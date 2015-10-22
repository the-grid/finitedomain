module.exports = (FD) ->
  {
    REJECTED
  } = FD.helpers

  {
    domain_is_rejected
    domain_shares_no_elements
  } = FD.Domain

  {
    fdvar_force_eq_inline
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

    unless fdvar_force_eq_inline fdvar1, fdvar2
      return REJECTED

    new_vupid = fdvar1.vupid + fdvar2.vupid
    return new_vupid - begin_upid

  # The eq step would reject if there all elements in one domain
  # do not occur in the other domain. Because then there's no
  # valid option to make sure A=B holds. So search for such value
  # or return false.
  # Read only check

  eq_step_would_reject = (fdvar1, fdvar2) ->
    dom1 = fdvar1.dom
    dom2 = fdvar2.dom

    if domain_is_rejected dom1 or domain_is_rejected dom2
      return true

    return domain_shares_no_elements dom1, dom2

  FD.propagators.eq_step_bare = eq_step_bare
  FD.propagators.eq_step_would_reject = eq_step_would_reject
