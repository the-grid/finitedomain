if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'

  {
    spec_d_create_bool
    spec_d_create_one
    spec_d_create_range
    spec_d_create_ranges
    spec_d_create_zero
  } = require '../../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe 'reified propagator', ->


  {
    SUB
    SUP

    REJECTED
    SOMETHING_CHANGED
    ZERO_CHANGES
  } = FD.helpers

  {
    fdvar_create
    fdvar_create_wide
  } = FD.Fdvar

  {
    reified_step_bare
  } = FD.propagators


  # constants (tests must copy args)
  zero = spec_d_create_zero()
  one = spec_d_create_one()
  bool = spec_d_create_bool()

  it 'should exist', ->

    expect(reified_step_bare?).to.be.true

  describe 'enforce=false', ->
    riftest = (A_in, B_in, bool_in, op, invop, expected_out, bool_after, msg) ->
      # test one step call with two vars and an op and check results
      it 'reified_step call ['+msg+'] with: '+['A=['+A_in+']', 'B=['+B_in+']', 'bool=['+bool_in+']', 'op='+op, 'inv='+invop, 'out='+expected_out, 'result=['+bool_after+']'], ->

        space =
          vars:
            A: fdvar_create 'A', A_in.slice 0
            B: fdvar_create 'B', B_in.slice 0
            bool: fdvar_create 'bool', bool_in.slice 0

        DONT_ENFORCE = false
        out = reified_step_bare space, 'A', 'B', 'bool', op, invop, DONT_ENFORCE

        expect(out, 'should reflect changed state').to.equal expected_out
        expect(space.vars.A.dom, 'A should be unchanged').to.eql A_in
        expect(space.vars.B.dom, 'B should be unchanged').to.eql B_in
        expect(space.vars.bool.dom, 'bool should reflect expected outcome').to.eql bool_after

    describe 'eq/neq with bools', ->
      riftest bool, bool, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'undetermined because eq/neq can only be determined when A and B are resolved'
      riftest bool, bool, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'undetermined because eq/neq can only be determined when A and B are resolved'
      riftest bool, zero, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'A is not resolved so not yet able to resolve bool'
      riftest bool, zero, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'A is not resolved so not yet able to resolve bool'
      riftest bool, one, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'A is not resolved so not yet able to resolve bool'
      riftest bool, one, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'A is not resolved so not yet able to resolve bool'
      riftest zero, bool, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'B is not resolved so not yet able to resolve bool'
      riftest zero, bool, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'B is not resolved so not yet able to resolve bool'
      riftest one, bool, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'B is not resolved so not yet able to resolve bool'
      riftest one, bool, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'B is not resolved so not yet able to resolve bool'
      riftest one, one, bool, 'eq', 'neq', SOMETHING_CHANGED, one, 'A and B are resolved and eq so bool should be 1'
      riftest one, one, bool, 'neq', 'eq', SOMETHING_CHANGED, zero, 'A and B are resolved and not eq so bool should be 0'
      riftest one, zero, bool, 'eq', 'neq', SOMETHING_CHANGED, zero, 'A and B are resolved and not eq so bool should be 0'
      riftest one, zero, bool, 'neq', 'eq', SOMETHING_CHANGED, one, 'A and B are resolved and neq so bool should be 1'
      riftest zero, one, bool, 'eq', 'neq', SOMETHING_CHANGED, zero, 'A and B are resolved and not eq so bool should be 0'
      riftest zero, one, bool, 'neq', 'eq', SOMETHING_CHANGED, one, 'A and B are resolved and neq so bool should be 1'
      riftest zero, zero, bool, 'eq', 'neq', SOMETHING_CHANGED, one, 'A and B are resolved and eq so bool should be 1'
      riftest zero, zero, bool, 'neq', 'eq', SOMETHING_CHANGED, zero, 'A and B are resolved and not eq so bool should be 0'

    describe 'eq/neq with non-bools', ->
      riftest spec_d_create_range(0, 5), spec_d_create_range(10, 15), bool, 'eq', 'neq', SOMETHING_CHANGED, zero, 'undetermined but can proof eq is impossible'
      riftest spec_d_create_range(0, 5), spec_d_create_range(3, 8), bool, 'eq', 'neq', ZERO_CHANGES, bool, 'undetermined but with overlap so cannot proof eq/neq yet'
      riftest spec_d_create_range(0, 5), one, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'A is undetermined and B is in A range so cannot proof eq/neq yet'
      riftest spec_d_create_range(10, 20), one, bool, 'eq', 'neq', SOMETHING_CHANGED, zero, 'A is undetermined but B is NOT in A range must be neq'

    describe 'eq/neq with preset bool var', ->
      riftest bool, bool, zero, 'eq', 'neq', SOMETHING_CHANGED, bool, 'bool was false but current state is undetermined so should change bool'
      riftest bool, bool, one, 'eq', 'neq', SOMETHING_CHANGED, bool, 'bool was true but current state is undetermined so should change bool'
      riftest zero, one, one, 'eq', 'neq', SOMETHING_CHANGED, zero, 'bool was true but current state is false so it should change'
      riftest one, zero, one, 'eq', 'neq', SOMETHING_CHANGED, zero, 'bool was true but current state is false so it should change'
      riftest zero, one, zero, 'neq', 'eq', SOMETHING_CHANGED, one, 'bool was false but current state is true so it should change'
      riftest one, zero, zero, 'neq', 'eq', SOMETHING_CHANGED, one, 'bool was false but current state is true so it should change'

describe 'integration', ->

  describe.skip 'interdependency', ->

    it 'a == (b == c)', ->
      S = new FD.Solver
        defaultDomain: spec_d_create_bool()

      S.decl 'A'
      S.decl 'B'
      S.decl 'C'
      S['==?'] 'A', 'B', S.decl 'AnotB'
      S['==?'] 'C', 'AnotB', S.decl 'CnotAnotB'
      S['=='] 'AnotB', S.constant 1

      solutions = S.solve
        vars: ['A', 'B', 'C']

#      # visualize solutions
#      names = ''
#      for name of solutions[0]
#        names += name+' '
#      console.log names
#      arr = solutions.map (sol) ->
#        out = ''
#        for name of sol
#          out += sol[name]+' '
#        return out
#      console.log arr

      # 3 vars, all solutions because nothing actually restricts it, so: 2^3
      expect(solutions.length).to.equal(8)
