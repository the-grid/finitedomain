if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_value
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "solver.min.spec", ->

  it 'FD?', ->

    expect(FD?).to.be.true

  it 'FD.Solver?', ->

    expect(FD.Solver).to.be.ok

  {
    Solver
  } = FD

  describe 'process values by picking the lowest value', ->

    itDistributes = (o, solutionMap) ->

      it "itDistributes(o = #{JSON.stringify(o)})", ->

        S = new Solver o
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

    itDistributes {}                                    , {0:1, 98:99}
    itDistributes {distribute:'naive'}                  , {0:1, 98:99}
    itDistributes {distribute:'fail_first'}             , {0:1, 98:99}
    itDistributes {distribute:'split'}                  , {0:1, 98:99}
    itDistributes {distribute:{var:'naive'}}            , {0:1, 98:99}
    itDistributes {distribute:{val:'min'}}              , {0:1, 98:99}
    itDistributes {distribute:{val:'min',var:'naive'}}  , {0:1, 98:99}
    itDistributes {distribute:{val:'min',var:'size'}}   , {0:1, 98:99}
    itDistributes {distribute:{val:'min',var:'min'}}    , {0:1, 98:99}
    itDistributes {distribute:{val:'min',var:'max'}}    , {0:1, 98:99}
