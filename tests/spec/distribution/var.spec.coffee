if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'
  require '../../fixtures/helpers.spec'
  {
    spec_d_create_bool
    spec_d_create_value
    spec_d_create_range
    spec_d_create_ranges
    spec_d_create_zero
  } = require '../../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe 'distribution/var.spec', ->

  {
    Solver
  } = FD

  {
    distribution_get_next_var
  } = FD.distribution.var


  describe 'distribution_var_by_throw', ->

    it 'should throw', ->

      expect(-> distribution_get_next_var {config_next_var_func: 'throw'}, {}).to.throw 'not expecting to pick this distributor'


  it_ab = (dist_name, range_a, range_b, out, desc) ->

    it desc, ->

      solver = new Solver
      solver.addVar
        id: 'A'
        domain: spec_d_create_ranges range_a
      solver.addVar
        id: 'B'
        domain: spec_d_create_ranges range_b
      solver.prepare
        distribute: var: dist_name

      fdvar = distribution_get_next_var solver.space, solver.space, ['A', 'B']

      expect(fdvar.id).to.eql out

  describe 'by_min', ->

    describe 'integration', ->

      it_ab 'min', [0, 1], [10, 11], 'A', 'should decide on lowest vars first A'
      it_ab 'min', [20, 30], [5, 8], 'B', 'should decide on lowest vars first B'
      it_ab 'min', [9, 21], [10, 20], 'A', 'should base decision on lowest lo, not lowest hi'

  describe 'by_max', ->

    describe 'integration', ->

      it_ab 'max', [0, 1], [10, 11], 'B', 'should decide on highest vars first A'
      it_ab 'max', [20, 30], [5, 8], 'A', 'should decide on highest vars first B'
      it_ab 'max', [9, 21], [10, 20], 'A', 'should base decision on highest hi, not highest lo'

  describe 'by_size', ->

    describe 'integration', ->

      it_ab 'size', [0, 1], [10, 12], 'A', 'should decide on largest domain first A'
      it_ab 'size', [20, 30], [50, 55], 'B', 'should decide on largest domain first B'

      it 'should count actual elements in the domain', ->

        # note: further tests should be unit tests on domain_size instead
        solver = new Solver
        solver.addVar
          id: 'A'
          domain: spec_d_create_ranges [30, 100] # 71 elements
        solver.addVar
          id: 'B'
          domain: spec_d_create_ranges [0, 50], [60, 90] # 82 elements
        solver.prepare
          distribute: var: 'size'

        fdvar = distribution_get_next_var solver.space, solver.space, ['A', 'B']

        expect(fdvar.id).to.eql 'B'

  describe 'by_markov', ->

    describe 'integration', ->

      it 'should prioritize markov vars', ->

        solver = new Solver
        solver.addVar
          id: 'A'
          domain: spec_d_create_ranges [0, 1]
        solver.addVar
          id: 'B'
          domain: spec_d_create_ranges [10, 12]
          distributeOptions:
            distributor_name: 'markov'
            expandVectorsWith: 1
        solver.addVar
          id: 'C'
          domain: spec_d_create_ranges [5, 17]
        solver.addVar
          id: 'D'
          domain: spec_d_create_ranges [13, 13]
        solver.prepare
          distribute: var: 'markov'

        fdvar = distribution_get_next_var solver.space, solver.space, ['A', 'B', 'C', 'D']

        expect(fdvar.id).to.eql 'B'

      it 'should get markov vars back to front', ->
        # it's not really a hard requirement but that's how it works

        solver = new Solver
        solver.addVar
          id: 'A'
          domain: spec_d_create_ranges [0, 1]
        solver.addVar
          id: 'B'
          domain: spec_d_create_ranges [10, 12]
          distributeOptions:
            distributor_name: 'markov'
            expandVectorsWith: 1
        solver.addVar
          id: 'C'
          domain: spec_d_create_ranges [5, 17]
          distributeOptions:
            distributor_name: 'markov'
            expandVectorsWith: 1
        solver.addVar
          id: 'D'
          domain: spec_d_create_ranges [13, 13]
        solver.prepare
          distribute: var: 'markov'

        fdvar = distribution_get_next_var solver.space, solver.space, ['A', 'B', 'C', 'D']

        expect(fdvar.id).to.eql 'C'

  describe 'by_list', ->

    describe 'integration', ->

      it 'should solve vars in the explicit order of the list A', ->


        solver = new Solver
        solver.addVar
          id: 'A'
        solver.addVar
          id: 'B'
        solver.prepare
          distribute:
            var: 'list'
            var_priority: ['A', 'B']

        fdvar = distribution_get_next_var solver.space, solver.space, ['A', 'B']

        expect(fdvar.id).to.eql 'A'

      it 'should solve vars in the explicit order of the list B', ->


        solver = new Solver
        solver.addVar
          id: 'A'
        solver.addVar
          id: 'B'
        solver.prepare
          distribute:
            var: 'list'
            var_priority: ['B', 'A']

        fdvar = distribution_get_next_var solver.space, solver.space, ['A', 'B']

        expect(fdvar.id).to.eql 'B'

      it 'should not crash if a var is not on the list or when list is empty', ->


        solver = new Solver
        solver.addVar
          id: 'A'
        solver.prepare
          distribute:
            var: 'list'
            var_priority: []

        fdvar = distribution_get_next_var solver.space, solver.space, ['A']

        expect(fdvar.id).to.eql 'A'

      it 'should assume unlisted vars come after listed vars', ->


        solver = new Solver
        solver.addVar
          id: 'A'
        solver.addVar
          id: 'B'
        solver.addVar
          id: 'C'
        solver.prepare
          distribute:
            var: 'list'
            var_priority: ['A', 'C']

        fdvar = distribution_get_next_var solver.space, solver.space, ['A', 'B', 'C']
        expect(fdvar.id, 'A and C should go before B').to.eql 'A'
        fdvar = distribution_get_next_var solver.space, solver.space, ['A', 'B']
        expect(fdvar.id, 'A should go before B').to.eql 'A'
        fdvar = distribution_get_next_var solver.space, solver.space, ['B', 'C']
        expect(fdvar.id, 'C should go before B').to.eql 'C'
        fdvar = distribution_get_next_var solver.space, solver.space, ['B']
        expect(fdvar.id, 'B is only one left').to.eql 'B'
