if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'
  require '../fixtures/helpers.spec'

  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_value
    spec_d_create_ranges
    strip_anon_vars
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "propagator.spec", ->

  unless FD.__DEV_BUILD
    return

  # TOFIX: add tests for all these propagators. there never have been but most functions here are trivial to test.

  {
    propagator_add_callback
    propagator_add_distinct
    propagator_add_div
    propagator_add_eq
    propagator_add_gt
    propagator_add_gte
    propagator_add_lt
    propagator_add_lte
    propagator_add_markov
    propagator_add_min
    propagator_add_mul
    propagator_add_neq
    propagator_add_plus
    propagator_add_product
    propagator_add_reified
    propagator_add_scale
    propagator_add_ring_mul
    propagator_add_sum

    _propagator_add_ring_plus_or_mul
  } = FD.propagator

  {
    space_add_var
    space_create_root
  } = FD.space

  describe 'propagator_add_markov', ->

    it 'should not crash', ->

      expect(propagator_add_markov space_create_root(), 'foo').to.be.undefined

  describe 'propagator_add_reified', ->

    it 'should accept numbers for anonymous var A', ->

      space = space_create_root()
      space_add_var space, 'B'
      space_add_var space, 'C'

      expect(-> propagator_add_reified space, 'eq', 0, 'B', 'C').not.to.throw()

    it 'should accept numbers for anonymous var B', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'C'

      expect(-> propagator_add_reified space, 'eq', 'A', 0, 'C').not.to.throw()

    it 'should throw if left and right vars are anonymous vars', ->

      space = space_create_root()
      space_add_var space, 'C'

      expect(-> propagator_add_reified space, 'eq', 0, 0, 'C').to.throw()

    describe 'bool var domain', ->

      it 'should throw if the boolvar has no zero or one', ->

        space = space_create_root()
        space_add_var space, 'A'
        space_add_var space, 'B'
        space_add_var space, 'C', 2, 3

        expect(-> propagator_add_reified space, 'eq', 'A', 'B', 'C').to.throw

      it 'should be fine if the boolvar has no one', ->

        space = space_create_root()
        space_add_var space, 'A'
        space_add_var space, 'B'
        space_add_var space, 'C', 0, 0

        expect(propagator_add_reified space, 'eq', 'A', 'B', 'C').to.eql 'C'

      it 'should be fine if the boolvar has no zero', ->

        space = space_create_root()
        space_add_var space, 'A'
        space_add_var space, 'B'
        space_add_var space, 'C', 1, 5

        expect(propagator_add_reified space, 'eq', 'A', 'B', 'C').to.eql 'C'

      it 'should be fine if the boolvar has more than zero and one', ->

        space = space_create_root()
        space_add_var space, 'A'
        space_add_var space, 'B'
        space_add_var space, 'C', 0, 3

        expect(propagator_add_reified space, 'eq', 'A', 'B', 'C').to.eql 'C'

      it 'should reduce the domain to bool if not already', ->

        space = space_create_root()
        space_add_var space, 'A'
        space_add_var space, 'B'
        space_add_var space, 'C', 0, 3
        propagator_add_reified space, 'eq', 'A', 'B', 'C'

        expect(space.vars.C.dom).to.eql spec_d_create_bool()

      it 'should accept a number for boolvar', ->

        space = space_create_root()
        space_add_var space, 'A'
        space_add_var space, 'B'

        expect(-> propagator_add_reified space, 'eq', 'A', 'B', 0).not.to.throw()

      it 'should return the name of the anon boolvar', ->

        space = space_create_root()
        space_add_var space, 'A'
        space_add_var space, 'B'

        expect(typeof propagator_add_reified space, 'eq', 'A', 'B', 0).to.eql 'string'

      it 'should return the name of the named boolvar', ->

        space = space_create_root()
        space_add_var space, 'A'
        space_add_var space, 'B'
        space_add_var space, 'C'

        expect(propagator_add_reified space, 'eq', 'A', 'B', 'C').to.eql 'C'

  describe 'propagator_add_eq', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        space = space_create_root()
        space_add_var space, 'B'

        expect(-> propagator_add_eq space, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        space = space_create_root()
        space_add_var space, 'A'

        expect(-> propagator_add_eq space, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        space = space_create_root()

        expect(-> propagator_add_eq space, 0, 0).to.throw()

  describe 'propagator_add_lt', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        space = space_create_root()
        space_add_var space, 'B'

        expect(-> propagator_add_lt space, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        space = space_create_root()
        space_add_var space, 'A'

        expect(-> propagator_add_lt space, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        space = space_create_root()

        expect(-> propagator_add_lt space, 0, 0).to.throw()

  describe 'propagator_add_lte', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        space = space_create_root()
        space_add_var space, 'B'

        expect(-> propagator_add_lte space, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        space = space_create_root()
        space_add_var space, 'A'

        expect(-> propagator_add_lte space, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        space = space_create_root()

        expect(-> propagator_add_lte space, 0, 0).to.throw()

  describe 'propagator_add_gt', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        space = space_create_root()
        space_add_var space, 'B'

        expect(-> propagator_add_gt space, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        space = space_create_root()
        space_add_var space, 'A'

        expect(-> propagator_add_gt space, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        space = space_create_root()

        expect(-> propagator_add_gt space, 0, 0).to.throw()

  describe 'propagator_add_gte', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        space = space_create_root()
        space_add_var space, 'B'

        expect(-> propagator_add_gte space, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        space = space_create_root()
        space_add_var space, 'A'

        expect(-> propagator_add_gte space, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        space = space_create_root()

        expect(-> propagator_add_gte space, 0, 0).to.throw()

  describe '_propagator_add_ring_plus_or_mul', ->

    it 'should return the name of the anonymous result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'

      expect(typeof _propagator_add_ring_plus_or_mul space, 'div', 'mul', 'A', 'B', 0).to.eql 'string'

    it 'should return the name of the named result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'
      space_add_var space, 'C'

      expect(_propagator_add_ring_plus_or_mul space, 'div', 'mul', 'A', 'B', 'C').to.eql 'C'

  describe 'propagator_add_sum', ->

    it 'should return the name of the anonymous result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'
      space_add_var space, 'C'

      expect(typeof propagator_add_sum space, ['A', 'B', 'C']).to.eql 'string'

    it 'should return the name of the named result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'
      space_add_var space, 'C'
      space_add_var space, 'D'

      expect(propagator_add_sum space, ['A', 'B', 'C'], 'D').to.eql 'D'

    it 'should allow anonymous numbers in the list of vars', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'C'
      space_add_var space, 'D'

      expect(propagator_add_sum space, ['A', 5, 'C'], 'D').to.eql 'D'

    it 'should throw if you dont pass on any vars', ->

      space = space_create_root()
      space_add_var space, 'A'

      expect(-> propagator_add_sum space, [], 'A').to.throw()

    it 'should throw if you dont pass on an array', ->

      space = space_create_root()
      space_add_var space, 'A'

      expect(-> propagator_add_sum space undefined, 'A').to.throw()
      expect(-> propagator_add_sum space, 'X', 'A').to.throw()
      expect(-> propagator_add_sum space, 5, 'A').to.throw()
      expect(-> propagator_add_sum space, null, 'A').to.throw()

  describe 'propagator_add_product', ->

    it 'should return the name of the anonymous result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'
      space_add_var space, 'C'

      expect(typeof propagator_add_product space, ['A', 'B', 'C']).to.eql 'string'

    it 'should return the name of the named result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'
      space_add_var space, 'C'
      space_add_var space, 'D'

      expect(propagator_add_product space, ['A', 'B', 'C'], 'D').to.eql 'D'

  describe 'propagator_add_min', ->

    it 'should return the name of the anonymous result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'

      expect(typeof propagator_add_min space, 'A', 'B').to.eql 'string'

    it 'should return the name of the named result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'
      space_add_var space, 'C'

      expect(propagator_add_min space, 'A', 'B', 'C').to.eql 'C'

  describe 'propagator_add_div', ->

    it 'should return the name of the anonymous result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'

      expect(typeof propagator_add_div space, 'A', 'B').to.eql 'string'

    it 'should return the name of the named result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'
      space_add_var space, 'C'

      expect(propagator_add_div space, 'A', 'B', 'C').to.eql 'C'

  describe 'propagator_add_mul', ->

    it 'should return the name of the anonymous result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'

      expect(typeof propagator_add_mul space, 'A', 'B').to.eql 'string'

    it 'should return the name of the named result var', ->

      space = space_create_root()
      space_add_var space, 'A'
      space_add_var space, 'B'
      space_add_var space, 'C'

      expect(propagator_add_mul space, 'A', 'B', 'C').to.eql 'C'
