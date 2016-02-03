module.exports = do ->

  {
    domain_divby
  } = require '../domain'

  {
    fdvar_constrain
  } = require '../fdvar'

  # BODY_START

  propagator_div_step = (fdvar1, fdvar2, fdvar_result) ->

    output = domain_divby fdvar1.dom, fdvar2.dom
    change_status = fdvar_constrain fdvar_result, output

    return change_status

  # BODY_STOP

  return {
    propagator_div_step
  }
