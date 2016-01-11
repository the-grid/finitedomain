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

  it 'FD?', ->

    expect(FD?).to.be.true

  it 'FD.Solver?', ->

    expect(FD.Solver).to.be.ok

  {
    Solver
  } = FD

  describe 'process values by alternating between picking the lowest and highest value', ->

    it 'should cycle', ->

      o = {distribute: {val: 'minMaxCycle'}}
      S = new Solver o
      S.addVar
        id: 'V1'
        domain: spec_d_create_range 1, 4
      S.addVar
        id: 'V2'
        domain: spec_d_create_range 1, 4
      S['>'] 'V1', S.constant(0)
      S['>'] 'V2', S.constant(0)

      solutions = S.solve()
      expect(solutions.length, 'all solutions').to.equal(16)
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
