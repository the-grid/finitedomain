if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_ranges
    strip_anon_vars
    strip_anon_vars_a
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "solver.minmaxcycle.spec", ->

  {
    Solver
  } = FD.Solver

  it 'FD.Solver?', ->

    expect(typeof Solver).to.be.equal 'function'

  describe 'process values by alternating between picking the lowest and highest value', ->

    it 'should cycle', ->

      solver = new Solver distribute: val: 'minMaxCycle'
      solver.addVar
        id: 'V1'
        domain: spec_d_create_range 1, 4
      solver.addVar
        id: 'V2'
        domain: spec_d_create_range 1, 4
      solver['>'] 'V1', solver.constant 0
      solver['>'] 'V2', solver.constant 0

      solutions = solver.solve()
      expect(solutions.length, 'all solutions').to.equal 16
      expect(strip_anon_vars_a solutions).to.eql [
        {V1: 1, V2: 4}
        {V1: 1, V2: 3}
        {V1: 1, V2: 2}
        {V1: 1, V2: 1}
        {V1: 2, V2: 4}
        {V1: 2, V2: 3}
        {V1: 2, V2: 2}
        {V1: 2, V2: 1}
        {V1: 3, V2: 4}
        {V1: 3, V2: 3}
        {V1: 3, V2: 2}
        {V1: 3, V2: 1}
        {V1: 4, V2: 4}
        {V1: 4, V2: 3}
        {V1: 4, V2: 2}
        {V1: 4, V2: 1}
      ]
