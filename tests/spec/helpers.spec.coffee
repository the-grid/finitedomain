if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

{expect, assert} = chai
FD = finitedomain

describe "helpers.spec", ->

  unless FD.__DEV_BUILD
    return

  {
    helpers
  } = FD

  it 'should exist', ->

    expect(helpers?).to.be.true

  describe 'ASSERT', ->

    {
      ASSERT
    } = helpers

    it 'should exist', ->

      expect(ASSERT?).to.be.true

    it 'should do nothing when you pass true', ->

      expect(ASSERT true).to.be.undefined

    it 'should throw if you pass on false', ->

      expect(-> ASSERT false).to.throw()
