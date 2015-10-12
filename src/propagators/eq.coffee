module.exports = (FD) ->
  {
    REJECTED
  } = FD.helpers

  {
    domain_equal
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
    begin_upid = v1.vupid + v2.vupid
    if begin_upid <= @last_upid
      return 0
    dom1 = v1.dom
    dom2 = v2.dom
    if domain_equal dom1, dom2
      return 0
    d = domain_intersection dom1, dom2
    unless d.length
      return REJECTED
    fdvar_set_domain v1, d
    fdvar_set_domain v2, d
    @last_upid = v1.vupid + v2.vupid
    return @last_upid - begin_upid

  propagator_create_eq = (space, left_var_name, right_var_name) ->
    return propagator_create_2x space, left_var_name, right_var_name, eq_stepper, 'eq'

  FD.propagators.propagator_create_eq = propagator_create_eq
