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

# These Solver specs focus on using Markov

describe "solver.markov.spec", ->

  {
    Solver
  } = FD

  it 'should solve an unconstrained Markov matrix', ->

    solver = new Solver {}

    solver.addVar
      id: 'V'
      domain: spec_d_create_bool()
      distribute: 'markov'
      distributeOptions:
        legend: [0, 0]
        matrix: [
          vector: [1, 1]
        ]

    solutions = solver.solve()

    # will only try (and pass) V=0 because V=1 is not in the legend
    expect(solutions.length, 'number of solutions').to.equal 1
    expect(solutions).to.eql [V: 0]

  describe 'random functions', ->

    FUNCS =

      default: undefined

      'Math.random': Math.random

    # Multiverse.Random should be tested on its own in its own package...
    #'seeded': new Multiverse.Random "sjf20ru"

      # redundant.
      'custom': () ->
        return Math.random()

      'MIN_FIRST': () ->
        return 0

      'MAX_FIRST': () ->
        return 1 - 1e-5

    setup_solver_for_random_test = (random_func) ->

      solver = new Solver {}

      solver.addVar
        id: 'STATE'
        domain: spec_d_create_range 0, 10
      solver.addVar
        id: 'V1'
        domain: spec_d_create_bool()
        distribute: 'markov'
        distributeOptions:
          legend: [0, 1]
          random: random_func
          matrix: [
            {
              vector: [.1, 1]
              boolean: (S) ->
                return S['==?'] 'STATE', S.constant 5
            }, {
              vector: [1, 1]
            }
          ]
      solver.addVar
        id: 'V2'
        domain: spec_d_create_bool()
        distribute: 'markov'
        distributeOptions:
          legend: [0, 1]
          random: random_func
          matrix: [
            {
              vector: [.1, 1]
              boolean: (Solver) ->
                return Solver['==?'] 'STATE', solver.constant 100
            }, {
              vector: [1, 1]
            }
          ]

      solver['=='] 'STATE', solver.constant 5

      return solver

    test_random = (random_name) ->

      random_func = FUNCS[random_name]

      describe "random function: #{random_name}", ->

        it 'should have a certain probability distribution of the random function when getting _one_ solution 1000x', ->

          v1_count = [0, 0]
          v2_count = [0, 0]
          for i in [0...1000]
            solver = setup_solver_for_random_test random_func

            solutions = solver.solve max: 1

            expect(solutions.length, 'solution count').to.equal 1
            for solution in solutions
              v1_count[solution['V1']]++
              v2_count[solution['V2']]++

          switch random_name
            when 'MIN_FIRST'
              expect(v1_count, 'minfirst v1 count').to.eql [1000, 0]
              expect(v2_count, 'minfirst v2 count').to.eql [1000, 0]
            when 'MAX_FIRST'
              expect(v1_count, 'maxfirst v1 count').to.eql [0, 1000]
              expect(v2_count, 'maxfirst v2 count').to.eql [0, 1000]
            else # random functions are within 15% error assuming a normal distribution
              v1_c = (v1_count[0] / v1_count[1]) - (1 / 10)
              v2_c = (v2_count[0] / v2_count[1]) - (1 / 10)
              expect(v1_c < .15, "#{v1_c} < .15").to.be.true
              #expect(v2_c > .85, "#{v2_c} > .85").to.be.true # TOFIX: confirm and fix this line....

        it 'should express equal probabilities when getting _all_ solutions x500 times', ->

          v1_count = [0, 0]
          v2_count = [0, 0]
          for i in [0...500]

            solver = setup_solver_for_random_test random_func

            solutions = solver.solve() # no max!

            for solution in solutions
              v1_count[solution['V1']]++
              v2_count[solution['V2']]++

          assert v1_count[0] is v1_count[1]
          assert v2_count[0] is v2_count[1]

    Object.keys(FUNCS).forEach test_random

  it 'should interpret large domain w/ sparse legend & 0 probability as a constraint', ->

    solver = new Solver {}

    solver.addVar
      id: 'STATE'
      domain: spec_d_create_range 0, 10
    solver.addVar
      id: 'V1',
      domain: spec_d_create_range 0, 100
      distribute: 'markov',
      distributeOptions:
        legend: [10, 100]
        matrix: [
          {
            vector: [1, 0]
            boolean: (S) ->
              return S['==?'] 'STATE', S.constant 5
          }, {
            vector: [0, 1]
          }
        ]
    solver.addVar
      id: 'V2',
      domain: spec_d_create_range 0, 100
      distribute: 'markov',
      distributeOptions:
        legend: [10, 100]
        matrix: [
          {
            vector: [1, 0]
            boolean: (S) ->
              return S['==?'] 'STATE', solver.constant 100
          }, {
            vector: [0, 1]
          }
        ]

    solver['=='] 'STATE', solver.constant(5)

    solutions = solver.solve()

    # there is only one solution for STATE (5), in which case V1 will
    # use vector [1,0] on legend [10,100], meaning 10. V2 will use
    # vector [0,1] on [10,100], meaning 100. so the only valid
    # solution can be STATE=5,V1=10,V2=100
    expect(solutions.length, 'solution count').to.equal 1
    expect(strip_anon_vars solutions[0]).to.eql
      STATE: 5
      V1: 10
      V2: 100

  it 'should expand vectors in markov with the expandVectorsWith option', ->

    # same as previous markov test, but with incomplete, to-be-padded, vectors

    solver = new Solver {}
    solver.addVar
      id: 'V1'
      domain: spec_d_create_range 1, 4
      distribute: 'markov'
      distributeOptions:
        legend: [1, 2] # 3,4]
        expandVectorsWith: 1
        random: () -> 0 # always pick first element
        matrix: [
          vector: [1, 1] # 1,1] padded by expandVectorsWith
        ]

    solver.addVar
      id: 'V2'
      domain: spec_d_create_range 1, 4
      distribute: 'markov'
      distributeOptions:
        legend: [1, 2] # 3,4]
        expandVectorsWith: 1
        random: () -> return 1 - 1e-5 # always pick last element
        matrix: [
          vector: [1, 1] # 1,1] padded by expandVectorsWith
        ]
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

  it "Markov expandVectorsWith w/o any legend or vector", ->

    solver = new Solver {}
    solver.addVar
      id: 'V1'
      domain: spec_d_create_range 1, 4
      distribute: 'markov'
      distributeOptions:
        # legend: [1,2,3,4]
        expandVectorsWith: 1
        random: -> 0 # pick first eligible legend value
        # matrix is added by expandVectorsWith, set to [1, 1, 1, 1]
    solver.addVar
      id: 'V2'
      domain: spec_d_create_range 1, 4
      distribute: 'markov'
      distributeOptions:
        # legend: [1,2,3,4]
        expandVectorsWith: 1
        random: -> 1 - 1e-5 # pick last eligible legend value
        # matrix is added by expandVectorsWith, set to [1, 1, 1, 1]
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

  describe 'markov legend should govern valid domain', ->


    it 'should reject if legend contains no values in the domain without vector expansion', ->

      # this examples the case where a solution automatically solves a markov
      # var before the markov distributor gets a chance to do anything

      solver = new Solver
      solver.addVar
        id: 'A_NORM'
        domain: spec_d_create_range 0, 1
      solver.addVar
        id: 'B_MARK'
        domain: spec_d_create_range 0, 1
        distributeOptions:
          distributor_name: 'markov'
          legend: [2]
          matrix: [
            vector: [1]
          ]
      solver['>'] 'B_MARK', 'A_NORM'

      # B can only become 2 as goverened by the legend, but the domain
      # never contained 2 so it will never be considered. No solution
      # should be possible as no valid value for B can be picked.
      solver.solve
        max: 1
        distribute:
          # distribute should be ignored as it should reject immediately
          var: 'throw'
          val: 'throw'

      expect(solver.solutions.length, 'solution count').to.eql 0
