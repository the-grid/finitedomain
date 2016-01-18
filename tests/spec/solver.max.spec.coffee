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

  {
    Solver
  } = FD

  it 'FD.Solver?', ->

    expect(typeof Solver).to.be.equal 'function'

  describe 'process values in from high to low', ->

    itDistributes = (solutionMap, options) ->

      it "itDistributes(o = #{JSON.stringify(options)})", ->

        solver = new Solver options
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

    itDistributes {0:99, 98:1 }, distribute: val: 'max'
    itDistributes {0:99, 98:1 }, distribute: val: 'max', var:'naive'
    itDistributes {0:99, 98:1 }, distribute: val: 'max', var:'size'
    itDistributes {0:99, 98:1 }, distribute: val: 'max', var:'min'
    itDistributes {0:99, 98:1 }, distribute: val: 'max', var:'max'
