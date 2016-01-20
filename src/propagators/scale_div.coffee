module.exports = do ->

  {
    REJECTED
  } = require '../helpers'

  {
    domain_intersection
  } = require '../domain'

  {
    fdvar_set_domain
  } = require '../fdvar'

  FLOOR = Math.floor
  PAIR_SIZE = 2

  propagator_div_step_bare = (fdvar_val, fdvar_prod) ->
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

    return fdvar_set_domain fdvar_val, d

  return {
    propagator_div_step_bare
  }
