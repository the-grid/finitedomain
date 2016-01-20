module.exports = do ->

  {
    ASSERT
    ASSERT_PROPAGATOR
    THROW
  } = require '../helpers'

  {
    domain_divby
    domain_minus
    domain_plus
    domain_times
  } = require '../domain'

  {
    mul_step_bare
  } = require './scale_mul'
  {
    div_step_bare
  } = require './scale_div'
  {
    callback_step_bare
  } = require './callback'
  {
    markov_step_bare
  } = require './markov'
  {
    reified_step_bare
  } = require './reified'
  {
    ring_step_bare
  } = require './ring'
  {
    step_comparison
  } = require './stepper_comparison'

  PROP_NAME = 0
  PROP_VAR_NAMES = 1
  PROP_OP_NAME = 2
  PROP_NOP_NAME = 3
  PROP_CALLBACK = 2
  PROP_OP_FUNC = 2

  stepper_prop_step = (prop_datails, space) ->
    ASSERT_PROPAGATOR prop_datails
    ASSERT !!space, 'requires a space'

    return stepper_step_any space, prop_datails[PROP_NAME], prop_datails[PROP_VAR_NAMES], prop_datails

  stepper_step_any = (space, op_name, prop_var_names, prop_datails) ->
    [vn1, vn2] = prop_var_names
    switch op_name
      when 'lt'
        return step_comparison space, op_name, vn1, vn2

      when 'lte'
        return step_comparison space, op_name, vn1, vn2

      when 'eq'
        return step_comparison space, op_name, vn1, vn2

      when 'neq'
        return step_comparison space, op_name, vn1, vn2

      when 'mul'
        return _mul space, vn1, vn2

      when 'div'
        return _div space, vn1, vn2

      when 'callback'
        return _cb space, prop_var_names, prop_datails

      when 'reified'
        return _reified space, vn1, vn2, prop_var_names, prop_datails

      when 'ring'
        return _ring space, vn1, vn2, prop_var_names, prop_datails

      when 'markov'
        return _markov space, vn1

      else
        THROW 'unsupported propagator: [' + prop_datails + ']'

    return

  _mul = (space, vn1, vn2) ->
    vars = space.vars
    return mul_step_bare vars[vn1], vars[vn2]

  _div = (space, vn1, vn2) ->
    vars = space.vars
    return div_step_bare vars[vn1], vars[vn2]

  _cb = (space, prop_var_names, prop_details) ->
    return callback_step_bare space, prop_var_names, prop_details[PROP_CALLBACK]

  _reified = (space, vn1, vn2, prop_var_names, prop_details) ->
    vn3 = prop_var_names[2]
    return reified_step_bare space, vn1, vn2, vn3, prop_details[PROP_OP_NAME], prop_details[PROP_NOP_NAME]

  _ring = (space, vn1, vn2, prop_var_names, prop_details) ->
    vars = space.vars
    vn3 = prop_var_names[2]
    op_name = prop_details[PROP_OP_FUNC]

    switch op_name
      when 'plus'
        return ring_step_bare vars[vn1], vars[vn2], vars[vn3], domain_plus
      when 'min'
        return ring_step_bare vars[vn1], vars[vn2], vars[vn3], domain_minus
      when 'mul'
        return ring_step_bare vars[vn1], vars[vn2], vars[vn3], domain_times
      when 'div'
        return ring_step_bare vars[vn1], vars[vn2], vars[vn3], domain_divby
      else
        ASSERT false, 'UNKNOWN ring opname', op_name

    return

  _markov = (space, vn1) ->
    return markov_step_bare space, vn1

  return {
    PROP_NAME
    PROP_VAR_NAMES
    PROP_OP_NAME
    PROP_NOP_NAME
    PROP_CALLBACK
    PROP_OP_FUNC

    stepper_prop_step
  }
