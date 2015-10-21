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

  ring_step_bare = (fdvar1, fdvar2, fdvar_result, op_func) ->
    # Apply an operator func to fdvar1 and fdvar2
    # Updates fdvar_result to the intersection of the result and itself

    begin_upid = fdvar1.vupid + fdvar2.vupid + fdvar_result.vupid
    domain = domain_intersection op_func(fdvar1.dom, fdvar2.dom), fdvar_result.dom
    unless domain.length
      return REJECTED
    fdvar_set_domain fdvar_result, domain

    new_upid = fdvar1.vupid + fdvar2.vupid + fdvar_result.vupid

    return new_upid - begin_upid

  FD.propagators.ring_step_bare = ring_step_bare
