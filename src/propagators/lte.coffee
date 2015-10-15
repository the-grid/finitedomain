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
    propagator_create_2x
  } = FD.Propagator

  {
    fdvar_lower_bound
    fdvar_set_domain
    fdvar_upper_bound
  } = FD.Var

  lte_stepper = ->
    v1 = @propdata[1]
    v2 = @propdata[2]

    last_upid = @last_upid
    begin_upid = v1.vupid + v2.vupid
    if begin_upid <= last_upid # or @solved
      return ZERO_CHANGES

    unless v1.dom.length and v2.dom.length
      return REJECTED

    lo_1 = fdvar_lower_bound v1
    hi_1 = fdvar_upper_bound v1
    lo_2 = fdvar_lower_bound v2
    hi_2 = fdvar_upper_bound v2

    if lo_2 >= hi_1 # :'(
      # Condition already satisfied. No changes necessary.
      @last_upid = begin_upid
      @solved = true
      return ZERO_CHANGES

    ASSERT_DOMAIN v1.dom, 'v1 needs to be csis for this trick to work'
    ASSERT_DOMAIN v2.dom, 'v2 needs to be csis for this trick to work'

    # every number in v1 can only be smaller than or equal to the biggest
    # value in v2. bigger values will never satisfy lt so prune them.
    if hi_1 > hi_2
      # TODO: make this an inline operation to fdvar, once that's possible
      new_dom = v1.dom.slice 0
      domain_remove_gte_inline new_dom, hi_2+1
      if new_dom.length is 0
        return REJECTED
      fdvar_set_domain v1, new_dom

    # likewise; numbers in v2 that are smaller than or equal to the
    # smallest value of v1 can never satisfy lt so prune them as well
    if lo_1 > lo_2
      # TODO: make this an inline operation to fdvar, once that's possible
      new_dom = v2.dom.slice 0
      domain_remove_lte_inline new_dom, lo_1-1
      if new_dom.length is 0
        return REJECTED
      fdvar_set_domain v2, new_dom

    current_upid = v1.vupid + v2.vupid
    @last_upid = current_upid
    return current_upid - begin_upid

  propagator_create_lte = (space, left_var_name, right_var_name) ->
    propagator_create_2x space, left_var_name, right_var_name, lte_stepper, 'lte'

  FD.propagators.propagator_create_lte = propagator_create_lte
