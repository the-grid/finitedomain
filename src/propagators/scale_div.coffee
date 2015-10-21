module.exports = (FD) ->
  {
    REJECTED
  } = FD.helpers

  {
    domain_intersection
  } = FD.Domain

  {
    fdvar_set_domain
  } = FD.Var

  FLOOR = Math.floor
  PAIR_SIZE = 2

  div_step_bare = (fdvar_val, fdvar_prod) ->
    begin_upid = fdvar_val.vupid + fdvar_prod.vupid

    domain = fdvar_prod.dom
    unless domain.length
      return REJECTED

    # We div only the interval bounds.
    dbyk = []
    for lo, index in domain by PAIR_SIZE
      hi = domain[index+1]
      dbyk.push FLOOR(lo / factor), FLOOR(hi / factor) # TODO: factor doesnt exist. this should throw an error. unused?

    d = domain_intersection dbyk, domain
    unless d.length
      return REJECTED
    fdvar_set_domain fdvar_val, d

    current_upid = fdvar_val.vupid + fdvar_prod.vupid
    return current_upid - begin_upid

  FD.propagators.div_step_bare = div_step_bare
