module.exports = (FD) ->
  {
    REJECTED
  } = FD.helpers

  {
    domain_intersection
  } = FD.Domain

  {
    propagator_create_2x
  } = FD.Propagator

  {
    fdvar_set_domain
  } = FD.Var

  scale_div_stepper = ->
    v = @propdata[1]
    prod = @propdata[2]

    begin_upid = v.vupid + prod.vupid
    if begin_upid <= @last_upid # or @solved
      return 0

    unless v.dom.length
      return REJECTED

    # We div only the interval bounds.
    dbyk = []
    for [lo, hi] in prod.dom
      dbyk.push [
        Math.floor lo / factor
        Math.floor hi / factor
      ]

    d = domain_intersection dbyk, v.dom
    unless d.length
      return REJECTED
    fdvar_set_domain v, d

    current_upid = v.vupid + prod.vupid
    @last_upid = current_upid
    return current_upid - begin_upid

  propagator_create_scale_div = (space, left_var_name, right_var_name) ->
    propagator_create_2x space, left_var_name, right_var_name, scale_div_stepper

  FD.propagators.propagator_create_scale_div = propagator_create_scale_div
