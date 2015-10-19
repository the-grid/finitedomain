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
        space.decl 'multi_range_with_solved', spec_d_create_ranges [10, 20], [15, 15], [30, 40]
        expect(space.solution()).to.eql
          single_range: spec_d_create_range 10, 20
          multi_range: spec_d_create_ranges([10, 20], [30, 40])
          multi_range_with_solved: spec_d_create_ranges([10, 20], [15, 15], [30, 40])

      it 'should not add anonymous vars to the result', ->

        space = new Space()
        space.decl_value 15
        space.decl 'addme', 20
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
