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
    propagator_add_eq
    propagator_add_gt
    propagator_add_gte
    propagator_add_lt
    propagator_add_lte
    propagator_add_markov
    propagator_add_neq
    propagator_add_plus
    propagator_add_product
    propagator_add_reified
    propagator_add_scale
    propagator_add_sum
    propagator_add_times
    propagator_add_times_plus
    propagator_add_wsum
  } = FD.propagator


  {
    space_add_var
    space_create_root
  } = FD.space

  describe 'propagator_add_markov', ->

    it 'should not crash', ->

      expect(propagator_add_markov space_create_root(), 'foo').to.be.undefined

  describe 'propagator_add_reified', ->

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
