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

  {
    Solver
  } = FD.Solver

  it 'FD.Solver?', ->

    expect(typeof Solver).to.be.equal 'function'

  describe 'process values by picking the lowest value', ->

    itDistributes = (solutionMap, o) ->

      it "itDistributes(o = #{JSON.stringify(o)})", ->

        solver = new Solver o
        solver.addVar
          id: 'Hello'
          domain: spec_d_create_range 1, 99
        solver.addVar
          id: 'World'
          domain: spec_d_create_value 0
        solver['>'] 'Hello', 'World'

        solutions = solver.solve()
        expect(solutions.length, 'all solutions').to.equal 99
        for n, val of solutionMap
          expect(solutions[n].Hello, "nth: #{n} solution").to.equal val

    itDistributes {0:1, 98:99}, {}
    itDistributes {0:1, 98:99}, distribute: 'naive'
    itDistributes {0:1, 98:99}, distribute: 'fail_first'
    itDistributes {0:1, 98:99}, distribute: 'split'
    itDistributes {0:1, 98:99}, distribute: var: 'naive'
    itDistributes {0:1, 98:99}, distribute: val: 'min'
    itDistributes {0:1, 98:99}, distribute: val: 'min', var: 'naive'
    itDistributes {0:1, 98:99}, distribute: val: 'min', var: 'size'
    itDistributes {0:1, 98:99}, distribute: val: 'min', var: 'min'
    itDistributes {0:1, 98:99}, distribute: val: 'min', var: 'max'
