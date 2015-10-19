if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_value
    spec_d_create_ranges
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "FD", ->

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

      it 'should set the value distributor to a thrower', ->

        expect(-> new Space().get_value_distributor()).to.throw

      it 'should set the value distributor to given function', ->

        f = ->
        expect(new Space(f).get_value_distributor).to.equal f

      it 'should init vars and var_names', ->

        expect(new Space().vars).to.be.an 'object'
        expect(new Space().var_names).to.be.an 'array'

    describe '#clone()', ->

      space = new Space
      clone = space.clone()

      it 'should return a new space', ->

        expect(clone).to.not.equal space

      it 'should deep clone the space', ->

        expect(clone).to.eql space

      it 'should clone vars', ->

        expect(space.vars).to.not.equal clone.vars

      it 'should deep clone the vars', ->

        for var_name in space.var_names
          expect(clone.vars[var_name]).to.not.equal space.vars[var_name]
          # note: the deep clone check is already done above, no need to repeat it

      it 'should clone certain props', ->
        expect(space.var_names).to.not.equal clone.var_names
        expect(space.var_names.join()).to.equal clone.var_names.join()
        expect(space._propagators).to.not.equal clone._propagators

      it 'should copy the get value distributor', ->

        expect(space.get_value_distributor).to.equal clone.get_value_distributor
        g = ->
        expect(new Space(g).clone().get_value_distributor).to.equal g

      it 'should copy the solver', ->

        expect(clone.solver).to.equal space.solver
        s = new Space()
        s.solver = {}
        expect(s.clone().solver).to.equal s.solver

    describe '#done()', ->

      it 'should not do anything', ->

        expect(new Space().done).not.to.throw

      it 'should not modify the space', ->

        space = new Space
        clone = space.clone()
        space.done()
        expect(space).to.eql clone # since clone is a deep clone, we can do a deep eq check here

    describe '#propagate()', ->

      it 'should return true without any propagators', ->

        expect(new Space().propagate()).to.be.true

      it 'should return false if a prop rejects', ->

        space = new Space
        space._propagators.push { stepper: -> FD.helpers.REJECTED }
        expect(space.propagate()).to.be.false

      it 'should return true if no prop rejects', ->

        space = new Space
        space._propagators.push { stepper: -> FD.helpers.ZERO_CHANGES }, { stepper: -> FD.helpers.ZERO_CHANGES }
        expect(space.propagate()).to.be.true

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
        expect(space.solution()).to.eql {addme: 20}

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
        space.inject ->
        expect(space).to.eql clone

    describe '#decl_anon()', ->

      it 'should create a new var', ->

        space = new Space()
        expect(space.var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space.decl_anon spec_d_create_value 22
        expect(space.var_names.length, 'after decl').to.eql 1

      it 'should return the name of a var', ->

        space = new Space()
        name = space.decl_anon spec_d_create_value 50
        expect(space.var_names.indexOf(name) > -1).to.be.true

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
        expect(space.var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space.decl_anons 22
        expect(space.var_names.length, 'after decl').to.eql 22

      it 'should return a list of names of the new vars', ->

        space = new Space()
        names = space.decl_anons 50
        for name in names
          expect(space.var_names.indexOf(name) > -1).to.be.true

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
        expect(space.var_names.length, 'before decl').to.eql 0 # no vars... right? :)
        space.decl_value 22
        expect(space.var_names.length, 'after decl').to.eql 1

      it 'should return the name of a var', ->

        space = new Space()
        name = space.decl_value 50
        expect(space.var_names.indexOf(name) > -1).to.be.true

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
        expect(space.var_names).to.eql ['foo']
        expect(space.vars.foo?).to.be.true

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
