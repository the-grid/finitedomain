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

describe 'distribution/value.spec', ->

  unless FD.__DEV_BUILD
    return

  {
    fdvar_create
    fdvar_create_bool
  } = FD.fdvar

  it 'fdvar_create_bool should exist', ->

    expect(fdvar_create_bool?).to.be.true

  describe 'distribution_value_by_throw', ->

    it 'should throw', ->

      expect(-> FD.distribution.value._distribute_get_next_domain_for_var 'throw').to.throw 'not expecting to pick this distributor'

  describe 'distribution_value_by_min', ->

    {_distribution_value_by_min: distribution_value_by_min} = FD.distribution.value

    it 'should exist', ->

      expect(distribution_value_by_min?).to.be.true

    it 'should pick lo for FIRST_CHOICE ', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_min fdvar, 0).to.eql spec_d_create_value 0
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should pick hi for SECOND_CHOICE', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_min fdvar, 1).to.eql spec_d_create_value 1
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should return undefined for third choice', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_min fdvar, 2).to.eql undefined
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([10, 11], [13, 20])

      expect(distribution_value_by_min fdvar, 0).to.eql spec_d_create_value 10

    it 'should intersect and not use lower range blindly for SECOND_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([10, 11], [13, 20])

      expect(distribution_value_by_min fdvar, 1).to.eql spec_d_create_ranges([11, 11], [13, 20])

    it 'should reject a "solved" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', spec_d_create_value 20

      expect(-> distribution_value_by_min fdvar, 0).to.throw
      expect(-> distribution_value_by_min fdvar, 1).to.throw

    it 'should reject a "rejected" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', []

      expect(-> distribution_value_by_min fdvar, 0).to.throw
      expect(-> distribution_value_by_min fdvar, 1).to.throw

  describe 'distribution_value_by_max', ->

    {_distribution_value_by_max: distribution_value_by_max} = FD.distribution.value

    it 'should exist', ->

      expect(distribution_value_by_max?).to.be.true

    it 'should pick lo for FIRST_CHOICE ', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_max fdvar, 0).to.eql spec_d_create_value 1
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should pick hi for SECOND_CHOICE', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_max fdvar, 1).to.eql spec_d_create_value 0
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should return undefined for third choice', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_max fdvar, 2).to.eql undefined
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([10, 17], [19, 20])

      expect(distribution_value_by_max fdvar, 0).to.eql spec_d_create_value 20

    it 'should intersect and not use lower range blindly for SECOND_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([10, 17], [19, 20])

      expect(distribution_value_by_max fdvar, 1).to.eql spec_d_create_ranges([10, 17], [19, 19])

    it 'should reject a "solved" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', spec_d_create_value 20

      expect(-> distribution_value_by_max fdvar, 0).to.throw
      expect(-> distribution_value_by_max fdvar, 1).to.throw

    it 'should reject a "rejected" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', []

      expect(-> distribution_value_by_max fdvar, 0).to.throw
      expect(-> distribution_value_by_max fdvar, 1).to.throw

  describe 'distribution_value_by_mid', ->

    {_distribution_value_by_mid: distribution_value_by_mid} = FD.distribution.value

    it 'should exist', ->

      expect(distribution_value_by_mid?).to.be.true

    it 'should pick lo for FIRST_CHOICE ', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_mid fdvar, 0).to.eql spec_d_create_value 1
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should pick hi for SECOND_CHOICE', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_mid fdvar, 1).to.eql spec_d_create_value 0
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should return undefined for third choice', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_mid fdvar, 2).to.eql undefined
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([10, 12], [18, 20])

      expect(distribution_value_by_mid fdvar, 0).to.eql spec_d_create_value 18

    it 'should intersect and not use lower range blindly for SECOND_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([10, 12], [18, 20])

      expect(distribution_value_by_mid fdvar, 1).to.eql spec_d_create_ranges([10, 12], [19, 20])

    it 'should pick middle out', ->

      fdvar = fdvar_create 'A', spec_d_create_range 1, 3
      expect(distribution_value_by_mid fdvar, 0).to.eql spec_d_create_ranges [2, 2]
      expect(distribution_value_by_mid fdvar, 1).to.eql spec_d_create_ranges [1, 1], [3, 3]

    it 'should reject a "solved" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', spec_d_create_value 20

      expect(-> distribution_value_by_mid fdvar, 0).to.throw
      expect(-> distribution_value_by_mid fdvar, 1).to.throw

    it 'should reject a "rejected" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', []

      expect(-> distribution_value_by_mid fdvar, 0).to.throw
      expect(-> distribution_value_by_mid fdvar, 1).to.throw

  describe 'distribution_value_by_split_min', ->

    {_distribution_value_by_split_min: distribution_value_by_split_min} = FD.distribution.value


    it 'should exist', ->

      expect(distribution_value_by_split_min?).to.be.true

    it 'should pick lower half for FIRST_CHOICE ', ->

      fdvar = fdvar_create 'A', spec_d_create_range 10, 20

      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_range 10, 15
      expect(fdvar.dom).to.eql spec_d_create_range 10, 20

    it 'should pick upper half for SECOND_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_range 10, 20

      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_range 16, 20
      expect(fdvar.dom).to.eql spec_d_create_range 10, 20

    it 'should return undefined for third choice', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_split_min fdvar, 2).to.eql undefined
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([0, 1], [8, 12], [18, 20])

      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_ranges [0, 1], [8, 10]

    it 'should intersect and not use lower range blindly for SECOND_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([0, 1], [8, 12], [18, 20])

      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_ranges [11, 12], [18, 20]

    it 'should handle simple domains', ->

      fdvar = fdvar_create 'A', spec_d_create_range 1, 2
      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_range 1, 1
      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_range 2, 2

      fdvar = fdvar_create 'A', spec_d_create_range 1, 3
      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_range 1, 2
      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_range 3, 3

      fdvar = fdvar_create 'A', spec_d_create_range 1, 4
      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_range 1, 2
      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_range 3, 4

    it 'should reject a "solved" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', spec_d_create_value 20

      expect(-> distribution_value_by_split_min fdvar, 0).to.throw
      expect(-> distribution_value_by_split_min fdvar, 1).to.throw

    it 'should reject a "rejected" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', []

      expect(-> distribution_value_by_split_min fdvar, 0).to.throw
      expect(-> distribution_value_by_split_min fdvar, 1).to.throw

  describe 'distribution_value_by_split_min', ->

    {_distribution_value_by_split_min: distribution_value_by_split_min} = FD.distribution.value


    it 'should exist', ->

      expect(distribution_value_by_split_min?).to.be.true

    it 'should pick lower half for FIRST_CHOICE ', ->

      fdvar = fdvar_create 'A', spec_d_create_range 10, 20

      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_range 10, 15
      expect(fdvar.dom).to.eql spec_d_create_range 10, 20

    it 'should pick upper half for SECOND_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_range 10, 20

      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_range 16, 20
      expect(fdvar.dom).to.eql spec_d_create_range 10, 20

    it 'should return undefined for third choice', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_split_min fdvar, 2).to.eql undefined
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([0, 1], [8, 12], [18, 20])

      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_ranges [0, 1], [8, 10]

    it 'should intersect and not use lower range blindly for SECOND_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([0, 1], [8, 12], [18, 20])

      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_ranges [11, 12], [18, 20]

    it 'should handle simple domains', ->

      fdvar = fdvar_create 'A', spec_d_create_range 1, 2
      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_range 1, 1
      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_range 2, 2

      fdvar = fdvar_create 'A', spec_d_create_range 1, 3
      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_range 1, 2
      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_range 3, 3

      fdvar = fdvar_create 'A', spec_d_create_range 1, 4
      expect(distribution_value_by_split_min fdvar, 0).to.eql spec_d_create_range 1, 2
      expect(distribution_value_by_split_min fdvar, 1).to.eql spec_d_create_range 3, 4

    it 'should reject a "solved" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', spec_d_create_value 20

      expect(-> distribution_value_by_split_min fdvar, 0).to.throw
      expect(-> distribution_value_by_split_min fdvar, 1).to.throw

    it 'should reject a "rejected" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', []

      expect(-> distribution_value_by_split_min fdvar, 0).to.throw
      expect(-> distribution_value_by_split_min fdvar, 1).to.throw

  describe 'distribution_value_by_split_max', ->

    {_distribution_value_by_split_max: distribution_value_by_split_max} = FD.distribution.value


    it 'should exist', ->

      expect(distribution_value_by_split_max?).to.be.true

    it 'should pick lower half for FIRST_CHOICE ', ->

      fdvar = fdvar_create 'A', spec_d_create_range 10, 20

      expect(distribution_value_by_split_max fdvar, 0).to.eql spec_d_create_range 16, 20
      expect(fdvar.dom).to.eql spec_d_create_range 10, 20

    it 'should pick upper half for SECOND_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_range 10, 20

      expect(distribution_value_by_split_max fdvar, 1).to.eql spec_d_create_range 10, 15
      expect(fdvar.dom).to.eql spec_d_create_range 10, 20

    it 'should return undefined for third choice', ->

      fdvar = fdvar_create_bool 'A'

      expect(distribution_value_by_split_max fdvar, 2).to.eql undefined
      expect(fdvar.dom).to.eql spec_d_create_bool()

    it 'should intersect and not use lower range blindly for FIRST_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([0, 1], [8, 12], [18, 20])

      expect(distribution_value_by_split_max fdvar, 0).to.eql spec_d_create_ranges [11, 12], [18, 20]

    it 'should intersect and not use lower range blindly for SECOND_CHOICE', ->

      fdvar = fdvar_create 'A', spec_d_create_ranges([0, 1], [8, 12], [18, 20])

      expect(distribution_value_by_split_max fdvar, 1).to.eql spec_d_create_ranges [0, 1], [8, 10]

    it 'should handle simple domains', ->

      fdvar = fdvar_create 'A', spec_d_create_range 1, 2
      expect(distribution_value_by_split_max fdvar, 0).to.eql spec_d_create_range 2, 2
      expect(distribution_value_by_split_max fdvar, 1).to.eql spec_d_create_range 1, 1

      fdvar = fdvar_create 'A', spec_d_create_range 1, 3
      expect(distribution_value_by_split_max fdvar, 0).to.eql spec_d_create_range 3, 3
      expect(distribution_value_by_split_max fdvar, 1).to.eql spec_d_create_range 1, 2

      fdvar = fdvar_create 'A', spec_d_create_range 1, 4
      expect(distribution_value_by_split_max fdvar, 0).to.eql spec_d_create_range 3, 4
      expect(distribution_value_by_split_max fdvar, 1).to.eql spec_d_create_range 1, 2

    it 'should reject a "solved" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', spec_d_create_value 20

      expect(-> distribution_value_by_split_max fdvar, 0).to.throw
      expect(-> distribution_value_by_split_max fdvar, 1).to.throw

    it 'should reject a "rejected" var', ->
      # note: only rejects with ASSERTs

      fdvar = fdvar_create 'A', []

      expect(-> distribution_value_by_split_max fdvar, 0).to.throw
      expect(-> distribution_value_by_split_max fdvar, 1).to.throw
