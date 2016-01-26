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
    space_create_root
  } = FD.space

  describe 'propagator_add_markov', ->

    it 'should not crash', ->

      expect(propagator_add_markov space_create_root(), 'foo').to.be.undefined
