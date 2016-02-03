# this is somewhat of a hack because the propagators used in
# this file are also used by reified, but the step_all also
# wants to use the reified propagator itself, which would
# lead to a circular reference. So instead I've opted to split
# the two steppers into their own files so that this file
# can be included in reified.coffee while the other stepper
# is included in space.coffee, and requires this as well.

module.exports = do ->

  {
    ASSERT
  } = require '../helpers'

  {
    propagator_lt_solved
  } = require './lt'

  {
    propagator_lte_solved
  } = require './lte'

  {
    propagator_eq_solved
  } = require './eq'

  {
    propagator_neq_solved
  } = require './neq'

  {
    fdvar_is_solved
    fdvar_lower_bound
    fdvar_upper_bound
  } = require '../fdvar'

  # BODY_START

  propagator_is_solved = (vars, propagator) ->
    op_name = propagator[0]
    v1 = vars[propagator[1][0]]
    v2 = vars[propagator[1][1]]

    switch op_name
      when 'reified'
        # once a bool_var resolves its owner reified prop resolves when
        # the original op or inv op (depending on bool_var) resolves
        var_name_3 = propagator[1][2]
        v3 = vars[var_name_3]
        unless fdvar_is_solved v3
          return false
        if fdvar_lower_bound(v3) is 1
          return _propagator_comparison_is_solved propagator[2], v1, v2
        ASSERT fdvar_upper_bound(v3) is 0, 'if bool_var is solved and lower is not 1 then upper should be 0', v3
        return _propagator_comparison_is_solved propagator[3], v1, v2

      when 'ring'
        if fdvar_is_solved(v1) and fdvar_is_solved(v2)
          ASSERT !propagator[1][2] or fdvar_is_solved(vars[propagator[1][2]]), 'ring and reified should solve their bool_var immediately after operand vars become solved'
          return true
        return false

      when 'callback'
        # callback is more like a spy; never ditch it. I think.
        # (maybe we do want to ditch it if its argument vars are solved?)
        return false

      when 'markov'
        # markov doesnt reduce the domain, only validates (in the propagator, not here)
        return false

      # TOFIX: we may be able to come up with a fast algorithm to validate div and mul
      when 'min'
        return false
      when 'div'
        return false
      when 'mul'
        return false

      else
        return _propagator_comparison_is_solved op_name, v1, v2

  _propagator_comparison_is_solved = (op, v1, v2) ->
    switch op
      when 'lt'
        return propagator_lt_solved v1, v2

      when 'lte'
        return propagator_lte_solved v1, v2

      when 'gt'
        return propagator_lt_solved v2, v1

      when 'gte'
        return propagator_lte_solved v2, v1

      when 'eq'
        return propagator_eq_solved v1, v2

      when 'neq'
        return propagator_neq_solved v1, v2

      else
        ASSERT false, 'unknown comparison op', op

  # BODY_STOP

  return {
    propagator_is_solved
  }

