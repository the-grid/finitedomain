if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'
  require '../fixtures/helpers.spec'

  {
  spec_d_create_bool
  spec_d_create_range
  spec_d_create_ranges
  spec_d_create_value
  spec_d_create_zero
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe 'config.spec', ->

  unless FD.__DEV_BUILD
    return

  {
    config_add_constant
    config_add_var
    config_add_var_value
    config_add_vars_a
    config_add_vars_o
    config_create
    config_set_defaults # TOFIX: test
    config_set_options # TOFIX: test
  } = FD.config

  describe 'config_create', ->

    it 'should return an object', ->

      expect(undefined).not.to.be.an.object # make sure .object works as intended
      expect(config_create()).to.be.an.object

  describe 'config_add_constant', ->

    it 'should add the value', ->

      config = config_create()
      name = config_add_constant config, 15

      expect(config.all_var_names.indexOf name).to.be.at.least 0
      expect(config.constant_uid).to.be.above 0
      expect(config.initial_vars[name]).to.equal 15

    it 'should populate the constant cache', ->

      config = config_create()
      name = config_add_constant config, 15

      expect(config.constant_cache[15]).to.equal name

    it 'should reuse the constant cache if available', ->

      config = config_create()
      name1 = config_add_constant config, 1
      name2 = config_add_constant config, 2
      name3 = config_add_constant config, 1

      expect(name1).to.not.equal name2
      expect(name1).to.equal name3

  describe 'config_add_var', ->

    it 'should accept domain as param', ->

      config = config_create()
      config_add_var config, 'A', [0, 1]

      expect(config.initial_vars.A).to.eql [0, 1]

    it 'should clone the input domains', ->

      d = [0, 1]
      config = config_create()
      config_add_var config, 'A', d

      expect(config.initial_vars.A).to.eql d
      expect(config.initial_vars.A).not.to.equal d

    it 'should accept a number', ->

      config = config_create()
      config_add_var config, 'A', 5

      expect(config.initial_vars.A).to.eql 5

    it 'should accept two numbers', ->

      config = config_create()
      config_add_var config, 'A', 5, 20

      expect(config.initial_vars.A).to.eql [5, 20]

    it 'should accept undefined', ->

      config = config_create()
      config_add_var config, 'A'

      expect(config.initial_vars.A).to.eql undefined


  describe 'config_add_var_value', ->

    it 'should accept domain as param', ->

      config = config_create()
      config_add_var_value config, 'A', [0, 1]

      expect(config.initial_vars.A).to.eql [0, 1]

    it 'should not clone the input domains', ->

      d = [0, 1]
      config = config_create()
      config_add_var_value config, 'A', d

      expect(config.initial_vars.A).to.eql d
      expect(config.initial_vars.A).to.equal d

    it 'should accept a number', ->

      config = config_create()
      config_add_var_value config, 'A', 5

      expect(config.initial_vars.A).to.eql 5

    it 'should only use one number even if given two', ->

      config = config_create()
      config_add_var_value config, 'A', 5, 20

      expect(config.initial_vars.A).to.eql 5

    it 'should accept undefined', ->

      config = config_create()
      config_add_var_value config, 'A'

      expect(config.initial_vars.A).to.eql undefined
      expect(config.all_var_names).to.contain 'A'

  describe 'config_add_vars_a', ->

    it 'should add all vars in the array with domain', ->

      config = config_create()
      config_add_vars_a config, [
        'A', 'B', 'C'
      ], [0, 1]

      expect(config.initial_vars.A).to.eql [0, 1]
      expect(config.initial_vars.B).to.eql [0, 1]
      expect(config.initial_vars.C).to.eql [0, 1]

    it 'should add all vars in the array with lo', ->

      config = config_create()
      config_add_vars_a config, [
        'A', 'B', 'C'
      ], 0

      expect(config.initial_vars.A).to.eql 0
      expect(config.initial_vars.B).to.eql 0
      expect(config.initial_vars.C).to.eql 0


    it 'should add all vars in the array with lo, hi', ->

      config = config_create()
      config_add_vars_a config, [
        'A', 'B', 'C'
      ], 10, 20

      expect(config.initial_vars.A).to.eql [10, 20]
      expect(config.initial_vars.B).to.eql [10, 20]
      expect(config.initial_vars.C).to.eql [10, 20]
      expect(config.initial_vars.A).to.not.equal config.initial_vars.B
      expect(config.initial_vars.B).to.not.equal config.initial_vars.C

    it 'should add all vars with the array with no domain', ->

      config = config_create()
      config_add_vars_a config, [
        'A', 'B', 'C'
      ]

      expect(config.initial_vars.A).to.eql undefined
      expect(config.initial_vars.B).to.eql undefined
      expect(config.initial_vars.C).to.eql undefined
      expect(config.all_var_names).to.contain 'A'
      expect(config.all_var_names).to.contain 'B'
      expect(config.all_var_names).to.contain 'C'

  describe 'config_add_vars_o', ->

    it 'should add all vars in the array with domain', ->

      config = config_create()
      config_add_vars_o config,
        A: [0, 1]
        B: [0, 1]
        C: [0, 1]

      expect(config.initial_vars.A).to.eql [0, 1]
      expect(config.initial_vars.B).to.eql [0, 1]
      expect(config.initial_vars.C).to.eql [0, 1]

    it 'should add all vars in the array with lo', ->

      config = config_create()
      config_add_vars_o config,
        A: 20
        B: 30
        C: 40

      expect(config.initial_vars.A).to.eql 20
      expect(config.initial_vars.B).to.eql 30
      expect(config.initial_vars.C).to.eql 40

    it 'should add all vars with the array with no domain', ->

      config = config_create()
      config_add_vars_o config,
        A: undefined
        B: undefined
        C: undefined

      expect(config.initial_vars.A).to.eql undefined
      expect(config.initial_vars.B).to.eql undefined
      expect(config.initial_vars.C).to.eql undefined
      expect(config.all_var_names).to.contain 'A'
      expect(config.all_var_names).to.contain 'B'
      expect(config.all_var_names).to.contain 'C'
