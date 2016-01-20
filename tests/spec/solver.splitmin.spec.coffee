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

  {
    Solver
  } = FD.Solver

  it 'FD.Solver?', ->

    expect(typeof Solver).to.be.equal 'function'

  describe 'process values by divide and conquer, low split first', ->

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

      itDistributes {0: 1, 97: 98, 98: 99}, distribute: val: 'splitMin'
      itDistributes {0: 1, 97: 98, 98: 99}, distribute: val: 'splitMin', var: 'naive'
      itDistributes {0: 1, 97: 98, 98: 99}, distribute: val: 'splitMin', var: 'size'
      itDistributes {0: 1, 97: 98, 98: 99}, distribute: val: 'splitMin', var: 'min'
      itDistributes {0: 1, 97: 98, 98: 99}, distribute: val: 'splitMin', var: 'max'
