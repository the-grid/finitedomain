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

  it 'FD?', ->

    expect(FD?).to.be.true

  describe 'Space class', ->

    {space:Space} = FD

    it 'should exist', ->

      expect(Space?).to.be.true

    describe 'new Space', ->

      it 'should create a new instance', ->

        # I dont want to test for instanceof... but i dont think we can change that due to ext. api.
        expect(new Space).to.be.a 'object'

      it 'should init vars and var_names', ->

        expect(new Space().vars).to.be.an 'object'
        expect(new Space().unsolved_var_names).to.be.an 'array'
        expect(new Space().all_var_names).to.be.an 'array'

      it 'should set root_space to null unless given', ->

        expect(new Space().root_space).to.be.null

      it 'should set root_space to given root_space', ->

        root = {}
        expect(new Space(root).root_space).to.equal root

    describe '#clone()', ->

      space = new Space
      clone = space.clone()

      it 'should return a new space', ->

        expect(clone).to.not.equal space

      it 'should deep clone the space and set root_space', ->

        lclone = space.clone() # local!
        expect(lclone.root_space).to.equal space
        expect(space.root_space).to.equal null
        lclone.root_space = null # exception to the rule
        expect(lclone, 'clone should be space').to.eql space

      it 'should set root_space to cloned space if not yet set there', ->

        expect(clone.root_space, 'clone.root_space').to.equal space
        expect(clone.clone().root_space, 'clone.clone().root_space').to.equal space

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

    describe '#get_value_distributor()', ->

      # TODO

    describe '#is_solved()', ->

      it 'should return true if there are no vars', ->

        expect(new Space().is_solved()).to.be.true

      it 'should return true if all vars are solved', ->

        space = new Space
        space.decl_value 1
        expect(space.is_solved(), 'only one solved var').to.be.true

        space.decl_value 1
        expect(space.is_solved(), 'two solved vars').to.be.true

      it 'should return false if at least one var is not solved', ->

        space = new Space
        space.decl_anon spec_d_create_bool()
        expect(space.is_solved(), 'only one unsolved var').to.be.false

        space.decl_anon spec_d_create_bool()
        expect(space.is_solved(), 'two unsolved vars').to.be.false

        space.decl_value 1
        expect(space.is_solved(), 'two unsolved vars and a solved var').to.be.false

    describe '#solution()', ->

      it 'should return an object, not array', ->

        expect(new Space().solution()).to.be.an 'object'
        expect(new Space().solution()).not.to.be.an 'array'

      it 'should return an empty object if there are no vars', ->

        expect(new Space().solution()).to.eql {}

      it 'should return false if a var covers no (more) elements', ->

        space = new Space()
        space.decl 'test', []
        expect(space.solution()).to.eql {test: false}

      it 'should return the value of a var is solved', ->

        space = new Space()
        space.decl 'test', spec_d_create_value 5
        expect(space.solution()).to.eql {test: 5}

      it 'should return the domain of a var if not yet determined', ->

        space = new Space()
        space.decl 'single_range', spec_d_create_range 10, 20
        space.decl 'multi_range', spec_d_create_ranges [10, 20], [30, 40]
        space.decl 'multi_range_with_solved', spec_d_create_ranges [10, 20], [25, 25], [30, 40]
        expect(space.solution()).to.eql
          single_range: spec_d_create_range 10, 20
          multi_range: spec_d_create_ranges([10, 20], [30, 40])
          multi_range_with_solved: spec_d_create_ranges([10, 20], [25, 25], [30, 40])

      it 'should not add anonymous vars to the result', ->

        space = new Space()
        space.decl_value 15
        space.decl 'addme', spec_d_create_value 20
        expect(strip_anon_vars space.solution()).to.eql {addme: 20}

    describe '#solutionFor()', ->

      it 'should only collect results for given var names', ->

        space = new Space()
        space.decl_value 10 # should be ignored
        space.decl 'nope', spec_d_create_range 10, 20
        space.decl 'yep10', spec_d_create_value 10
        space.decl 'yep20', spec_d_create_value 20
        space.decl 'yep30', spec_d_create_value 30
        expect(space.solutionFor ['yep10', 'yep20', 'yep30']).to.eql {yep10: 10, yep20: 20, yep30: 30}

      it 'should return normal even if a var is unsolved when complete=false', ->

        space = new Space()
        space.decl_value 10 # should be ignored
        space.decl 'yep10', spec_d_create_value 10
        space.decl 'oops20', []
        space.decl 'yep30', spec_d_create_value 30
        expect(space.solutionFor ['yep10', 'oops20', 'yep30']).to.eql {yep10: 10, oops20: false, yep30: 30}

      it 'should return false if a var is unsolved when complete=true', ->

        space = new Space()
        space.decl_value 10 # should be ignored
        space.decl 'yep10', spec_d_create_value 10
        space.decl 'oops20', []
        space.decl 'yep30', spec_d_create_value 30
        expect(space.solutionFor ['yep10', 'oops20', 'yep30'], true).to.be.false

      it 'should return true if a var is unsolved that was not requested when complete=true', ->

        space = new Space()
        space.decl_value 10 # should be ignored
        space.decl 'yep10', spec_d_create_value 10
        space.decl 'nope20', []
        space.decl 'yep30', spec_d_create_value 30
        expect(space.solutionFor ['yep10', 'yep30'], true).to.eql {yep10: 10, yep30: 30}

    describe '#inject()', ->
      # (this function is to be eliminated because it's super silly)

      it 'should call its function with this', ->

        x = false
        new Space().inject -> x = true
        expect(x).to.be.true

      it 'should return its this', ->
        space = new Space()
        expect(space.inject ->).to.equal space

      it 'should not modify its space', ->
        space = new Space()
        clone = space.clone()
        clone.root_space = null # since space is the root, it does not have itself as a root_space prop.
        space.inject ->
        expect(space).to.eql clone

    describe '#decl_anon()', ->

      it 'should create a new var', ->

        space = new Space()
        expect(space.all_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        expect(space.unsolved_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space.decl_anon spec_d_create_value 22
        expect(space.all_var_names.length, 'after decl').to.eql 1
        expect(space.unsolved_var_names.length, 'after decl').to.eql 1

      it 'should return the name of a var', ->

        space = new Space()
        name = space.decl_anon spec_d_create_value 50
        expect(space.all_var_names.indexOf(name) > -1).to.be.true
        expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true

      it 'should create a var with given domain', ->

        space = new Space()
        name = space.decl_anon spec_d_create_range 100, 200
        expect(space.vars[name].dom).to.eql spec_d_create_range 100, 200

      it 'should create a full range var if no domain is given', ->

        space = new Space()
        name = space.decl_anon()
        expect(space.vars[name].dom).to.eql spec_d_create_range FD.helpers.SUB, FD.helpers.SUP

    describe '#decl_anons()', ->

      it 'should create multiple vars', ->

        space = new Space()
        expect(space.all_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        expect(space.unsolved_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space.decl_anons 22
        expect(space.all_var_names.length, 'after decl').to.eql 22
        expect(space.unsolved_var_names.length, 'after decl').to.eql 22

      it 'should return a list of names of the new vars', ->

        space = new Space()
        names = space.decl_anons 50
        for name in names
          expect(space.all_var_names.indexOf(name) > -1).to.be.true
          expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true

      it 'should set the domain to full if no domain is given', ->

        full_range = spec_d_create_range FD.helpers.SUB, FD.helpers.SUP
        space = new Space()
        names = space.decl_anons 50
        for name in names
          expect(space.vars[name].dom).to.eql full_range

      it 'should not use same reference for the new domains', ->

        space = new Space()
        names = space.decl_anons 5
        for name1, i in names
          for name2, j in names # yeah yeah you could start at `i`
            if i isnt j
              expect(space.vars[name1]).not.to.equal space.vars[name2]

      it 'should set the domain to given domain', ->

        domain = spec_d_create_range 10, 20
        space = new Space()
        names = space.decl_anons 5, domain
        for name in names
          expect(space.vars[name].dom).to.eql domain

      it 'should init vars to a clone of the given domain', ->

        domain = spec_d_create_range 10, 20
        space = new Space()
        names = space.decl_anons 5, domain
        for name in names
          expect(space.vars[name].dom).not.to.equal domain

      it 'should not use same reference for the domains of new vars', ->

        space = new Space()
        names = space.decl_anons 5, spec_d_create_range 10, 20
        for name1, i in names
          for name2, j in names # yeah yeah you could start at `i`
            if i isnt j
              expect(space.vars[name1]).not.to.equal space.vars[name2]

    describe '#decl_value()', ->

      it 'should create a new var', ->

        space = new Space()
        expect(space.all_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        expect(space.unsolved_var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space.decl_value 22
        expect(space.all_var_names.length, 'after decl').to.eql 1
        expect(space.unsolved_var_names.length, 'after decl').to.eql 1

      it 'should return the name of a var', ->

        space = new Space()
        name = space.decl_value 50
        expect(space.all_var_names.indexOf(name) > -1).to.be.true
        expect(space.unsolved_var_names.indexOf(name) > -1).to.be.true

      it 'should create a "solved" var with given value', ->

        space = new Space()
        name = space.decl_value 100
        expect(space.vars[name].dom).to.eql spec_d_create_value 100

      it 'should throw if value is OOB', ->

        space = new Space()
        expect(-> space.decl_value FD.helpers.SUB - 100).to.throw

    describe '#decl()', ->

      it 'should create a new var', ->

        space = new Space()
        space.decl 'foo', spec_d_create_value 100
        expect(space.all_var_names).to.eql ['foo']
        expect(space.unsolved_var_names).to.eql ['foo']
        expect(space.vars.foo?).to.be.true

      it 'should return the space', ->

        space = new Space()
        expect(space.decl 'foo', spec_d_create_value 100).to.eql space

      it 'should set var to domain', ->

        space = new Space()
        space.decl 'foo', spec_d_create_value 100
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100

      it 'should set var to full domain if none given', ->

        space = new Space()
        space.decl 'foo'
        expect(space.vars.foo.dom).to.eql spec_d_create_range FD.helpers.SUB, FD.helpers.SUP

      it 'should just update domain if var already exists', ->
        # this should throw an error instead. when would you _want_ to do this?

        space = new Space()
        space.decl 'foo', spec_d_create_value 100
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100
        space.decl 'foo', spec_d_create_value 200
        expect(space.vars.foo.dom).to.eql spec_d_create_value 200

      it 'should ignore an update if no domain is given', ->
        # this should throw an error instead. when would you _want_ to do this?

        space = new Space()
        space.decl 'foo', spec_d_create_value 100
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100
        space.decl 'foo'
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100

      it 'should return space', ->

        space = new Space()
        expect(space.decl 'foo', spec_d_create_value 100).to.equal space
        # even if already exists
        expect(space.decl 'foo', spec_d_create_value 200).to.equal space

    describe '#decls()', ->

      it 'should create some new vars', ->

        space = new Space()
        names = ['foo', 'bar', 'baz']
        space.decls names, spec_d_create_value 100
        expect(space.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars.foo?).to.be.true

      it 'should set to given domain', ->

        space = new Space()
        names = ['foo', 'bar', 'baz']
        domain = spec_d_create_value 100
        space.decls names, domain
        expect(space.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars[name]?).to.be.true
          expect(space.vars[name].dom, 'domain should be cloned').not.to.equal domain
          expect(space.vars[name].dom).to.eql domain
          for name2 in names
            expect(space.vars[name].dom, 'domains should be cloned').not.to.equal space.vars[name2]

      it 'should be set to full domain if none given', ->

        space = new Space()
        names = ['foo', 'bar', 'baz']
        domain = spec_d_create_range FD.helpers.SUB, FD.helpers.SUP
        space.decls names
        expect(space.all_var_names).to.eql names
        expect(space.unsolved_var_names).to.eql names
        for name in names
          expect(space.vars[name]?).to.be.true
          expect(space.vars[name].dom).to.eql domain
          for name2 in names
            expect(space.vars[name].dom, 'domains should be cloned').not.to.equal space.vars[name2]

    describe '#num()', ->

      it 'should create a new var', ->

        space = new Space()
        space.num 'foo', 22
        expect(space.all_var_names).to.eql ['foo']
        expect(space.unsolved_var_names).to.eql ['foo']

      it 'should return the space', ->

        space = new Space()
        expect(space.num 'foo', 100).to.eql space

      it 'should create a "solved" var with given value', ->

        space = new Space()
        name = space.num 'foo', 100
        expect(space.vars.foo.dom).to.eql spec_d_create_value 100

    describe 'propagate', ->

      describe 'simple cases', ->

        it 'should not reject this multiply case', ->

          S = new Space()

          S.decl 'A', [0, 10]
          S.decl 'B', [0, 10]
          S.decl 'MAX', [25, 25]
          S.decl 'MUL', [0, 100]

          S._propagators = [
            ['ring', ['A', 'B', 'MUL'], 'mul']
            ['ring', ['MUL', 'A', 'B'], 'div']
            ['ring', ['MUL', 'B', 'A'], 'div']
            ['lt', ['MUL', 'MAX']]
          ]

          expect(S.propagate()).to.eql true

      describe 'timeout callback', ->

        it 'should ignore timeout callback if not set at all', ->

          # (base timeout callback test)

          space = new Space()

          space.decl 'A', [0, 10]
          space.decl 'B', [0, 10]

          space._propagators = [
            ['lt', ['A', 'B']]
          ]

          expect(space.propagate()).to.eql true

        it 'should not break early if callback doesnt return true', ->

          space = new Space()

          space.decl 'A', [0, 10]
          space.decl 'B', [0, 10]

          space._propagators = [
            ['lt', ['A', 'B']]
          ]

          space.set_options timeout_callback: -> false

          expect(space.propagate()).to.eql true

        it 'should break early if callback returns true', ->

          space = new Space()

          space.decl 'A', [0, 10]
          space.decl 'B', [0, 10]

          space._propagators = [
            ['lt', ['A', 'B']]
          ]

          space.set_options timeout_callback: -> true

          expect(space.propagate()).to.eql false

# the propagator methods on Space are to be tested later, after I change them completely;
    # reified
    # callback
    # eq
    # lt
    # gt
    # lte
    # gte
    # neq
    # distinct
    # plus
    # times
    # scale
    # times_plus
    # sum
    # product
    # wsum
