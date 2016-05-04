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
    _config_add_var_value
    config_add_vars_a
    config_add_vars_o
    config_create
    config_create_with # TOFIX: test
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


  describe '_config_add_var_value', ->

    it 'should accept domain as param', ->

      config = config_create()
      _config_add_var_value config, 'A', [0, 1]

      expect(config.initial_vars.A).to.eql [0, 1]

    it 'should not clone the input domains', ->

      d = [0, 1]
      config = config_create()
      _config_add_var_value config, 'A', d

      expect(config.initial_vars.A).to.eql d
      expect(config.initial_vars.A).to.equal d

    it 'should accept a number', ->

      config = config_create()
      _config_add_var_value config, 'A', 5

      expect(config.initial_vars.A).to.eql 5

    it 'should throw if given lo, hi', ->

      config = config_create()

      expect(-> _config_add_var_value config, 'A', 5, 20).to.throw()

    it 'should accept undefined', ->

      config = config_create()
      _config_add_var_value config, 'A'

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

    describe.skip 'space_add_var', ->
      # to migrate

      {
      fdvar_create_range
      } = FD.fdvar

      {
      domain_create_range
      } = FD.domain

      it 'should accept full parameters', ->

        space = space_create_root()
        config_add_var space.config, 'A', 0, 1
        space_init_from_config space

        expect(space.vars.A).to.eql fdvar_create_range 'A', 0, 1

      it 'should accept only lo and assume [lo,lo] for domain', ->

        space = space_create_root()
        config_add_var space.config, 'A', 0
        space_init_from_config space

        expect(space.vars.A).to.eql fdvar_create_range 'A', 0, 0

      it 'should accept lo as the domain if array', ->

        input_domain = [0, 1]
        space = space_create_root()
        config_add_var space.config, 'A', input_domain
        space_init_from_config space

        expect(space.vars.A).to.eql fdvar_create_range 'A', 0, 1
        expect(space.vars.A.dom).to.not.equal input_domain # should clone

      it 'should create an anonymous var with [lo,lo] if name is not given', ->

        space = space_create_root()
        config_add_var space.config, 0
        space_init_from_config space

        expect(space.vars[space.config.all_var_names[0]].dom).to.eql domain_create_range 0, 0

      it 'should create an anonymous var with [lo,hi] if name is not given', ->

        space = space_create_root()
        config_add_var space.config, 0, 1
        space_init_from_config space

        expect(space.vars[space.config.all_var_names[0]].dom).to.eql domain_create_range 0, 1

      it 'should create an anonymous var with given domain if name is not given', ->

        input_domain = [0, 1]
        space = space_create_root()
        config_add_var space.config, input_domain
        space_init_from_config space

        expect(space.vars[space.config.all_var_names[0]].dom).to.eql domain_create_range 0, 1
        expect(space.vars[space.config.all_var_names[0]].dom).to.not.equal input_domain

      it 'should create a full wide domain for var without lo/hi', ->

        space = space_create_root()
        config_add_var space.config, 'A'
        space_init_from_config space

        expect(space.vars.A).to.eql fdvar_create_range 'A', SUB, SUP

      it 'should create a full wide domain for anonymous var', ->

        space = space_create_root()
        config_add_var space.config
        space_init_from_config space

        expect(space.vars[space.config.all_var_names[0]].dom).to.eql domain_create_range SUB, SUP

      it 'should create a new var', ->

        space = space_create_root()
        config_add_var space.config, 'foo', 100
        space_init_from_config space

        expect(space.config.all_var_names).to.eql ['foo']
        expect(space.unsolved_var_names).to.eql ['foo']
        expect(space.vars.foo?).to.be.true

      it 'should set var to domain', ->

        space = space_create_root()
        config_add_var space.config, 'foo', 100
        space_init_from_config space

        expect(space.vars.foo.dom).to.eql domain_create_range 100, 100

      it 'should set var to full domain if none given', ->

        space = space_create_root()
        config_add_var space.config, 'foo'
        space_init_from_config space

        expect(space.vars.foo.dom).to.eql spec_d_create_range SUB, SUP

      it 'should throw if var already exists', ->
        # this should throw an error instead. when would you _want_ to do this?

        space = space_create_root()
        config_add_var space.config, 'foo', 100
        space_init_from_config space

        expect(space.vars.foo.dom).to.eql spec_d_create_value 100
        expect(-> config_add_var space.config, 'foo', 200).to.throw()

      it 'should return the name', ->

        space = space_create_root()
        space_init_from_config space

        expect(space_add_var space, 'foo', 100).to.equal 'foo'

      it 'should create a new var p1', ->

        space = space_create_root()
        space_init_from_config space

        expect(space.config.all_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        expect(space.unsolved_var_names.length, 'before decl').to.eql 0 # no vars... right? :)

      it 'should create a new var p2', ->

        space = space_create_root()
        space_add_var space, 22
        space_init_from_config space

        expect(space.config.all_var_names.length, 'after decl').to.eql 1
        expect(space.unsolved_var_names.length, 'after decl').to.eql 1

      it 'should return the name of a var', ->

        space = space_create_root()
        name = space_add_var space, 50
        space_init_from_config space

        expect(space.config.all_var_names.indexOf(name) > -1).to.be.true
        expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true

      it 'should create a "solved" var with given value', ->

        space = space_create_root()
        name = space_add_var space, 100
        space_init_from_config space

        expect(space.vars[name].dom).to.eql spec_d_create_value 100

      it 'should throw if value is OOB', ->

        space = space_create_root()
        space_init_from_config space

        expect(-> space_add_var space, SUB - 100).to.throw()
        expect(-> space_add_var space, SUP + 100).to.throw()

      it 'should create a var with given domain', ->

        space = space_create_root()
        name = space_add_var space, 100, 200
        space_init_from_config space

        expect(space.vars[name].dom).to.eql spec_d_create_range 100, 200

      it 'should create a full range var if no name and no domain is given', ->

        space = space_create_root()
        name = space_add_var space
        space_init_from_config space

        expect(space.vars[name].dom).to.eql spec_d_create_range SUB, SUP

    describe.skip 'space_add_vars', ->
      # to migrate

      {
      fdvar_create
      fdvar_create_range
      } = FD.fdvar

      it 'should accept multiple vars', ->

        space = space_create_root()
        space_add_vars space,
          ['A']
          ['B', 0]
          ['C', 10, 20]
          ['D', [5, 8, 20, 30]]
        space_init_from_config space

        expect(space.vars.A).to.eql fdvar_create_range 'A', SUB, SUP
        expect(space.vars.B).to.eql fdvar_create_range 'B', 0, 0
        expect(space.vars.C).to.eql fdvar_create_range 'C', 10, 20
        expect(space.vars.D).to.eql fdvar_create 'D', spec_d_create_ranges [5, 8], [20, 30]

    describe.skip 'space_add_vars_domain', ->
      # to migrate

      it 'should create some new vars', ->

        space = space_create_root()
        names = ['foo', 'bar', 'baz']
        space_add_vars_domain space, names, 100
        space_init_from_config space

        expect(space.config.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars.foo?).to.be.true

      it 'should set to given domain', ->

        space = space_create_root()
        names = ['foo', 'bar', 'baz']
        domain = spec_d_create_value 100
        space_add_vars_domain space, names, domain
        space_init_from_config space

        expect(space.config.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars[name]?).to.be.true
          expect(space.vars[name].dom, 'domain should be cloned').not.to.equal domain
          expect(space.vars[name].dom).to.eql domain
          for name2 in names
            expect(space.vars[name].dom, 'domains should be cloned').not.to.equal space.vars[name2]

      it 'should be set to full domain if none given', ->

        space = space_create_root()
        names = ['foo', 'bar', 'baz']
        domain = spec_d_create_range SUB, SUP
        space_add_vars_domain space, names
        space_init_from_config space

        expect(space.config.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars[name]?).to.be.true
          expect(space.vars[name].dom).to.eql domain
          for name2 in names
            expect(space.vars[name].dom, 'domains should be cloned').not.to.equal space.vars[name2]
