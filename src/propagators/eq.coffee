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
    fdvar_set_domain
  } = FD.Var

  # This eq propagator looks a lot different from neq because in
  # eq we can prune early all values that are not covered by both.
  # Any value that is not covered by both can not be a valid solution
  # that holds this constraint. In neq that's different and we can
  # only start pruning once at least one var has a solution.
  # Basically eq is much more efficient compared to neq because we
  # can potentially skip a lot of values early.

  eq_step_bare = (fdvar1, fdvar2) ->
    begin_upid = fdvar1.vupid + fdvar2.vupid

    dom1 = fdvar1.dom
    dom2 = fdvar2.dom
    if domain_equal dom1, dom2
      return ZERO_CHANGES

    new_domain = domain_intersection dom1, dom2
    unless new_domain.length
      return REJECTED

    # note: both vars need different array refs! so clone it for one
    fdvar_set_domain fdvar1, new_domain
    fdvar_set_domain fdvar2, new_domain.slice 0

    new_vupid = fdvar1.vupid + fdvar2.vupid
    return new_vupid - begin_upid

  FD.propagators.eq_step_bare = eq_step_bare
