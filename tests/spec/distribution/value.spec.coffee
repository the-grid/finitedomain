if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'
  require '../../fixtures/helpers.spec'
  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_ranges
    spec_d_create_zero
  } = require '../../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe 'FD.distribution.Value', ->

  describe 'distribution_value_by_min', ->
    {distribution_value_by_min} = FD.distribution.Value

    it 'should exist', ->

      expect(distribution_value_by_min?).to.be.true

    describe 'factory', ->

      it 'should return a function', ->

        expect(distribution_value_by_min()).to.be.a 'function'

    describe 'distribution', ->

      it 'should set var to lo for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_bool()

        # setup the space distributors such that all vars are used and value uses distribution_value_by_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_min` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_min` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # since 0 was the lowest value in original value, expecting var to be set to that now
        expect(new_space.vars.A.dom).to.eql spec_d_create_range 0, 0

      it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 11], [13, 20])

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_min` here
        get_next_value = space.get_value_distributor space

        # now we have `distribution_value_by_split_min` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # make sure 12 is not part of the result
        expect(new_space.vars.A.dom).to.eql spec_d_create_range(10, 10)

      it 'should set var to second value for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_bool()

        # setup the space distributors such that all vars are used and value uses distribution_value_by_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_min` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_min` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # since 0 was the lowest value in original value, expecting var to be set to that now
        expect(new_space.vars.A.dom).to.eql spec_d_create_range 1, 1

      it 'should intersect and not use middle elements blindly for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 11], [13, 20])

        # setup the space distributors such that all vars are used and value uses distribution_value_by_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_min` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # make sure 12 is still not part of the result
        expect(new_space.vars.A.dom).to.eql spec_d_create_ranges([11, 11], [13, 20])

      it 'should reject a "solved" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_zero()

        # setup the space distributors such that all vars are used and value uses distribution_value_by_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_min` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_min` so call it and it should throw because A is already solved
        expect(-> get_next_value space, 0).to.throw

      it 'should reject a "rejected" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', [0, 1] # initially set to unsolved to circumvent early asserts

        # setup the space distributors such that all vars are used and value uses distribution_value_by_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'min'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_min` here
        get_next_value = space.get_value_distributor space

        # now clear the var before calling next
        FD.Var.fdvar_set_domain space.vars.A, []

        # now we have `value_distribution_by_min` so call it and it should throw because A is already rejected
        expect(-> get_next_value space, 0).to.throw

      it 'should do nothing if choice is >2', ->

        expect(distribution_value_by_min()(null, 2)).to.be.undefined

  describe 'distribution_value_by_max', ->
    {distribution_value_by_max} = FD.distribution.Value

    it 'should exist', ->

      expect(distribution_value_by_max?).to.be.true

    describe 'factory', ->

      it 'should return a function', ->

        expect(distribution_value_by_max()).to.be.a 'function'

    describe 'distribution', ->

      it 'should set var to hi for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_bool()

        # setup the space distributors such that all vars are used and value uses distribution_value_by_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'max'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_max` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # since 1 was the highest value in original value, expecting var to be set to that now
        expect(new_space.vars.A.dom).to.eql spec_d_create_range 1, 1

      it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 11], [13, 20])

        # setup the space distributors such that all vars are used and value uses value_distribution_by_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'max'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_max` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # make sure 12 is not part of the result
        expect(new_space.vars.A.dom).to.eql spec_d_create_range(20, 20)

      it 'should set var to second value for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_bool()

        # setup the space distributors such that all vars are used and value uses distribution_value_by_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'max'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_max` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # since 1 was the highest value in original value, expecting var to be set to the inv
        expect(new_space.vars.A.dom).to.eql spec_d_create_range 0, 0

      it 'should intersect and not use middle values blindly for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 11], [13, 20])

        # setup the space distributors such that all vars are used and value uses distribution_value_by_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'max'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_max` here
        get_next_value = space.get_value_distributor space

        # now we have `distribution_value_by_max` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # make sure 12 is still not part of the result
        expect(new_space.vars.A.dom).to.eql spec_d_create_ranges([10, 11], [13, 19])

      it 'should reject a "solved" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_zero()

        # setup the space distributors such that all vars are used and value uses distribution_value_by_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'max'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_max` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it and it should throw because A is already solved
        expect(-> get_next_value space, 0).to.throw

      it 'should reject a "rejected" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', [0, 1] # initially set to unsolved to circumvent early asserts

        # setup the space distributors such that all vars are used and value uses distribution_value_by_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'max'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_max` here
        get_next_value = space.get_value_distributor space

        # now clear the var before calling next
        FD.Var.fdvar_set_domain space.vars.A, []

        # now we have `value_distribution_by_max` so call it and it should throw because A is already rejected
        expect(-> get_next_value space, 0).to.throw

      it 'should do nothing if choice is >2', ->

        expect(distribution_value_by_max()(null, 2)).to.be.undefined

  describe 'distribution_value_by_mid', ->
    {distribution_value_by_mid} = FD.distribution.Value

    it 'should exist', ->

      expect(distribution_value_by_mid?).to.be.true

    describe 'factory', ->

      it 'should return a function', ->

        expect(distribution_value_by_mid()).to.be.a 'function'

    describe 'distribution', ->

      it 'should set var to mid for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_range(10, 20)

        # setup the space distributors such that all vars are used and value uses distribution_value_by_mid
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'mid'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_mid` here
        get_next_value = space.get_value_distributor space

        # now we have `distribution_value_by_mid` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # since 15 was the middle value in original value, expecting var to be set to that now
        expect(new_space.vars.A.dom).to.eql spec_d_create_range 15, 15

      it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 12], [18, 20])

        # setup the space distributors such that all vars are used and value uses distribution_value_by_mid
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'mid'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_min` here
        get_next_value = space.get_value_distributor space

        # now we have `distribution_value_by_mid` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # make sure 12 is not part of the result
        expect(new_space.vars.A.dom).to.eql spec_d_create_range(18, 18) # should not be 15-ish

      it 'should set var to same range sans middle value for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_range(10, 20)

        # setup the space distributors such that all vars are used and value uses distribution_value_by_mid
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'mid'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_mid` here
        get_next_value = space.get_value_distributor space

        # now we have `distribution_value_by_mid` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # should now be 10-20 sans the 15
        expect(new_space.vars.A.dom).to.eql spec_d_create_ranges([10, 14], [16, 20])

      it 'should intersect and not use higher range blindly for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 12], [18, 20])

        # setup the space distributors such that all vars are used and value uses distribution_value_by_mid
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'mid'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_mid` here
        get_next_value = space.get_value_distributor space

        # now we have `distribution_value_by_mid` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # make sure 12 is still not part of the result
        expect(new_space.vars.A.dom).to.eql spec_d_create_ranges([10, 12], [19, 20])

      it 'should reject a "solved" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_zero()

        # setup the space distributors such that all vars are used and value uses distribution_value_by_mid
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'mid'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_mid` here
        get_next_value = space.get_value_distributor space

        # now we have `distribution_value_by_mid` so call it and it should throw because A is already solved
        expect(-> get_next_value space, 0).to.throw

      it 'should reject a "rejected" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_bool() # initially set to unsolved to circumvent early asserts

        # setup the space distributors such that all vars are used and value uses distribution_value_by_mid
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'mid'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_mid` here
        get_next_value = space.get_value_distributor space

        # now clear the var before calling next
        FD.Var.fdvar_set_domain space.vars.A, []

        # now we have `distribution_value_by_mid` so call it and it should throw because A is already rejected
        expect(-> get_next_value space, 0).to.throw

      it 'should do nothing if choice is >2', ->

        expect(distribution_value_by_mid()(null, 2)).to.be.undefined

  describe 'distribution_value_by_split_min', ->
    {distribution_value_by_split_min} = FD.distribution.Value

    it 'should exist', ->

      expect(distribution_value_by_split_min?).to.be.true

    describe 'factory', ->

      it 'should return a function', ->

        expect(distribution_value_by_split_min()).to.be.a 'function'

    describe 'distribution', ->

      it 'should set var to lower half for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_range(10, 20)

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMin'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_min` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # since 15 was the middle value in original value, expecting var to be set to that now
        expect(new_space.vars.A.dom).to.eql spec_d_create_range(10, 15)

      it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 11], [13, 20])

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMin'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_min` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # make sure 12 is not part of the result
        expect(new_space.vars.A.dom).to.eql spec_d_create_ranges([10, 11], [13, 15])

      it 'should set var to higher half for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_range(10, 20)

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMin'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_min` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # should now be 10-20 sans the 15
        expect(new_space.vars.A.dom).to.eql spec_d_create_range(16, 20)

      it 'should intersect and not use higher range blindly for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 17], [19, 20])

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMin'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_min` here
        get_next_value = space.get_value_distributor space

        # now we have `distribution_value_by_split_min` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # should now be 10-20 sans the 15
        expect(new_space.vars.A.dom).to.eql spec_d_create_ranges([16, 17], [19, 20])

      it 'should reject a "solved" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_zero()

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMin'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_min` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it and it should throw because A is already solved
        expect(-> get_next_value space, 0).to.throw

      it 'should reject a "rejected" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_bool() # initially set to unsolved to circumvent early asserts

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_min
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMin'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_min` here
        get_next_value = space.get_value_distributor space

        # now clear the var before calling next
        FD.Var.fdvar_set_domain space.vars.A, []

        # now we have `value_distribution_by_max` so call it and it should throw because A is already rejected
        expect(-> get_next_value space, 0).to.throw

      it 'should do nothing if choice is >2', ->

        expect(distribution_value_by_split_min()(null, 2)).to.be.undefined

  describe 'distribution_value_by_split_max', ->
    {distribution_value_by_split_max} = FD.distribution.Value

    it 'should exist', ->

      expect(distribution_value_by_split_max?).to.be.true

    describe 'factory', ->

      it 'should return a function', ->

        expect(distribution_value_by_split_max()).to.be.a 'function'

    describe 'distribution', ->

      it 'should set higher half for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_range(10, 20)

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMax'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_max` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # since 15 was the middle value in original value, expecting var to be set to that now
        expect(new_space.vars.A.dom).to.eql spec_d_create_range(16, 20)

      it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 17], [19, 20])

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMax'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_max` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with FIRST_CHOICE
        new_space = get_next_value space, 0

        # make sure 18 is still not part of the result
        expect(new_space.vars.A.dom).to.eql spec_d_create_ranges([16, 17], [19, 20])

      it 'should set var to lower half for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_range(10, 20)

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMax'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_max` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # should now be 10-20 sans the 15
        expect(new_space.vars.A.dom).to.eql spec_d_create_range(10, 15)

      it 'should intersect and not use higher range blindly for SECOND_CHOICE', ->

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_ranges([10, 11], [13, 20])

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMax'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_max` here
        get_next_value = space.get_value_distributor space

        # now we have `distribution_value_by_split_max` so call it with SECOND_CHOICE
        new_space = get_next_value space, 1

        # make sure 12 is still not part of the result
        expect(new_space.vars.A.dom).to.eql spec_d_create_ranges([10, 11], [13, 15])

      it 'should reject a "solved" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_zero()

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMax'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_max` here
        get_next_value = space.get_value_distributor space

        # now we have `value_distribution_by_max` so call it and it should throw because A is already solved
        expect(-> get_next_value space, 0).to.throw

      it 'should reject a "rejected" var', ->
        # note: only rejects with ASSERTs

        # create a space with one bool var
        space = new FD.space
        space.decl 'A', spec_d_create_bool() # initially set to unsolved to circumvent early asserts

        # setup the space distributors such that all vars are used and value uses distribution_value_by_split_max
        FD.distribution.create_custom_distributor space, ['A'], {var: 'naive', val: 'splitMax'}

        # create a function that walks the space. note that we're calling a `distribution_value_by_split_max` here
        get_next_value = space.get_value_distributor space

        # now clear the var before calling next
        FD.Var.fdvar_set_domain space.vars.A, []

        # now we have `value_distribution_by_max` so call it and it should throw because A is already rejected
        expect(-> get_next_value space, 0).to.throw

      it 'should do nothing if choice is >2', ->

        expect(distribution_value_by_split_max()(null, 2)).to.be.undefined
