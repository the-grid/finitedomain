module.exports = (FD) ->
  {
    REJECTED
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

  FLOOR = Math.floor
  PAIR_SIZE = 2

  scale_div_stepper = ->
    fdvar = @propdata[1]
    prod = @propdata[2]

    begin_upid = fdvar.vupid + prod.vupid
    if begin_upid <= @last_upid # or @solved
      return ZERO_CHANGES

    domain = prod.dom
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
    fdvar_set_domain fdvar, d

    current_upid = fdvar.vupid + prod.vupid
    @last_upid = current_upid
    return current_upid - begin_upid

  propagator_create_scale_div = (space, left_var_name, right_var_name) ->
    propagator_create_2x space, left_var_name, right_var_name, scale_div_stepper, 'div'

  FD.propagators.propagator_create_scale_div = propagator_create_scale_div
