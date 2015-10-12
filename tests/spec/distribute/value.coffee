if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'
  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_zero
  } = require '../../fixtures/domain'

{expect, assert} = chai
FD = finitedomain

describe 'FD.distribute.Value', ->

  describe 'distribute_value_by_min', ->
    {distribute_value_by_min} = FD.distribute.Value

    it 'should exist', ->

      expect(distribute_value_by_min?).to.be.true

    describe 'factory', ->

      it 'should return a function', ->

        expect(distribute_value_by_min()).to.be.a 'function'

    describe 'choicer', ->

      it 'should set var to lo for first choice', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_bool()

        # setup the space distributors such that all vars are used and value uses distribute_value_by_min
        FD.distribute._generate_and_setup_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribute_value_by_min` here
        get_next_value = space.distribuate space

        # now we have `value_choicer_by_min` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # since 0 was the lowest value in original value, expecting var to be set to that now
        expect(new_space.vars.A.dom).to.eql spec_d_create_range 0, 0

      it 'should set var to second value for second choice', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_bool()

        # setup the space distributors such that all vars are used and value uses distribute_value_by_min
        FD.distribute._generate_and_setup_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribute_value_by_min` here
        get_next_value = space.distribuate space

        # now we have `value_choicer_by_min` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # since 0 was the lowest value in original value, expecting var to be set to that now
        expect(new_space.vars.A.dom).to.eql spec_d_create_range 1, 1

      it 'should reject a "solved" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_zero()

        # setup the space distributors such that all vars are used and value uses distribute_value_by_min
        FD.distribute._generate_and_setup_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribute_value_by_min` here
        get_next_value = space.distribuate space

        # now we have `value_choicer_by_min` so call it and it should throw because A is already solved
        expect(-> get_next_value space, 0).to.throw

      it 'should reject a "rejected" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', [0, 1] # initially set to unsolved to circumvent early asserts

        # setup the space distributors such that all vars are used and value uses distribute_value_by_min
        FD.distribute._generate_and_setup_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribute_value_by_min` here
        get_next_value = space.distribuate space

        # now clear the var before calling next
        FD.Var.fdvar_set_domain space.vars.A, []

        # now we have `value_choicer_by_min` so call it and it should throw because A is already rejected
        expect(-> get_next_value space, 0).to.throw

      it 'should do nothing if choice is >2', ->

        expect(distribute_value_by_min()(null, 2)).to.be.undefined
