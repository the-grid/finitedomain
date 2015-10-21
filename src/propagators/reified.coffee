module.exports = (FD) ->
  {
    REJECTED

    ASSERT
  } = FD.helpers

  {
    step_comparison
  } = FD.propagators

  {
    fdvar_set_value_inline
  } = FD.Var

  # A boolean variable that represents whether a comparison
  # condition between two variables currently holds or not.

  reified_step_bare = (space, left_var_name, right_var_name, bool_name, op_name, inv_op_name) ->
    vars = space.vars
    fdvar1 = vars[left_var_name]
    fdvar2 = vars[right_var_name]
    bool_var = vars[bool_name]

    current_upid = fdvar1.vupid + fdvar2.vupid + bool_var.vupid

    # assert domain is bool bound
    ASSERT bool_var.dom.length is 2
    ASSERT bool_var.dom[0] is 0 or bool_var.dom[0] is 1
    ASSERT bool_var.dom[1] is 0 or bool_var.dom[1] is 1
    ASSERT bool_var.dom[0] <= bool_var.dom[1]

    [lo, hi] = bool_var.dom

    if lo < hi
      # pos and neg cant both fail, they can both pass while lo<hi

      b1 = fdvar1.dom.slice 0 # TODO: add test that fails when these slices dont happen
      b2 = fdvar1.vupid
      b3 = fdvar2.dom.slice 0
      b4 = fdvar2.vupid

      if step_comparison(space, op_name, left_var_name, right_var_name) is REJECTED
        fdvar_set_value_inline bool_var, 0

      # TODO: is `else` proper here or should it just be `if`?
      else
        # must reset!
        fdvar1.dom = b1.slice 0 # must slice as well because inline changes may have happened. # TODO: add test that requires the slice here as well
        fdvar1.vupid = b2
        fdvar2.dom = b3.slice 0
        fdvar2.vupid = b4

        if step_comparison(space, inv_op_name, left_var_name, right_var_name) is REJECTED
          fdvar_set_value_inline bool_var, 1

      fdvar1.dom = b1
      fdvar1.vupid = b2
      fdvar2.dom = b3
      fdvar2.vupid = b4

    else if lo is 1
      # constraint should hold POS propagator. reject if this is no longer the case
      if step_comparison(space, op_name, left_var_name, right_var_name) is REJECTED
        return REJECTED

    else if hi is 0
      # constraint should hold NEG propagator. reject if this is no longer the case
      if step_comparison(space, inv_op_name, left_var_name, right_var_name) is REJECTED
        return REJECTED

    else
      ASSERT false, 'bool_var should have csis bool domain but doesnt?', bool_var

    new_upid = fdvar1.vupid + fdvar2.vupid + bool_var.vupid
    return new_upid - current_upid

  FD.propagators.reified_step_bare = reified_step_bare
