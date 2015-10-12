if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'
  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_value
  } = require '../fixtures/domain'

{expect, assert} = chai
FD = finitedomain

describe "FD -", ->

  describe "Distribute - ", ->

    describe "value distribution -", ->
      itDistributes = (o, solutionMap) ->
        o ?= {}
        it "itDistributes(o = #{JSON.stringify(o)})", ->
          S = new FD.Solver o
          S.addVars [
            {id:'Hello', domain: spec_d_create_range 1, 99}
            {id:'World', domain: spec_d_create_value 0}
          ]
          S['>'] 'Hello', 'World'
          solutions = S.solve()
          expect(solutions.length, 'all solutions').to.equal(99)
          for n, val of solutionMap
            expect(solutions[n].Hello, "nth: #{n} solution").to.equal(val)

      # min
      describe "min", ->
        itDistributes {}                                            , {0:1,         98:99}
        itDistributes {distribute:'naive'}                          , {0:1,         98:99}
        itDistributes {distribute:'fail_first'}                     , {0:1,         98:99}
        itDistributes {distribute:'split'}                          , {0:1,         98:99}
        itDistributes {distribute:{var:'naive'}}                    , {0:1,         98:99}
        itDistributes {distribute:{val:'min'}}                      , {0:1,         98:99}
        itDistributes {distribute:{val:'min',var:'naive'}}          , {0:1,         98:99}
        itDistributes {distribute:{val:'min',var:'size'}}           , {0:1,         98:99}
        itDistributes {distribute:{val:'min',var:'min'}}            , {0:1,         98:99}
        itDistributes {distribute:{val:'min',var:'max'}}            , {0:1,         98:99}

      # max
      describe "max", ->
        itDistributes {distribute:{val:'max'}}                      , {0:99,        98:1 }
        itDistributes {distribute:{val:'max',var:'naive'}}          , {0:99,        98:1 }
        itDistributes {distribute:{val:'max',var:'size'}}           , {0:99,        98:1 }
        itDistributes {distribute:{val:'max',var:'min'}}            , {0:99,        98:1 }
        itDistributes {distribute:{val:'max',var:'max'}}            , {0:99,        98:1 }

      # mid
      describe 'mid', ->
        itDistributes {distribute:{val:'mid'}}                      , {0:50, 97:99, 98:1 }
        itDistributes {distribute:{val:'mid',var:'naive'}}          , {0:50, 97:99, 98:1 }
        itDistributes {distribute:{val:'mid',var:'size'}}           , {0:50, 97:99, 98:1 }
        itDistributes {distribute:{val:'mid',var:'min'}}            , {0:50, 97:99, 98:1 }
        itDistributes {distribute:{val:'mid',var:'max'}}            , {0:50, 97:99, 98:1 }

      # splitMin
      describe 'splitMin', ->
        itDistributes {distribute:{val:'splitMin'}}                 , {0:1,  97:98, 98:99}
        itDistributes {distribute:{val:'splitMin',var:'naive'}}     , {0:1,  97:98, 98:99}
        itDistributes {distribute:{val:'splitMin',var:'size'}}      , {0:1,  97:98, 98:99}
        itDistributes {distribute:{val:'splitMin',var:'min'}}       , {0:1,  97:98, 98:99}
        itDistributes {distribute:{val:'splitMin',var:'max'}}       , {0:1,  97:98, 98:99}

      # splitMax
      describe 'splitMax', ->
        itDistributes {distribute:{val:'splitMax'}}                 , {0:99, 97:2, 98:1}
        itDistributes {distribute:{val:'splitMax',var:'naive'}}     , {0:99, 97:2, 98:1}
        itDistributes {distribute:{val:'splitMax',var:'size'}}      , {0:99, 97:2, 98:1}
        itDistributes {distribute:{val:'splitMax',var:'min'}}       , {0:99, 97:2, 98:1}
        itDistributes {distribute:{val:'splitMax',var:'max'}}       , {0:99, 97:2, 98:1}

      # dynamic methods

      describe "minMaxCycle", ->
        o = {distribute:{val:'minMaxCycle'}}
        S = new FD.Solver o
        S.addVars [
          {id:'V1', domain: spec_d_create_range 1, 4}
          {id:'V2', domain: spec_d_create_range 1, 4}
        ]
        S['>'] 'V1', S.constant(0)
        S['>'] 'V2', S.constant(0)
        it 'all solutions', ->
          solutions = S.solve()
          expect(solutions.length, 'all solutions').to.equal(16)
          expect(solutions).to.eql [
            { V1: 1, V2: 4 }
            { V1: 1, V2: 3 }
            { V1: 1, V2: 2 }
            { V1: 1, V2: 1 }
            { V1: 2, V2: 4 }
            { V1: 2, V2: 3 }
            { V1: 2, V2: 2 }
            { V1: 2, V2: 1 }
            { V1: 3, V2: 4 }
            { V1: 3, V2: 3 }
            { V1: 3, V2: 2 }
            { V1: 3, V2: 1 }
            { V1: 4, V2: 4 }
            { V1: 4, V2: 3 }
            { V1: 4, V2: 2 }
            { V1: 4, V2: 1 }
          ]

      describe "per var val-distribution", ->
        o = {distribute:{val:'mid'}} # doesnt actually matter
        S = new FD.Solver o
        S.addVars [
          {id:'V1', domain: spec_d_create_range(1, 4), distribute:'min'}
          {id:'V2', domain: spec_d_create_range(1, 4), distribute:'max'}
        ]
        S['>'] 'V1', S.constant(0)
        S['>'] 'V2', S.constant(0)
        it 'all solutions', ->
          solutions = S.solve()
          expect(solutions.length, 'all solutions').to.equal(16)
          expect(solutions).to.eql [
            { V1: 1, V2: 4 }
            { V1: 1, V2: 3 }
            { V1: 1, V2: 2 }
            { V1: 1, V2: 1 }
            { V1: 2, V2: 4 }
            { V1: 2, V2: 3 }
            { V1: 2, V2: 2 }
            { V1: 2, V2: 1 }
            { V1: 3, V2: 4 }
            { V1: 3, V2: 3 }
            { V1: 3, V2: 2 }
            { V1: 3, V2: 1 }
            { V1: 4, V2: 4 }
            { V1: 4, V2: 3 }
            { V1: 4, V2: 2 }
            { V1: 4, V2: 1 }
          ]

      describe "per var list value distribution", ->
        o = {distribute:{val:'mid'}} # doesnt actually matter
        S = new FD.Solver o
        S.addVars [
          {id:'V1', domain: spec_d_create_range(1, 4), distribute:'list', distributeOptions:{list:[2,4,3,1]}, }
          {id:'V2', domain: spec_d_create_range(1, 4), distribute:'list', distributeOptions:{list:[3,1,4,2]}, }
        ]
        S['>'] 'V1', S.constant(0)
        S['>'] 'V2', S.constant(0)
        it 'all solutions', ->
          solutions = S.solve()
          expect(solutions.length, 'all solutions').to.equal(16)
          expect(solutions).to.eql [
            { V1: 2, V2: 3 }
            { V1: 2, V2: 1 }
            { V1: 2, V2: 4 }
            { V1: 2, V2: 2 }

            { V1: 4, V2: 3 }
            { V1: 4, V2: 1 }
            { V1: 4, V2: 4 }
            { V1: 4, V2: 2 }

            { V1: 3, V2: 3 }
            { V1: 3, V2: 1 }
            { V1: 3, V2: 4 }
            { V1: 3, V2: 2 }

            { V1: 1, V2: 3 }
            { V1: 1, V2: 1 }
            { V1: 1, V2: 4 }
            { V1: 1, V2: 2 }
          ]

      describe "Dynamic list value distribution, no memmory", ->
        o = {distribute:{val:'mid'}} # doesnt actually matter
        S = new FD.Solver o

        listCallback = (S,v) ->
          solution = S.solutionFor(['STATE','STATE2','V1','V2'], false)
          #console.log solution
          if solution['STATE'] is 5
            if v is 'V1'
              return [2,4,3,1]
            else if v is 'V2'
              if solution['V1'] > 0
                return [3,1,4,2]
          return [1,2,3,4]

        S.addVars [
          {id:'STATE', domain: spec_d_create_range(0, 10)}
          {id:'V1', domain: spec_d_create_range(1, 4), distribute:'list', distributeOptions:{list:listCallback} }
          {id:'V2', domain: spec_d_create_range(1, 4), distribute:'list', distributeOptions:{list:listCallback} }
          # {id:'STATE2', domain: spec_d_create_range(0, 10)}
        ]

        S['=='] 'STATE', S.constant(5)
        S['>'] 'V1', S.constant(0)
        S['>'] 'V2', S.constant(0)
        # S['=='] S['==?']('STATE',S.constant(5)), 'STATE2'
        it 'all solutions', ->
          solutions = S.solve()
          expect(solutions.length, 'all solutions').to.equal(16)
          expect(solutions).to.eql [
            { V1: 2, V2: 3, STATE:5 }
            { V1: 2, V2: 1, STATE:5 }
            { V1: 2, V2: 4, STATE:5 }
            { V1: 2, V2: 2, STATE:5 }

            { V1: 4, V2: 3, STATE:5 }
            { V1: 4, V2: 1, STATE:5 }
            { V1: 4, V2: 4, STATE:5 }
            { V1: 4, V2: 2, STATE:5 }

            { V1: 3, V2: 3, STATE:5 }
            { V1: 3, V2: 1, STATE:5 }
            { V1: 3, V2: 4, STATE:5 }
            { V1: 3, V2: 2, STATE:5 }

            { V1: 1, V2: 3, STATE:5 }
            { V1: 1, V2: 1, STATE:5 }
            { V1: 1, V2: 4, STATE:5 }
            { V1: 1, V2: 2, STATE:5 }
          ]



      describe "Markov value distribution", ->

        describe "basic Markov matrix", ->

          setupSolver = ->
            o = {distribute:{val:'min'}} # doesnt actually matter
            S = new FD.Solver o

            S.addVars [
              {id:'STATE', domain: spec_d_create_range 0, 10}
              {
                id:'V1',
                domain: spec_d_create_bool(),
                distribute:'markov',
                distributeOptions:{
                  legend: [0,1]
                  matrix: [
                    vector: [.1,1]
                    boolean: (S, varId) ->
                      return S['==?'] 'STATE', S.constant(5)
                  ,
                    vector: [1,1]
                  ]
                }
              }
              {
                id:'V2',
                domain: spec_d_create_bool(),
                distribute:'markov',
                distributeOptions:{
                  legend: [0,1]
                  matrix: [
                    vector: [.1,1]
                    boolean: (Solver, varId) ->
                      return Solver['==?'] 'STATE', S.constant(100)
                  ,
                    vector: [1,1]
                  ]
                }
              }
            ]

            S['=='] 'STATE', S.constant(5)

            return S

          it 'first solution expresses markov probabilities x1000 times', ->
            V1_count = [0,0]
            V2_count = [0,0]
            for i in [0...1000]

              S = setupSolver()

              solutions = S.solve(max:1)

              #expect(solutions.length, 'all solutions').to.equal(1)
              for solution in solutions
                #solution = solutions[0]
                V1_count[solution['V1']]++
                V2_count[solution['V2']]++

            console.log 'V1_count: ',V1_count
            console.log 'V2_count: ',V2_count

            assert (V1_count[0] / V1_count[1]) - (1 / 10) < .15
            assert (V1_count[0] / V1_count[1]) - (1 / 1) < .15

          it 'all solutions express equal probabilities x500 times', ->
            V1_count = [0,0]
            V2_count = [0,0]
            for i in [0...500]

              S = setupSolver()

              solutions = S.solve()

              #expect(solutions.length, 'all solutions').to.equal(1)
              for solution in solutions
                #solution = solutions[0]
                V1_count[solution['V1']]++
                V2_count[solution['V2']]++

            console.log 'V1_count: ',V1_count
            console.log 'V2_count: ',V2_count

            assert V1_count[0] is V1_count[1]
            assert V1_count[0] is V1_count[1]


        describe "large domain w/ sparse legend & 0 probability acts as constraint", ->

          setupSolver = ->
            o = {distribute:{val:'min'}} # doesnt actually matter
            S = new FD.Solver o

            S.addVars [
              {id:'STATE', domain: spec_d_create_range 0, 10}
              {
                id:'V1',
                domain: spec_d_create_range(0, 100),
                distribute:'markov',
                distributeOptions:{
                  legend: [10,100]
                  matrix: [
                    vector: [1,0]
                    boolean: (S, varId) ->
                      return S['==?'] 'STATE', S.constant(5)
                  ,
                    vector: [0,1]
                  ]
                }
              }
              {
                id:'V2',
                domain: spec_d_create_range(0, 100),
                distribute:'markov',
                distributeOptions:{
                  legend: [10,100]
                  matrix: [
                    vector: [1,0]
                    boolean: (Solver, varId) ->
                      return Solver['==?'] 'STATE', S.constant(100)
                  ,
                    vector: [0,1]
                  ]
                }
              }
            ]

            S['=='] 'STATE', S.constant(5)

            return S

          it 'only 1 solution', ->
            S = setupSolver()
            solutions = S.solve()
            expect(solutions.length).to.equal 1
            expect(solutions[0]).to.eql
              STATE: 5
              V1: 10
              V2: 100


