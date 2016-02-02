module.exports = do ->

  {
    REJECTED
  } = require '../helpers'

  # BODY_START

  propagator_div_step = (fdvar1, fdvar2, fdvar_result) ->

    dom1 = fdvar1.dom
    dom2 = fdvar2.dom

    list1 = domain_to_list dom1
    list2 = domain_to_list dom2

    list = []
    for a in list1
      for b in list2
        if b isnt 0 # skip 0? issue warning, error? add 0 or SUB or SUP to result?
          list.push Math.floor a / b

    return domain_set fdvar_result.dom, domain_normalize domain_from_list list

  # BODY_STOP

  return {
    propagator_ring_step_bare
  }
