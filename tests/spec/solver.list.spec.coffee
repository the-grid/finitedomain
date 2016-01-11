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

  it 'FD?', ->

    expect(FD?).to.be.true

  it 'FD.Solver?', ->

    expect(FD.Solver).to.be.ok

  {
    Solver
  } = FD

  describe 'explicit list per var of distribution', ->

    it 'should try values in order of the list', ->

      S = new Solver {}
      S.addVar
        id: 'V1'
        domain: spec_d_create_range 1, 4
        distribute: 'list'
        distributeOptions:
          list: [2, 4, 3, 1]
      S.addVar
        id: 'V2'
        domain: spec_d_create_range 1, 4
        distribute: 'list'
        distributeOptions:
          list: [3, 1, 4, 2]
      S['>'] 'V1', S.constant(0)
      S['>'] 'V2', S.constant(0)
      solutions = S.solve()

      expect(solutions.length, 'all solutions').to.equal(16)
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

      S = new Solver {}
      S.addVar
        id: 'V1'
        domain: [[1, 4]]
        distribute: 'markov'
        distributeOptions:
          legend: [2, 4, 3, 1]
          expandVectorsWith: 1
          random: -> 0 # causes first element in legend to be picked
      S.addVar
        id: 'V2'
        domain: [[1, 4]]
        distribute: 'markov'
        distributeOptions:
          legend: [3, 1, 4, 2]
          expandVectorsWith: 1
          random: -> 0 # causes first element in legend to be picked
      S['>'] 'V1', S.constant(0)
      S['>'] 'V2', S.constant(0)

      solutions = S.solve()
      expect(solutions.length, 'all solutions').to.equal(16)
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

      listCallback = (S, v) ->
        solution = S.solutionFor(['STATE', 'STATE2', 'V1', 'V2'], false)
        if solution['STATE'] is 5
          if v is 'V1'
            return [2, 4, 3, 1]
          else if v is 'V2'
            if solution['V1'] > 0
              return [3, 1, 4, 2]
        return [1, 2, 3, 4]

      S = new Solver {}
      S.addVar
        id: 'STATE'
        domain: spec_d_create_range 0, 10
      S.addVar
        id: 'V1'
        domain: spec_d_create_range 1, 4
        distribute: 'list'
        distributeOptions:
          list: listCallback
      S.addVar
        id: 'V2'
        domain: spec_d_create_range 1, 4
        distribute: 'list'
        distributeOptions:
          list: listCallback
      S['=='] 'STATE', S.constant 5
      S['>'] 'V1', S.constant 0
      S['>'] 'V2', S.constant 0

      solutions = S.solve()
      expect(solutions.length, 'all solutions').to.equal(16)
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
