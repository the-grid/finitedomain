if typeof require is 'function'
  finitedomain = require('../../src/index')
  chai = require 'chai'

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

    it 'should pass true if propagator has no vars', ->

      expect(propagator_is_solved {propdata: []}).to.be.true

    it 'should skip the first elemenet', ->

      expect(propagator_is_solved {propdata: [0]}).to.be.true

    it 'should return false if at least one var is undetermined', ->

      expect(propagator_is_solved {propdata: [0, {dom: [[0,0]]}]}).to.be.true

    it 'should return true if no var is undetermined', ->

      expect(propagator_is_solved {propdata: [0, {dom: [[0,0],[1,1]]}]}).to.be.false

    it 'should loop through all vars', ->

      expect(propagator_is_solved {
        propdata: [
          0, # "space"... for now.
          {dom: [[0,0]]}
          {dom: [[0,0],[1,1]]}
          {dom: [[0,0]]}
        ]
      }).to.be.false
