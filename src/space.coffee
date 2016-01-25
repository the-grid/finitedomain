module.exports = do ->

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
  } = require './helpers'

  {
    domain_create_bool
    domain_create_value
    domain_is_solved
    domain_min
  } = require './domain'

  {
    fdvar_clone
    fdvar_constrain
    fdvar_create
    fdvar_is_solved
    fdvar_set_domain
  } = require './fdvar'

  {
    propagator_step_any
  } = require './propagators/step_any'

  {
    propagator_is_solved
  } = require './propagators/is_solved'

  {
    distribution_get_defaults
  } = require './distribution/defaults'

  # BODY_START

  # A monotonically increasing class-global counter for unique temporary variable names.
  _space_uid_counter = 1

  space_create_root = ->
    return _space_create_new null, [], {}, [], []

  # Create a space node that is a child of given space node

  space_create_clone = (space) ->
    root = space_get_root space
    all_names = space.all_var_names
    unsolved_names = []
    clone_vars = {}

    vars = space.vars
    unsolved_propagators = []
    for propagator in space._propagators
      unless propagator_is_solved vars, propagator
        unsolved_propagators.push propagator

    _space_pseudo_clone_vars all_names, vars, clone_vars, unsolved_names
    return _space_create_new root, unsolved_propagators, clone_vars, all_names, unsolved_names

  # Note: it's pseudo because solved vars are not cloned but copied...

  _space_pseudo_clone_vars = (all_names, parent_vars, clone_vars, clone_unsolved_var_names) ->
    for var_name in all_names
      fdvar = parent_vars[var_name]
      if fdvar.was_solved
        clone_vars[var_name] = fdvar
      else # copy by reference
        clone_vars[var_name] = fdvar_clone fdvar
        clone_unsolved_var_names.push var_name
    return

  # Concept of a space that holds config, some fdvars, and some propagators

  _space_create_new = (_root_space, _propagators, vars, all_var_names, unsolved_var_names) ->
    ASSERT typeof _root_space is 'object', 'should be an object or null', _root_space
    ASSERT !(_root_space instanceof Array), 'not expecting an array here',  _root_space
    ASSERT _propagators instanceof Array, 'props should be an array', _propagators
    ASSERT vars and typeof vars is 'object', 'vars should be an object', vars
    ASSERT all_var_names instanceof Array, 'all_var_names should be an array', all_var_names
    ASSERT unsolved_var_names instanceof Array, 'unsolved_var_names should be an array', unsolved_var_names

    return {
      _class: 'space'

      _root_space

      config_var_filter_func: 'unsolved'
      config_next_var_func: 'naive'
      config_next_value_func: 'min'
      config_targeted_vars: 'all'
      config_when_solved: 'all'
      config_var_dist_options: {}
      config_timeout_callback: undefined

      vars
      all_var_names
      unsolved_var_names
      constant_cache: {}

      _propagators

      next_distribution_choice: 0
    }

  # Set solving options on this space. Only required for the root.

  space_set_options = (space, options) ->
    if options?.filter
      # for markov,
      # string: 'none', ignored
      # function: callback to determine which vars of a space are considered, should return array of names
      space.config_var_filter_func = options.filter
    if options?.var
      # see distribution.var
      # either
      # - a function: should return the _name_ of the next var to process
      # - a string: the name of the var distributor to use
      # - an object: a complex object like {dist_name:string, fallback_config: string|object, data...?}
      # fallback_config has the same struct as the main config_next_var_func and is used when the dist returns SAME
      # this way you can chain distributors if they cant decide on their own (list -> markov -> naive)
      space.config_next_var_func = options.var
      _space_init_configs_and_fallbacks options.var
    if options?.val
      # see distribution.value
      space.config_next_value_func = options.val
    if options?.targeted_var_names
      # which vars must be solved for this space to be solved
      # string: 'all'
      # string[]: list of vars that must be solved
      # function: callback to return list of names to be solved
      space.config_targeted_vars = options.targeted_var_names
    if options?.is_solved
      # 'all': solved when all vars of a space are solved
      # string[]: a list of vars that must be solved to consider the space solved
      # function: a custom callback to determine whether the space is solved
      space.config_when_solved = options.is_solved
    if options?.var_dist_config
      # An object which defines a value distributor per variable
      # which overrides the globally set value distributor.
      # See Bvar#distributionOptions
      space.config_var_dist_options = options.var_dist_config
    if options?.timeout_callback
      # A function that returns true if the current search should stop
      # Can be called multiple times after the search is stopped, should
      # keep returning false (or assume an uncertain outcome).
      # The function is called after the first batch of propagators is
      # called so it won't immediately stop. But it stops quickly.
      space.config_timeout_callback = options.timeout_callback

    return

  # Create a simple lookup hash from an array of strings
  # to an object that looks up the index from the string.
  # This is used for finding the priority of a var elsewhere.
  #
  # @param {Object} [config] This is the var dist config (-> space.config_next_var_func)
  # @property {string[]} [config.priority_list] If present, creates a priority_hash on config which maps string>index

  _space_init_configs_and_fallbacks = (config) ->

    # populate the priority hashes for all (sub)configs
    while config?

      # explicit list of priorities. vars not in this list have equal
      # priority, but lower than any var that is in the list.
      list = config.priority_list
      if list
        hash = {}
        config.priority_hash = hash
        max = list.length
        for name, index in list
          # note: lowest priority still in the list is one, not zero
          # this way you dont have to check -1 for non-existing, later
          hash[name] = max - index

      # do it for all the fallback configs as well...
      config = config.fallback_config

    return

  # Initialize the config of this space according to certain presets
  #
  # @param {string} name

  space_set_defaults = (space, name) ->
    space_set_options space, distribution_get_defaults name
    return

  # Get the root space for this search tree
  #
  # @returns {Space}

  space_get_root = (space) ->
    return space._root_space or space

  # Run all the propagators until stability point. Returns the number
  # of changes made or throws a 'fail' if any propagator failed.

  space_propagate = (space) ->
    changed = true # init (do-while)
    propagators = space._propagators
    ASSERT_PROPAGATORS space._propagators
    while changed
      changed = false
      for prop_details in propagators
        n = propagator_step_any prop_details, space # TODO: if we can get a "solved" state here we can prevent an "is_solved" check later...

        # the domain of either var of a propagator can only be empty if the prop REJECTED
        ASSERT n is REJECTED or space.vars[prop_details[1][0]].dom.length, 'prop var empty but it didnt REJECT'
        ASSERT n is REJECTED or !prop_details[1][1] or space.vars[prop_details[1][1]].dom.length, 'prop var empty but it didnt REJECT'
        # if a domain was set empty and the flag is on the property should be set or
        # the unit test setup is unsound and it should be fixed (ASSERT_DOMAIN_EMPTY_SET)
        ASSERT !ENABLED or !ENABLE_EMPTY_CHECK or space.vars[prop_details[1][0]].dom.length or space.vars[prop_details[1][0]].dom._trace, 'domain empty but not marked'
        ASSERT !ENABLED or !ENABLE_EMPTY_CHECK or !prop_details[1][1] or space.vars[prop_details[1][1]].dom.length or space.vars[prop_details[1][1]].dom._trace, 'domain empty but not marked'

        if n is SOMETHING_CHANGED
          changed = true
        else if n is REJECTED
          return false # solution impossible

      if _space_abort_search space
        return false

    return true

  _space_abort_search = (space) ->
    root_space = space_get_root space
    c = root_space.config_timeout_callback
    if c
      return c space
    return false

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

  space_is_solved = (space) ->
    vars = space.vars
    unsolved_names = space.unsolved_var_names

    j = 0
    for name, i in unsolved_names
      fdvar = vars[name]
      ASSERT !fdvar.was_solved, 'should not be set yet at this stage' # we may change this though...
      ASSERT_DOMAIN fdvar.dom, 'is_solved extra domain validation check'

      if fdvar_is_solved fdvar
        fdvar.was_solved = true # makes space_create_clone faster
      else
        unsolved_names[j++] = name
    unsolved_names.length = j

    return j is 0

  # Returns an object whose field names are the fdvar names
  # and whose values are the solved values. The space *must*
  # be already in a solved state for this to work.

  space_solution = (space) ->
    result = {}
    vars = space.vars
    for var_name in space.all_var_names
      _space_getset_var_solve_state var_name, vars, result
    return result

  # @param {string[]} var_names List of var names to query the solution for
  # @param {boolean} [complete=false] Return false if at least one var could not be solved?

  space_solution_for = (space, var_names, complete = false) -> # todo implement memorize flag
    vars = space.vars
    result = {}
    for var_name in var_names
      value = false
      if vars[var_name]
        value = _space_getset_var_solve_state var_name, vars, result

      if complete and value is false
        return false

      result[var_name] = value

    return result

  _space_getset_var_solve_state = (var_name, vars, result) ->
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

  # create a new var on this space
  # - name is optional, an anonymous var is created if absent
  # - if name is a number or array it is assumed to be `lo`,
  # and then hi becomes lo, lo becomes name, name becomes null
  # - lo can be a number, undefined, or an array.\
  # - hi can be a number or undefined.
  # - if lo is array it is assumed to be the whole domain
  # returns the name of the new var (regardless)
  #
  # Usage:
  # space_add_var space, 'A', 0           # declares var A with domain [0, 0]
  # space_add_var space, 'A', 0, 1        # declares var A with domain [0, 1]
  # space_add_var space, 'A', [0, 1]      # declares var A with given domain
  # space_add_var space, 'A'              # declares var A with [SUB, SUP]
  # space_add_var space, 0                # declares anonymous var with [0, 0]
  # space_add_var space, 0, 1             # declares anonymous var with [0, 1]
  # space_add_var space, [0, 1]           # declares anonymous var with given domain
  # space_add_var space                   # declares anonymous var with [SUB, SUP]

  space_add_var = (space, name, lo, hi, skip_value_check) ->
    if typeof name is 'number' or name instanceof Array
      hi = lo
      lo = name
      name = undefined

    if typeof lo is 'number' and !hi?
      if name
        _space_create_var_domain space, name, domain_create_value lo
        return name

    if !name? and typeof lo is 'number'
      # use special function that caches and dedupes "solved" vars
      if !hi?
        return _space_create_var_value space, lo
      # recursive check. but if a "solved" domain is passed we may want to cache that too
      if !skip_value_check and lo is hi
        return _space_create_var_value space, lo

    if lo? and hi?
      ASSERT typeof lo is 'number', 'if hi is passed lo should be a number', lo, hi
      domain = [lo, hi]
    else if lo?
      ASSERT lo instanceof Array, 'if lo is not a number it must be an array; the domain', lo
      ASSERT !hi?, 'if lo is the domain, hi should not be given', lo, hi
      domain = lo.slice 0
    else
      ASSERT !lo?, 'expecting no lo/hi at this point', lo, hi
      ASSERT !hi?, 'expecting no lo/hi at this point', lo, hi
      domain = [SUB, SUP]

    unless name
      # create anonymous var
      name = String ++_space_uid_counter

    _space_create_var_domain space, name, domain
    return name

  # See space_add_var for details

  space_add_vars = (space, arr...) ->
    for a in arr
      space_add_var space, a[0], a[1], a[2]
    return

  # Add a bunch of vars by different names and same domain
  # See space_add_var for details

  space_add_vars_domain = (space, names, lo, hi) ->
    for name in names
      space_add_var space, name, lo, hi
    return

  # create an anonymous var with specific solved state
  # multiple anonymous vars with same name return the same
  # reference as optimization (should not harm?)

  _space_create_var_value = (space, val) ->
    ASSERT !isNaN(val), '_space_create_var_value: Value is NaN', val
    ASSERT val >= SUB, 'val must be above minimum value', val
    ASSERT val <= SUP, 'val must be below max value', val

    # The idea is that single value domains are already solved so if they
    # change, the state is immediately rejected. As such these vars can
    # be considered constants; use them as is or bust. We do have to take
    # care not to change them inline as they are shared by reference.
    # TOFIX: make this more stable.
    cache = space.constant_cache

    fdvar_name = cache[val]
    if fdvar_name
      return fdvar_name

    SKIP_RECURSION = true
    fdvar_name = space_add_var space, undefined, val, val, SKIP_RECURSION
    cache[val] = fdvar_name
    return fdvar_name

  # Register a variable with specific name and specific dom

  _space_create_var_domain = (space, var_name, dom) ->
    ASSERT !!dom
    ASSERT_DOMAIN dom

    vars = space.vars

    fdvar = vars[var_name]
    if fdvar
      # If it already exists, change the domain if necessary.
      # (I think this should issue an error because when would you want to do this?)
      fdvar_set_domain fdvar, dom
    else
      vars[var_name] = fdvar_create var_name, dom
      space.unsolved_var_names.push var_name
      space.all_var_names.push var_name

    return

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

  space_reified = (space, opname, left_var_name, right_var_name, bool_name) ->
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
        THROW 'add_reified: Unsupported operator \'' + opname + '\''

    if bool_name
      if fdvar_constrain(space.vars[bool_name], domain_create_bool()) is REJECTED
        return REJECTED
    else
      bool_name = space_add_var space, 0, 1

    space._propagators.push ['reified', [left_var_name, right_var_name, bool_name], opname, nopname]
    ASSERT_PROPAGATORS space._propagators
    return bool_name

  space_callback = (space, var_names, callback) ->
    space._propagators.push ['callback', var_names, callback]
    ASSERT_PROPAGATORS space._propagators
    return

  # Domain equality propagator. Creates the propagator
  # in this space. The specified variables need not
  # exist at the time the propagator is created and
  # added, since the fdvars are all referenced by name.
  # if `v2name` is a number, an anonymous var is created
  # for that value so you can do `space_eq(space, 'A', 1)`
  # TOFIX: deprecate the "functional" syntax for sake of simplicity. Was part of original lib. Silliness.

  space_eq = (space, v1name, v2name) ->
    # If v2name is not specified, then we're operating in functional syntax
    # and the return value is expected to be v2name itself. This can happen
    # when, for example, scale uses a weight factor of 1.
    if !v2name?
      return v1name

    if typeof v2name is 'number'
      v2name = space_add_var space, v2name

    space._propagators.push ['eq', [v1name, v2name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Less than propagator. See general propagator nores
  # for fdeq which also apply to this one.

  space_lt = (space, v1name, v2name) ->
    space._propagators.push ['lt', [v1name, v2name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Greater than propagator.

  space_gt = (space, v1name, v2name) ->
    # _swap_ v1 and v2 because: a>b is b<a
    space._propagators.push ['lt', [v2name, v1name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Less than or equal to propagator.

  space_lte = (space, v1name, v2name) ->
    space._propagators.push ['lte', [v1name, v2name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Greater than or equal to.

  space_gte = (space, v1name, v2name) ->
    # _swap_ v1 and v2 because: a>b is b<a
    space._propagators.push ['lte', [v2name, v1name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Ensures that the two variables take on different values.

  space_neq = (space, v1name, v2name) ->
    space._propagators.push ['neq', [v1name, v2name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Takes an arbitrary number of FD variables and adds propagators that
  # ensure that they are pairwise distinct.

  space_distinct = (space, var_names) ->
    for var_name_i, i in var_names
      for j in [0...i]
        space_neq space, var_name_i, var_names[j]
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

  _space_plus_or_times = (space, target_op_name, inv_op_name, v1name, v2name, sumname) ->
    retval = space
    # If sumname is not specified, we need to create a anonymous
    # for the result and return the name of that anon variable.
    unless sumname
      sumname = space_add_var space
      retval = sumname

    _space_add_ring space, v1name, v2name, sumname, target_op_name
    _space_add_ring space, sumname, v2name, v1name, inv_op_name
    _space_add_ring space, sumname, v1name, v2name, inv_op_name

    return retval

  _space_add_ring = (space, A, B, C, op) ->
    space._propagators.push ['ring', [A, B, C], op]
    ASSERT_PROPAGATORS space._propagators
    return

  # Bidirectional addition propagator.
  # Returns either space or the anonymous var name if no sumname was given

  space_plus = (space, v1name, v2name, sumname) ->
    return _space_plus_or_times space, 'plus', 'min', v1name, v2name, sumname

  # Bidirectional multiplication propagator.
  # Returns either space or the anonymous var name if no sumname was given

  space_times = (space, v1name, v2name, prodname) ->
    return _space_plus_or_times space, 'mul', 'div', v1name, v2name, prodname

  # factor = constant number (not an fdvar)
  # vname is an fdvar name
  # prodname is an fdvar name, optional
  #
  # factor * v = prod

  space_scale = (space, factor, vname, prodname) ->
    if factor is 1
      return space_eq space, vname, prodname

    if factor is 0
      return space_eq space, space_add_var(space, 0), prodname

    if factor < 0
      THROW 'scale: negative factors not supported.'

    unless prodname
      prodname = space_add_var space
      retval = prodname

    space._propagators.push ['mul', [vname, prodname]]
    space._propagators.push ['div', [vname, prodname]]
    ASSERT_PROPAGATORS space._propagators

    return retval

  # TODO: Can be made more efficient.

  space_times_plus = (space, k1, v1name, k2, v2name, resultname) ->
    A = space_scale space, k1, v1name
    B = space_scale space, k2, v2name
    return space_plus space, A, B, resultname

  # Sum of N fdvars = resultFDVar
  # Creates as many anonymous vars as necessary.
  # Returns either space or the anonymous var name if no sumname was given

  space_sum = (space, vars, result_var_name) ->
    retval = space

    unless result_var_name
      result_var_name = space_add_var space
      retval = result_var_name

    switch vars.length
      when 0
        THROW 'space_sum: Nothing to sum!'

      when 1
        space_eq space, vars[0], result_var_name

      when 2
        space_plus space, vars[0], vars[1], result_var_name

      else # "divide and conquer" ugh. feels like there is a better way to do this
        n = Math.floor vars.length / 2
        if n > 1
          t1 = space_add_var space
          space_sum space, vars.slice(0, n), t1
        else
          t1 = vars[0]

        t2 = space_add_var space

        space_sum space, vars.slice(n), t2
        space_plus space, t1, t2, result_var_name

    return retval

  # Product of N fdvars = resultFDvar.
  # Create as many anonymous vars as necessary.

  space_product = (space, vars, result_var_name) ->
    retval = space

    unless result_var_name
      result_var_name = space_add_var space
      retval = result_var_name

    switch vars.length
      when 0
        return retval

      when 1
        space_eq space, vars[0], result_var_name

      when 2
        space_times space, vars[0], vars[1], result_var_name

      else
        n = Math.floor vars.length / 2
        if n > 1
          t1 = space_add_var space
          space_product space, vars.slice(0, n), t1
        else
          t1 = vars[0]
        t2 = space_add_var space

        space_product space, vars.slice(n), t2
        space_times space, t1, t2, result_var_name

    return retval

  # Weighted sum of fdvars where the weights are constants.

  space_wsum = (space, kweights, vars, result_name) ->
    anons = []
    for var_i, i in vars
      t = space_add_var space
      space_scale space, kweights[i], var_i, t
      anons.push t
    space_sum space, anons, result_name
    return

  space_markov = (space, var_name) ->
    ASSERT space._class is 'space'
    space._propagators.push ['markov', [var_name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # __REMOVE_BELOW_FOR_DIST__

  #### Debugging

  # debug stuff (should be stripped from dist)

  __space_to_solver_test_case = (space) ->
    things = ['S = new Solver {}\n']

    for name of space.vars
      things.push 'space_add_var space, \''+name+'\', ['+space.vars[name].dom.join(', ')+']'
    things.push ''

    space._propagators.forEach (c) ->
      if c[0] is 'reified'
        things.push 'S._cacheReified \''+c[2]+'\', \''+c[1].join('\', \'')+'\''
      else if c[0] is 'ring'
        switch c[2]
          when 'plus'
            things.push 'space_plus S, \''+c[1].join('\', \'')+'\''
          when 'min'
          # doesnt really exist. merely artifact of times
            things.push '# S.minus \''+c[1].join('\', \'')+'\' # (artifact from .plus)'
          when 'mul'
            things.push 'space_times S, \''+c[1].join('\', \'')+'\''
          when 'div'
          # doesnt really exist. merely artifact of times
            things.push '# S.divby \''+c[1].join('\', \'')+'\' # (artifact from .times)'
          else
            ASSERT false, 'unknown ring op name', c[2]
      else
        things.push 'S.'+c[0]+' \''+c[1].join('\', \'')+'\''

    things.push '\nexpect(S.solve({max:10000}).length).to.eql 666'

    return things.join '\n'

  __space_to_space_test_case = (space) ->
    things = ['S = space_create_root()\n']

    for name of space.vars
      things.push 'space_add_var S, \''+name+'\', ['+space.vars[name].dom.join(', ')+']'
    things.push ''

    things.push 'S._propagators = [\n  ' + space._propagators.map(JSON.stringify).join('\n  ').replace(/"/g, '\'') + '\n]'

    things.push '\nexpect(space_propagate S).to.eql true'

    return things.join '\n'


  __space_debug_string = (space) ->
    try
      things = ['#########']

      things.push 'Config:'
      things.push '- config_var_filter_func: ' + space.config_var_filter_func
      things.push '- config_next_var_func: ' + space.config_next_var_func
      things.push '- config_next_value_func: ' + space.config_next_value_func
      things.push '- config_targeted_vars: ' + space.config_targeted_vars
      things.push '- config_when_solved: ' + space.config_when_solved

      things.push "Vars (#{space.all_var_names.length}x):"

      vars = space.vars
      for name, fdvar of vars
        options = space.config_var_dist_options[name]
        things.push "  #{name}: [#{fdvar.dom.join(', ')}] #{options and ('Options: '+JSON.stringify(options)) or ''}"

      things.push 'config_var_dist_options:'
      for key, val of space.config_var_dist_options
        things.push "  #{key}: #{JSON.stringify val}"

      things.push "Var (#{space.all_var_names.length}x):"
      things.push '  ' + space.all_var_names
      things.push "Unsolved vars (#{space.unsolved_var_names.length}x):"
      things.push '  ' + space.unsolved_var_names

      things.push "Propagators (#{space._propagators.length}x):"

      space._propagators.forEach (p) ->
        try
          solved = propagator_is_solved vars, p
        catch e
          solved = '(unknown; crashes when checked)'

        a = p[1]?[0]
        b = p[1]?[1]
        c = p[1]?[2]
        if p[0] is 'reified'
          things.push "  #{p[0]}: '#{p[2]}', '#{p[1].join '\', \''}' \# [#{vars[a]?.dom or 'FAIL'}] #{p[2]} [#{vars[b]?.dom or 'FAIL'}] -> [#{vars[c]?.dom or 'FAIL'}] | solved: #{solved}"
        else if p[0] is 'ring'
          things.push "  #{p[0]}: '#{p[2]}', '#{p[1].join '\', \''}' \# [#{vars[a]?.dom or 'FAIL'}] #{p[2]} [#{vars[b]?.dom or 'FAIL'}] -> [#{vars[c]?.dom or 'FAIL'}] | solved: #{solved}"
        else
          things.push "  #{p[0]} '#{p[1].join ', '}' \# [#{vars[a]?.dom or 'FAIL'}] #{p[0]} [#{vars[b]?.dom or 'FAIL'}] | solved: #{solved}"
      unless space._propagators.length
        things.push '  - none'

      things.push '#########'
    catch e
      things.push '(Crashed inside __space_debug_string!)'
      throw new Error things.join '\n'

    return things.join '\n'

    __space_debug_var_domains = (space_) ->
      things = []
      for name of space.vars
        things.push name+': ['+space.vars[name].dom+']'
      return things

    __space_get_unsolved = (space) ->
      vars = space.vars
      unsolved_names = []
      for name of vars
        fdvar = vars[name]
        unless fdvar_is_solved fdvar
          unsolved_names.push name
      return unsolved_names

    # __REMOVE_ABOVE_FOR_DIST__

  # BODY_STOP

  return {
    space_add_vars_domain
    space_add_var
    space_add_vars
    space_callback
    space_create_clone
    space_create_root
    space_distinct
    space_eq
    space_get_root
    space_gt
    space_gte
    space_is_solved
    space_lt
    space_lte
    space_markov
    space_neq
    space_plus
    space_product
    space_propagate
    space_reified
    space_scale
    space_set_defaults
    space_set_options
    space_solution
    space_solution_for
    space_sum
    space_times
    space_times_plus
    space_wsum

    # testing
    _space_create_var_domain
    _space_create_var_value
  }
