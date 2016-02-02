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
    domain_mul
  } = require '../domain'

  {
    propagator_callback_step_bare
  } = require './callback'
  {
    propagator_markov_step_bare
  } = require './markov'
  {
    propagator_reified_step_bare
  } = require './reified'
  {
    propagator_ring_step_bare
  } = require './ring'
  {
    propagator_step_comparison
  } = require './step_comparison'

  # BODY_START

  PROP_NAME = 0
  PROP_VAR_NAMES = 1
  PROP_OP_NAME = 2
  PROP_NOP_NAME = 3
  PROP_CALLBACK = 2
  PROP_OP_FUNC = 2

  propagator_step_any = (prop_datails, space) ->
    ASSERT_PROPAGATOR prop_datails
    ASSERT !!space, 'requires a space'

    return _propagator_step_any space, prop_datails[PROP_NAME], prop_datails[PROP_VAR_NAMES], prop_datails

  _propagator_step_any = (space, op_name, prop_var_names, prop_datails) ->
    [vn1, vn2] = prop_var_names

    ASSERT vn2 or op_name is 'markov' or op_name is 'callback', 'vn2 should exist for most props', prop_datails

    switch op_name
      when 'lt'
        return propagator_step_comparison space, op_name, vn1, vn2

      when 'lte'
        return propagator_step_comparison space, op_name, vn1, vn2

      when 'eq'
        return propagator_step_comparison space, op_name, vn1, vn2

      when 'neq'
        return propagator_step_comparison space, op_name, vn1, vn2

      when 'callback'
        return _propagator_cb space, prop_var_names, prop_datails

      when 'reified'
        return _propagator_reified space, vn1, vn2, prop_var_names, prop_datails

      when 'ring'
        return _propagator_ring space, vn1, vn2, prop_var_names, prop_datails

      when 'markov'
        return _propagator_markov space, vn1

      else
        THROW 'unsupported propagator: [' + prop_datails + ']'

    return

  _propagator_cb = (space, prop_var_names, prop_details) ->
    return propagator_callback_step_bare space, prop_var_names, prop_details[PROP_CALLBACK]

  _propagator_reified = (space, vn1, vn2, prop_var_names, prop_details) ->
    vn3 = prop_var_names[2]
    return propagator_reified_step_bare space, vn1, vn2, vn3, prop_details[PROP_OP_NAME], prop_details[PROP_NOP_NAME]

  _propagator_ring = (space, vn1, vn2, prop_var_names, prop_details) ->
    vars = space.vars
    vn3 = prop_var_names[2]
    op_name = prop_details[PROP_OP_FUNC]

    switch op_name
      when 'plus'
        return propagator_ring_step_bare vars[vn1], vars[vn2], vars[vn3], domain_plus
      when 'min'
        return propagator_ring_step_bare vars[vn1], vars[vn2], vars[vn3], domain_minus
      when 'mul'
        return propagator_ring_step_bare vars[vn1], vars[vn2], vars[vn3], domain_mul
      when 'div'
        return propagator_ring_step_bare vars[vn1], vars[vn2], vars[vn3], domain_divby
      else
        ASSERT false, 'UNKNOWN ring opname', op_name

    return

  _propagator_markov = (space, vn1) ->
    return propagator_markov_step_bare space, vn1

  # BODY_STOP

  return {
    PROP_NAME
    PROP_VAR_NAMES
    PROP_OP_NAME
    PROP_NOP_NAME
    PROP_CALLBACK
    PROP_OP_FUNC

    propagator_step_any
  }
