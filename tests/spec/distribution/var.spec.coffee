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
    fdvar_create
    fdvar_create_bool
  } = FD.Fdvar

  describe 'distribution_var_by_throw', ->

    it 'should throw', ->

      expect(-> FD.distribution.var.distribution_get_next_var {config_next_var_func: 'throw'}, {}).to.throw 'not expecting to pick this distributor'
