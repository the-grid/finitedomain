if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'
  {
  spec_d_create_bool
  spec_d_create_range
  spec_d_create_ranges
  spec_d_create_value
  } = require '../../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "propagators/lt.spec", ->
  # in general after call, max(v1) should be < max(v2) and min(v2) should be > min(v1)
  # it makes sure v1 and v2 have no values that can't possibly result in fulfilling <

  {
    REJECTED
    ZERO_CHANGES
  } = FD.helpers

  {
    fdvar_create
    fdvar_create_wide
  } = FD.Fdvar

  {
    lt_step_bare
  } = FD.propagators

  it 'should exist', ->

    expect(lt_step_bare?).to.be.true

  it 'should require two vars', ->

    expect(-> lt_step_bare()).to.throw
    v = fdvar_create_wide 'x'
    expect(-> lt_step_bare v).to.throw
    expect(-> lt_step_bare undefined, v).to.throw

#  it 'should reject for empty domains', ->
#
#    v1 = fdvar_create 'x', []
#    v2 = fdvar_create 'y', []
#    expect(lt_step_bare v1, v2).to.eql REJECTED
#
#  it 'should reject for empty left domain', ->
#
#    v1 = fdvar_create 'x', []
#    v2 = fdvar_create_wide 'y'
#    expect(lt_step_bare v1, v2).to.eql REJECTED
#
#  it 'should reject for empty right domain', ->
#
#    v1 = fdvar_create_wide 'x'
#    v2 = fdvar_create 'y', []
#    expect(lt_step_bare v1, v2).to.eql REJECTED

  it 'should not change if v1 already < v2', ->

    v1 = fdvar_create 'x', spec_d_create_range 0, 10
    v2 = fdvar_create 'y', spec_d_create_range 20, 30
    expect(lt_step_bare v1, v2).to.eql ZERO_CHANGES

    v1 = fdvar_create 'x', spec_d_create_range 0, 10
    v2 = fdvar_create 'y', spec_d_create_range 11, 30
    expect(lt_step_bare v1, v2).to.eql ZERO_CHANGES

    v1 = fdvar_create 'x', spec_d_create_range 0, 0
    v2 = fdvar_create 'y', spec_d_create_range 1, 1
    expect(lt_step_bare v1, v2).to.eql ZERO_CHANGES

    v1 = fdvar_create 'x', spec_d_create_range 0, 0
    v2 = fdvar_create 'y', spec_d_create_range 1, 1
    expect(lt_step_bare v1, v2).to.eql ZERO_CHANGES

  describe 'when max(v1) >= max(v2)', ->

    test = (lo1, hi1, lo2, hi2, result_lo, result_hi, result) ->
      it 'should (only) trunc values from v1 ['+[lo1,hi1,lo2,hi2,result_lo,result_hi]+']', ->
        v1 = fdvar_create 'x', spec_d_create_range lo1, hi1
        v2 = fdvar_create 'y', spec_d_create_range lo2, hi2
        r = lt_step_bare v1, v2
        expect(v1.dom, 'v1 after').to.eql (result is REJECTED and []) or spec_d_create_range result_lo, result_hi
        expect(v2.dom, 'v2 after').to.eql spec_d_create_range lo2, hi2
        result? and expect(r).to.eql result

    test 0,20, 5,15, 0,14
    test 0,10, 5,15, 0,10, ZERO_CHANGES

  it 'should reject when v1 and v2 are solved and v1>v2', ->

    v1 = fdvar_create 'x', spec_d_create_range 10, 10
    v2 = fdvar_create 'y', spec_d_create_range 5, 5
    r = lt_step_bare v1, v2
    # depending on implementation v1 and v2 may be cleared, one of them cleared, or not changed. but must reject regardless...
    #expect(v1.dom, 'v1 after').to.eql []
    #expect(v2.dom, 'v2 after').to.eql []
    expect(r).to.eql REJECTED

  describe 'when min(v1) >= min(v2)', ->

    test = (lo1, hi1, lo2, hi2, result_lo, result_hi, result) ->
      it 'should (only) trunc values from v2 ['+[lo1,hi1,lo2,hi2,result_lo,result_hi]+']', ->
        v1 = fdvar_create 'x', spec_d_create_range lo1, hi1
        v2 = fdvar_create 'y', spec_d_create_range lo2, hi2
        r = lt_step_bare v1, v2
        expect(v1.dom, 'v1 after').to.eql spec_d_create_range lo1, hi1
        expect(v2.dom, 'v2 after').to.eql (result is REJECTED and []) or spec_d_create_range result_lo, result_hi
        result? and expect(r).to.eql result

    test 5,14, 0,15, 6,15
    test 5,10, 7,15, 7,15, ZERO_CHANGES
    #test 10,10, 5,5, 5,5, REJECTED # note: this is the same test as in v1>=v2 because v1 is checked first. so not possible here.

  describe 'when both min/max v1 >= min/max v2', ->

    test = (lo1, hi1, lo2, hi2, result_lo1, result_hi1, result_lo2, result_hi2, result) ->
      it 'should (only) trunc values from v2 ['+[lo1, hi1, lo2, hi2, result_lo1, result_hi1, result_lo2, result_hi2, result]+']', ->
        v1 = fdvar_create 'x', spec_d_create_range lo1, hi1
        v2 = fdvar_create 'y', spec_d_create_range lo2, hi2
        r = lt_step_bare v1, v2
        expect(v1.dom, 'v1 after').to.eql spec_d_create_range result_lo1, result_hi1
        expect(v2.dom, 'v2 after').to.eql spec_d_create_range result_lo2, result_hi2
        result? and expect(r).to.eql result

    test 5,20, 0,10, 5,9, 6,10
    test 5,20, 5,20, 5,19, 6,20

  it 'should handle multiple ranges too', ->

    v1 = fdvar_create 'x', spec_d_create_ranges [10, 20], [30, 40], [50, 60], [70, 150]
    v2 = fdvar_create 'y', spec_d_create_range 0, 100
    lt_step_bare v1, v2
    expect(v1.dom, 'v1 after').to.eql spec_d_create_ranges [10, 20], [30, 40], [50, 60], [70, 99]
    expect(v2.dom, 'v2 after').to.eql spec_d_create_range 11, 100

  it 'should be able to drop last range in v1', ->

    v1 = fdvar_create 'x', spec_d_create_ranges [10, 20], [30, 40], [50, 60], [70, 98], [120, 150]
    v2 = fdvar_create 'y', spec_d_create_range 0, 100
    lt_step_bare v1, v2
    expect(v1.dom, 'v1 after').to.eql spec_d_create_ranges [10, 20], [30, 40], [50, 60], [70, 98]
    expect(v2.dom, 'v2 after').to.eql spec_d_create_range 11, 100

    v1 = fdvar_create 'x', spec_d_create_ranges [10, 20], [30, 40], [50, 60], [70, 98], [100, 150]
    v2 = fdvar_create 'y', spec_d_create_range 0, 100
    lt_step_bare v1, v2
    expect(v1.dom, 'v1 after').to.eql spec_d_create_ranges [10, 20], [30, 40], [50, 60], [70, 98]
    expect(v2.dom, 'v2 after').to.eql spec_d_create_range 11, 100

    v1 = fdvar_create 'x', spec_d_create_ranges [10, 20], [30, 40], [50, 60], [70, 98], [100, 100] # last is single value
    v2 = fdvar_create 'y', spec_d_create_range 0, 100
    lt_step_bare v1, v2
    expect(v1.dom, 'v1 after').to.eql spec_d_create_ranges [10, 20], [30, 40], [50, 60], [70, 98]
    expect(v2.dom, 'v2 after').to.eql spec_d_create_range 11, 100

  it 'should be able to drop first range in v1', ->

    v1 = fdvar_create 'x', spec_d_create_ranges [10, 20], [30, 40], [50, 60]
    v2 = fdvar_create 'y', spec_d_create_ranges [0, 10], [20, 100]
    lt_step_bare v1, v2
    expect(v1.dom, 'v1 after').to.eql spec_d_create_ranges [10, 20], [30, 40], [50, 60]
    expect(v2.dom, 'v2 after').to.eql spec_d_create_ranges [20, 100]

    v1 = fdvar_create 'x', spec_d_create_ranges [10, 20], [30, 40], [50, 60]
    v2 = fdvar_create 'y', spec_d_create_ranges [0, 5], [20, 100]
    lt_step_bare v1, v2
    expect(v1.dom, 'v1 after').to.eql spec_d_create_ranges [10, 20], [30, 40], [50, 60]
    expect(v2.dom, 'v2 after').to.eql spec_d_create_ranges [20, 100]

    v1 = fdvar_create 'x', spec_d_create_ranges [10, 20], [30, 40], [50, 60]
    v2 = fdvar_create 'y', spec_d_create_ranges [10, 10], [20, 100]  # first is single value
    lt_step_bare v1, v2
    expect(v1.dom, 'v1 after').to.eql spec_d_create_ranges [10, 20], [30, 40], [50, 60]
    expect(v2.dom, 'v2 after').to.eql spec_d_create_ranges [20, 100]
