module.exports = do ->

  {
    domain_minus
  } = require '../domain'

  {
    fdvar_constrain
  } = require '../fdvar'

  # BODY_START

  propagator_min_step = (fdvar1, fdvar2, fdvar_result) ->
    output = domain_minus fdvar1.dom, fdvar2.dom
    change_status = fdvar_constrain fdvar_result, output
    return change_status

  # BODY_STOP

  return {
    propagator_min_step
  }
