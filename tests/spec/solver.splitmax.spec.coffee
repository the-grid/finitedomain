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

describe "solver.splitmax.spec", ->

  describe 'process values by divide and conquer, high split first', ->

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

      itDistributes {distribute:{val:'splitMax'}}             , {0:99, 97:2, 98:1}
      itDistributes {distribute:{val:'splitMax',var:'naive'}} , {0:99, 97:2, 98:1}
      itDistributes {distribute:{val:'splitMax',var:'size'}}  , {0:99, 97:2, 98:1}
      itDistributes {distribute:{val:'splitMax',var:'min'}}   , {0:99, 97:2, 98:1}
      itDistributes {distribute:{val:'splitMax',var:'max'}}   , {0:99, 97:2, 98:1}
