module.exports = (FD) ->
  {
    REJECTED

    ASSERT_DOMAIN
  } = FD.helpers

  {
    domain_is_rejected
    domain_max
    domain_min
  } = FD.Domain

  {
    fdvar_is_rejected
    fdvar_lower_bound
    fdvar_remove_gte_inline
    fdvar_remove_lte_inline
    fdvar_upper_bound
  } = FD.Var

  lte_step_bare = (fdvar1, fdvar2) ->
    begin_upid = fdvar1.vupid + fdvar2.vupid

    lo_1 = fdvar_lower_bound fdvar1
    hi_1 = fdvar_upper_bound fdvar1
    lo_2 = fdvar_lower_bound fdvar2
    hi_2 = fdvar_upper_bound fdvar2

    ASSERT_DOMAIN fdvar1.dom, 'v1 needs to be csis for this trick to work'
    ASSERT_DOMAIN fdvar2.dom, 'v2 needs to be csis for this trick to work'

    # every number in v1 can only be smaller than or equal to the biggest
    # value in v2. bigger values will never satisfy lt so prune them.
    if hi_1 > hi_2
      fdvar_remove_gte_inline fdvar1, hi_2+1

    # likewise; numbers in v2 that are smaller than or equal to the
    # smallest value of v1 can never satisfy lt so prune them as well
    if lo_1 > lo_2
      fdvar_remove_lte_inline fdvar2, lo_1-1

    if fdvar_is_rejected(fdvar1) or fdvar_is_rejected(fdvar2)
      return REJECTED

    current_upid = fdvar1.vupid + fdvar2.vupid
    return current_upid - begin_upid

  # lte would reject if all elements in the left var are bigger than the
  # right var. And since everything is CSIS, we only have to check the
  # lo bound of left to the high bound of right for that answer.
  # Read-only check

  lte_step_would_reject = (fdvar1, fdvar2) ->
    dom1 = fdvar1.dom
    dom2 = fdvar2.dom

    if domain_is_rejected dom1 or domain_is_rejected dom2
      return true

    return domain_min(dom1) > domain_max(dom2)

  FD.propagators.lte_step_bare = lte_step_bare
  FD.propagators.lte_step_would_reject = lte_step_would_reject
