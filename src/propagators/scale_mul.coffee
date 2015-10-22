module.exports = (FD) ->
  {
    REJECTED
    SUP
  } = FD.helpers

  {
    domain_intersection
  } = FD.Domain

  {
    fdvar_set_domain
  } = FD.Var

  MIN = Math.min
  PAIR_SIZE = 2

  # TODO: write test that uses this. this is currently not tested at all.

  mul_step_bare = (fdvar, fdvar_prod) ->
    domain = fdvar.dom
    unless domain.length
      return REJECTED

    # We multiply only the interval bounds.
    kd = []
    for lo, index in domain by PAIR_SIZE
      hi = domain[index+1]
      # TODO: this is untested, so unused? (no error if SUP is not imported)
      # TODO: factor isnt defined so this should throw an error
      kd.push MIN(SUP, lo * factor),  MIN(SUP, hi * factor)

    d = domain_intersection kd, fdvar_prod.dom
    unless d.length
      return REJECTED

    return fdvar_set_domain fdvar_prod, d

  FD.propagators.mul_step_bare = mul_step_bare
