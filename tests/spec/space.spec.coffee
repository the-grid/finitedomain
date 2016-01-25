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

describe "space.spec", ->

  unless FD.__DEV_BUILD
    return

  describe 'Space class', ->

    {
      space_add_var
      space_add_vars
      space_add_vars_domain
      space_create_clone
      space_create_root
      space_get_root
      space_is_solved
      space_propagate
      space_set_defaults # TOFIX: add test
      space_set_options
      space_solution
      space_solution_for
    } = FD.space

    describe 'space_create_root()', ->

      it 'should create a new instance', ->

        # I dont want to test for instanceof... but i dont think we can change that due to ext. api.
        expect(space_create_root()).to.be.an 'object'

      it 'should init vars and var_names', ->

        expect(space_create_root().vars).to.be.an 'object'
        expect(space_create_root().unsolved_var_names).to.be.an 'array'
        expect(space_create_root().all_var_names).to.be.an 'array'

      it 'should set root_space to null unless given', ->

        space = space_create_root()
        expect(space._root_space).to.be.null
        expect(space_get_root space).to.equal space

      it 'should set root_space to given root_space', ->

        # TOFIX: move to space_create_clone
        root = space_create_root()
        space = space_create_clone root
        expect(space._root_space).to.equal root
        expect(space_get_root space).to.equal root

    describe 'space_create_clone()', ->

      space = space_create_root()
      clone = space_create_clone space

      it 'should return a new space', ->

        expect(clone).to.not.equal space

      it 'should deep clone the space and set root_space', ->

        lclone = space_create_clone space # local!
        expect(lclone._root_space).to.equal space
        expect(space._root_space).to.equal null
        lclone._root_space = null # exception to the rule
        expect(lclone, 'clone should be space').to.eql space

      it 'should set root_space to cloned space if not yet set there', ->

        expect(clone._root_space, 'clone._root_space').to.equal space
        expect(space_create_clone(clone)._root_space, 'space_create_clone(clone)._root_space').to.equal space

      it 'should clone vars', ->

        expect(space.vars).to.not.equal clone.vars

      it 'should deep clone the vars', ->

        for var_name in space.all_var_names
          expect(clone.vars[var_name]).to.not.equal space.vars[var_name]
          # note: the deep clone check is already done above, no need to repeat it

      it 'should clone certain props, copy others', ->

        expect(space.unsolved_var_names).to.not.equal clone.unsolved_var_names
        expect(space.unsolved_var_names.join()).to.equal clone.unsolved_var_names.join()
        expect(space.all_var_names).to.equal clone.all_var_names
        expect(space._propagators).to.eql clone._propagators

    describe 'space_is_solved()', ->

      it 'should return true if there are no vars', ->

        expect(space_is_solved space_create_root()).to.be.true

      it 'should return true if all vars are solved', ->

        space = space_create_root()
        space_add_var space, 1
        expect(space_is_solved(space), 'only one solved var').to.be.true

        space_add_var space, 1
        expect(space_is_solved(space), 'two solved vars').to.be.true

      it 'should return false if at least one var is not solved', ->

        space = space_create_root()
        space_add_var space, 0, 1
        expect(space_is_solved(space), 'only one unsolved var').to.be.false

        space_add_var space, 0, 1
        expect(space_is_solved(space), 'two unsolved vars').to.be.false

        space_add_var space, 1
        expect(space_is_solved(space), 'two unsolved vars and a solved var').to.be.false

    describe 'space_solution()', ->

      it 'should return an object, not array', ->

        expect(space_solution space_create_root()).to.be.an 'object'
        expect(space_solution space_create_root()).not.to.be.an 'array'

      it 'should return an empty object if there are no vars', ->

        expect(space_solution space_create_root()).to.eql {}

      it 'should return false if a var covers no (more) elements', ->

        space = space_create_root()
        space_add_var space, 'test', []
        expect(space_solution space).to.eql {test: false}

      it 'should return the value of a var is solved', ->

        space = space_create_root()
        space_add_var space, 'test', 5
        expect(space_solution space).to.eql {test: 5}

      it 'should return the domain of a var if not yet determined', ->

        space = space_create_root()
        space_add_var space, 'single_range', 10, 20
        space_add_var space, 'multi_range', spec_d_create_ranges [10, 20], [30, 40]
        space_add_var space, 'multi_range_with_solved', spec_d_create_ranges [10, 20], [25, 25], [30, 40]
        expect(space_solution space).to.eql
          single_range: spec_d_create_range 10, 20
          multi_range: spec_d_create_ranges([10, 20], [30, 40])
          multi_range_with_solved: spec_d_create_ranges([10, 20], [25, 25], [30, 40])

      it 'should not add anonymous vars to the result', ->

        space = space_create_root()
        space_add_var space, 15
        space_add_var space, 'addme', 20
        expect(strip_anon_vars space_solution space).to.eql {addme: 20}

    describe 'space_solution_for()', ->

      it 'should only collect results for given var names', ->

        space = space_create_root()
        space_add_var space, 10 # should be ignored
        space_add_var space, 'nope', 10, 20
        space_add_var space, 'yep10', 10
        space_add_var space, 'yep20', 20
        space_add_var space, 'yep30', 30
        expect(space_solution_for space, ['yep10', 'yep20', 'yep30']).to.eql {yep10: 10, yep20: 20, yep30: 30}

      it 'should return normal even if a var is unsolved when complete=false', ->

        space = space_create_root()
        space_add_var space, 10 # should be ignored
        space_add_var space, 'yep10', 10
        space_add_var space, 'oops20', []
        space_add_var space, 'yep30', 30
        expect(space_solution_for space, ['yep10', 'oops20', 'yep30']).to.eql {yep10: 10, oops20: false, yep30: 30}

      it 'should return false if a var is unsolved when complete=true', ->

        space = space_create_root()
        space_add_var space, 10 # should be ignored
        space_add_var space, 'yep10', 10
        space_add_var space, 'oops20', []
        space_add_var space, 'yep30', 30
        expect(space_solution_for space, ['yep10', 'oops20', 'yep30'], true).to.be.false

      it 'should return true if a var is unsolved that was not requested when complete=true', ->

        space = space_create_root()
        space_add_var space, 10 # should be ignored
        space_add_var space, 'yep10', 10
        space_add_var space, 'nope20', []
        space_add_var space, 'yep30', 30
        expect(space_solution_for space, ['yep10', 'yep30'], true).to.eql {yep10: 10, yep30: 30}

    describe 'space_propagate', ->

      describe 'simple cases', ->

        it 'should not reject this multiply case', ->

          space = space_create_root()

          space_add_var space, 'A', 0, 10
          space_add_var space, 'B', 0, 10
          space_add_var space, 'MAX', 25, 25
          space_add_var space, 'MUL', 0, 100

          space._propagators = [
            ['ring', ['A', 'B', 'MUL'], 'mul']
            ['ring', ['MUL', 'A', 'B'], 'div']
            ['ring', ['MUL', 'B', 'A'], 'div']
            ['lt', ['MUL', 'MAX']]
          ]

          expect(space_propagate space).to.eql true

      describe 'timeout callback', ->

        it 'should ignore timeout callback if not set at all', ->

          # (base timeout callback test)

          space = space_create_root()

          space_add_var space, 'A', 0, 10
          space_add_var space, 'B', 0, 10

          space._propagators = [
            ['lt', ['A', 'B']]
          ]

          expect(space_propagate space).to.eql true

        it 'should not break early if callback doesnt return true', ->

          space = space_create_root()

          space_add_var space, 'A', 0, 10
          space_add_var space, 'B', 0, 10

          space._propagators = [
            ['lt', ['A', 'B']]
          ]

          space_set_options space, timeout_callback: -> false

          expect(space_propagate space).to.eql true

        it 'should break early if callback returns true', ->

          space = space_create_root()

          space_add_var space, 'A', 0, 10
          space_add_var space, 'B', 0, 10

          space._propagators = [
            ['lt', ['A', 'B']]
          ]

          space_set_options space, timeout_callback: -> true

          expect(space_propagate space).to.eql false

    describe 'space_add_var', ->

      {
        SUB
        SUP
      } = FD.helpers

      {
        fdvar_create_range
      } = FD.fdvar

      {
        domain_create_range
      } = FD.domain

      it 'should accept full parameters', ->

        space = space_create_root()
        space_add_var space, 'A', 0, 1

        expect(space.vars.A).to.eql fdvar_create_range 'A', 0, 1

      it 'should accept only lo and assume [lo,lo] for domain', ->

        space = space_create_root()
        space_add_var space, 'A', 0

        expect(space.vars.A).to.eql fdvar_create_range 'A', 0, 0

      it 'should accept lo as the domain if array', ->

        input_domain = [0, 1]
        space = space_create_root()
        space_add_var space, 'A', input_domain

        expect(space.vars.A).to.eql fdvar_create_range 'A', 0, 1
        expect(space.vars.A.dom).to.not.equal input_domain # should clone

      it 'should create an anonymous var with [lo,lo] if name is not given', ->

        space = space_create_root()
        space_add_var space, 0

        expect(space.vars[space.all_var_names[0]].dom).to.eql domain_create_range 0, 0

      it 'should create an anonymous var with [lo,hi] if name is not given', ->

        space = space_create_root()
        space_add_var space, 0, 1

        expect(space.vars[space.all_var_names[0]].dom).to.eql domain_create_range 0, 1

      it 'should create an anonymous var with given domain if name is not given', ->

        input_domain = [0, 1]
        space = space_create_root()
        space_add_var space, input_domain

        expect(space.vars[space.all_var_names[0]].dom).to.eql domain_create_range 0, 1
        expect(space.vars[space.all_var_names[0]].dom).to.not.equal input_domain

      it 'should create a full wide domain for var without lo/hi', ->

        space = space_create_root()
        space_add_var space, 'A'

        expect(space.vars.A).to.eql fdvar_create_range 'A', SUB, SUP

      it 'should create a full wide domain for anonymous var', ->

        space = space_create_root()
        space_add_var space

        expect(space.vars[space.all_var_names[0]].dom).to.eql domain_create_range SUB, SUP

      it 'should create a new var', ->

        space = space_create_root()
        space_add_var space, 'foo', 100
        expect(space.all_var_names).to.eql ['foo']
        expect(space.unsolved_var_names).to.eql ['foo']
        expect(space.vars.foo?).to.be.true

      it 'should set var to domain', ->

        space = space_create_root()
        space_add_var space, 'foo', 100
        expect(space.vars.foo.dom).to.eql domain_create_range 100, 100

      it 'should set var to full domain if none given', ->

        space = space_create_root()
        space_add_var space, 'foo'
        expect(space.vars.foo.dom).to.eql spec_d_create_range FD.helpers.SUB, FD.helpers.SUP

      it 'should just update domain if var already exists', ->
        # this should throw an error instead. when would you _want_ to do this?

        space = space_create_root()
        space_add_var space, 'foo', 100
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100
        space_add_var space, 'foo', 200
        expect(space.vars.foo.dom).to.eql spec_d_create_value 200

      it 'should return the name', ->

        space = space_create_root()
        expect(space_add_var space, 'foo', 100).to.equal 'foo'
        # even if already exists
        expect(space_add_var space, 'foo', 200).to.equal 'foo'

      it 'should create a new var', ->

        space = space_create_root()
        expect(space.all_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        expect(space.unsolved_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space_add_var space, 22
        expect(space.all_var_names.length, 'after decl').to.eql 1
        expect(space.unsolved_var_names.length, 'after decl').to.eql 1

      it 'should return the name of a var', ->

        space = space_create_root()
        name = space_add_var space, 50
        expect(space.all_var_names.indexOf(name) > -1).to.be.true
        expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true

      it 'should create a "solved" var with given value', ->

        space = space_create_root()
        name = space_add_var space, 100
        expect(space.vars[name].dom).to.eql spec_d_create_value 100

      it 'should throw if value is OOB', ->

        space = space_create_root()
        expect(-> space_add_var space, FD.helpers.SUB - 100).to.throw

      it 'should create a new var', ->

        space = space_create_root()
        expect(space.all_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        expect(space.unsolved_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space_add_var space, 22
        expect(space.all_var_names.length, 'after decl').to.eql 1
        expect(space.unsolved_var_names.length, 'after decl').to.eql 1

      it 'should return the name of a var', ->

        space = space_create_root()
        name = space_add_var space, 50
        expect(space.all_var_names.indexOf(name) > -1).to.be.true
        expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true

      it 'should create a var with given domain', ->

        space = space_create_root()
        name = space_add_var space, 100, 200
        expect(space.vars[name].dom).to.eql spec_d_create_range 100, 200

      it 'should create a full range var if no name and no domain is given', ->

        space = space_create_root()
        name = space_add_var space
        expect(space.vars[name].dom).to.eql spec_d_create_range SUB, SUP

    describe 'space_add_vars', ->

      {
        SUB
        SUP
      } = FD.helpers

      {
        fdvar_create
        fdvar_create_range
      } = FD.fdvar

      it 'should multiple vars', ->

        space = space_create_root()
        space_add_vars space,
          ['A']
          ['B', 0]
          ['C', 10, 20]
          ['D', [5, 8, 20, 30]]

        expect(space.vars.A).to.eql fdvar_create_range 'A', SUB, SUP
        expect(space.vars.B).to.eql fdvar_create_range 'B', 0, 0
        expect(space.vars.C).to.eql fdvar_create_range 'C', 10, 20
        expect(space.vars.D).to.eql fdvar_create 'D', spec_d_create_ranges [5, 8], [20, 30]

    describe 'space_add_vars_domain', ->

      it 'should create some new vars', ->

        space = space_create_root()
        names = ['foo', 'bar', 'baz']
        space_add_vars_domain space, names, 100
        expect(space.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars.foo?).to.be.true

      it 'should set to given domain', ->

        space = space_create_root()
        names = ['foo', 'bar', 'baz']
        domain = spec_d_create_value 100
        space_add_vars_domain space, names, domain
        expect(space.all_var_names).to.eql names
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
        domain = spec_d_create_range FD.helpers.SUB, FD.helpers.SUP
        space_add_vars_domain space, names
        expect(space.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars[name]?).to.be.true
          expect(space.vars[name].dom).to.eql domain
          for name2 in names
            expect(space.vars[name].dom, 'domains should be cloned').not.to.equal space.vars[name2]
