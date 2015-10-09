# Finite-Domain Helpers

module.exports = (FD) ->

  SUP = 100000000
  REJECTED = -1

  ASSERT = (bool, msg='') ->
    unless !!bool
      console.error 'Assertion fail: ' + msg
      throw new Error 'Assertion fail: ' + msg

  FD.helpers = {
    REJECTED
    SUP

    ASSERT
  }
