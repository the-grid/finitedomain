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

  # TODO: why doesnt this do the opposite of what neq does? this func is much simpler

  eq_stepper = ->
    v1 = @propdata[1]
    v2 = @propdata[2]
    last_upid = v1.vupid + v2.vupid
    if last_upid <= @last_upid
      return 0
    d = domain_intersection v1.dom, v2.dom
    unless d.length
      return REJECTED
    fdvar_set_domain v1, d
    fdvar_set_domain v2, d
    @last_upid = v1.vupid + v2.vupid
    return @last_upid - last_upid

  propagator_create_eq = (space, left_var_name, right_var_name) ->
    return propagator_create_2x space, left_var_name, right_var_name, eq_stepper

  FD.propagators.propagator_create_eq = propagator_create_eq
