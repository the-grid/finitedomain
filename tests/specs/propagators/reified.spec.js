import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateBool,
  specDomainCreateOne,
  specDomainCreateRange,
  specDomainCreateZero,
  stripAnonVarsFromArrays,
} from '../../fixtures/domain.fixt';

import {
  SOMETHING_CHANGED,
  ZERO_CHANGES,
} from '../../../src/helpers';

import {
  fdvar_create,
} from '../../../src/fdvar';
import Solver from '../../../src/solver';
import propagator_reifiedStepBare from '../../../src/propagators/reified';

describe('propagators/reified.spec', function() {

  // constants (tests must copy args)
  let zero = specDomainCreateZero();
  let one = specDomainCreateOne();
  let bool = specDomainCreateBool();

  describe('propagator_reifiedStepBare', function() {
    it('should exist', function() {
      expect(propagator_reifiedStepBare).to.be.a('function');
    });

    describe('enforce=false', function() {

      // rif -> reified ;)
      function riftest(A_in, B_in, bool_in, op, invop, expected_out, bool_after, msg) {
        // test one step call with two vars and an op and check results
        it(`reified_step call [${msg}] with: ${[`A=[${A_in}]`, `B=[${B_in}]`, `bool=[${bool_in}]`, `op=${op}`, `inv=${invop}`, `out=${expected_out}`, `result=[${bool_after}]`]}`, function() {

          let space = {
            vars: {
              A: fdvar_create('A', A_in.slice(0)),
              B: fdvar_create('B', B_in.slice(0)),
              bool: fdvar_create('bool', bool_in.slice(0)),
            },
          };

          let out = propagator_reifiedStepBare(space, 'A', 'B', 'bool', op, invop);

          expect(out, 'should reflect changed state').to.equal(expected_out);
          expect(space.vars.A.dom, 'A should be unchanged').to.eql(A_in);
          expect(space.vars.B.dom, 'B should be unchanged').to.eql(B_in);
          expect(space.vars.bool.dom, 'bool should reflect expected outcome').to.eql(bool_after);
        });
      }

      describe('eq/neq with bools', function() {
        riftest(bool, bool, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'undetermined because eq/neq can only be determined when A and B are resolved');
        riftest(bool, bool, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'undetermined because eq/neq can only be determined when A and B are resolved');
        riftest(bool, zero, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'A is not resolved so not yet able to resolve bool');
        riftest(bool, zero, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'A is not resolved so not yet able to resolve bool');
        riftest(bool, one, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'A is not resolved so not yet able to resolve bool');
        riftest(bool, one, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'A is not resolved so not yet able to resolve bool');
        riftest(zero, bool, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'B is not resolved so not yet able to resolve bool');
        riftest(zero, bool, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'B is not resolved so not yet able to resolve bool');
        riftest(one, bool, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'B is not resolved so not yet able to resolve bool');
        riftest(one, bool, bool, 'neq', 'eq', ZERO_CHANGES, bool, 'B is not resolved so not yet able to resolve bool');
        riftest(one, one, bool, 'eq', 'neq', SOMETHING_CHANGED, one, 'A and B are resolved and eq so bool should be 1');
        riftest(one, one, bool, 'neq', 'eq', SOMETHING_CHANGED, zero, 'A and B are resolved and not eq so bool should be 0');
        riftest(one, zero, bool, 'eq', 'neq', SOMETHING_CHANGED, zero, 'A and B are resolved and not eq so bool should be 0');
        riftest(one, zero, bool, 'neq', 'eq', SOMETHING_CHANGED, one, 'A and B are resolved and neq so bool should be 1');
        riftest(zero, one, bool, 'eq', 'neq', SOMETHING_CHANGED, zero, 'A and B are resolved and not eq so bool should be 0');
        riftest(zero, one, bool, 'neq', 'eq', SOMETHING_CHANGED, one, 'A and B are resolved and neq so bool should be 1');
        riftest(zero, zero, bool, 'eq', 'neq', SOMETHING_CHANGED, one, 'A and B are resolved and eq so bool should be 1');
        riftest(zero, zero, bool, 'neq', 'eq', SOMETHING_CHANGED, zero, 'A and B are resolved and not eq so bool should be 0');
      });

      describe('eq/neq with non-bools', function() {
        riftest(specDomainCreateRange(0, 5), specDomainCreateRange(10, 15), bool, 'eq', 'neq', SOMETHING_CHANGED, zero, 'undetermined but can proof eq is impossible');
        riftest(specDomainCreateRange(0, 5), specDomainCreateRange(3, 8), bool, 'eq', 'neq', ZERO_CHANGES, bool, 'undetermined but with overlap so cannot proof eq/neq yet');
        riftest(specDomainCreateRange(0, 5), one, bool, 'eq', 'neq', ZERO_CHANGES, bool, 'A is undetermined and B is in A range so cannot proof eq/neq yet');
        riftest(specDomainCreateRange(10, 20), one, bool, 'eq', 'neq', SOMETHING_CHANGED, zero, 'A is undetermined but B is NOT in A range must be neq');
      });
    });
  });

  describe('solver test', function() {

    it('should not let reifiers influence results if they are not forced', function() {
      let solver = new Solver({defaultDomain: specDomainCreateBool()});

      solver.decl('A');
      solver.decl('B');
      solver.decl('C');
      solver['==?']('A', 'B', solver.decl('AnotB'));

      let solutions = solver.solve({vars: ['A', 'B', 'C']});

      //// visualize solutions
      //let names = '';
      //for (var name in solutions[0]) {
      //  names += name+' ';
      //}
      //console.log(names);
      //let arr = solutions.map(function(sol) {
      //  let out = '';
      //  for (name in sol) {
      //    out += sol[name]+' ';
      //  }
      //  return out;
      //});
      //console.log(arr);

      // a, b, c are not constrainted in any way, so 2^3=8
      expect(solutions.length).to.equal(8);
    });

    it('should be able to force a reifier to be true and affect the outcome', function() {
      let solver = new Solver({defaultDomain: specDomainCreateBool()});

      solver.decl('A');
      solver.decl('B');
      solver.decl('C');
      solver['==?']('A', 'B', solver.decl('AisB'));
      solver['==']('AisB', solver.constant(1));

      let solutions = solver.solve({vars: ['A', 'B', 'C']});

      //// visualize solutions
      //let names = '';
      //for (var name in solutions[0]) {
      //  names += name+' ';
      //}
      //console.log(names);
      //let arr = solutions.map(function(sol) {
      //  let out = '';
      //  for (name in sol) {
      //    out += sol[name]+' ';
      //  }
      //  return out;
      //});
      //console.log(arr);

      // the a==?b reifier is bound to be 1
      // a cannot be b, so 1 0 1, 0 1 1, 1 0 0, and 0 1 0, = 4 solutions
      // TODO: verify this is correct and why this was 8 before...
      expect(solutions.length).to.equal(4);
    });

    it('should not adjust operands if result var is unconstrained', function() {
      let solver = new Solver();
      solver.addVar('A', specDomainCreateRange(0, 10));
      solver.isEq('A', 2);
      solver.solve();

      expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
        {A: 0},
        {A: 1},
        {A: 2},
        {A: 3},
        {A: 4},
        {A: 5},
        {A: 6},
        {A: 7},
        {A: 8},
        {A: 9},
        {A: 10},
      ]);
    });

    it('should adjust operands if result var is constrained to 0', function() {
      let solver = new Solver();
      solver.addVar('A', specDomainCreateRange(0, 10));
      solver.isEq('A', 2, 0);
      solver.solve();

      expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
        {A: 0},
        {A: 1},
        {A: 3},
        {A: 4},
        {A: 5},
        {A: 6},
        {A: 7},
        {A: 8},
        {A: 9},
        {A: 10},
      ]);
    });

    it('should adjust operands if result var is constrained to 1', function() {
      let solver = new Solver();
      solver.addVar('A', specDomainCreateRange(0, 10));
      solver.isEq(2, 'A', 1);
      solver.solve();

      expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
        {A: 2},
      ]);
    });
  });
});
