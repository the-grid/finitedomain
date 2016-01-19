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
    Fdvar
    Solver
  } = FD

  {
    BETTER
    SAME
    WORSE

    distribution_get_next_var
    _distribution_var_min: by_min
    _distribution_var_max: by_max
    _distribution_var_size: by_min_size
    _distribution_var_markov: by_markov
    _distribution_var_list: by_list
  } = FD.distribution.var

  {
    fdvar_create
  } = Fdvar


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

    describe 'unit', ->

      it 'should return BETTER if lo(v1) < lo(v2)', ->

        v1 = fdvar_create '1', [10, 11]
        v2 = fdvar_create '2', [11, 11]

        expect(by_min v1, v2).to.equal BETTER

      it 'should return SAME if lo(v1) = lo(v2)', ->

        v1 = fdvar_create '1', [11, 11]
        v2 = fdvar_create '2', [11, 11]

        expect(by_min v1, v2).to.equal SAME

      it 'should return WORSE if lo(v1) > lo(v2)', ->

        v1 = fdvar_create '1', [12, 11]
        v2 = fdvar_create '2', [11, 11]

        expect(by_min v1, v2).to.equal WORSE

    describe 'integration', ->

      it_ab 'min', [0, 1], [10, 11], 'A', 'should decide on lowest vars first A'
      it_ab 'min', [20, 30], [5, 8], 'B', 'should decide on lowest vars first B'
      it_ab 'min', [9, 21], [10, 20], 'A', 'should base decision on lowest lo, not lowest hi'

  describe 'by_max', ->

    describe 'unit', ->

      it 'should return BETTER if hi(v1) > hi(v2)', ->

        v1 = fdvar_create '1', [11, 12]
        v2 = fdvar_create '2', [11, 11]

        expect(by_max v1, v2).to.equal BETTER

      it 'should return SAME if hi(v1) = hi(v2)', ->

        v1 = fdvar_create '1', [11, 11]
        v2 = fdvar_create '2', [11, 11]

        expect(by_max v1, v2).to.equal SAME

      it 'should return WORSE if hi(v1) < hi(v2)', ->

        v1 = fdvar_create '1', [11, 10]
        v2 = fdvar_create '2', [11, 11]

        expect(by_max v1, v2).to.equal WORSE

    describe 'integration', ->

      it_ab 'max', [0, 1], [10, 11], 'B', 'should decide on highest vars first A'
      it_ab 'max', [20, 30], [5, 8], 'A', 'should decide on highest vars first B'
      it_ab 'max', [9, 21], [10, 20], 'A', 'should base decision on highest hi, not highest lo'

  describe 'by_size', ->

    describe 'unit', ->

      # note: further tests should be unit tests on domain_size instead

      it 'should return BETTER if size(v1) < size(v2)', ->

        v1 = fdvar_create '1', [5, 5]
        v2 = fdvar_create '2', [11, 12]

        expect(by_min_size v1, v2).to.equal BETTER

      it 'should return SAME if size(v1) = size(v2) with single range', ->

        v1 = fdvar_create '1', [11, 11]
        v2 = fdvar_create '2', [8, 8]

        expect(by_min_size v1, v2).to.equal SAME

      it 'should return SAME if size(v1) = size(v2) with multiple ranges', ->

        v1 = fdvar_create '1', spec_d_create_ranges [11, 11], [15, 19]
        v2 = fdvar_create '2', spec_d_create_ranges [8, 10], [12, 14]

        expect(by_min_size v1, v2).to.equal SAME

      it 'should return SAME if size(v1) = size(v2) with different range count', ->

        v1 = fdvar_create '1', spec_d_create_ranges [11, 11], [13, 14], [18, 19]
        v2 = fdvar_create '2', spec_d_create_ranges [8, 10], [12, 13]

        expect(by_min_size v1, v2).to.equal SAME

      it 'should return WORSE if size(v1) > size(v2)', ->

        v1 = fdvar_create '1', [11, 12]
        v2 = fdvar_create '2', [11, 11]

        expect(by_min_size v1, v2).to.equal WORSE

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

    describe 'unit', ->

      it 'should say v1 is BETTER if v1 is a markov var', ->

        v1 = fdvar_create 'A', [11, 12]
        v2 = fdvar_create 'B', [11, 11]
        fake_space = config_var_dist_options: A: distributor_name: 'markov'

        expect(by_markov v1, v2, fake_space).to.equal BETTER

      it 'should say v2 is WORSE if v1 not a markov but v2 is', ->

        v1 = fdvar_create 'A', [11, 12]
        v2 = fdvar_create 'B', [11, 11]
        fake_space = config_var_dist_options: B: distributor_name: 'markov'

        expect(by_markov v1, v2, fake_space).to.equal WORSE

      it 'should say v1 is BETTER if v1 and v2 are both markov vars', ->

        v1 = fdvar_create 'A', [11, 12]
        v2 = fdvar_create 'B', [11, 11]
        fake_space =
          config_var_dist_options:
            A: distributor_name: 'markov'
            B: distributor_name: 'markov'

        expect(by_markov v1, v2, fake_space).to.equal BETTER

      it 'should say v1 is SAME as v2 if neither is a markov var', ->

        v1 = fdvar_create 'A', [11, 12]
        v2 = fdvar_create 'B', [11, 11]
        fake_space = config_var_dist_options: {}
        fake_config = {} # its okay to expect this to exist

        expect(by_markov v1, v2, fake_space, fake_config).to.equal SAME

      it 'should use fallback if available and vars are SAME and then return BETTER', ->

        v1 = fdvar_create 'A', [11, 11]
        v2 = fdvar_create 'B', [11, 12]
        fake_space = config_var_dist_options: {} # neither is markov
        fallback_config = fallback_config: 'size'

        expect(by_markov v1, v2, fake_space, fallback_config).to.equal BETTER

      it 'should use fallback if available and vars are SAME but then still return SAME', ->

        v1 = fdvar_create 'A', [11, 11]
        v2 = fdvar_create 'B', [11, 11]
        fake_space = config_var_dist_options: {} # neither is markov
        fallback_config = fallback_config: 'size'

        expect(by_markov v1, v2, fake_space, fallback_config).to.equal SAME

      it 'should use fallback if available and vars are SAME and then return WORSE', ->

        v1 = fdvar_create 'A', [11, 12]
        v2 = fdvar_create 'B', [11, 11]
        fake_space = config_var_dist_options: {} # neither is markov
        fallback_config = fallback_config: 'size'

        expect(by_markov v1, v2, fake_space, fallback_config).to.equal WORSE

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

    describe 'unit', ->

      it 'should return BETTER if the priority hash says A is higher than B', ->

        v1 = fdvar_create 'A', []
        v2 = fdvar_create 'B', []
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash:
            A: 2
            B: 1

        expect(by_list v1, v2, fake_space, {}).to.equal BETTER

      it 'should THROW if the priority hash says A is equal to B', ->

        v1 = fdvar_create 'A', []
        v2 = fdvar_create 'B', []
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash:
            A: 2
            B: 2

        expect(-> by_list v1, v2, fake_space, {}).to.throw


      it 'should return WORSE if the priority hash says A is lower than B', ->

        v1 = fdvar_create 'A', []
        v2 = fdvar_create 'B', []
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash:
            A: 1
            B: 2

        expect(by_list v1, v2, fake_space, {}).to.equal WORSE

      it 'should return BETTER if A is in the hash but B is not', ->

        v1 = fdvar_create 'A', []
        v2 = fdvar_create 'B', []
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash:
            A: 2

        expect(by_list v1, v2, fake_space, {}).to.equal BETTER

      it 'should return WORSE if B is in the hash but A is not', ->

        v1 = fdvar_create 'A', []
        v2 = fdvar_create 'B', []
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash:
            B: 2

        expect(by_list v1, v2, fake_space, {}).to.equal WORSE

      it 'should throw if A gets value 0 from the hash', ->

        v1 = fdvar_create 'A', []
        v2 = fdvar_create 'B', []
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash:
            A: 0

        expect(-> by_list v1, v2, fake_space, {}).to.throw

      it 'should throw if B gets value 0 from the hash', ->

        v1 = fdvar_create 'A', []
        v2 = fdvar_create 'B', []
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash:
            B: 2

        expect(-> by_list v1, v2, fake_space, {}).to.throw

      it 'should return SAME if neither A nor B is in the hash without fallback', ->

        v1 = fdvar_create 'A', []
        v2 = fdvar_create 'B', []
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash: {}

        expect(by_list v1, v2, fake_space, {}).to.equal SAME

      it 'should return BETTER if neither is in the hash and fallback is size with A smaller', ->

        v1 = fdvar_create 'A', [0, 0]
        v2 = fdvar_create 'B', [0, 10]
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash: {}
        fallback =
          fallback_config: 'size'

        expect(by_list v1, v2, fake_space, fallback).to.equal BETTER

      it 'should return SAME if neither is in the hash and fallback is size with A same size as B', ->

        v1 = fdvar_create 'A', [0, 10]
        v2 = fdvar_create 'B', [0, 10]
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash: {}
        fallback =
          fallback_config: 'size'

        expect(by_list v1, v2, fake_space, fallback).to.equal SAME

      it 'should return WORSE if neither is in the hash and fallback is size with A larger', ->

        v1 = fdvar_create 'A', [0, 10]
        v2 = fdvar_create 'B', [0, 0]
        fake_space =
          config_var_dist_options: {}
          config_var_priority_hash: {}
        fallback =
          fallback_config: 'size'

        expect(by_list v1, v2, fake_space, fallback).to.equal WORSE

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

  describe 'fallback list -> markov -> size', ->

    # each test will ask for a var and supply a more limited list of vars

    solver = new Solver
    solver.addVar
      id: 'A_list'
      domain: [0, 10]
    solver.addVar
      id: 'B_list'
      domain: [0, 20]
    solver.addVar
      id: 'C_markov'
      domain: [0, 100]
      distributeOptions:
        distributor_name: 'markov'
        expandVectorsWith: 1
    solver.addVar
      id: 'D_markov'
      domain: [0, 50]
      distributeOptions:
        distributor_name: 'markov'
        expandVectorsWith: 1
    solver.addVar
      id: 'E_pleb'
      domain: [0, 100]
    solver.addVar
      id: 'F_pleb'
      domain: [0, 75]
    solver.prepare
      distribute:
        var_priority: ['B_list', 'A_list']
        var:
          dist_name: 'list'
          fallback_config:
            dist_name: 'markov'
            fallback_config: 'size'

    it 'base test: should get highest priority on the list; A_list', ->

      fdvar = distribution_get_next_var solver.space, solver.space, ['A_list', 'B_list', 'C_markov', 'D_markov', 'E_pleb', 'F_pleb']

      expect(fdvar.id).to.equal 'B_list'

    it 'missing first item from list', ->

      fdvar = distribution_get_next_var solver.space, solver.space, ['A_list', 'C_markov', 'D_markov', 'E_pleb', 'F_pleb']

      expect(fdvar.id).to.equal 'A_list'

    it 'nothing on list, fallback to markov, get last markov', ->

      fdvar = distribution_get_next_var solver.space, solver.space, ['C_markov', 'D_markov', 'E_pleb', 'F_pleb']

      expect(fdvar.id).to.equal 'D_markov'

    it 'nothing on list, fallback to markov, get only markov', ->

      fdvar = distribution_get_next_var solver.space, solver.space, ['C_markov', 'E_pleb', 'F_pleb']

      expect(fdvar.id).to.equal 'C_markov'

    it 'nothing on list, no markov vars, pick smallest by size', ->

      fdvar = distribution_get_next_var solver.space, solver.space, ['E_pleb', 'F_pleb']

      expect(fdvar.id).to.equal 'F_pleb'

    it 'nothing on list, no markov vars, pick only var left', ->

      fdvar = distribution_get_next_var solver.space, solver.space, ['E_pleb']

      expect(fdvar.id).to.equal 'E_pleb'

    it 'should just return undefined despite config', ->

      fdvar = distribution_get_next_var solver.space, solver.space, []

      expect(fdvar.id).to.equal undefined

    it 'dont crash on randomized inclusion and order', ->

      all = ['A_list', 'B_list', 'C_markov', 'D_markov', 'E_pleb', 'F_pleb']
      for [0..20]
        # randomly remove elements from the list
        names = all.filter -> Math.random() > 0.3
        # shuffle list the ugly way
        names.sort -> Math.random() - .5

        expect(-> distribution_get_next_var solver.space, solver.space, names).not.to.throw
