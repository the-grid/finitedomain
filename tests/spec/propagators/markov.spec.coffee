if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'
  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_ranges
    spec_d_create_value
  } = require '../../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "propagators/markov.spec", ->

  {
    Fdvar
    helpers
    propagators
    Solver
  } = FD

  {
    REJECTED
    ZERO_CHANGES
  } = helpers

  {
    markov_step_bare
  } = propagators

  it 'should exist', ->

    expect(markov_step_bare?).to.be.true

  describe 'simple unit tests', ->

    it 'should pass if solved value is in legend with prob>0', ->

      solver = new Solver
      solver.addVar
        id: 'A'
        domain: spec_d_create_range 0, 0
        distributeOptions:
          distributor_name: 'markov'
          legend: [0]
          matrix: [
            vector: [1]
          ]
      solver.prepare() # sets up dist options in solver.space

      # A=0, which is in legend and has prob=1
      expect(markov_step_bare solver.space, 'A').to.eql ZERO_CHANGES

    it 'should reject if solved value is not in legend', ->

      solver = new Solver
      solver.addVar
        id: 'A'
        domain: spec_d_create_range 0, 0
        distributeOptions:
          distributor_name: 'markov'
          legend: [1]
          matrix: [
            vector: [1]
          ]
      solver.prepare() # sets up dist options in solver.space

      # A=0, which is not in legend
      expect(markov_step_bare solver.space, 'A').to.eql REJECTED

    describe 'matrix with one row', ->

      it 'should reject if solved value does not have prob>0', ->

        solver = new Solver
        solver.addVar
          id: 'A'
          domain: spec_d_create_range 0, 0
          distributeOptions:
            distributor_name: 'markov'
            legend: [0]
            matrix: [
              vector: [0]
            ]
        solver.prepare() # sets up dist options in solver.space

        # A=0, which is in legend but has prob=0
        expect(markov_step_bare solver.space, 'A').to.eql REJECTED

      it 'should pass if solved value does has prob>0', ->

        solver = new Solver
        solver.addVar
          id: 'A'
          domain: spec_d_create_range 0, 0
          distributeOptions:
            distributor_name: 'markov'
            legend: [0]
            matrix: [
              vector: [0]
            ]
        solver.prepare() # sets up dist options in solver.space

        # A=0, which is in legend and has prob=1
        expect(markov_step_bare solver.space, 'A').to.eql REJECTED

    describe 'multi layer matrix', ->

      it 'should pass if second row gives value prob>0', ->

        solver = new Solver
        solver.addVar
          id: 'A'
          domain: spec_d_create_range 0, 0
          distributeOptions:
            distributor_name: 'markov'
            legend: [0]
            matrix: [
              {
                vector: [0]
                boolean: solver.constant 0
              }
              {
                vector: [1]
              }
            ]
        solver.prepare() # sets up dist options in solver.space

        # A=0, which is in legend and has prob=0 in first row,
        # but only second row is considered which gives prob=1
        expect(markov_step_bare solver.space, 'A').to.eql ZERO_CHANGES

      it 'should reject if second row gives value prob=0', ->

        solver = new Solver
        solver.addVar
          id: 'A'
          domain: spec_d_create_range 0, 0
          distributeOptions:
            distributor_name: 'markov'
            legend: [0]
            matrix: [
              {
                vector: [1]
                boolean: solver.constant 0
              }
              {
                vector: [0]
              }
            ]
        solver.prepare() # sets up dist options in solver.space

        # A=0, which is in legend and has prob=1 in first row,
        # but only second row is considered which gives prob=0
        expect(markov_step_bare solver.space, 'A').to.eql REJECTED
