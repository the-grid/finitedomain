# Space

module.exports = (FD) ->

  {
    REJECTED
    SUB
    SUP
  } = FD.helpers

  {
    domain_create_bool
    domain_create_value
    domain_create_zero
    domain_intersection
    domain_is_solved
    domain_min
    domain_plus
    domain_times
    domain_minus
    domain_divby
  } = FD.Domain

  {
    propagator_is_solved
    propagator_create
    propagator_create_3x
  } = FD.Propagator

  {
    propagator_create_eq
    propagator_create_neq
    propagator_create_lt
    propagator_create_lte
    propagator_create_reified
    propagator_create_callback
    propagator_create_scale_mul
    propagator_create_scale_div
  } = FD.propagators

  {
    fdvar_clone
    fdvar_constrain
    fdvar_create
    fdvar_create_wide
    fdvar_is_solved
    fdvar_set_domain
  } = FD.Var


  throw_unless_overridden = ->
    throw new Error 'Space#get_value_distributor(); override me'


  # Duplicates the functionality of new Space(S) for readability.
  # Concept of a space that holds fdvars and propagators

  Space = FD.space = (get_value_distributor = throw_unless_overridden) ->
    @_class = 'space'

    # The FDVARS are all named and accessed by name.
    # When a space is cloned, the clone's fdvars objects
    # all have their __proto__ fields set to the parent's
    # fdvars object. This gets us copy on modify semantics.
    @vars = {}
    @var_names = []

    @_propagators = []

    # overridden from distribution/distribute... for now. and copied from parent space
    @get_value_distributor = get_value_distributor

    return

  Space::clone = () ->
    space = new FD.space @get_value_distributor

    parent_vars = @vars
    child_vars = space.vars
    child_var_names = space.var_names
    for var_name in @var_names
      child_vars[var_name] = fdvar_clone parent_vars[var_name]
      child_var_names.push var_name

    # Clone propagators that have not been solved yet into new space.
    # They will use @space so we'll need to update the clones with @.
    for p in @_propagators
      unless propagator_is_solved p
        space._propagators.push propagator_create space, p.target_var_names, p.stepper, p._name

    # D4:
    # - add ref to high level solver
    space.solver = @solver if @solver
    return space

  # @obsolete Keeping it for non-breaking-api sake

  Space::done = ->

  # A monotonically increasing class-global counter for unique temporary variable names.
  _temp_count = 1

  # Run all the propagators until stability point. Returns the number
  # of changes made or throws a 'fail' if any propagator failed.

  Space::propagate = ->
    changed = true # init (do-while)
    propagators = @_propagators
    while changed
      changed = false
      for propagator in propagators
        # step currently returns the nums of changes. but we will change that to 'change','nochange','fail' soon
        n = propagator.stepper()
        if n > 0
          changed = true
        else if n is REJECTED
          return false # solution impossible
    # console.log(JSON.stringify(this.solution()));
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
    for var_name in @var_names
      unless fdvar_is_solved vars[var_name]
        return false
    return true

  # Returns an object whose field names are the fdvar names
  # and whose values are the solved values. The space *must*
  # be already in a solved state for this to work.

  Space::solution = ->
    result = {}
    vars = @vars
    for var_name in @var_names
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
    value = undefined
    # Don't include the temporary variables in the "solution".
    # Temporary variables take the form of a numeric property
    # of the object, so we test for the var_name to be a number and
    # don't include those variables in the result.
    c = var_name[0]
    if c < '0' or c > '9'
      domain = vars[var_name].dom
      if domain.length is 0
        value = false
      else if domain_is_solved domain
        value = domain_min domain
      else
        value = domain
      result[var_name] = value

    return value

  # Utility to easily print out the state of variables in the space.
  # TOFIX: we should move this elsewhere so that we can more easily find usages of it. this is too implicit.

  Space::toString = ->
    return JSON.stringify @solution()

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

  Space::decl_value = (val) ->
    if val >= SUB and val <= SUP # also catches NaN cases
      return @decl_anon domain_create_value val
    throw new Error 'FD.space.konst: Value out of valid range'

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

  # Apply an operator func to var_left and var_right
  # Updates var_result to the intersection of the result and itself

  ring_prop_stepper = (propagator, op_func, var_left, var_right, var_result) ->
    begin_upid = var_left.vupid + var_right.vupid + var_result.vupid
    if begin_upid > propagator.last_upid
      d = (domain_intersection(op_func(var_left.dom, var_right.dom), var_result.dom))
      unless d.length
        return REJECTED
      fdvar_set_domain var_result, d
      propagator.last_upid = var_left.vupid + var_right.vupid + var_result.vupid
    return propagator.last_upid - begin_upid

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

  ring = (space, plusop, minusop, v1name, v2name, sumname) ->
    retval = space
    # If sumname is not specified, we need to create a anonymous
    # for the result and return the name of that anon variable.
    unless sumname
      sumname = space.decl_anon()
      retval = sumname

    ring_a = ->
      [_, v1, v2, sum] = @propdata
      return ring_prop_stepper @, plusop, v1, v2, sum

    ring_b = ->
      [_, v1, v2, sum] = @propdata
      return ring_prop_stepper @, minusop, sum, v2, v1

    ring_c = ->
      [_, v1, v2, sum] = @propdata
      return ring_prop_stepper @, minusop, sum, v1, v2

    a = propagator_create_3x space, v1name, v2name, sumname, ring_a, 'ring_a'
    b = propagator_create_3x space, v1name, v2name, sumname, ring_b, 'ring_b'
    c = propagator_create_3x space, v1name, v2name, sumname, ring_c, 'ring_c'

    space._propagators.push a, b, c

    return retval

  # Register one or more variables with specific names
  # Note: if you want to register multiple names call Space#decls instead

  Space::decl = (name_or_names, dom) ->
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
    @var_names.push var_name

    return @

  # Register multiple vars. If you supply a domain the domain will be cloned for each.

  Space::decls = (names, dom) ->
    # Recursively declare all variables in the structure given.
    for key, value of names
      @decl value, dom.slice 0
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
        positive_propagator = propagator_create_eq @, left_var_name, right_var_name
        negative_propagator = propagator_create_neq @, left_var_name, right_var_name

      when 'neq'
        positive_propagator = propagator_create_neq @, left_var_name, right_var_name
        negative_propagator = propagator_create_eq @, left_var_name, right_var_name

      when 'lt'
        positive_propagator = propagator_create_lt @, left_var_name, right_var_name
        negative_propagator = propagator_create_lte @, right_var_name, left_var_name

      when 'gt'
        positive_propagator = propagator_create_lt @, right_var_name, left_var_name
        negative_propagator = propagator_create_lte @, left_var_name, right_var_name

      when 'lte'
        positive_propagator = propagator_create_lte @, left_var_name, right_var_name
        negative_propagator = propagator_create_lt @, right_var_name, left_var_name

      when 'gte'
        positive_propagator = propagator_create_lte @, right_var_name, left_var_name
        negative_propagator = propagator_create_lt @, left_var_name, right_var_name

      else
        throw new Error 'FD.space.reified: Unsupported operator \'' + opname + '\''

    if bool_name
      r = fdvar_constrain @vars[bool_name], domain_create_bool()
      if r is REJECTED
        return REJECTED
    else
      bool_name = @decl_anon domain_create_bool()

    @_propagators.push propagator_create_reified @, left_var_name, right_var_name, bool_name, positive_propagator, negative_propagator, opname

    return bool_name

  Space::callback = (var_names, callback) ->
    @_propagators.push propagator_create_callback @, var_names, callback
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

    @_propagators.push propagator_create_eq @, v1name, v2name
    return

  # Less than propagator. See general propagator nores
  # for fdeq which also apply to this one.

  Space::lt = (v1name, v2name) ->
    @_propagators.push propagator_create_lt @, v1name, v2name
    return

  # Greater than propagator.

  Space::gt = (v1name, v2name) ->
    # _swap_ v1 and v2 because: a>b is b<=a
    @_propagators.push propagator_create_lte @, v2name, v1name
    return

  # Less than or equal to propagator.

  Space::lte = (v1name, v2name) ->
    @_propagators.push propagator_create_lte @, v1name, v2name
    return

  # Greater than or equal to.

  Space::gte = (v1name, v2name) ->
    # TODO: fix this as per https://github.com/srikumarks/FD.js/issues/6
    # _swap_ v1 and v2 because: a>=b is b<a
    @_propagators.push propagator_create_lte @, v2name, v1name
    return

  # Ensures that the two variables take on different values.

  Space::neq = (v1name, v2name) ->
    @_propagators.push propagator_create_neq @, v1name, v2name
    return

  # Takes an arbitrary number of FD variables and adds propagators that
  # ensure that they are pairwise distinct.

  Space::distinct = (vars) ->
    for var_i, i in vars
      for j in [0...i]
        @_propagators.push propagator_create_neq @, vars[i], vars[j]
    return

  # Bidirectional addition propagator.
  # Returns either @ or the anonymous var name if no sumname was given

  Space::plus = (v1name, v2name, sumname) ->
    return ring @, domain_plus, domain_minus, v1name, v2name, sumname

  # Bidirectional multiplication propagator.
  # Returns either @ or the anonymous var name if no sumname was given

  Space::times = (v1name, v2name, prodname) ->
    return ring @, domain_times, domain_divby, v1name, v2name, prodname

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
      throw new Error 'scale: negative factors not supported.'

    unless prodname
      prodname = @decl_anon()
      retval = prodname

    a = propagator_create_scale_mul @, vname, prodname
    b = propagator_create_scale_div @, vname, prodname
    @_propagators.push a, b

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
        throw new Error 'Space.sum: Nothing to sum!'

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
