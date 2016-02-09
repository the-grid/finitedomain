module.exports = do ->

  {
    REJECTED

    ASSERT
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
    space_add_propagator
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
    ASSERT typeof left_var_name is 'string' or typeof left_var_name is 'number', 'expecting left_var_name', left_var_name
    ASSERT typeof right_var_name is 'string' or typeof right_var_name is 'number', 'expecting right_var_name', right_var_name
    ASSERT typeof bool_name is 'string' or typeof bool_name is 'number' or typeof bool_name is 'undefined', 'expecting bool_name to be string, number, or undefined', bool_name

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

    if !bool_name
      bool_name = space_add_var space, 0, 1
    # TOFIX: trigger this check later somehow. it's not super relevant, mostly a safety procedure
    #else if fdvar_constrain(space.vars[bool_name], domain_create_bool()) is REJECTED
    #  THROW 'boolean var should start with a domain containing zero, one, or both'

    if typeof left_var_name is 'number'
      left_var_name = space_add_var space, left_var_name
      if typeof right_var_name is 'number'
        THROW 'must pass in at least one var name'
    else if typeof right_var_name is 'number'
      right_var_name = space_add_var space, right_var_name
      if typeof left_var_name is 'number'
        THROW 'must pass in at least one var name'

    space_add_propagator space, ['reified', [left_var_name, right_var_name, bool_name], opname, nopname]
    return bool_name

  propagator_add_callback = (space, var_names, callback) ->
    ASSERT space._class is 'space'
    space_add_propagator space, ['callback', var_names, callback]
    return

  # Domain equality propagator. Creates the propagator
  # in given space.
  # Can pass in vars or numbers that become anonymous
  # vars. Must at least pass in one var because the
  # propagator would be useless otherwise.

  propagator_add_eq = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
    ASSERT typeof v1name is 'string' or typeof v1name is 'number', 'expecting var name 1', v1name
    ASSERT typeof v2name is 'string' or typeof v2name is 'number', 'expecting var name 2', v2name

    if typeof v1name is 'number'
      v1name = space_add_var space, v1name
      if typeof v2name is 'number'
        THROW 'must pass in at least one var name'
    else if typeof v2name is 'number'
      t = space_add_var space, v2name
      # swap such that v1 is the solved var. order is irrelevant to eq itself.
      v2name = v1name
      v1name = t
      if typeof v2name is 'number'
        THROW 'must pass in at least one var name'

    space_add_propagator space, ['eq', [v1name, v2name]]
    # return either operand var. this allows you to chain eqs -> .eq(.eq(A, B), C)
    # doesnt really matter which operand since they should be equal
    # (though you should probably try to make v1 solved the fastest)
    return v1name

  # Less than propagator. See general propagator nores
  # for fdeq which also apply to this one.

  propagator_add_lt = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
    ASSERT typeof v1name is 'string' or typeof v1name is 'number', 'expecting var name 1', v1name
    ASSERT typeof v2name is 'string' or typeof v2name is 'number', 'expecting var name 2', v2name

    if typeof v1name is 'number'
      v1name = space_add_var space, v1name
      if typeof v2name is 'number'
        THROW 'must pass in at least one var name'
    else if typeof v2name is 'number'
      v2name = space_add_var space, v2name
      if typeof v1name is 'number'
        THROW 'must pass in at least one var name'

    space_add_propagator space, ['lt', [v1name, v2name]]
    return

  # Greater than propagator.

  propagator_add_gt = (space, v1name, v2name) ->
    # _swap_ v1 and v2 because: a>b is b<a
    propagator_add_lt space, v2name, v1name
    return

  # Less than or equal to propagator.

  propagator_add_lte = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
    ASSERT typeof v1name is 'string' or typeof v1name is 'number', 'expecting var name 1', v1name
    ASSERT typeof v2name is 'string' or typeof v2name is 'number', 'expecting var name 2', v2name

    if typeof v1name is 'number'
      v1name = space_add_var space, v1name
      if typeof v2name is 'number'
        THROW 'must pass in at least one var name'
    else if typeof v2name is 'number'
      v2name = space_add_var space, v2name
      if typeof v1name is 'number'
        THROW 'must pass in at least one var name'

    space_add_propagator space, ['lte', [v1name, v2name]]
    return

  propagator_add_mul = (space, v1name, v2name, result_name) ->
    ASSERT space._class is 'space'
    ASSERT typeof v1name is 'string' or typeof v1name is 'number', 'expecting var name 1', v1name
    ASSERT typeof v2name is 'string' or typeof v2name is 'number', 'expecting var name 2', v2name

    if typeof result_name is 'undefined'
      result_name = space_add_var space
    else if typeof result_name is 'number'
      result_name = space_add_var space, result_name
    else if typeof result_name isnt 'string'
      THROW 'expecting result_name to be absent or a number or string: `'+result_name+'`'

    if typeof v1name is 'number'
      v1name = space_add_var space, v1name
      if typeof v2name is 'number'
        THROW 'must pass in at least one var name'
    else if typeof v2name is 'number'
      v2name = space_add_var space, v2name
      if typeof v1name is 'number'
        THROW 'must pass in at least one var name'

    space_add_propagator space, ['mul', [v1name, v2name, result_name]]
    return result_name

  propagator_add_div = (space, v1name, v2name, result_name) ->
    ASSERT space._class is 'space'
    ASSERT typeof v1name is 'string' or typeof v1name is 'number', 'expecting var name 1', v1name
    ASSERT typeof v2name is 'string' or typeof v2name is 'number', 'expecting var name 2', v2name

    if typeof result_name is 'undefined'
      result_name = space_add_var space
    else if typeof result_name is 'number'
      result_name = space_add_var space, result_name
    else if typeof result_name isnt 'string'
      THROW 'expecting result_name to be absent or a number or string: `'+result_name+'`'

    if typeof v1name is 'number'
      v1name = space_add_var space, v1name
      if typeof v2name is 'number'
        THROW 'must pass in at least one var name'
    else if typeof v2name is 'number'
      v2name = space_add_var space, v2name
      if typeof v1name is 'number'
        THROW 'must pass in at least one var name'

    space_add_propagator space, ['div', [v1name, v2name, result_name]]
    return result_name

  # Greater than or equal to.

  propagator_add_gte = (space, v1name, v2name) ->
    # _swap_ v1 and v2 because: a>=b is b<=a
    propagator_add_lte space, v2name, v1name
    return

  # Ensures that the two variables take on different values.

  propagator_add_neq = (space, v1name, v2name) ->
    ASSERT space._class is 'space'
    ASSERT typeof v1name is 'string' or typeof v1name is 'number', 'expecting var name 1', v1name
    ASSERT typeof v2name is 'string' or typeof v2name is 'number', 'expecting var name 2', v2name

    if typeof v1name is 'number'
      v1name = space_add_var space, v1name
      if typeof v2name is 'number'
        THROW 'must pass in at least one var name'
    else if typeof v2name is 'number'
      v2name = space_add_var space, v2name
      if typeof v1name is 'number'
        THROW 'must pass in at least one var name'

    space_add_propagator space, ['neq', [v1name, v2name]]
    return

  # Takes an arbitrary number of FD variables and adds propagators that
  # ensure that they are pairwise distinct.

  propagator_add_distinct = (space, var_names) ->
    ASSERT space._class is 'space'
    for var_name_i, i in var_names
      for j in [0...i]
        propagator_add_neq space, var_name_i, var_names[j]
    return

  _propagator_add_ring_plus_or_mul = (space, target_op_name, inv_op_name, v1name, v2name, sumname) ->
    ASSERT space._class is 'space'
    ASSERT typeof v1name is 'string' or typeof v1name is 'number', 'expecting var name 1', v1name
    ASSERT typeof v2name is 'string' or typeof v2name is 'number', 'expecting var name 2', v2name
    ASSERT typeof sumname is 'string' or typeof sumname is 'number' or typeof sumname is 'undefined', 'expecting sumname to be number, string, or undefined', sumname

    if typeof v1name is 'number'
      v1name = space_add_var space, v1name
      if typeof v2name is 'number'
        THROW 'must pass in at least one var name'
    else if typeof v2name is 'number'
      v2name = space_add_var space, v2name
      if typeof v1name is 'number'
        THROW 'must pass in at least one var name'

    if typeof sumname is 'undefined'
      sumname = space_add_var space
    else if typeof sumname is 'number'
      sumname = space_add_var space, sumname
    else if typeof sumname isnt 'string'
      THROW 'expecting sumname to be absent or a number or string: `'+sumname+'`'

    _propagator_add_ring space, v1name, v2name, sumname, target_op_name
    _propagator_add_ring space, sumname, v2name, v1name, inv_op_name
    _propagator_add_ring space, sumname, v1name, v2name, inv_op_name

    return sumname

  _propagator_add_ring = (space, A, B, C, op) ->
    ASSERT space._class is 'space'
    ASSERT typeof A is 'string', 'number/undefined vars should be handled by caller'
    ASSERT typeof B is 'string', 'number/undefined vars should be handled by caller'
    ASSERT typeof C is 'string', 'number/undefined vars should be handled by caller'
    space_add_propagator space, ['ring', [A, B, C], op]
    return

  # Bidirectional addition propagator.
  # Returns either space or the anonymous var name if no sumname was given

  propagator_add_plus = (space, v1name, v2name, sumname) ->
    ASSERT space._class is 'space'
    return _propagator_add_ring_plus_or_mul space, 'plus', 'min', v1name, v2name, sumname

  propagator_add_min = (space, v1name, v2name, result_var) ->
    ASSERT space._class is 'space'
    ASSERT typeof v1name is 'string' or typeof v1name is 'number', 'expecting var name 1', v1name
    ASSERT typeof v2name is 'string' or typeof v2name is 'number', 'expecting var name 2', v2name
    ASSERT typeof result_var is 'string' or typeof result_var is 'number' or typeof result_var is 'undefined', 'expecting result_var to be number, string, or undefined', result_var

    if typeof v1name is 'number'
      v1name = space_add_var space, v1name
      if typeof v2name is 'number'
        THROW 'must pass in at least one var name'
    else if typeof v2name is 'number'
      v2name = space_add_var space, v2name
      if typeof v1name is 'number'
        THROW 'must pass in at least one var name'

    if typeof result_var is 'undefined'
      result_var = space_add_var space
    else if typeof result_var is 'number'
      result_var = space_add_var space, result_var
    else if typeof result_var isnt 'string'
      THROW 'expecting result_var to be absent or a number or string: `'+result_var+'`'

    space_add_propagator space, ['min', [v1name, v2name, result_var]]
    return result_var

  # Bidirectional multiplication propagator.
  # Returns either space or the anonymous var name if no sumname was given

  propagator_add_ring_mul = (space, v1name, v2name, prodname) ->
    ASSERT space._class is 'space'
    return _propagator_add_ring_plus_or_mul space, 'mul', 'div', v1name, v2name, prodname

  # Sum of N fdvars = resultFDVar
  # Creates as many anonymous vars as necessary.
  # Returns either space or the anonymous var name if no sumname was given

  propagator_add_sum = (space, vars, result_var_name) ->
    ASSERT space._class is 'space'
    ASSERT vars instanceof Array, 'vars should be an array of var names', vars

    unless result_var_name
      result_var_name = space_add_var space

    len = vars.length
    switch len
      when 0
        THROW 'propagator_add_sum: Nothing to sum!'

      when 1
        propagator_add_eq space, vars[0], result_var_name

      when 2
        propagator_add_plus space, vars[0], vars[1], result_var_name

      else # "divide and conquer" ugh. feels like there is a better way to do this
        ASSERT len > 2, 'expecting at least 3 elements in the list...', vars

        n = Math.floor vars.length / 2
        if n > 1
          t1 = space_add_var space
          propagator_add_sum space, vars.slice(0, n), t1
        else
          t1 = vars[0]

        t2 = space_add_var space

        propagator_add_sum space, vars.slice(n), t2
        propagator_add_plus space, t1, t2, result_var_name

    return result_var_name

  # Product of N fdvars = resultFDvar.
  # Create as many anonymous vars as necessary.

  propagator_add_product = (space, vars, result_var_name) ->
    ASSERT space._class is 'space'

    unless result_var_name
      result_var_name = space_add_var space

    switch vars.length
      when 0
        return retval

      when 1
        propagator_add_eq space, vars[0], result_var_name

      when 2
        propagator_add_ring_mul space, vars[0], vars[1], result_var_name

      else
        n = Math.floor vars.length / 2
        if n > 1
          t1 = space_add_var space
          propagator_add_product space, vars.slice(0, n), t1
        else
          t1 = vars[0]
        t2 = space_add_var space

        propagator_add_product space, vars.slice(n), t2
        propagator_add_ring_mul space, t1, t2, result_var_name

    return result_var_name

  propagator_add_markov = (space, var_name) ->
    ASSERT space._class is 'space'
    ASSERT typeof var_name is 'string'
    space_add_propagator space, ['markov', [var_name]]
    return

  # BODY_STOP

  return {
    propagator_add_callback
    propagator_add_distinct
    propagator_add_div
    propagator_add_eq
    propagator_add_gt
    propagator_add_gte
    propagator_add_lt
    propagator_add_lte
    propagator_add_markov
    propagator_add_mul
    propagator_add_neq
    propagator_add_plus
    propagator_add_min
    propagator_add_product
    propagator_add_reified
    propagator_add_ring_mul
    propagator_add_sum

    # for testing
    _propagator_add_ring_plus_or_mul
  }
