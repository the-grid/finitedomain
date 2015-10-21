module.exports = (FD) ->
  {
    REJECTED
    ZERO_CHANGES

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

    if fdvar_is_rejected(fdvar1) or fdvar_is_rejected(fdvar2)
      return REJECTED

    lo_1 = fdvar_lower_bound fdvar1
    hi_1 = fdvar_upper_bound fdvar1
    lo_2 = fdvar_lower_bound fdvar2
    hi_2 = fdvar_upper_bound fdvar2

    if lo_2 > hi_1 # :'(
      # Condition already satisfied. No changes necessary.
      return ZERO_CHANGES

    ASSERT_DOMAIN fdvar1.dom, 'v1 needs to be csis for this trick to work'
    ASSERT_DOMAIN fdvar2.dom, 'v2 needs to be csis for this trick to work'

    # every number in v1 can only be smaller than or equal to the biggest
    # value in v2. bigger values will never satisfy lt so prune them.
    if hi_1 >= hi_2
      # TODO: make this an inline operation to fdvar, once that's possible
      new_dom = fdvar1.dom.slice 0
      domain_remove_gte_inline new_dom, hi_2
      if new_dom.length is 0
        return REJECTED
      fdvar_set_domain fdvar1, new_dom

    # likewise; numbers in v2 that are smaller than or equal to the
    # smallest value of v1 can never satisfy lt so prune them as well
    if lo_1 >= lo_2
      # TODO: make this an inline operation to fdvar, once that's possible
      new_dom = fdvar2.dom.slice 0
      domain_remove_lte_inline new_dom, lo_1
      if new_dom.length is 0
        return REJECTED
      fdvar_set_domain fdvar2, new_dom

    current_upid = fdvar1.vupid + fdvar2.vupid
    return current_upid - begin_upid


  FD.propagators.lt_step_bare = lt_step_bare
