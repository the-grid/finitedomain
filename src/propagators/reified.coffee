module.exports = (FD) ->
  {
    ZERO_CHANGES

    ASSERT
  } = FD.helpers

  {
    step_comparison
    step_would_reject
  } = FD.propagators

  {
    fdvar_set_value_inline
  } = FD.Var

  PAIR_SIZE = 2
  ONE_CHANGE = 1

  # A boolean variable that represents whether a comparison
  # condition between two variables currently holds or not.

  reified_step_bare = (space, left_var_name, right_var_name, bool_name, op_name, inv_op_name) ->
    vars = space.vars
    fdvar1 = vars[left_var_name]
    fdvar2 = vars[right_var_name]
    bool_var = vars[bool_name]

    # assert domain is bool bound
    ASSERT bool_var.dom.length is PAIR_SIZE
    ASSERT bool_var.dom[0] is 0 or bool_var.dom[0] is 1
    ASSERT bool_var.dom[1] is 0 or bool_var.dom[1] is 1
    ASSERT bool_var.dom[0] <= bool_var.dom[1]

    [lo, hi] = bool_var.dom

    # If the bool is unsolved, check the op and inv of the op to see whether
    # we can decide it now. If that's the case, decide it immediately.
    if lo < hi
      if step_would_reject op_name, fdvar1, fdvar2
        fdvar_set_value_inline bool_var, 0
        return ONE_CHANGE

      if step_would_reject inv_op_name, fdvar1, fdvar2
        fdvar_set_value_inline bool_var, 1
        return ONE_CHANGE

      return ZERO_CHANGES

    # If the bool is solved, force the left+right vars accordingly
    # Note that the bool may (and in some test cases will) be updated
    # outside of this function!
    if lo is 1
      ASSERT hi is 1, 'domain should be csis boolean so if lo is 1, hi must be 1', bool_var
      return step_comparison space, op_name, left_var_name, right_var_name

    ASSERT hi is 0, 'since bool_var is bool, hi and lo must be 0 now...', bool_var
    ASSERT lo is 0, 'domain should be csis boolean so if hi is 0, lo must be 0', bool_var
    return step_comparison space, inv_op_name, left_var_name, right_var_name

  FD.propagators.reified_step_bare = reified_step_bare
