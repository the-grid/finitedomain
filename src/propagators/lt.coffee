module.exports = (FD) ->
  {
    REJECTED

    ASSERT_DOMAIN
  } = FD.helpers

  {
    domain_remove_gte_inline
    domain_remove_lte_inline
  } = FD.Domain

  {
    fdvar_is_rejected
    fdvar_lower_bound
    fdvar_set_domain
    fdvar_upper_bound
  } = FD.Var

  lt_step_bare = (fdvar1, fdvar2) ->
    begin_upid = fdvar1.vupid + fdvar2.vupid

    lo_1 = fdvar_lower_bound fdvar1
    hi_1 = fdvar_upper_bound fdvar1
    lo_2 = fdvar_lower_bound fdvar2
    hi_2 = fdvar_upper_bound fdvar2

    ASSERT_DOMAIN fdvar1.dom, 'v1 needs to be csis for this trick to work'
    ASSERT_DOMAIN fdvar2.dom, 'v2 needs to be csis for this trick to work'

    # every number in v1 can only be smaller than or equal to the biggest
    # value in v2. bigger values will never satisfy lt so prune them.
    if hi_1 >= hi_2
      new_dom = fdvar1.dom.slice 0
      domain_remove_gte_inline new_dom, hi_2
      fdvar_set_domain fdvar1, new_dom
      # TOFIX: change to inline:
      #domain_remove_gte_inline fdvar1.dom, hi_2

    # likewise; numbers in v2 that are smaller than or equal to the
    # smallest value of v1 can never satisfy lt so prune them as well
    if lo_1 >= lo_2
      new_dom = fdvar2.dom.slice 0
      domain_remove_lte_inline new_dom, lo_1
      fdvar_set_domain fdvar2, new_dom
      # TOFIX: change to inline:
      #domain_remove_lte_inline fdvar2.dom, lo_1

    if fdvar_is_rejected(fdvar1) or fdvar_is_rejected(fdvar2)
      return REJECTED

    current_upid = fdvar1.vupid + fdvar2.vupid
    return current_upid - begin_upid


  FD.propagators.lt_step_bare = lt_step_bare
