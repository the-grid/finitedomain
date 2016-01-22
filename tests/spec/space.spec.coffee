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
      space_callback
      space_create_clone
      space_create_root
      space_decl
      space_decl_anon
      space_decl_anons
      space_decl_value
      space_decls
      space_distinct
      space_eq
      space_get_root
      space_gt
      space_gte
      space_is_solved
      space_lt
      space_lte
      space_neq
      space_num
      space_plus
      space_product
      space_propagate
      space_reified
      space_scale
      space_set_defaults
      space_set_options
      space_solution
      space_solution_for
      space_sum
      space_times
      space_times_plus
      space_wsum
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
        space_decl_value space, 1
        expect(space_is_solved(space), 'only one solved var').to.be.true

        space_decl_value space, 1
        expect(space_is_solved(space), 'two solved vars').to.be.true

      it 'should return false if at least one var is not solved', ->

        space = space_create_root()
        space_decl_anon space, spec_d_create_bool()
        expect(space_is_solved(space), 'only one unsolved var').to.be.false

        space_decl_anon space, spec_d_create_bool()
        expect(space_is_solved(space), 'two unsolved vars').to.be.false

        space_decl_value space, 1
        expect(space_is_solved(space), 'two unsolved vars and a solved var').to.be.false

    describe 'space_solution()', ->

      it 'should return an object, not array', ->

        expect(space_solution space_create_root()).to.be.an 'object'
        expect(space_solution space_create_root()).not.to.be.an 'array'

      it 'should return an empty object if there are no vars', ->

        expect(space_solution space_create_root()).to.eql {}

      it 'should return false if a var covers no (more) elements', ->

        space = space_create_root()
        space_decl space, 'test', []
        expect(space_solution space).to.eql {test: false}

      it 'should return the value of a var is solved', ->

        space = space_create_root()
        space_decl space, 'test', spec_d_create_value 5
        expect(space_solution space).to.eql {test: 5}

      it 'should return the domain of a var if not yet determined', ->

        space = space_create_root()
        space_decl space, 'single_range', spec_d_create_range 10, 20
        space_decl space, 'multi_range', spec_d_create_ranges [10, 20], [30, 40]
        space_decl space, 'multi_range_with_solved', spec_d_create_ranges [10, 20], [25, 25], [30, 40]
        expect(space_solution space).to.eql
          single_range: spec_d_create_range 10, 20
          multi_range: spec_d_create_ranges([10, 20], [30, 40])
          multi_range_with_solved: spec_d_create_ranges([10, 20], [25, 25], [30, 40])

      it 'should not add anonymous vars to the result', ->

        space = space_create_root()
        space_decl_value space, 15
        space_decl space, 'addme', spec_d_create_value 20
        expect(strip_anon_vars space_solution space).to.eql {addme: 20}

    describe 'space_solution_for()', ->

      it 'should only collect results for given var names', ->

        space = space_create_root()
        space_decl_value space, 10 # should be ignored
        space_decl space, 'nope', spec_d_create_range 10, 20
        space_decl space, 'yep10', spec_d_create_value 10
        space_decl space, 'yep20', spec_d_create_value 20
        space_decl space, 'yep30', spec_d_create_value 30
        expect(space_solution_for space, ['yep10', 'yep20', 'yep30']).to.eql {yep10: 10, yep20: 20, yep30: 30}

      it 'should return normal even if a var is unsolved when complete=false', ->

        space = space_create_root()
        space_decl_value space, 10 # should be ignored
        space_decl space, 'yep10', spec_d_create_value 10
        space_decl space, 'oops20', []
        space_decl space, 'yep30', spec_d_create_value 30
        expect(space_solution_for space, ['yep10', 'oops20', 'yep30']).to.eql {yep10: 10, oops20: false, yep30: 30}

      it 'should return false if a var is unsolved when complete=true', ->

        space = space_create_root()
        space_decl_value space, 10 # should be ignored
        space_decl space, 'yep10', spec_d_create_value 10
        space_decl space, 'oops20', []
        space_decl space, 'yep30', spec_d_create_value 30
        expect(space_solution_for space, ['yep10', 'oops20', 'yep30'], true).to.be.false

      it 'should return true if a var is unsolved that was not requested when complete=true', ->

        space = space_create_root()
        space_decl_value space, 10 # should be ignored
        space_decl space, 'yep10', spec_d_create_value 10
        space_decl space, 'nope20', []
        space_decl space, 'yep30', spec_d_create_value 30
        expect(space_solution_for space, ['yep10', 'yep30'], true).to.eql {yep10: 10, yep30: 30}

    describe 'space_decl_anon()', ->

      it 'should create a new var', ->

        space = space_create_root()
        expect(space.all_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        expect(space.unsolved_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space_decl_anon space, spec_d_create_value 22
        expect(space.all_var_names.length, 'after decl').to.eql 1
        expect(space.unsolved_var_names.length, 'after decl').to.eql 1

      it 'should return the name of a var', ->

        space = space_create_root()
        name = space_decl_anon space, spec_d_create_value 50
        expect(space.all_var_names.indexOf(name) > -1).to.be.true
        expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true

      it 'should create a var with given domain', ->

        space = space_create_root()
        name = space_decl_anon space, spec_d_create_range 100, 200
        expect(space.vars[name].dom).to.eql spec_d_create_range 100, 200

      it 'should create a full range var if no domain is given', ->

        space = space_create_root()
        name = space_decl_anon space
        expect(space.vars[name].dom).to.eql spec_d_create_range FD.helpers.SUB, FD.helpers.SUP

    describe 'space_decl_anons()', ->

      it 'should create multiple vars', ->

        space = space_create_root()
        expect(space.all_var_names.length, 'before decl').to.eql 0
        expect(space.unsolved_var_names.length, 'before decl').to.eql 0
        space_decl_anons space, 22
        expect(space.all_var_names.length, 'after decl').to.eql 22
        expect(space.unsolved_var_names.length, 'after decl').to.eql 22

      it 'should return a list of names of the new vars', ->

        space = space_create_root()
        names = space_decl_anons space, 50
        for name in names
          expect(space.all_var_names.indexOf(name) > -1).to.be.true
          expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true

      it 'should set the domain to full if no domain is given', ->

        full_range = spec_d_create_range FD.helpers.SUB, FD.helpers.SUP
        space = space_create_root()
        names = space_decl_anons space, 50
        for name in names
          expect(space.vars[name].dom).to.eql full_range

      it 'should not use same reference for the new domains', ->

        space = space_create_root()
        names = space_decl_anons space, 5
        for name1, i in names
          for name2, j in names # yeah yeah you could start at `i`
            if i isnt j
              expect(space.vars[name1]).not.to.equal space.vars[name2]

      it 'should set the domain to given domain', ->

        domain = spec_d_create_range 10, 20
        space = space_create_root()
        names = space_decl_anons space, 5, domain
        for name in names
          expect(space.vars[name].dom).to.eql domain

      it 'should init vars to a clone of the given domain', ->

        domain = spec_d_create_range 10, 20
        space = space_create_root()
        names = space_decl_anons space, 5, domain
        for name in names
          expect(space.vars[name].dom).not.to.equal domain

      it 'should not use same reference for the domains of new vars', ->

        space = space_create_root()
        names = space_decl_anons space, 5, spec_d_create_range 10, 20
        for name1, i in names
          for name2, j in names # yeah yeah you could start at `i`
            if i isnt j
              expect(space.vars[name1]).not.to.equal space.vars[name2]

    describe 'space_decl_value()', ->

      it 'should create a new var', ->

        space = space_create_root()
        expect(space.all_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        expect(space.unsolved_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space_decl_value space, 22
        expect(space.all_var_names.length, 'after decl').to.eql 1
        expect(space.unsolved_var_names.length, 'after decl').to.eql 1

      it 'should return the name of a var', ->

        space = space_create_root()
        name = space_decl_value space, 50
        expect(space.all_var_names.indexOf(name) > -1).to.be.true
        expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true

      it 'should create a "solved" var with given value', ->

        space = space_create_root()
        name = space_decl_value space, 100
        expect(space.vars[name].dom).to.eql spec_d_create_value 100

      it 'should throw if value is OOB', ->

        space = space_create_root()
        expect(-> space_decl_value space, FD.helpers.SUB - 100).to.throw

    describe 'space_decl()', ->

      it 'should create a new var', ->

        space = space_create_root()
        space_decl space, 'foo', spec_d_create_value 100
        expect(space.all_var_names).to.eql ['foo']
        expect(space.unsolved_var_names).to.eql ['foo']
        expect(space.vars.foo?).to.be.true

      it 'should return the space', ->

        space = space_create_root()
        expect(space_decl space, 'foo', spec_d_create_value 100).to.eql space

      it 'should set var to domain', ->

        space = space_create_root()
        space_decl space, 'foo', spec_d_create_value 100
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100

      it 'should set var to full domain if none given', ->

        space = space_create_root()
        space_decl space, 'foo'
        expect(space.vars.foo.dom).to.eql spec_d_create_range FD.helpers.SUB, FD.helpers.SUP

      it 'should just update domain if var already exists', ->
        # this should throw an error instead. when would you _want_ to do this?

        space = space_create_root()
        space_decl space, 'foo', spec_d_create_value 100
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100
        space_decl space, 'foo', spec_d_create_value 200
        expect(space.vars.foo.dom).to.eql spec_d_create_value 200

      it 'should ignore an update if no domain is given', ->
        # this should throw an error instead. when would you _want_ to do this?

        space = space_create_root()
        space_decl space, 'foo', spec_d_create_value 100
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100
        space_decl space, 'foo'
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100

      it 'should return space', ->

        space = space_create_root()
        expect(space_decl space, 'foo', spec_d_create_value 100).to.equal space
        # even if already exists
        expect(space_decl space, 'foo', spec_d_create_value 200).to.equal space

    describe 'space_decls()', ->

      it 'should create some new vars', ->

        space = space_create_root()
        names = ['foo', 'bar', 'baz']
        space_decls space, names, spec_d_create_value 100
        expect(space.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars.foo?).to.be.true

      it 'should set to given domain', ->

        space = space_create_root()
        names = ['foo', 'bar', 'baz']
        domain = spec_d_create_value 100
        space_decls space, names, domain
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
        space_decls space, names
        expect(space.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars[name]?).to.be.true
          expect(space.vars[name].dom).to.eql domain
          for name2 in names
            expect(space.vars[name].dom, 'domains should be cloned').not.to.equal space.vars[name2]

    describe 'space_num()', ->

      it 'should create a new var', ->

        space = space_create_root()
        space_num space, 'foo', 22
        expect(space.all_var_names).to.eql ['foo']
        expect(space.unsolved_var_names).to.eql ['foo']

      it 'should return the space', ->

        space = space_create_root()
        expect(space_num space, 'foo', 100).to.eql space

      it 'should create a "solved" var with given value', ->

        space = space_create_root()
        space_num space, 'foo', 100
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100

    describe 'propagate', ->

      describe 'simple cases', ->

        it 'should not reject this multiply case', ->

          space = space_create_root()

          space_decl space, 'A', [0, 10]
          space_decl space, 'B', [0, 10]
          space_decl space, 'MAX', [25, 25]
          space_decl space, 'MUL', [0, 100]

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

          space_decl space, 'A', [0, 10]
          space_decl space, 'B', [0, 10]

          space._propagators = [
            ['lt', ['A', 'B']]
          ]

          expect(space_propagate space).to.eql true

        it 'should not break early if callback doesnt return true', ->

          space = space_create_root()

          space_decl space, 'A', [0, 10]
          space_decl space, 'B', [0, 10]

          space._propagators = [
            ['lt', ['A', 'B']]
          ]

          space_set_options space, timeout_callback: -> false

          expect(space_propagate space).to.eql true

        it 'should break early if callback returns true', ->

          space = space_create_root()

          space_decl space, 'A', [0, 10]
          space_decl space, 'B', [0, 10]

          space._propagators = [
            ['lt', ['A', 'B']]
          ]

          space_set_options space, timeout_callback: -> true

          expect(space_propagate space).to.eql false

# the propagator methods on Space are to be tested later, after I change them completely;
    # gt
    # gte
    # distinct
    # plus
    # times
    # scale
    # times_plus
    # sum
    # product
    # wsum
