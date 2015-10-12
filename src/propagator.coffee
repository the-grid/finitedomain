module.exports = (FD) ->

  {
    fdvar_is_solved
  } = FD.Var

  # Create propagator with 2 vars

  propagator_create_2x = (space, var_name_a, var_name_b, stepper, name) ->
    return propagator_create space, [var_name_a, var_name_b], stepper, name

  # Create propagator with 3 vars

  propagator_create_3x = (space, var_name_a, var_name_b, var_name_c, stepper, name) ->
    return propagator_create space, [var_name_a, var_name_b, var_name_c], stepper, name

  # Create propagator with an unknown number of vars

  propagator_create = (space, target_var_names, stepper, name) ->
    space_vars = space.vars
    propdata = [space]
    for pvar in target_var_names
      propdata.push space_vars[pvar]

    return {
      _class: 'propagator'
      _name: name

      target_var_names
      stepper
      last_upid: -1 # cache control

      propdata: propdata # this used to be `.space`
      from_space: space

      old_stepper: undefined # object footprint optimization. Used by reified.
    }

  # A propagator is solved if all the target_var_names it affects and
  # depends on have domains of size = 1.

  propagator_is_solved = (p) ->
    unless p.solved
      for fdvar, i in p.propdata
        if i > 0
          unless fdvar_is_solved fdvar
            return false
    return true

  FD.Propagator = {
    propagator_create
    propagator_create_2x
    propagator_create_3x
    propagator_is_solved
  }
