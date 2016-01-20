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

  propagator_ring_step_bare = (fdvar1, fdvar2, fdvar_result, op_func) ->
    # Apply an operator func to fdvar1 and fdvar2
    # Updates fdvar_result to the intersection of the result and itself

    from_op = op_func fdvar1.dom, fdvar2.dom
    domain = domain_intersection from_op, fdvar_result.dom
    unless domain.length
      return REJECTED

    return fdvar_set_domain fdvar_result, domain

  return {
    propagator_ring_step_bare
  }
