# this is somewhat of a hack because the propagators used in
# this file are also used by reified, but the step_all also
# wants to use the reified propagator itself, which would
# lead to a circular reference. So instead I've opted to split
# the two steppers into their own files so that this file
# can be included in reified.coffee while the other stepper
# is included in space.coffee, and requires this as well.

module.exports = do ->
  {
    THROW
  } = require '../helpers'

  {
    propagator_lt_step_would_reject
  } = require './lt'
  {
    propagator_lte_step_would_reject
  } = require './lte'
  {
    propagator_eq_step_would_reject
  } = require './eq'
  {
    propagator_neq_step_would_reject
  } = require './neq'
  {
    propagator_lt_step_bare
  } = require './lt'
  {
    propagator_lte_step_bare
  } = require './lte'
  {
    propagator_eq_step_bare
  } = require './eq'
  {
    propagator_neq_step_bare
  } = require './neq'

  # BODY_START

  propagator_step_comparison = (space, op_name, var_name_1, var_name_2) ->
    v1 = space.vars[var_name_1]
    v2 = space.vars[var_name_2]

    switch op_name
      when 'lt'
        return propagator_lt_step_bare v1, v2

      when 'lte'
        return propagator_lte_step_bare v1, v2

      when 'gt'
      # TOFIX: should go to lte
        return propagator_step_comparison space, 'lt', var_name_2, var_name_1

      when 'gte'
      # TOFIX: should go to lt
        return propagator_step_comparison space, 'lte', var_name_2, var_name_1

      when 'eq'
        return propagator_eq_step_bare v1, v2

      when 'neq'
        return propagator_neq_step_bare v1, v2

      else
        THROW 'unsupported propagator: [' + op_name + ']'

  # Do a fast dry run of one of the comparison propagators. Only returns
  # true when the step would result in REJECTED. Returns true otherwise.

  propagator_step_would_reject = (op_name, fdvar1, fdvar2) ->
    switch op_name
      when 'lt'
        return propagator_lt_step_would_reject fdvar1, fdvar2

      when 'lte'
        return propagator_lte_step_would_reject fdvar1, fdvar2

      when 'gt'
        # TOFIX: should go to lte
        return propagator_lt_step_would_reject fdvar2, fdvar1 # swapped vars!

      when 'gte'
        return propagator_lte_step_would_reject fdvar2, fdvar1 # swapped vars!

      when 'eq'
        return propagator_eq_step_would_reject fdvar1, fdvar2

      when 'neq'
        return propagator_neq_step_would_reject fdvar1, fdvar2

      else
        THROW 'stepper_step_read_only: unsupported propagator: [' + op_name + ']'
        return

  # BODY_STOP

  return {
    propagator_step_comparison
    propagator_step_would_reject
  }
