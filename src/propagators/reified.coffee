module.exports = do ->

  {
    REJECTED
    SOMETHING_CHANGED
    ZERO_CHANGES

    ASSERT
    ASSERT_DOMAIN
  } = require '../helpers'

  {
    step_comparison
    step_would_reject
  } = require './stepper_comparison'

  {
    fdvar_set_value_inline
  } = require '../fdvar'

  PAIR_SIZE = 2

  # A boolean variable that represents whether a comparison
  # condition between two variables currently holds or not.

  propagator_reified_step_bare = (space, left_var_name, right_var_name, bool_name, op_name, inv_op_name) ->
    vars = space.vars
    fdvar1 = vars[left_var_name]
    fdvar2 = vars[right_var_name]
    bool_var = vars[bool_name]

    ASSERT bool_var.dom.length is PAIR_SIZE
    ASSERT_DOMAIN bool_var.dom

    [lo, hi] = bool_var.dom

    # bool_var can only shrink so we only need to check its current state
    if lo is 0 and step_would_reject inv_op_name, fdvar1, fdvar2
      if hi is 0
        return REJECTED
      fdvar_set_value_inline bool_var, 1
      return SOMETHING_CHANGED
    else if hi is 1 and step_would_reject op_name, fdvar1, fdvar2
      if lo is 1
        return REJECTED
      fdvar_set_value_inline bool_var, 0
      return SOMETHING_CHANGED
    else # bool_var is solved, enforce relevant op
      if lo is 1
        return step_comparison space, op_name, left_var_name, right_var_name
      if hi is 0
        return step_comparison space, inv_op_name, left_var_name, right_var_name

    ASSERT lo is 0 and hi is 1, 'bool_var remains undetermined, nothing happens right now'

    # artifacts; this way these lines are stripped for dist/perf. we want to cache the result for legibility
    ASSERT (op_reject = step_would_reject(op_name, fdvar1, fdvar2)) or true
    ASSERT (inv_op_reject = step_would_reject(inv_op_name, fdvar1, fdvar2)) or true
    # either the bool was undetermined and neither op rejected or the bool is solved and
    # still holds (we assume both ops cant reject at the same time). so no change.
    ASSERT lo is 1 or hi is 0 or (!op_reject and !inv_op_reject), 'if bool is [0,1] then neither op should reject'
    ASSERT lo is 0 or (!op_reject and inv_op_reject), 'if bool=1 then op_name should not reject'
    ASSERT hi is 1 or (op_reject and !inv_op_reject), 'if bool=0 then inv_op_name should not reject'

    return ZERO_CHANGES

  return {
    propagator_reified_step_bare
  }
