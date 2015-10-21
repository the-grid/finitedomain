module.exports = (FD) ->
  {
    REJECTED
    SUP
    ZERO_CHANGES
  } = FD.helpers

  {
    domain_intersection
  } = FD.Domain

  {
    propagator_create_2x
  } = FD.Propagator

  {
    fdvar_set_domain
  } = FD.Var

  MIN = Math.min
  PAIR_SIZE = 2

  scale_mul_stepper = ->
    fdvar_val = @fdvar1
    fdvar_prod = @fdvar2

    begin_upid = fdvar_val.vupid + fdvar_prod.vupid
    if begin_upid <= @last_upid # or @solved
      return ZERO_CHANGES

    domain = fdvar_val.dom
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
    fdvar_set_domain fdvar_prod, d

    current_upid = fdvar_val.vupid + fdvar_prod.vupid
    @last_upid = current_upid
    return current_upid - begin_upid

  propagator_create_scale_mul = (space, left_var_name, right_var_name) ->
    propagator_create_2x space, left_var_name, right_var_name, scale_mul_stepper, 'mul'

  FD.propagators.propagator_create_scale_mul = propagator_create_scale_mul
