if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'
  {
  spec_d_create_bool
  spec_d_create_range
  spec_d_create_value
  strip_anon_vars
  strip_anon_vars_a
  } = require '../fixtures/domain.spec.coffee'

{expect, assert} = chai
FD = finitedomain

describe 'solver.list.spec', ->

  {
    Solver
  } = FD

  {
    space_solution_for
  } = FD.space or {} # no space in dist

  it 'FD.Solver?', ->

    expect(typeof Solver).to.be.equal 'function'

  describe 'explicit list per var of distribution', ->

    it 'should try values in order of the list', ->

      solver = new Solver {}
      solver.addVar
        id: 'V1'
        domain: spec_d_create_range 1, 4
        distribute: 'list'
        distributeOptions:
          list: [2, 4, 3, 1]
      solver.addVar
        id: 'V2'
        domain: spec_d_create_range 1, 4
        distribute: 'list'
        distributeOptions:
          list: [3, 1, 4, 2]
      solver['>'] 'V1', solver.constant(0)
      solver['>'] 'V2', solver.constant(0)
      solutions = solver.solve()

      expect(solutions.length, 'all solutions').to.equal 16
      expect(strip_anon_vars_a solutions).to.eql [
        {V1: 2, V2: 3}
        {V1: 2, V2: 1}
        {V1: 2, V2: 4}
        {V1: 2, V2: 2}

        {V1: 4, V2: 3}
        {V1: 4, V2: 1}
        {V1: 4, V2: 4}
        {V1: 4, V2: 2}

        {V1: 3, V2: 3}
        {V1: 3, V2: 1}
        {V1: 3, V2: 4}
        {V1: 3, V2: 2}

        {V1: 1, V2: 3}
        {V1: 1, V2: 1}
        {V1: 1, V2: 4}
        {V1: 1, V2: 2}
      ]

    it "should solve markov according to the list in order when random=0", ->

      solver = new Solver {}
      solver.addVar
        id: 'V1'
        domain: [[1, 4]]
        distribute: 'markov'
        distributeOptions:
          legend: [2, 4, 3, 1]
          expandVectorsWith: 1
          random: -> 0 # causes first element in legend to be picked
      solver.addVar
        id: 'V2'
        domain: [[1, 4]]
        distribute: 'markov'
        distributeOptions:
          legend: [3, 1, 4, 2]
          expandVectorsWith: 1
          random: -> 0 # causes first element in legend to be picked
      solver['>'] 'V1', solver.constant(0)
      solver['>'] 'V2', solver.constant(0)

      solutions = solver.solve()
      expect(solutions.length, 'all solutions').to.equal 16
      expect(strip_anon_vars_a solutions).to.eql [
        {V1: 2, V2: 3}
        {V1: 2, V2: 1}
        {V1: 2, V2: 4}
        {V1: 2, V2: 2}

        {V1: 4, V2: 3}
        {V1: 4, V2: 1}
        {V1: 4, V2: 4}
        {V1: 4, V2: 2}

        {V1: 3, V2: 3}
        {V1: 3, V2: 1}
        {V1: 3, V2: 4}
        {V1: 3, V2: 2}

        {V1: 1, V2: 3}
        {V1: 1, V2: 1}
        {V1: 1, V2: 4}
        {V1: 1, V2: 2}
      ]

    it "should call the list if it is a function", ->

      unless FD.__DEV_BUILD
        return

      listCallback = (space, v) ->
        solution = space_solution_for space, ['STATE', 'STATE2', 'V1', 'V2'], false
        if solution['STATE'] is 5
          if v is 'V1'
            return [2, 4, 3, 1]
          else if v is 'V2'
            if solution['V1'] > 0
              return [3, 1, 4, 2]
        return [1, 2, 3, 4]

      solver = new Solver {}
      solver.addVar
        id: 'STATE'
        domain: spec_d_create_range 0, 10
      solver.addVar
        id: 'V1'
        domain: spec_d_create_range 1, 4
        distribute: 'list'
        distributeOptions:
          list: listCallback
      solver.addVar
        id: 'V2'
        domain: spec_d_create_range 1, 4
        distribute: 'list'
        distributeOptions:
          list: listCallback
      solver['=='] 'STATE', solver.constant 5
      solver['>'] 'V1', solver.constant 0
      solver['>'] 'V2', solver.constant 0

      solutions = solver.solve()
      expect(solutions.length, 'all solutions').to.equal 16
      expect(strip_anon_vars_a solutions).to.eql [
        {V1: 2, V2: 3, STATE: 5}
        {V1: 2, V2: 1, STATE: 5}
        {V1: 2, V2: 4, STATE: 5}
        {V1: 2, V2: 2, STATE: 5}

        {V1: 4, V2: 3, STATE: 5}
        {V1: 4, V2: 1, STATE: 5}
        {V1: 4, V2: 4, STATE: 5}
        {V1: 4, V2: 2, STATE: 5}

        {V1: 3, V2: 3, STATE: 5}
        {V1: 3, V2: 1, STATE: 5}
        {V1: 3, V2: 4, STATE: 5}
        {V1: 3, V2: 2, STATE: 5}

        {V1: 1, V2: 3, STATE: 5}
        {V1: 1, V2: 1, STATE: 5}
        {V1: 1, V2: 4, STATE: 5}
        {V1: 1, V2: 2, STATE: 5}
      ]

  describe 'list values trump domain values', ->

    it 'should ignore values in the domain that are not in the list', ->

      solver = new Solver {}
      solver.addVar
        id: 'V1'
        domain: spec_d_create_range 0, 5
        distributeOptions:
          distributor_name: 'list'
          list: [0, 3, 4]
      solver['>'] 'V1', 0
      solutions = solver.solve()

      expect(solutions.length, 'all solutions').to.equal 2 # list.length
      expect(strip_anon_vars_a solutions).to.eql [
        {V1: 3}
        {V1: 4}
      ]

    it 'should not solve when the list contains no values in the domain', ->

      solver = new Solver {}
      solver.addVar
        id: 'V1'
        domain: spec_d_create_range 0, 10
        distributeOptions:
          distributor_name: 'list'
          list: [0, 15]
      solver['>'] 'V1', 0
      solutions = solver.solve()

      expect(solutions.length, 'all solutions').to.equal 0
