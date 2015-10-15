module.exports = (FD) ->
  {
    REJECTED
    ZERO_CHANGES
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

  # This eq propagator looks a lot different from neq because in
  # eq we can prune early all values that are not covered by both.
  # Any value that is not covered by both can not be a valid solution
  # that holds this constraint. In neq that's different and we can
  # only start pruning once at least one var has a solution.
  # Basically eq is much more efficient compared to neq because we
  # can potentially skip a lot of values early.

  eq_stepper = ->
    v1 = @propdata[1]
    v2 = @propdata[2]

    begin_upid = v1.vupid + v2.vupid
    if begin_upid <= @last_upid
      return ZERO_CHANGES

    dom1 = v1.dom
    dom2 = v2.dom
    if domain_equal dom1, dom2
      return ZERO_CHANGES

    new_domain = domain_intersection dom1, dom2
    unless new_domain.length
      return REJECTED

    # note: both vars need different array refs! so clone it for one
    fdvar_set_domain v1, new_domain
    fdvar_set_domain v2, new_domain.slice 0

    @last_upid = v1.vupid + v2.vupid
    return @last_upid - begin_upid

  propagator_create_eq = (space, left_var_name, right_var_name) ->
    return propagator_create_2x space, left_var_name, right_var_name, eq_stepper, 'eq'

  FD.propagators.propagator_create_eq = propagator_create_eq
