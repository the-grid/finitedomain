if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'
  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_value
    strip_anon_vars
    strip_anon_vars_a
  } = require '../../fixtures/domain.spec.coffee'

{expect, assert} = chai
FD = finitedomain

describe 'distribute.spec', ->

  {
    Solver
  } = FD

  describe 'override value distribution strategy per var', ->

    it 'v1=min, v2=max', ->

      solver = new Solver {}
      solver.addVar
        id: 'V1'
        domain: spec_d_create_range 1, 4
        distribute: 'min'
      solver.addVar
        id: 'V2'
        domain: spec_d_create_range 1, 4
        distribute: 'max'
      solver['>'] 'V1', solver.constant 0
      solver['>'] 'V2', solver.constant 0

      solutions = solver.solve()
      expect(solutions.length, 'all solutions').to.equal 16

      # (basically V1 solves lo to hi, V2 goes hi to lo)
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

    it 'v1=min, v2=max (regression)', ->

      # regression: when domains include 0, should still lead to same result

      solver = new Solver {}
      solver.addVar
        id: 'V1'
        domain: spec_d_create_range 0, 4
        distribute: 'min'
      solver.addVar
        id: 'V2'
        domain: spec_d_create_range 0, 4
        distribute: 'max'
      solver['>'] 'V1', solver.constant 0
      solver['>'] 'V2', solver.constant 0

      solutions = solver.solve()
      expect(solutions.length, 'all solutions').to.equal 16

      # (basically V1 solves lo to hi, V2 goes hi to lo)
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

    it 'should pick a random() value in markov', ->

      # note: this is pretty much the same as the previous min/max test except it uses
      # markov for it but it mimics min/max because we fixate the random() outcome

      solver = new Solver {}
      solver.addVar
        id: 'V1'
        domain: spec_d_create_range 0, 4
        distribute: 'markov'
        distributeOptions:
          legend: [1, 2, 3, 4]
          random: -> 0 # always take the first element
          matrix: [
            vector: [1, 1, 1, 1]
          ]
      solver.addVar
        id: 'V2'
        domain: spec_d_create_range 0, 4
        distribute: 'markov'
        distributeOptions:
          legend: [1, 2, 3, 4]
          random: -> 1 - 1e-5 # always take the last element
          matrix: [
            vector: [1, 1, 1, 1]
          ]
      solver['>'] 'V1', solver.constant 0
      solver['>'] 'V2', solver.constant 0

      solutions = solver.solve()
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
