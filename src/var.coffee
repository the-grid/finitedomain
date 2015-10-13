module.exports = (FD) ->

  {
    REJECTED
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
    return fdvar_new fdvar.id, fdvar.dom, fdvar.vupid

  fdvar_set_domain = (fdvar, domain) ->
    unless domain_equal fdvar.dom, domain
      fdvar.dom = domain
      fdvar.vupid++
    return

  fdvar_set_value_inline = (fdvar, value) ->
    domain_set_to_range_inline fdvar.dom, value, value
    return

  fdvar_set_range_inline = (fdvar, lo, hi) ->
    domain_set_to_range_inline fdvar.dom, lo, hi
    return

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
    # TODO: Can be cached using the 'vupid' member which
    # keeps track of the number of times the domain was
    # changed.
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
    fdvar_is_undetermined
    fdvar_is_rejected
    fdvar_is_solved
    fdvar_upper_bound
    fdvar_middle_element
    fdvar_lower_bound
    fdvar_set_domain
    fdvar_set_range_inline
    fdvar_set_value_inline
    fdvar_size
  }
