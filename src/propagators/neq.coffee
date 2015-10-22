module.exports = (FD) ->
  {
    domain_is_rejected
    domain_max
    domain_min
  } = FD.Domain

  {
    fdvar_force_neq_inline
  } = FD.Var

  PAIR_SIZE = 2

  neq_step_bare = (fdvar1, fdvar2) ->
    return fdvar_force_neq_inline fdvar1, fdvar2

  # neq will only reject if both domains are solved and equal.
  # This is a read-only check.

  neq_step_would_reject = (fdvar1, fdvar2) ->
    dom1 = fdvar1.dom
    dom2 = fdvar2.dom
    len1 = dom1.length
    len2 = dom2.length

    if len1 is 0 or len2 is 0
      return true
    if len1 isnt PAIR_SIZE or len2 isnt PAIR_SIZE
      return false

    # reject if domain is solved (lo=hi) and same as other domain
    lo = domain_min dom1
    hi = domain_max dom1
    return lo is hi and lo is domain_min(dom2) and lo is domain_max(dom2)

  FD.propagators.neq_step_bare = neq_step_bare
  FD.propagators.neq_step_would_reject = neq_step_would_reject
