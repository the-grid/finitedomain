module.exports = (FD) ->
  {
    REJECTED
    SOMETHING_CHANGED
  } = FD.helpers

  {
    domain_intersection
  } = FD.Domain

  {
    fdvar_set_domain
  } = FD.Fdvar

  ring_step_bare = (fdvar1, fdvar2, fdvar_result, op_func) ->
    # Apply an operator func to fdvar1 and fdvar2
    # Updates fdvar_result to the intersection of the result and itself

    from_op = op_func fdvar1.dom, fdvar2.dom
    domain = domain_intersection from_op, fdvar_result.dom
    unless domain.length
      return REJECTED

    return fdvar_set_domain fdvar_result, domain

  FD.propagators.ring_step_bare = ring_step_bare
