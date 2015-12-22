if typeof require is 'function'
  chai = require 'chai'

{expect:expect_real} = chai

chai.expect = (args...) ->
  # remove assertion expandos
  if args[0] instanceof Array
    delete args[0]._trace
    delete args[0]._fdvar_in_use
    # meh.
    for key of args[0]
      delete args[0][key]._fdvar_in_use

  # call real chai.expect
  return expect_real.apply this, args
