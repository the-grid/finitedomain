module.exports = do ->

  {
    REJECTED

    ASSERT
    ASSERT_PROPAGATORS
    THROW
  } = require './helpers'

  {
    domain_create_bool
  } = require './domain'

  {
    fdvar_constrain
  } = require './fdvar'

  {
    space_add_var
  } = require './space'

  # BODY_START

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

  propagator_add_reified = (space, opname, left_var_name, right_var_name, bool_name) ->
    ASSERT space._class is 'space'
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

    ASSERT space.vars[left_var_name], 'var should exist'
    ASSERT space.vars[right_var_name], 'var should exist'
    ASSERT space.vars[bool_name], 'var should exist'

    space._propagators.push ['reified', [left_var_name, right_var_name, bool_name], opname, nopname]
    ASSERT_PROPAGATORS space._propagators
    return bool_name

  propagator_add_callback = (space, var_names, callback) ->
    ASSERT space._class is 'space'
    space._propagators.push ['callback', var_names, callback]
    ASSERT_PROPAGATORS space._propagators
    return

  # Domain equality propagator. Creates the propagator
  # in this space. The specified variables need not
  # exist at the time the propagator is created and
  # added, since the fdvars are all referenced by name.
  # if `v2name` is a number, an anonymous var is created
  # for that value so you can do `propagator_add_eq(space, 'A', 1)`
  # TOFIX: deprecate the "functional" syntax for sake of simplicity. Was part of original lib. Silliness.

  propagator_add_eq = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
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

  propagator_add_lt = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
    space._propagators.push ['lt', [v1name, v2name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Greater than propagator.

  propagator_add_gt = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
    # _swap_ v1 and v2 because: a>b is b<a
    space._propagators.push ['lt', [v2name, v1name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Less than or equal to propagator.

  propagator_add_lte = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
    space._propagators.push ['lte', [v1name, v2name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Greater than or equal to.

  propagator_add_gte = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
    # _swap_ v1 and v2 because: a>b is b<a
    space._propagators.push ['lte', [v2name, v1name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Ensures that the two variables take on different values.

  propagator_add_neq = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
    space._propagators.push ['neq', [v1name, v2name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # Takes an arbitrary number of FD variables and adds propagators that
  # ensure that they are pairwise distinct.

  propagator_add_distinct = (space, var_names) ->
    ASSERT space._class is 'space'
    for var_name_i, i in var_names
      for j in [0...i]
        propagator_add_neq space, var_name_i, var_names[j]
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

  _propagator_add_plus_or_times = (space, target_op_name, inv_op_name, v1name, v2name, sumname) ->
    ASSERT space._class is 'space'
    retval = space
    # If sumname is not specified, we need to create a anonymous
    # for the result and return the name of that anon variable.
    unless sumname
      sumname = space_add_var space
      retval = sumname

    _propagator_add_ring space, v1name, v2name, sumname, target_op_name
    _propagator_add_ring space, sumname, v2name, v1name, inv_op_name
    _propagator_add_ring space, sumname, v1name, v2name, inv_op_name

    return retval

  _propagator_add_ring = (space, A, B, C, op) ->
    ASSERT space._class is 'space'
    space._propagators.push ['ring', [A, B, C], op]
    ASSERT_PROPAGATORS space._propagators
    return

  # Bidirectional addition propagator.
  # Returns either space or the anonymous var name if no sumname was given

  propagator_add_plus = (space, v1name, v2name, sumname) ->
    ASSERT space._class is 'space'
    return _propagator_add_plus_or_times space, 'plus', 'min', v1name, v2name, sumname

  # Bidirectional multiplication propagator.
  # Returns either space or the anonymous var name if no sumname was given

  propagator_add_times = (space, v1name, v2name, prodname) ->
    ASSERT space._class is 'space'
    return _propagator_add_plus_or_times space, 'mul', 'div', v1name, v2name, prodname

  # factor = constant number (not an fdvar)
  # vname is an fdvar name
  # prodname is an fdvar name, optional
  #
  # factor * v = prod

  propagator_add_scale = (space, factor, vname, prodname) ->
    ASSERT space._class is 'space'
    if factor is 1
      return propagator_add_eq space, vname, prodname

    if factor is 0
      return propagator_add_eq space, space_add_var(space, 0), prodname

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

  propagator_add_times_plus = (space, k1, v1name, k2, v2name, resultname) ->
    ASSERT space._class is 'space'
    A = propagator_add_scale space, k1, v1name
    B = propagator_add_scale space, k2, v2name
    return propagator_add_plus space, A, B, resultname

  # Sum of N fdvars = resultFDVar
  # Creates as many anonymous vars as necessary.
  # Returns either space or the anonymous var name if no sumname was given

  propagator_add_sum = (space, vars, result_var_name) ->
    ASSERT space._class is 'space'
    retval = space

    unless result_var_name
      result_var_name = space_add_var space
      retval = result_var_name

    switch vars.length
      when 0
        THROW 'propagator_add_sum: Nothing to sum!'

      when 1
        propagator_add_eq space, vars[0], result_var_name

      when 2
        propagator_add_plus space, vars[0], vars[1], result_var_name

      else # "divide and conquer" ugh. feels like there is a better way to do this
        n = Math.floor vars.length / 2
        if n > 1
          t1 = space_add_var space
          propagator_add_sum space, vars.slice(0, n), t1
        else
          t1 = vars[0]

        t2 = space_add_var space

        propagator_add_sum space, vars.slice(n), t2
        propagator_add_plus space, t1, t2, result_var_name

    return retval

  # Product of N fdvars = resultFDvar.
  # Create as many anonymous vars as necessary.

  propagator_add_product = (space, vars, result_var_name) ->
    ASSERT space._class is 'space'
    retval = space

    unless result_var_name
      result_var_name = space_add_var space
      retval = result_var_name

    switch vars.length
      when 0
        return retval

      when 1
        propagator_add_eq space, vars[0], result_var_name

      when 2
        propagator_add_times space, vars[0], vars[1], result_var_name

      else
        n = Math.floor vars.length / 2
        if n > 1
          t1 = space_add_var space
          propagator_add_product space, vars.slice(0, n), t1
        else
          t1 = vars[0]
        t2 = space_add_var space

        propagator_add_product space, vars.slice(n), t2
        propagator_add_times space, t1, t2, result_var_name

    return retval

  # Weighted sum of fdvars where the weights are constants.

  propagator_add_wsum = (space, kweights, vars, result_name) ->
    ASSERT space._class is 'space'
    anons = []
    for var_i, i in vars
      t = space_add_var space
      propagator_add_scale space, kweights[i], var_i, t
      anons.push t
    propagator_add_sum space, anons, result_name
    return

  propagator_add_markov = (space, var_name) ->
    ASSERT space._class is 'space'
    space._propagators.push ['markov', [var_name]]
    ASSERT_PROPAGATORS space._propagators
    return

  # BODY_STOP

  return {
    propagator_add_callback
    propagator_add_distinct
    propagator_add_eq
    propagator_add_gt
    propagator_add_gte
    propagator_add_lt
    propagator_add_lte
    propagator_add_markov
    propagator_add_neq
    propagator_add_plus
    propagator_add_product
    propagator_add_reified
    propagator_add_scale
    propagator_add_sum
    propagator_add_times
    propagator_add_times_plus
    propagator_add_wsum
  }
