# Space

module.exports = (FD) ->

  {
    REJECTED
    SOMETHING_CHANGED
    SUB
    SUP

    ENABLED
    ENABLE_EMPTY_CHECK

    ASSERT
    ASSERT_DOMAIN
    ASSERT_PROPAGATORS
    THROW
  } = FD.helpers

  {
    domain_create_bool
    domain_create_value
    domain_create_zero
    domain_is_solved
    domain_min
  } = FD.Domain

  {
    step_any
    prop_is_solved
  } = FD.propagators

  {
    fdvar_clone
    fdvar_constrain
    fdvar_create
    fdvar_create_wide
    fdvar_is_solved
    fdvar_set_domain
  } = FD.Fdvar

  # Duplicates the functionality of new Space(S) for readability.
  # Concept of a space that holds fdvars and propagators

  Space = FD.space = (root_space = null, propagator_data = [], vars = {}, all_var_names = [], unsolved_var_names = []) ->
    @_class = 'space'

    @vars = vars
    @all_var_names = all_var_names # shared by reference in whole tree! should have all keys of @vars
    @unsolved_var_names = unsolved_var_names
    @root_space = root_space

    @constant_cache = {}

    # shared with root! should not change after initialization
    @_propagators = propagator_data

    # used from Search
    @next_distribution_choice = 0
    @solver = undefined # see clone

    # these configs are only read from the root_space
    @config_var_filter_func = 'unsolved'
    @config_next_var_func = 'naive'
    @config_next_value_func = 'min'
    @config_targeted_vars = 'all'
    @config_when_solved = 'all'
    @config_var_dist_options = {}

    return

  space_new = (root, propagators, vars, all_names, unsolved_names) ->
    return new Space root, propagators, vars, all_names, unsolved_names

  # Note: it's pseudo because solved vars are not cloned but copied...

  pseudo_clone_vars = (all_names, parent_vars, clone_vars, clone_unsolved_var_names) ->
    for var_name in all_names
      fdvar = parent_vars[var_name]
      if fdvar.was_solved
        clone_vars[var_name] = fdvar
      else # copy by reference
        clone_vars[var_name] = fdvar_clone fdvar
        clone_unsolved_var_names.push var_name
    return

  Space::clone = () ->
    root = @root_space or @
    all_names = @all_var_names
    unsolved_names = []
    clone_vars = {}

    vars = @vars
    unsolved_propagators = []
    for propagator in @_propagators
      unless prop_is_solved vars, propagator
        unsolved_propagators.push propagator

    pseudo_clone_vars all_names, @vars, clone_vars, unsolved_names
    clone = space_new root, unsolved_propagators, clone_vars, all_names, unsolved_names

    # D4:
    # - add ref to high level solver
    clone.solver = @solver if @solver
    return clone

  # Return best var according to some fitness function `is_better_var`
  # Note that this function originates from `get_distributor_var_func()`

  get_next_var = (space, vars, is_better_var) ->
    if vars.length is 0
      return null

    for var_i, i in vars
      if i is 0
        first = var_i
      else unless is_better_var space, first, var_i
        first = var_i

    return first

  # Set solving options on this space. Only required for the root.

  Space::set_options = (options) ->
    if options?.filter
      # for markov,
      # string: 'none', ignored
      # function: callback to determine which vars of a space are considered, should return array of names
      @config_var_filter_func = options.filter
    if options?.var
      # see distribution.var
      @config_next_var_func = options.var
    if options?.val
      # see distribution.value
      @config_next_value_func = options.val
    if options?.targeted_var_names
      # which vars must be solved for this space to be solved
      # string: 'all'
      # string[]: list of vars that must be solved
      # function: callback to return list of names to be solved
      @config_targeted_vars = options.targeted_var_names
    if options?.is_solved
      # 'all': solved when all vars of a space are solved
      # string[]: a list of vars that must be solved to consider the space solved
      # function: a custom callback to determine whether the space is solved
      @config_when_solved = options.is_solved
    if options?.var_dist_config
      # An object which defines a value distributor per variable
      # which overrides the globally set value distributor.
      # See Bvar#distributionOptions
      @config_var_dist_options = options.var_dist_config

    return

  # Initialize the config of this space according to certain presets
  #
  # @param {string} name

  Space::set_defaults = (name) ->
    @set_options FD.distribution.get_defaults name
    return

  # A monotonically increasing class-global counter for unique temporary variable names.
  _temp_count = 1

  # Run all the propagators until stability point. Returns the number
  # of changes made or throws a 'fail' if any propagator failed.

  Space::propagate = ->
    changed = true # init (do-while)
    propagators = @_propagators
    ASSERT_PROPAGATORS @_propagators
    while changed
      changed = false
      for prop_details in propagators
        n = step_any prop_details, @ # TODO: if we can get a "solved" state here we can prevent an "is_solved" check later...

        # the domain of either var of a propagator can only be empty if the prop REJECTED
        ASSERT n is REJECTED or (@.vars[prop_details[1][0]].dom.length and @.vars[prop_details[1][1]].dom.length), 'prop var empty but it didnt REJECT'
        # if a domain was set empty and the flag is on the property should be set or
        # the unit test setup is unsound and it should be fixed (ASSERT_DOMAIN_EMPTY_SET)
        ASSERT !ENABLED or !ENABLE_EMPTY_CHECK or @.vars[prop_details[1][0]].dom.length or @.vars[prop_details[1][0]].dom._trace, 'domain empty but not marked'
        ASSERT !ENABLED or !ENABLE_EMPTY_CHECK or @.vars[prop_details[1][1]].dom.length or @.vars[prop_details[1][1]].dom._trace, 'domain empty but not marked'

        if n is SOMETHING_CHANGED
          changed = true
        else if n is REJECTED
          return false # solution impossible
    return true

  # Returns true if this space is solved - i.e. when
  # all the fdvars in the space have a singleton domain.
  #
  # This is a *very* strong condition that might not need
  # to be satisfied for a space to be considered to be
  # solved. For example, the propagators may determine
  # ranges for all variables under which all conditions
  # are met and there would be no further need to enumerate
  # those solutions.
  #
  # For weaker tests, use the solve_for_variables function
  # to create an appropriate "is_solved" tester and
  # set the "state.is_solved" field at search time to
  # that function.

  Space::is_solved = ->
    vars = @vars
    unsolved_names = @unsolved_var_names

    j = 0
    for name, i in unsolved_names
      fdvar = vars[name]
      ASSERT !fdvar.was_solved, 'should not be set yet at this stage' # we may change this though...
      ASSERT_DOMAIN fdvar.dom, 'is_solved extra domain validation check'
      if fdvar_is_solved fdvar
        ASSERT !fdvar.was_solved, 'should not have been marked as solved yet'
        fdvar.was_solved = true # makes Space#clone faster
      else
        unsolved_names[j++] = name
    unsolved_names.length = j

    return j is 0

  # Returns an object whose field names are the fdvar names
  # and whose values are the solved values. The space *must*
  # be already in a solved state for this to work.

  Space::solution = ->
    result = {}
    vars = @vars
    for var_name in @all_var_names
      getset_var_solve_state var_name, vars, result
    return result

  # @param {string[]} var_names List of var names to query the solution for
  # @param {boolean} [complete=false] Return false if at least one var could not be solved?

  Space::solutionFor = (var_names, complete = false) -> # todo implement memorize flag
    vars = @vars
    result = {}
    for var_name in var_names
      value = false
      if vars[var_name]
        value = getset_var_solve_state var_name, vars, result

      if complete and value is false
        return false

      result[var_name] = value

    return result

  getset_var_solve_state = (var_name, vars, result) ->
    # Don't include the temporary variables in the "solution".
    # Temporary variables take the form of a numeric property
    # of the object, so we test for the var_name to be a number and
    # don't include those variables in the result.
    domain = vars[var_name].dom
    value = domain
    if domain.length is 0
      value = false
    else if domain_is_solved domain
      value = domain_min domain
    result[var_name] = value

    return value

  # Utility to easily print out the state of variables in the space.
  # TOFIX: we should move this elsewhere so that we can more easily find usages of it. this is too implicit.

  Space::toString = ->
    return 'Object[Space]'

  # Call given function with `this` as argument
  # @deprecated (Silly construct... we should refactor call sites to eliminate usages)

  Space::inject = (func) ->
    func @
    return @

  # @deprecated Use @decl_anon instead

  Space::temp = (dom) ->
    return @decl_anon dom

  # @deprecated Use @decl_anons instead

  Space::temps = (N, dom) ->
    return @decl_anons N, dom

  # Returns a new unique name usable for an anonymous fdvar.
  # Returns the name of the new var, which will be a unique
  # number. You can optionally specify a domain, defaults
  # to the full range (SUB-SUP).

  Space::decl_anon = (dom) ->
    t = String(++_temp_count)
    @decl t, dom
    return t

  # Alias for @decl_anon [val, val]
  # Note: use #num() to give it a name. TODO: combine these funcs to a single func with optional name arg...

  Space::decl_value = (val) ->
    ASSERT !isNaN(val), 'Space#decl_value: Value is NaN', val
    ASSERT val >= SUB, 'val must be above minimum value', val
    ASSERT val <= SUP, 'val must be below max value', val

    # The idea is that single value domains are already solved so if they
    # change, the state is immediately rejected. As such these vars can
    # be considered constants; use them as is or bust. We do have to take
    # care not to change them inline as they are shared by reference.
    # TOFIX: make this more stable.
    cache = @constant_cache

    fdvar = cache[val]
    if fdvar
      return fdvar

    fdvar = @decl_anon domain_create_value val
    cache[val] = fdvar
    return fdvar

  # Create N anonymous FD variables and return their names
  # in an array. Optionally set them to given dom for all
  # of them, defaults to full range (SUB-SUP).

  Space::decl_anons = (N, dom) ->
    result = []
    for [0...N]
      result.push @decl_anon (dom and dom.slice 0)
    return result

  # Const/Konst is misleading because it serves no optimization.
  # @deprecated use @decl_value instead

  Space::konst = (val) ->
    return @decl_value val

  # Keep old name for compatibility.
  # @deprecated use @decl_value instead

  Space::const = (val) ->
    return @decl_value val

  # Register one or more variables with specific names
  # Note: if you want to register multiple names call Space#decls instead

  Space::decl = (name_or_names, dom) ->
    if dom
      ASSERT_DOMAIN dom
    # lets try to deprecate this path
    if name_or_names instanceof Object or name_or_names instanceof Array
      return @decls name_or_names, dom

    # A single variable is being declared.
    var_name = name_or_names
    vars = @vars

    fdvar = vars[var_name]
    if fdvar
      # If it already exists, change the domain if necessary.
      if dom
        fdvar_set_domain fdvar, dom
      return @

    if dom
      vars[var_name] = fdvar_create var_name, dom
    else
      vars[var_name] = fdvar_create_wide var_name
    @unsolved_var_names.push var_name
    @all_var_names.push var_name

    return @

  # Register multiple vars. If you supply a domain the domain will be cloned for each.

  Space::decls = (names, dom) ->
    # Recursively declare all variables in the structure given.
    for key, value of names
      @decl value, (dom and dom.slice 0)
    return @

  # Same function as @decl_value but with explicit name

  Space::num = (name, n) ->
    @decl name, domain_create_value n
    return @

  # Adds propagators which reify the given operator application
  # to the given boolean variable.
  #
  # `opname` is a string giving the name of the comparison
  # operator to reify. Currently, 'eq', 'neq', 'lt', 'lte', 'gt' and 'gte'
  # are supported.
  #
  # `left_var_name` and `right_var_name` are the arguments accepted
  # by the comparison operator. These must be existing FDVars in S.vars.
  #
  # `bool_name` is the name of the boolean variable to which to
  # reify the comparison operator. Note that this boolean
  # variable must already have been declared. If this argument
  # is omitted from the call, then the `reified` function can
  # be used in "functional style" and will return the name of
  # the reified boolean variable which you can pass to other
  # propagator creator functions.

  Space::reified = (opname, left_var_name, right_var_name, bool_name) ->
    switch opname
      when 'eq'
        nopname = 'neq'

      when 'neq'
        nopname = 'eq'

      when 'lt'
        nopname = 'gte'

      when 'gt'
        nopname = 'lte'

      when 'lte'
        nopname = 'gt'

      when 'gte'
        nopname = 'lt'

      else
        THROW 'FD.space.reified: Unsupported operator \'' + opname + '\''

    if bool_name
      if fdvar_constrain(@vars[bool_name], domain_create_bool()) is REJECTED
        return REJECTED
    else
      bool_name = @decl_anon domain_create_bool()

    @_propagators.push ['reified', [left_var_name, right_var_name, bool_name], opname, nopname]
    ASSERT_PROPAGATORS @_propagators

    return bool_name

  Space::callback = (var_names, callback) ->
    @_propagators.push ['callback', var_names, callback]
    ASSERT_PROPAGATORS @_propagators
    return

  # Domain equality propagator. Creates the propagator
  # in this space. The specified variables need not
  # exist at the time the propagator is created and
  # added, since the fdvars are all referenced by name.
  # TOFIX: deprecate the "functional" syntax for sake of simplicity. Was part of original lib. Silliness.

  Space::eq = (v1name, v2name) ->
    # If v2name is not specified, then we're operating in functional syntax
    # and the return value is expected to be v2name itself. This can happen
    # when, for example, scale uses a weight factor of 1.
    if !v2name
      return v1name

    @_propagators.push ['eq', [v1name, v2name]]
    ASSERT_PROPAGATORS @_propagators
    return

  # Less than propagator. See general propagator nores
  # for fdeq which also apply to this one.

  Space::lt = (v1name, v2name) ->
    @_propagators.push ['lt', [v1name, v2name]]
    ASSERT_PROPAGATORS @_propagators
    return

  # Greater than propagator.

  Space::gt = (v1name, v2name) ->
    # _swap_ v1 and v2 because: a>b is b<=a
    @_propagators.push ['lte', [v2name, v1name]]
    ASSERT_PROPAGATORS @_propagators
    return

  # Less than or equal to propagator.

  Space::lte = (v1name, v2name) ->
    @_propagators.push ['lte', [v1name, v2name]]
    ASSERT_PROPAGATORS @_propagators
    return

  # Greater than or equal to.

  Space::gte = (v1name, v2name) ->
    # TODO: fix this as per https://github.com/srikumarks/FD.js/issues/6
    # _swap_ v1 and v2 because: a>=b is b<a
    @_propagators.push ['lte', [v2name, v1name]]
    ASSERT_PROPAGATORS @_propagators
    return

  # Ensures that the two variables take on different values.

  Space::neq = (v1name, v2name) ->
    @_propagators.push ['neq', [v1name, v2name]]
    ASSERT_PROPAGATORS @_propagators
    return

  # Takes an arbitrary number of FD variables and adds propagators that
  # ensure that they are pairwise distinct.

  Space::distinct = (vars) ->
    for var_i, i in vars
      for j in [0...i]
        @_propagators.push ['neq', [vars[i], vars[j]]]
    ASSERT_PROPAGATORS @_propagators
    return

  # Once you create an fdvar in a space with the given
  # name, it is available for accessing as a direct member
  # of the space. Since this can cause a name clash, it is
  # recommended that you start the names of fdvars with an
  # upper case letter. Since all the declared member names
  # start with a lower case letter, a clash can certainly
  # be avoided if you stick to that rule.
  #
  # If the domain is not specified, it is taken to be [SUB, SUP].
  #
  # Returns the space. All methods, unless otherwise noted,
  # will return the current space so that other methods
  # can be invoked in sequence.

  plus_or_times = (space, target_op_name, inv_op_name, v1name, v2name, sumname) ->
    retval = space
    # If sumname is not specified, we need to create a anonymous
    # for the result and return the name of that anon variable.
    unless sumname
      sumname = space.decl_anon()
      retval = sumname

    space._propagators.push(
      ['ring', [v1name, v2name, sumname], target_op_name]
      ['ring', [sumname, v2name, v1name], inv_op_name]
      ['ring', [sumname, v1name, v2name], inv_op_name]
    )

    ASSERT_PROPAGATORS space._propagators

    return retval

  # Bidirectional addition propagator.
  # Returns either @ or the anonymous var name if no sumname was given

  Space::plus = (v1name, v2name, sumname) ->
    return plus_or_times @, 'plus', 'min', v1name, v2name, sumname

  # Bidirectional multiplication propagator.
  # Returns either @ or the anonymous var name if no sumname was given

  Space::times = (v1name, v2name, prodname) ->
    return plus_or_times @, 'mul', 'div', v1name, v2name, prodname

  # factor = constant number (not an fdvar)
  # vname is an fdvar name
  # prodname is an fdvar name, optional
  #
  # factor * v = prod

  Space::scale = (factor, vname, prodname) ->
    if factor is 1
      return @eq vname, prodname

    if factor is 0
      return @eq @decl_anon(domain_create_zero()), prodname

    if factor < 0
      THROW 'scale: negative factors not supported.'

    unless prodname
      prodname = @decl_anon()
      retval = prodname

    @_propagators.push ['mul', [vname, prodname]]
    @_propagators.push ['div', [vname, prodname]]
    ASSERT_PROPAGATORS @_propagators

    return retval

  # TODO: Can be made more efficient.

  Space::times_plus = (k1, v1name, k2, v2name, resultname) ->
    return @plus @scale(k1, v1name), @scale(k2, v2name), resultname

  # Sum of N fdvars = resultFDVar
  # Creates as many anonymous vars as necessary.
  # Returns either @ or the anonymous var name if no sumname was given

  Space::sum = (vars, result_var_name) ->
    retval = @

    unless result_var_name
      result_var_name = @decl_anon()
      retval = result_var_name

    switch vars.length
      when 0
        THROW 'Space.sum: Nothing to sum!'

      when 1
        @eq vars[0], result_var_name

      when 2
        @plus vars[0], vars[1], result_var_name

      else # "divide and conquer" ugh. feels like there is a better way to do this
        n = Math.floor vars.length / 2
        if n > 1
          t1 = @decl_anon()
          @sum vars.slice(0, n), t1
        else
          t1 = vars[0]

        t2 = @decl_anon()

        @sum vars.slice(n), t2
        @plus t1, t2, result_var_name

    return retval

  # Product of N fdvars = resultFDvar.
  # Create as many anonymous vars as necessary.

  Space::product = (vars, result_var_name) ->
    retval = @

    unless result_var_name
      result_var_name = @decl_anon()
      retval = result_var_name

    switch vars.length
      when 0
        return retval

      when 1
        @eq vars[0], result_var_name

      when 2
        @times vars[0], vars[1], result_var_name

      else
        n = Math.floor vars.length / 2
        if n > 1
          t1 = @decl_anon()
          @product vars.slice(0, n), t1
        else
          t1 = vars[0]
        t2 = @decl_anon()

        @product vars.slice(n), t2
        @times t1, t2, result_var_name

    return retval

  # Weighted sum of fdvars where the weights are constants.

  Space::wsum = (kweights, vars, result_name) ->
    anons = []
    for var_i, i in vars
      t = @decl_anon()
      @scale kweights[i], var_i, t
      anons.push t
    @sum anons, result_name
    return

  # debug stuff (should be stripped from dist)

  Space::__to_solver_test_case = () ->
    things = ['S = new FD.Solver {}\n']

    for name of @vars
      things.push 'S.decl \''+name+'\', ['+@vars[name].dom.join(', ')+']'
    things.push ''

    @_propagators.forEach (c) ->
      if c[0] is 'reified'
        things.push 'S._cacheReified \''+c[2]+'\', \''+c[1].join('\', \'')+'\''
      else if c[0] is 'ring'
        switch c[2]
          when 'plus'
            things.push 'S.plus \''+c[1].join('\', \'')+'\''
          when 'min'
          # doesnt really exist. merely artifact of times
            things.push '# S.minus \''+c[1].join('\', \'')+'\' # (artifact from .plus)'
          when 'mul'
            things.push 'S.times \''+c[1].join('\', \'')+'\''
          when 'div'
          # doesnt really exist. merely artifact of times
            things.push '# S.divby \''+c[1].join('\', \'')+'\' # (artifact from .times)'
          else
            ASSERT false, 'unknown ring op name', c[2]
      else
        things.push 'S.'+c[0]+' \''+c[1].join('\', \'')+'\''

    things.push '\nexpect(S.solve({max:10000}).length).to.eql 666'

    return things.join '\n'

  Space::__to_space_test_case = () ->
    things = ['S = new Space {}\n']

    for name of @vars
      things.push 'S.decl \''+name+'\', ['+@vars[name].dom.join(', ')+']'
    things.push ''

    things.push 'S._propagators = [\n  ' + @_propagators.map(JSON.stringify).join('\n  ').replace(/"/g, '\'') + '\n]'

    things.push '\nexpect(S.propagate()).to.eql true'

    return things.join '\n'


  Space::__debug_string = () ->

    things = ['Config:']

    things.push '- config_var_filter_func: ' + @config_var_filter_func
    things.push '- config_next_var_func: ' + @config_next_var_func
    things.push '- config_next_value_func: ' + @config_next_value_func
    things.push '- config_targeted_vars: ' + @config_targeted_vars
    things.push '- config_when_solved: ' + @config_when_solved

    things.push "Vars (#{@all_var_names.length}x):"

    vars = @vars
    for name of vars
      things.push '  '+name+': ['+vars[name].dom.join(', ')+']'

    things.push "Var (#{@all_var_names.length}x):"
    things.push '  ' + @all_var_names
    things.push "Unsolved vars (#{@unsolved_var_names.length}x):"
    things.push '  ' + @unsolved_var_names

    things.push "Propagators (#{@_propagators.length}x):"

    @_propagators.forEach (c) ->
      if c[0] is 'reified'
        things.push "  #{c[0]}: '#{c[2]}', '#{c[1].join '\', \''}' \# [#{vars[c[1][0]].dom}] #{c[2]} [#{vars[c[1][1]].dom}] -> [#{vars[c[1][2]].dom}]"
      if c[0] is 'ring'
        things.push "  #{c[0]}: '#{c[2]}', '#{c[1].join '\', \''}' \# [#{vars[c[1][0]].dom}] #{c[2]} [#{vars[c[1][1]].dom}] -> [#{vars[c[1][2]].dom}]"
      else
        things.push "  #{c[0]} '#{c[1].join ', '}' \# [#{vars[c[1][0]].dom}] #{c[0]} [#{vars[c[1][1]].dom}]"
    unless @_propagators.length
      things.push '  - none'

    return things.join '\n'

  Space::__debug_var_domains = ->
    things = []
    for name of @vars
      things.push name+': ['+@vars[name].dom+']'
    return things

  Space::__get_unsolved = ->
    vars = @vars
    unsolved_names = []
    for name of vars
      fdvar = vars[name]
      unless fdvar_is_solved fdvar
        unsolved_names.push name
    return unsolved_names
