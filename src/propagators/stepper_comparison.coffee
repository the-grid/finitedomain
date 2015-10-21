# this is somewhat of a hack because the propagators used in
# this file are also used by reified, but the step_all also
# wants to use the reified propagator itself, which would
# lead to a circular reference. So instead I've opted to split
# the two steppers into their own files so that this file
# can be included in reified.coffee while the other stepper
# is included in space.coffee, and requires this as well.

module.exports = (FD) ->
  {
    lt_step_bare
    lte_step_bare
    eq_step_bare
    neq_step_bare
  } = FD.propagators

  stepper_step_comparison = (space, op_name, var_name_1, var_name_2) ->
    v1 = space.vars[var_name_1]
    v2 = space.vars[var_name_2]

    switch op_name
      when 'lt'
        return lt_step_bare v1, v2

      when 'lte'
        return lte_step_bare v1, v2

      when 'gt'
      # TOFIX: should go to lte
        return stepper_step_comparison space, 'lt', var_name_2, var_name_1

      when 'gte'
      # TOFIX: should go to lt
        return stepper_step_comparison space, 'lte', var_name_2, var_name_1

      when 'eq'
        return eq_step_bare v1, v2

      when 'neq'
        return neq_step_bare v1, v2

      else
        throw new Error 'unsupported propagator: [' + op_name + ']'

  FD.propagators.step_comparison = stepper_step_comparison
