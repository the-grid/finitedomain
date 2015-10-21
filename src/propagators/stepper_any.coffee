module.exports = (FD) ->

  {
    ASSERT
    ASSERT_PROPAGATOR
  } = FD.helpers

  {
    mul_step_bare
    div_step_bare
    callback_step_bare
    reified_step_bare
    ring_step_bare
    lt_step_bare
    lte_step_bare
    eq_step_bare
    neq_step_bare
    step_comparison
  } = FD.propagators

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
    switch op_name
      when 'lt'
        [vn1, vn2] = prop_var_names
        return step_comparison space, op_name, vn1, vn2

      when 'lte'
        [vn1, vn2] = prop_var_names
        return step_comparison space, op_name, vn1, vn2

      when 'eq'
        [vn1, vn2] = prop_var_names
        return step_comparison space, op_name, vn1, vn2

      when 'neq'
        [vn1, vn2] = prop_var_names
        return step_comparison space, op_name, vn1, vn2

      when 'mul'
        vars = space.vars
        [vn1, vn2] = prop_var_names
        return mul_step_bare vars[vn1], vars[vn2]

      when 'div'
        vars = space.vars
        [vn1, vn2] = prop_var_names
        return div_step_bare vars[vn1], vars[vn2]

      when 'callback'
        return callback_step_bare space, prop_var_names, prop_datails[PROP_CALLBACK]

      when 'reified'
        return reified_step_bare space, prop_var_names[0], prop_var_names[1], prop_var_names[2], prop_datails[PROP_OP_NAME], prop_datails[PROP_NOP_NAME]

      when 'ring'
        vars = space.vars
        [vn1, vn2, vn3] = prop_var_names
        return ring_step_bare vars[vn1], vars[vn2], vars[vn3], prop_datails[PROP_OP_FUNC]

      else
        throw new Error 'unsupported propagator: [' + prop_datails + ']'

  FD.propagators.step_any = stepper_prop_step

  FD.propagators.PROP_NAME = PROP_NAME
  FD.propagators.PROP_VAR_NAMES = PROP_VAR_NAMES
  FD.propagators.PROP_OP_NAME = PROP_OP_NAME
  FD.propagators.PROP_NOP_NAME = PROP_NOP_NAME
  FD.propagators.PROP_CALLBACK = PROP_CALLBACK
  FD.propagators.PROP_OP_FUNC = PROP_OP_FUNC
