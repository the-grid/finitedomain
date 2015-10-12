module.exports = (FD) ->
  {
    REJECTED
  } = FD.helpers

  {
    domain_intersect_bounds_into
  } = FD.Domain

  {
    propagator_create_2x
  } = FD.Propagator

  {
    fdvar_lower_bound
    fdvar_set_domain
    fdvar_upper_bound
  } = FD.Var

  lt_stepper = ->
    v1 = @propdata[1]
    v2 = @propdata[2]

    last_upid = @last_upid
    begin_upid = v1.vupid + v2.vupid
    if begin_upid <= last_upid # or @solved
      return 0

    unless v1.dom.length and v2.dom.length
      return REJECTED

    lo_1 = fdvar_lower_bound v1
    hi_1 = fdvar_upper_bound v1
    lo_2 = fdvar_lower_bound v2
    hi_2 = fdvar_upper_bound v2

    if lo_2 > hi_1 # :'(
      # Condition already satisfied. No changes necessary.
      @last_upid = begin_upid
      @solved = true
      return 0

    current_upid = begin_upid
    while current_upid > last_upid
      if hi_2 - 1 < hi_1
        # Need to change domain of v1.
        # TODO: this update step can be done more efficient... it's too "formal" right now.
        hi_1 = hi_2 - 1 # note: either get rid of the intersection (YES) or update hi_1 by ref after the fdvar_set_domain
        new_domain = []
        domain_intersect_bounds_into v1.dom, lo_1, hi_1, new_domain
        unless new_domain.length
          return REJECTED
        fdvar_set_domain v1, new_domain

      if lo_1 + 1 > lo_2
        # Need to change domain of v2.
        # TODO: this update step can be done more efficient... it's too "formal" right now.
        lo_2 = lo_1 + 1 # note: either get rid of the intersection (YES) or update lo_2 by ref after the fdvar_set_domain
        new_domain = []
        domain_intersect_bounds_into v2.dom, lo_2, hi_2, new_domain
        unless new_domain.length
          return REJECTED
        fdvar_set_domain v2, new_domain

      last_upid = current_upid
      current_upid = v1.vupid + v2.vupid

    @last_upid = current_upid
    return current_upid - begin_upid

  propagator_create_lt = (space, left_var_name, right_var_name) ->
    propagator_create_2x space, left_var_name, right_var_name, lt_stepper, 'lt'

  FD.propagators.propagator_create_lt = propagator_create_lt
