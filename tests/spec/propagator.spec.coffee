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
    config_create
  } = FD.config

  describe 'propagator_add_markov', ->

    it 'should not crash', ->

      expect(propagator_add_markov config_create(), 'foo').to.be.undefined

  describe 'propagator_add_reified', ->

    it 'should accept numbers for anonymous var A', ->

      config = config_create()

      propagator_add_reified config, 'eq', 0, 'B', 'C'

      expect(-> propagator_add_reified config, 'eq', 0, 'B', 'C').not.to.throw()

    it 'should accept numbers for anonymous var B', ->

      config = config_create()

      expect(-> propagator_add_reified config, 'eq', 'A', 0, 'C').not.to.throw()

    it 'should throw if left and right vars are anonymous vars', ->

      config = config_create()

      expect(-> propagator_add_reified config, 'eq', 0, 0, 'C').to.throw()

    describe 'bool var domain', ->

      it 'should throw if the boolvar has no zero or one', ->

        config = config_create()

        expect(-> propagator_add_reified config, 'eq', 'A', 'B', 'C').to.throw

      it 'should be fine if the boolvar has no one', ->

        config = config_create()

        expect(propagator_add_reified config, 'eq', 'A', 'B', 'C').to.eql 'C'

      it 'should be fine if the boolvar has no zero', ->

        config = config_create()

        expect(propagator_add_reified config, 'eq', 'A', 'B', 'C').to.eql 'C'

      it 'should be fine if the boolvar has more than zero and one', ->

        config = config_create()

        expect(propagator_add_reified config, 'eq', 'A', 'B', 'C').to.eql 'C'

      # TOFIX: re-enable this test when the check is back in place
      it.skip 'should reduce the domain to bool if not already', ->

        config = config_create()
        propagator_add_reified config, 'eq', 'A', 'B', 'C'

        expect(config.initial_vars.C).to.eql spec_d_create_bool()

      it 'should accept a number for boolvar', ->

        config = config_create()

        expect(-> propagator_add_reified config, 'eq', 'A', 'B', 0).not.to.throw()

      it 'should return the name of the anon boolvar', ->

        config = config_create()

        expect(typeof propagator_add_reified config, 'eq', 'A', 'B', 0).to.eql 'string'

      it 'should return the name of the named boolvar', ->

        config = config_create()

        expect(propagator_add_reified config, 'eq', 'A', 'B', 'C').to.eql 'C'

  describe 'propagator_add_eq', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        config = config_create()

        expect(-> propagator_add_eq config, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        config = config_create()

        expect(-> propagator_add_eq config, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        config = config_create()

        expect(-> propagator_add_eq config, 0, 0).to.throw()

  describe 'propagator_add_lt', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        config = config_create()

        expect(-> propagator_add_lt config, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        config = config_create()

        expect(-> propagator_add_lt config, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        config = config_create()

        expect(-> propagator_add_lt config, 0, 0).to.throw()

  describe 'propagator_add_lte', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        config = config_create()

        expect(-> propagator_add_lte config, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        config = config_create()

        expect(-> propagator_add_lte config, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        config = config_create()

        expect(-> propagator_add_lte config, 0, 0).to.throw()

  describe 'propagator_add_gt', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        config = config_create()

        expect(-> propagator_add_gt config, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        config = config_create()

        expect(-> propagator_add_gt config, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        config = config_create()

        expect(-> propagator_add_gt config, 0, 0).to.throw()

  describe 'propagator_add_gte', ->

    describe 'numbers as anonymous vars', ->

      it 'should accept a number for var1', ->

        config = config_create()

        expect(-> propagator_add_gte config, 0, 'B').not.to.throw()

      it 'should accept a number for var2', ->

        config = config_create()

        expect(-> propagator_add_gte config, 'A', 0).not.to.throw()

      it 'should throw if both vars are anonymous numbers', ->

        config = config_create()

        expect(-> propagator_add_gte config, 0, 0).to.throw()

  describe '_propagator_add_ring_plus_or_mul', ->

    it 'should return the name of the anonymous result var', ->

      config = config_create()

      expect(typeof _propagator_add_ring_plus_or_mul config, 'div', 'mul', 'A', 'B', 0).to.eql 'string'

    it 'should return the name of the named result var', ->

      config = config_create()

      expect(_propagator_add_ring_plus_or_mul config, 'div', 'mul', 'A', 'B', 'C').to.eql 'C'

  describe 'propagator_add_sum', ->

    it 'should return the name of the anonymous result var', ->

      config = config_create()

      expect(typeof propagator_add_sum config, ['A', 'B', 'C']).to.eql 'string'

    it 'should return the name of the named result var', ->

      config = config_create()

      expect(propagator_add_sum config, ['A', 'B', 'C'], 'D').to.eql 'D'

    it 'should allow anonymous numbers in the list of vars', ->

      config = config_create()

      expect(propagator_add_sum config, ['A', 5, 'C'], 'D').to.eql 'D'

    it 'should throw if you dont pass on any vars', ->

      config = config_create()

      expect(-> propagator_add_sum config, [], 'A').to.throw()

    it 'should throw if you dont pass on an array', ->

      config = config_create()

      expect(-> propagator_add_sum config undefined, 'A').to.throw()
      expect(-> propagator_add_sum config, 'X', 'A').to.throw()
      expect(-> propagator_add_sum config, 5, 'A').to.throw()
      expect(-> propagator_add_sum config, null, 'A').to.throw()

  describe 'propagator_add_product', ->

    it 'should return the name of the anonymous result var', ->

      config = config_create()

      expect(typeof propagator_add_product config, ['A', 'B', 'C']).to.eql 'string'

    it 'should return the name of the named result var', ->

      config = config_create()

      expect(propagator_add_product config, ['A', 'B', 'C'], 'D').to.eql 'D'

  describe 'propagator_add_min', ->

    it 'should return the name of the anonymous result var', ->

      config = config_create()

      expect(typeof propagator_add_min config, 'A', 'B').to.eql 'string'

    it 'should return the name of the named result var', ->

      config = config_create()

      expect(propagator_add_min config, 'A', 'B', 'C').to.eql 'C'

  describe 'propagator_add_div', ->

    it 'should return the name of the anonymous result var', ->

      config = config_create()

      expect(typeof propagator_add_div config, 'A', 'B').to.eql 'string'

    it 'should return the name of the named result var', ->

      config = config_create()

      expect(propagator_add_div config, 'A', 'B', 'C').to.eql 'C'

  describe 'propagator_add_mul', ->

    it 'should return the name of the anonymous result var', ->

      config = config_create()

      expect(typeof propagator_add_mul config, 'A', 'B').to.eql 'string'

    it 'should return the name of the named result var', ->

      config = config_create()

      expect(propagator_add_mul config, 'A', 'B', 'C').to.eql 'C'
