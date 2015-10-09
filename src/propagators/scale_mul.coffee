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

  scale_mul_stepper = ->
    v = @propdata[1]
    prod = @propdata[2]

    begin_upid = v.vupid + prod.vupid
    if begin_upid <= @last_upid # or @solved
      return 0

    unless v.dom.length
      return REJECTED

    # We multiply only the interval bounds.
    kd = []
    for [lo, hi] in v.dom
      kd.push [
        Math.min SUP, lo * factor
        Math.min SUP, hi * factor
      ]

    d = domain_intersection kd, prod.dom
    unless d.length
      return REJECTED
    fdvar_set_domain prod, d

    current_upid = v.vupid + prod.vupid
    @last_upid = current_upid
    return current_upid - begin_upid

  propagator_create_scale_mul = (space, left_var_name, right_var_name) ->
    propagator_create_2x space, left_var_name, right_var_name, scale_mul_stepper

  FD.propagators.propagator_create_scale_mul = propagator_create_scale_mul
