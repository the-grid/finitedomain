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

describe "propagators/neq.spec", ->
  # in general after call v1 and v2 should be equal

  {
    SUB
    SUP

    REJECTED
    ZERO_CHANGES
  } = FD.helpers

  {
    fdvar_create
    fdvar_create_wide
  } = FD.fdvar

  {
    neq_step_bare
  } = FD.propagators.neq

  it 'should exist', ->

    expect(neq_step_bare?).to.be.true

  it 'should require two vars', ->

    expect(-> neq_step_bare()).to.throw
    v = fdvar_create_wide 'x'
    expect(-> neq_step_bare v).to.throw
    expect(-> neq_step_bare undefined, v).to.throw

#  it 'should reject for empty domains', ->
#
#    v1 = fdvar_create 'x', []
#    v2 = fdvar_create 'y', []
#    expect(neq_step_bare v1, v2).to.eql REJECTED
#
#  it 'should reject for empty left domain', ->
#
#    v1 = fdvar_create 'x', []
#    v2 = fdvar_create_wide 'y'
#    expect(neq_step_bare v1, v2).to.eql REJECTED
#
#  it 'should reject for empty right domain', ->
#
#    v1 = fdvar_create_wide 'x'
#    v2 = fdvar_create 'y', []
#    expect(neq_step_bare v1, v2).to.eql REJECTED

  describe 'should not change anything as long as both domains are unsolved', ->

    test = (domain1, domain2=domain1.slice 0) ->
      for n in domain1
        if typeof(n) isnt 'number'
          throw new Error 'bad test, fixme! neq.spec.1: ['+domain1+'] ['+domain2+']'
      for n in domain2
        if typeof(n) isnt 'number'
          throw new Error 'bad test, fixme! neq.spec.2: ['+domain1+'] ['+domain2+']'

      it 'should not change anything (left-right): '+[domain1, domain2].join('|'), ->
        v1 = fdvar_create 'x', domain1.slice 0
        v2 = fdvar_create 'y', domain2.slice 0
        expect(neq_step_bare v1, v2).to.eql ZERO_CHANGES
        expect(v1.dom, 'v1 dom').to.eql domain1
        expect(v2.dom, 'v2 dom').to.eql domain2

      it 'should not change anything (right-left): '+[domain2, domain1].join('|'), ->
        v1 = fdvar_create 'x', domain2.slice 0
        v2 = fdvar_create 'y', domain1.slice 0
        expect(neq_step_bare v1, v2).to.eql ZERO_CHANGES
        expect(v1.dom, 'v1 dom').to.eql domain2
        expect(v2.dom, 'v2 dom').to.eql domain1

    # these are the (non-solved) cases plucked from eq tests
    test spec_d_create_range(SUB, SUP), spec_d_create_ranges [0, 10], [20, 30]
    test spec_d_create_range 0, 1
    test spec_d_create_range 20, 50
    test spec_d_create_ranges [0, 10], [20, 30], [40, 50]
    test spec_d_create_ranges [0, 10], [25, 25], [40, 50]
    test spec_d_create_ranges [0, 0], [2, 2]
    test spec_d_create_ranges [0, 0], [2, 3]
    test spec_d_create_range(SUB, 1),  spec_d_create_range(1, SUP)
    test spec_d_create_ranges([0, 10], [20, 30], [40, 50]),  spec_d_create_ranges([5, 15], [25, 35]), spec_d_create_ranges([5, 10], [25, 30])
    test spec_d_create_ranges([0, 10], [20, 30], [40, 50]),  spec_d_create_ranges([SUB, SUP]), spec_d_create_ranges([0, 10], [20, 30], [40, 50])
    test spec_d_create_ranges([0, 0], [2, 2]),  spec_d_create_ranges([1, 1], [3, 3]), [], REJECTED
    test spec_d_create_ranges([0, 0], [2, 2]),  spec_d_create_ranges([1, 2], [4, 4]), spec_d_create_range 2,2

  describe 'with one solved domain', ->

    test = (value, domain1, result) ->
      domain2 = spec_d_create_range value, value

      it 'should remove solved domain from unsolve domain (left-right): '+[domain1, domain2].join('|'), ->
        v1 = fdvar_create 'x', domain1.slice 0
        v2 = fdvar_create 'y', domain2.slice 0
        expect(neq_step_bare v1, v2).to.be.above 0
        expect(v1.dom, 'v1 dom').to.eql result
        expect(v2.dom, 'v2 dom').to.eql domain2

      it 'should not change anything (right-left): '+[domain2, domain1].join('|'), ->
        v1 = fdvar_create 'x', domain2.slice 0
        v2 = fdvar_create 'y', domain1.slice 0
        expect(neq_step_bare v1, v2).to.be.above 0
        expect(v1.dom, 'v1 dom').to.eql domain2
        expect(v2.dom, 'v2 dom').to.eql result

    test 0, spec_d_create_range(0, 1), spec_d_create_ranges([1, 1])
    test 1, spec_d_create_range(0, 1), spec_d_create_ranges([0, 0])
    test SUB, spec_d_create_range(SUB, 50), spec_d_create_ranges([SUB+1, 50])
    test SUP, spec_d_create_range(20, SUP), spec_d_create_ranges([20, SUP-1])
    test 10, spec_d_create_ranges([10, 10], [12, 50]), spec_d_create_ranges([12, 50])
    test 10, spec_d_create_ranges([0, 8], [10, 10], [12, 20]), spec_d_create_ranges([0, 8], [12, 20])
    test 10, spec_d_create_ranges([0, 10], [12, 50]), spec_d_create_ranges([0, 9], [12, 50])
    test 1, spec_d_create_range(0, 3), spec_d_create_ranges([0,0], [2,3])

  describe 'two solved domains', ->

    test = (value1, value2) ->
      domain1 = spec_d_create_range value1, value1
      domain2 = spec_d_create_range value2, value2

      it 'should be "solved" (left-right): '+[domain1, domain2].join('|'), ->
        v1 = fdvar_create 'x', domain1.slice 0
        v2 = fdvar_create 'y', domain2.slice 0
        expect(neq_step_bare v1, v2).to.eql ZERO_CHANGES
        expect(v1.dom, 'v1 dom').to.eql domain1
        expect(v2.dom, 'v2 dom').to.eql domain2

      it 'should be "solved" (right-left): '+[domain2, domain1].join('|'), ->
        v1 = fdvar_create 'x', domain2.slice 0
        v2 = fdvar_create 'y', domain1.slice 0
        expect(neq_step_bare v1, v2).to.eql ZERO_CHANGES
        expect(v1.dom, 'v1 dom').to.eql domain2
        expect(v2.dom, 'v2 dom').to.eql domain1

      it 'should reject if same (left-left): '+[domain1, domain1].join('|'), ->
        v1 = fdvar_create 'x', domain1.slice 0
        v2 = fdvar_create 'y', domain1.slice 0
        expect(neq_step_bare v1, v2).to.eql REJECTED
#        expect(v1.dom, 'v1 dom').to.eql []
#        expect(v2.dom, 'v2 dom').to.eql []

    test 0, 1
    test 1, 2
    test 1, 20
    test SUB, 10
    test 10, SUP
    test SUB, SUP

