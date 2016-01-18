if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_ranges
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "solver.splitmin.spec", ->

  describe 'process values by divide and conquer, low split first', ->

    itDistributes = (o, solutionMap) ->

      it "itDistributes(o = #{JSON.stringify(o)})", ->

        S = new FD.Solver o
        S.addVar
          id:'Hello'
          domain: spec_d_create_range 1, 99
        S.addVar
          id:'World'
          domain: spec_d_create_value 0
        S['>'] 'Hello', 'World'

        solutions = S.solve()
        expect(solutions.length, 'all solutions').to.equal(99)
        for n, val of solutionMap
          expect(solutions[n].Hello, "nth: #{n} solution").to.equal(val)

      itDistributes {distribute:{val:'splitMin'}}             , {0:1,  97:98, 98:99}
      itDistributes {distribute:{val:'splitMin',var:'naive'}} , {0:1,  97:98, 98:99}
      itDistributes {distribute:{val:'splitMin',var:'size'}}  , {0:1,  97:98, 98:99}
      itDistributes {distribute:{val:'splitMin',var:'min'}}   , {0:1,  97:98, 98:99}
      itDistributes {distribute:{val:'splitMin',var:'max'}}   , {0:1,  97:98, 98:99}
