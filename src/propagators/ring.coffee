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

  # Apply an operator func to var_left and var_right
  # Updates var_result to the intersection of the result and itself

  ring_prop_stepper = (propagator, op_func, fdvar1, fdvar2, fdvar_result) ->
    begin_upid = fdvar1.vupid + fdvar2.vupid + fdvar_result.vupid
    if begin_upid > propagator.last_upid
      d = (domain_intersection(op_func(fdvar1.dom, fdvar2.dom), fdvar_result.dom))
      unless d.length
        return REJECTED
      fdvar_set_domain fdvar_result, d
      propagator.last_upid = fdvar1.vupid + fdvar2.vupid + fdvar_result.vupid
    return propagator.last_upid - begin_upid

  FD.propagators.ring_prop_stepper = ring_prop_stepper
