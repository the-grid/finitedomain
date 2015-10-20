if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_one
    spec_d_create_range
    spec_d_create_ranges
    spec_d_create_value
    spec_d_create_zero
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "FD - Propagator", ->

  {Propagator} = FD

  it 'should exist', ->

    expect(Propagator?).to.be.true

  describe 'propagator_is_solved', ->

    {propagator_is_solved} = Propagator

    it 'should exist', ->

      expect(propagator_is_solved?).to.be.true

    it 'should pass true regardless if propagator is already marked solved', ->

      expect(propagator_is_solved {solved: true}).to.be.true

    it 'should return false if at least one var is undetermined', ->

      fake_prop =
        fdvar1: {dom: spec_d_create_range(0, 1)}
        fdvar2: {dom: spec_d_create_range(0, 1)}
        fdvar3: {dom: spec_d_create_range(0, 1)}
      expect(propagator_is_solved fake_prop).to.be.false

    it 'should return false even if a var has multiple "single" ranges', ->

      fake_prop =
        fdvar1: {dom: spec_d_create_value 0}
        fdvar3: {dom: spec_d_create_ranges([0, 0], [2, 2])}
        fdvar2: {dom: spec_d_create_value 1}
      expect(propagator_is_solved fake_prop).to.be.false

    it 'should return true if no var is undetermined', ->

      fake_prop =
        fdvar1: {dom: spec_d_create_value 0}
        fdvar2: {dom: spec_d_create_value 1}
        fdvar3: {dom: spec_d_create_value 20}
      expect(propagator_is_solved fake_prop).to.be.true

    it 'should loop through all vars', ->

      fake_prop =
        fdvar1: {dom: spec_d_create_value 0}
        fdvar2: {dom: spec_d_create_value 1}
        fdvar3: {dom: spec_d_create_range 0, 1}
      expect(propagator_is_solved fake_prop).to.be.false
