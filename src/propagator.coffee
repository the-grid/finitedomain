module.exports = (FD) ->

  {
    ASSERT
  } = FD.helpers

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
    [var_name_1, var_name_2, var_name_3] = target_var_names
    space_vars = space.vars

    return {
      _class: 'propagator'
      _name: name

      # store the names so we can clone the prop with a new space
      # callback props may also depend on target_var_names
      target_var_names

      stepper # the func to determine next value to test per step
      last_upid: -1 # cache control. usually v1+v2[+v3]
      solved: false

      from_space: space
      # cache first three var lookups, that's the most common case
      # if you want others you will have to do the lookup from the target_var_names array
      fdvar1: space_vars[var_name_1]
      fdvar2: space_vars[var_name_2]
      fdvar3: space_vars[var_name_3] # only some props use this, like reified

      var_state_stack: undefined # for reified, to temporarily store state when "trying"
    }

  # A propagator is solved if all the target_var_names it affects and
  # depends on have domains of size = 1.

  propagator_is_solved = (p) ->
    if p.solved
      return true
    unless fdvar_is_solved p.fdvar1
      return false
    unless fdvar_is_solved p.fdvar2
      return false
    if p.fdvar3
      unless fdvar_is_solved p.fdvar3
        return false
    return true

  propagator_push_vars = (propagator) ->
    stash = [
      propagator.fdvar1.dom.slice 0 # TODO: add test that fails when these slices dont happen
      propagator.fdvar1.vupid
      propagator.fdvar2.dom.slice 0
      propagator.fdvar2.vupid
      propagator.fdvar3?.dom?.slice 0
      propagator.fdvar3?.vupid
      propagator.last_upid
      propagator.stepper
    ]

    var_state_stack = propagator.var_state_stack
    if var_state_stack
      var_state_stack.push stash
    else
      var_state_stack = propagator.var_state_stack = [stash]

    return

  propagator_pop_vars = (propagator) ->
    [
      propagator.fdvar1.dom,
      propagator.fdvar1.vupid,
      propagator.fdvar2.dom,
      propagator.fdvar2.vupid,
      propagator.fdvar3?.dom,
      propagator.fdvar3?.vupid,
      propagator.last_upid,
      propagator.stepper,
    ] = propagator.var_state_stack.pop()

    return

  FD.Propagator = {
    propagator_create
    propagator_create_2x
    propagator_create_3x
    propagator_is_solved
    propagator_pop_vars
    propagator_push_vars
  }
