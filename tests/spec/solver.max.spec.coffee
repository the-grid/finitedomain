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

describe 'solver.max.spec', ->

  it 'FD?', ->

    expect(FD?).to.be.true

  it 'FD.Solver?', ->

    expect(FD.Solver).to.be.ok

  {
    Solver
  } = FD

  describe 'process values in from high to low', ->

    itDistributes = (o, solutionMap) ->

      it "itDistributes(o = #{JSON.stringify(o)})", ->

        solver = new Solver o
        solver.addVar
          id:'Hello'
          domain: spec_d_create_range 1, 99
        solver.addVar
          id:'World'
          domain: spec_d_create_value 0
        solver['>'] 'Hello', 'World'

        solutions = solver.solve()
        expect(solutions.length, 'all solutions').to.equal 99
        for n, val of solutionMap
          expect(solutions[n].Hello, "nth: #{n} solution").to.equal val

    itDistributes {distribute:{val:'max'}}             , {0:99, 98:1 }
    itDistributes {distribute:{val:'max',var:'naive'}} , {0:99, 98:1 }
    itDistributes {distribute:{val:'max',var:'size'}}  , {0:99, 98:1 }
    itDistributes {distribute:{val:'max',var:'min'}}   , {0:99, 98:1 }
    itDistributes {distribute:{val:'max',var:'max'}}   , {0:99, 98:1 }
