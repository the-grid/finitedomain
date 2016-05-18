import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specCreateFdvarRange,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainSmallEmpty,
  specDomainSmallNums,
} from '../../fixtures/domain.fixt';

import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,
  SUB,
  SUP,
} from '../../../src/helpers';
import {
  domain_clone,
} from '../../../src/domain';
import {
  propagator_eqStepBare,
} from '../../../src/propagators/eq';
import {
  fdvar_create,
} from '../../../src/fdvar';

describe('propagators/eq.spec', function() {
  // in general after call v1 and v2 should be equal

  it('should exist', function() {
    expect(propagator_eqStepBare).to.be.a('function');
  });

  it('should require two vars', function() {
    let v = specCreateFdvarRange('x', SUB, SUP);

    expect(() => propagator_eqStepBare()).to.throw();
    expect(() => propagator_eqStepBare(v)).to.throw();
    expect(() => propagator_eqStepBare(undefined, v)).to.throw();
  });

  //it('should reject for empty domains', function() {
  //
  //  let v1 = fdvar_create('x', []);
  //  let v2 = fdvar_create('y', []);
  //  expect(eq_step_bare(v1, v2)).to.eql(REJECTED);
  //});
  //
  //it('should reject for empty left domain', function() {
  //
  //  let v1 = fdvar_create('x', []);
  //  let v2 = specCreateFdvarRange('y', SUB, SUP);
  //  expect(eq_step_bare(v1, v2)).to.eql(REJECTED);
  //});
  //
  //it('should reject for empty right domain', function() {
  //
  //  let v1 = specCreateFdvarRange('x', SUB, SUP);
  //  let v2 = fdvar_create('y', []);
  //  expect(eq_step_bare(v1, v2)).to.eql(REJECTED);
  //});

  it('should split a domain if it covers multiple ranges of other domain', function() {
    let v1 = specCreateFdvarRange('x', SUB, SUP);
    let v2 = fdvar_create('y', specDomainCreateRanges([0, 10], [20, 30]));

    expect(propagator_eqStepBare(v1, v2)).to.be.above(0);
    expect(v1.dom).to.eql(specDomainCreateRanges([0, 10], [20, 30]));
    expect(v2.dom).to.eql(specDomainCreateRanges([0, 10], [20, 30]));
  });

  describe('when v1 == v2', function() {
    function test(domain) {
      it(`should not change anything: ${domain}`, function() {
        let v1 = fdvar_create('x', domain_clone(domain));
        let v2 = fdvar_create('y', domain_clone(domain));
        expect(propagator_eqStepBare(v1, v2)).to.eql(NO_CHANGES);
        expect(v1.dom, 'v1 dom').to.eql(domain);
        expect(v2.dom, 'v2 dom').to.eql(domain);
      });
    }

    describe('with array', function() {
      test(specDomainCreateRange(SUP, SUP));
      test(specDomainCreateRange(20, 50));
      test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]));
      test(specDomainCreateRanges([0, 10], [25, 25], [40, 50]));
    });

    describe('with numbers', function() {
      test(specDomainSmallNums(SUB, SUB));
      test(specDomainSmallNums(0, 0));
      test(specDomainSmallNums(1, 1));
      test(specDomainSmallNums(0, 1));
      test(specDomainSmallNums(0, 2));
      test(specDomainSmallNums(0, 2, 3));
    });
  });

  describe('when v1 != v2', function() {

    function test(left, right, result, changes) {
      it(`should not change anything (left-right): ${[left, right, result].join('|')}`, function() {
        let v1 = fdvar_create('x', domain_clone(left));
        let v2 = fdvar_create('y', domain_clone(right));

        expect(propagator_eqStepBare(v1, v2)).to.equal(changes);
        expect(v1.dom, 'v1 dom').to.eql(result);
        expect(v2.dom, 'v2 dom').to.eql(result);
      });

      it(`should not change anything (right-left): ${[right, left, result].join('|')}`, function() {
        let v1 = fdvar_create('x', domain_clone(right));
        let v2 = fdvar_create('y', domain_clone(left));

        expect(propagator_eqStepBare(v1, v2)).to.equal(changes);
        expect(v1.dom, 'v1 dom').to.eql(result);
        expect(v2.dom, 'v2 dom').to.eql(result);
      });
    }

    test(specDomainSmallNums(0, 1), specDomainSmallNums(0, 0), specDomainSmallNums(0, 0), SOME_CHANGES);
    test(specDomainSmallNums(0, 1), specDomainSmallNums(1, 1), specDomainSmallNums(1, 1), SOME_CHANGES);
    test(specDomainSmallNums(SUB, 1), specDomainCreateRange(1, SUP), specDomainSmallNums(1, 1), SOME_CHANGES);
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainSmallNums(5, 5), specDomainSmallNums(5, 5), SOME_CHANGES);
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainCreateRanges([5, 15], [25, 35]), specDomainCreateRanges([5, 10], [25, 30]), SOME_CHANGES);
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainCreateRanges([SUB, SUP]), specDomainCreateRanges([0, 10], [20, 30], [40, 50]), SOME_CHANGES);
    test(specDomainSmallNums(0, 2), specDomainSmallNums(1, 3), specDomainSmallEmpty(), REJECTED);
    test(specDomainSmallNums(0, 2), specDomainSmallNums(1, 2, 4), specDomainSmallNums(2), SOME_CHANGES);
  });
});

// TOFIX: migrate these tests to this file. dedupe them too.
//describe.skip('fdvar_forceEqInline', function() {
//
//  it('should exist', function() {
//    expect(fdvar_forceEqInline).to.be.a('function');
//  });
//
//  describe('with array', function() {
//
//    it('should get start end', function() {
//      let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40]));
//      let B = fdvar_create('B', specDomainCreateRanges([20, 30]));
//      let C = specDomainCreateRanges([20, 20], [30, 30]);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should return SOME_CHANGES if domains are not equal and update them inline', function() {
//      let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//      let B = fdvar_create('B', specDomainCreateRanges([15, 35], [40, 50]));
//      let C = specDomainCreateRanges([15, 20], [30, 35], [40, 40], [50, 50]);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should return NO_CHANGES if domains are equal', function() {
//      let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//      let B = fdvar_create('B', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//      let C = specDomainCreateRanges([10, 20], [30, 40], [50, 60]);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(NO_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//  });
//
//  describe('with numbers', function() {
//
//    it('should return SOME_CHANGES if domains are not equal and update them inline', function() {
//      let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let B = fdvar_create('B', specDomainSmallNums(2, 3, 4, 5, 6, 7));
//      let C = specDomainSmallNums(2, 3, 6, 7);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should return NO_CHANGES if domains are equal', function() {
//      let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let B = fdvar_create('B', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let C = specDomainSmallNums(1, 2, 3, 6, 7, 8);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(NO_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//  });
//
//  describe('with array and numbers', function() {
//
//    it('should work with an array and a number', function() {
//      let A = fdvar_create('A', specDomainCreateRange(10, 100));
//      let B = fdvar_create('B', specDomainSmallRange(5, 15));
//      let C = specDomainSmallRange(10, 15);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should work with a number and an array', function() {
//      let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 10, 11, 13));
//      let B = fdvar_create('B', specDomainCreateRange(8, 100));
//      let C = specDomainSmallNums(10, 11, 13);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//  });
//});
