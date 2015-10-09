module.exports = (FD) ->
  {
    REJECTED
  } = FD.helpers

  {
    domain_complement
    domain_intersection
  } = FD.Domain

  {
    propagator_create_2x
  } = FD.Propagator

  {
    fdvar_lower_bound
    fdvar_set_domain
    fdvar_upper_bound
  } = FD.Var

  FIRST_RANGE = 0
  LO_BOUND = 0
  HI_BOUND = 1

  neq_stepper = ->
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

    # quick check
    if lo_2 > hi_1 or hi_1 < lo_2 # :'(
      # Condition already satisfied. No changes necessary.
      @last_upid = begin_upid
      @solved = true
      return 0

    # expensive but thorough check
    # TODO: replace with a fail_fast comparison check that only returns a bool
    v12 = domain_intersection v1.dom, v2.dom
    unless v12.length
      # Condition already satisfied.
      @last_upid = begin_upid
      @solved = true
      return 0

    current_upid = begin_upid
    while current_upid > last_upid
      # TODO: optimize this step. it's too formal. i think we can remove the loop and certainly the complement.

      if lo_1 is hi_1
        d = domain_intersection v2.dom, domain_complement [[lo_1, hi_1]]
        unless d.length
          return REJECTED
        fdvar_set_domain v2, d

      if lo_2 is hi_2
        d = domain_intersection v1.dom, domain_complement [[lo_2, hi_2]]
        unless d.length
          return REJECTED
        fdvar_set_domain v1, d

      last_upid = current_upid
      current_upid = v1.vupid + v2.vupid

    @last_upid = current_upid
    return current_upid - begin_upid

  propagator_create_neq = (space, left_var_name, right_var_name) ->
    propagator_create_2x space, left_var_name, right_var_name, neq_stepper

  FD.propagators.propagator_create_neq = propagator_create_neq
