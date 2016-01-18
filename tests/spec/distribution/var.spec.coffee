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

describe 'var.spec', ->

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

    it_ab 'min', [0, 1], [10, 11], 'A', 'should decide on lowest vars first A'
    it_ab 'min', [20, 30], [5, 8], 'B', 'should decide on lowest vars first B'
    it_ab 'min', [9, 21], [10, 20], 'A', 'should base decision on lowest lo, not lowest hi'

  describe 'by_max', ->

    it_ab 'max', [0, 1], [10, 11], 'B', 'should decide on highest vars first A'
    it_ab 'max', [20, 30], [5, 8], 'A', 'should decide on highest vars first B'
    it_ab 'max', [9, 21], [10, 20], 'A', 'should base decision on highest hi, not highest lo'

  describe 'by_size', ->

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
