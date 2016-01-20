module.exports = do ->

  {
    ASSERT_DOMAIN_EMPTY_CHECK
  } = require '../helpers'

  {
    domain_shares_no_elements
  } = require '../domain'

  {
    fdvar_force_eq_inline
    fdvar_is_solved
  } = require '../fdvar'

  # This eq propagator looks a lot different from neq because in
  # eq we can prune early all values that are not covered by both.
  # Any value that is not covered by both can not be a valid solution
  # that holds this constraint. In neq that's different and we can
  # only start pruning once at least one var has a solution.
  # Basically eq is much more efficient compared to neq because we
  # can potentially skip a lot of values early.

  propagator_eq_step_bare = (fdvar1, fdvar2) ->
    return fdvar_force_eq_inline fdvar1, fdvar2

  # The eq step would reject if there all elements in one domain
  # do not occur in the other domain. Because then there's no
  # valid option to make sure A=B holds. So search for such value
  # or return false.
  # Read only check

  propagator_eq_step_would_reject = (fdvar1, fdvar2) ->
    dom1 = fdvar1.dom
    dom2 = fdvar2.dom

    ASSERT_DOMAIN_EMPTY_CHECK dom1
    ASSERT_DOMAIN_EMPTY_CHECK dom2
#    if domain_is_rejected dom1 or domain_is_rejected dom2
#      return true

    return domain_shares_no_elements dom1, dom2

  # An eq propagator is solved when both its vars are
  # solved. Any other state may still lead to failure.

  propagator_eq_solved = (fdvar1, fdvar2) ->
    return fdvar_is_solved(fdvar1) and fdvar_is_solved fdvar2

  return {
    propagator_eq_step_bare
    propagator_eq_step_would_reject
    propagator_eq_solved
  }
