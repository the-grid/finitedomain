if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'
  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_value
  } = require '../../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "propagators/callback.spec", ->

  unless FD.__DEV_BUILD
    return

  {
    Solver
  } = FD

  describe 'integration tests', ->
    {
      NO_SUCH_VALUE
    } = FD.helpers

    {
      domain_get_value
    } = FD.domain

    it 'should be able to access the var names array', ->

      # some criteria to search for. callback will reject all but one.
      [tr, tg, tb] = [2, 120, 201]

      cb = (space, var_names) ->

        vars = space.vars

        rv = domain_get_value vars[var_names[0]].dom
        gv = domain_get_value vars[var_names[1]].dom
        bv = domain_get_value vars[var_names[2]].dom

        if rv is NO_SUCH_VALUE or gv is NO_SUCH_VALUE or bv is NO_SUCH_VALUE
          return true # at least one domain isnt a single value; keep searching

        # exact match now
        return rv is tr and gv is tg and bv is tb

      solver = new Solver
      solver.addVar 'R', [0, 3]
      solver.addVar 'G', [119, 121]
      solver.addVar 'B', [200, 203]
      solver.addVar 'T', [tr + tg + tb, tr + tg + tb]
      solver.sum ['R', 'G', 'B'], 'T'
      solver.callback ['R', 'G', 'B'], cb

      solver.solve
        distribute: 'naive'
        vars: ['R', 'G', 'B']
        max: 10 # should only find 1

      # note: there are a few solutions for the sum(), but only one passes the callback
      expect(solver.solutions.length, 'solutions').to.equal 1
