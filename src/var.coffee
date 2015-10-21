module.exports = (FD) ->

  {
    REJECTED

    ASSERT
    ASSERT_UNUSED_DOMAIN
  } = FD.helpers

  {
    domain_create_all
    domain_create_range
    domain_create_value
    domain_intersection
    domain_equal
    domain_is_determined
    domain_is_rejected
    domain_is_solved
    domain_max
    domain_middle_element
    domain_min
    domain_set_to_range_inline
    domain_size
  } = FD.Domain

  fdvar_create = (id, dom) ->
    return fdvar_new id, dom, 0

  fdvar_create_wide = (id) ->
    return fdvar_new id, domain_create_all(), 0

  fdvar_new = (id, dom, vupid) ->
    ASSERT !!dom, 'should init to a domain', [id, dom, vupid]
    ASSERT vupid >= 0, 'should init var update id (vupid) to >=0', vupid
    ASSERT_UNUSED_DOMAIN dom
    return {
      _class: 'fdvar'
      id
      dom
      vupid # "var update id", caching mechanism, used to be called `step`
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
    return fdvar_new fdvar.id, fdvar.dom.slice(0), fdvar.vupid

  fdvar_is_equal = (fdvar1, fdvar2) ->
    return domain_equal fdvar1.dom, fdvar2.dom

  fdvar_set_domain = (fdvar, domain) ->
    ASSERT_UNUSED_DOMAIN domain
    unless domain_equal fdvar.dom, domain
      fdvar.dom = domain
      fdvar.vupid++
    return

  fdvar_set_value_inline = (fdvar, value) ->
    domain_set_to_range_inline fdvar.dom, value, value
    fdvar.vupid++
    return

  fdvar_set_range_inline = (fdvar, lo, hi) ->
    domain_set_to_range_inline fdvar.dom, lo, hi
    fdvar.vupid++
    return

  # TODO: rename to intersect for that's what it is.
  fdvar_constrain = (fdvar, domain) ->
    domain = domain_intersection fdvar.dom, domain
    unless domain.length
      return REJECTED
    before = fdvar.vupid
    fdvar_set_domain fdvar, domain
    return fdvar.vupid - before

  fdvar_constrain_to_range = (fdvar, lo, hi) ->
    return fdvar_constrain fdvar, domain_create_range(lo, hi)

  fdvar_constrain_to_value = (fdvar, value) ->
    return fdvar_constrain fdvar, domain_create_value(value)

  fdvar_size = (fdvar) ->
    # We could cache this with the `vupid` property but that
    # means another property on this var which is unused by
    # most cases. Currently only `distribution_var_size` uses
    # this and so maybe this size should be cached at caller?
    return domain_size fdvar.dom

  fdvar_lower_bound = (fdvar) ->
    return domain_min fdvar.dom

  fdvar_upper_bound = (fdvar) ->
    return domain_max fdvar.dom

  # Get the exact middle value from all values covered by var
  # Middle here means the middle index, not hi-lo/2

  fdvar_middle_element = (fdvar) ->
    return domain_middle_element fdvar.dom

  FD.Var = {
    fdvar_clone
    fdvar_constrain
    fdvar_constrain_to_range
    fdvar_constrain_to_value
    fdvar_create
    fdvar_create_wide
    fdvar_is_equal
    fdvar_is_rejected
    fdvar_is_solved
    fdvar_is_undetermined
    fdvar_upper_bound
    fdvar_middle_element
    fdvar_lower_bound
    fdvar_set_domain
    fdvar_set_range_inline
    fdvar_set_value_inline
    fdvar_size
  }
