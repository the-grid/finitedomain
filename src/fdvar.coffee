module.exports = (FD) ->

  {
    REJECTED
    SOMETHING_CHANGED
    ZERO_CHANGES

    ASSERT
    ASSERT_UNUSED_DOMAIN
    ASSERT_DOMAIN_EMPTY_CHECK
  } = FD.helpers

  {
    domain_create_all
    domain_create_bool
    domain_create_range
    domain_create_value
    domain_intersection
    domain_equal
    domain_force_eq_inline
    domain_is_determined
    domain_is_rejected
    domain_is_solved
    domain_max
    domain_middle_element
    domain_min
    domain_remove_gte_inline
    domain_remove_lte_inline
    domain_remove_value_inline
    domain_set_to_range_inline
    domain_size
  } = FD.Domain

  fdvar_create = (id, dom) ->
    return fdvar_new id, dom, 0

  fdvar_create_bool = (id) ->
    return fdvar_new id, domain_create_bool(), 0

  fdvar_create_range = (id, lo, hi) ->
    return fdvar_new id, domain_create_range(lo, hi), 0

  fdvar_create_value = (id, val) ->
    return fdvar_new id, domain_create_value(val), 0

  fdvar_create_wide = (id) ->
    return fdvar_new id, domain_create_all(), 0

  fdvar_new = (id, dom) ->
    ASSERT !!dom, 'should init to a domain', [id, dom]
    ASSERT_UNUSED_DOMAIN dom
    return {
      _class: 'fdvar'
      id
      dom
      was_solved: false # for Space#clone
    }

  # A var is undetermined when it is neither rejected nor solved.
  # Basically that means that the domain contains more than one range
  # or that the only range spans at least two elements.

  fdvar_is_undetermined = (fdvar) ->
    return !domain_is_determined fdvar.dom

  # A var is solved if it has only one range that spans only one value.

  fdvar_is_solved = (fdvar) ->
    return domain_is_solved fdvar.dom

  # A var is rejected if its domain is empty. This means none of the
  # possible values for this var could satisfy all the constraints.

  fdvar_is_rejected = (fdvar) ->
    return domain_is_rejected fdvar.dom

  fdvar_clone = (fdvar) ->
    ASSERT !fdvar.was_solved, 'should not clone vars that are already solved...'
    return fdvar_new fdvar.id, fdvar.dom.slice(0)

  fdvar_is_equal = (fdvar1, fdvar2) ->
    return domain_equal fdvar1.dom, fdvar2.dom

  fdvar_set_domain = (fdvar, domain) ->
    ASSERT_UNUSED_DOMAIN domain
    unless domain_equal fdvar.dom, domain
      fdvar.dom = domain
      return SOMETHING_CHANGED
    return ZERO_CHANGES

  fdvar_set_value_inline = (fdvar, value) ->
    domain_set_to_range_inline fdvar.dom, value, value
    return

  fdvar_set_range_inline = (fdvar, lo, hi) ->
    domain_set_to_range_inline fdvar.dom, lo, hi
    return

  # TODO: rename to intersect for that's what it is.
  fdvar_constrain = (fdvar, domain) ->
    domain = domain_intersection fdvar.dom, domain
    unless domain.length
      return REJECTED
    return fdvar_set_domain fdvar, domain

  fdvar_constrain_to_range = (fdvar, lo, hi) ->
    return fdvar_constrain fdvar, domain_create_range(lo, hi)

  fdvar_constrain_to_value = (fdvar, value) ->
    return fdvar_constrain fdvar, domain_create_value(value)

  fdvar_size = (fdvar) ->
    return domain_size fdvar.dom

  fdvar_lower_bound = (fdvar) ->
    return domain_min fdvar.dom

  fdvar_upper_bound = (fdvar) ->
    return domain_max fdvar.dom

  # Get the exact middle value from all values covered by var
  # Middle here means the middle index, not hi-lo/2

  fdvar_middle_element = (fdvar) ->
    return domain_middle_element fdvar.dom

  fdvar_remove_gte_inline = (fdvar, value) ->
    if domain_remove_gte_inline fdvar.dom, value
      return SOMETHING_CHANGED
    return ZERO_CHANGES

  fdvar_remove_lte_inline = (fdvar, value) ->
    if domain_remove_lte_inline fdvar.dom, value
      return SOMETHING_CHANGED
    return ZERO_CHANGES

  # for the eq propagator; makes sure all elements in either var
  # are also contained in the other. removes all others. operates
  # inline on the var domains. returns REJECTED, ZERO_CHANGES, or
  # SOMETHING_CHANGED

  fdvar_force_eq_inline = (fdvar1, fdvar2) ->
    change_state = domain_force_eq_inline fdvar1.dom, fdvar2.dom

    # if this assert fails, update the following checks accordingly!
    ASSERT change_state >= -1 and change_state <= 1, 'state should be -1 for reject, 0 for no change, 1 for both changed; but was ?', change_state

    if change_state is REJECTED
      return REJECTED

    return change_state

  fdvar_force_neq_inline = (fdvar1, fdvar2) ->
    r = ZERO_CHANGES
    dom1 = fdvar1.dom
    dom2 = fdvar2.dom

    ASSERT_DOMAIN_EMPTY_CHECK dom1
    ASSERT_DOMAIN_EMPTY_CHECK dom2

    if fdvar1.was_solved or fdvar_is_solved fdvar1
      r = domain_remove_value_inline dom2, domain_min dom1
      ASSERT r < 2, 'should return SOMETHING_CHANGED and not the actual number of changes... test here just in case!'
    else if fdvar2.was_solved or fdvar_is_solved fdvar2
      r = domain_remove_value_inline dom1, domain_min dom2
      ASSERT r < 2, 'should return SOMETHING_CHANGED and not the actual number of changes... test here just in case!'

    ASSERT r is REJECTED or r is ZERO_CHANGES or r is SOMETHING_CHANGED, 'turning stuff into enum, must be sure about values'
    ASSERT (r is REJECTED) is (domain_is_rejected(dom1) or domain_is_rejected(dom2)), 'if either domain is rejected, r should reflect this already'

    return r

  FD.Var = {
    fdvar_clone
    fdvar_constrain
    fdvar_constrain_to_range
    fdvar_constrain_to_value
    fdvar_create
    fdvar_create_bool
    fdvar_create_range
    fdvar_create_value
    fdvar_create_wide
    fdvar_force_eq_inline
    fdvar_force_neq_inline
    fdvar_is_equal
    fdvar_is_rejected
    fdvar_is_solved
    fdvar_is_undetermined
    fdvar_upper_bound
    fdvar_middle_element
    fdvar_lower_bound
    fdvar_remove_gte_inline
    fdvar_remove_lte_inline
    fdvar_set_domain
    fdvar_set_value_inline
    fdvar_set_range_inline
    fdvar_size
  }
