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

  {
    Solver
  } = FD.Solver

  it 'FD.Solver?', ->

    expect(typeof Solver).to.be.equal 'function'

  describe 'process values by divide and conquer, high split first', ->

    itDistributes = (solutionMap, options) ->

      it "itDistributes(o = #{JSON.stringify(options)})", ->

        S = new Solver options
        S.addVar
          id:'Hello'
          domain: spec_d_create_range 1, 99
        S.addVar
          id:'World'
          domain: spec_d_create_value 0
        S['>'] 'Hello', 'World'

        solutions = S.solve()
        expect(solutions.length, 'all solutions').to.equal 99
        for n, val of solutionMap
          expect(solutions[n].Hello, "nth: #{n} solution").to.equal val

      itDistributes {0: 99, 97: 2, 98: 1}, distribute: val: 'splitMax'
      itDistributes {0: 99, 97: 2, 98: 1}, distribute: val: 'splitMax', var: 'naive'
      itDistributes {0: 99, 97: 2, 98: 1}, distribute: val: 'splitMax', var: 'size'
      itDistributes {0: 99, 97: 2, 98: 1}, distribute: val: 'splitMax', var: 'min'
      itDistributes {0: 99, 97: 2, 98: 1}, distribute: val: 'splitMax', var: 'max'
