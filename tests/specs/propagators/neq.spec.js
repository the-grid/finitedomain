import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateValue,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainSmallNums,
  specDomainSmallRange,
} from '../../fixtures/domain.fixt';

import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,
  SUB,
  SUP,
} from '../../../src/helpers';
import {
  fdvar_create,
  fdvar_createRange,
} from '../../../src/fdvar';
import {
  domain_clone,
} from '../../../src/domain';
import {
  propagator_neqStepBare,
} from '../../../src/propagators/neq';

describe('propagators/neq.spec', function() {

  it('should exist', function() {
    expect(propagator_neqStepBare).to.be.a('function');
  });

  it('should require two vars', function() {
    let v = fdvar_createRange('x', SUB, SUP);

    expect(() => propagator_neqStepBare()).to.throw();
    expect(() => propagator_neqStepBare(v)).to.throw();
    expect(() => propagator_neqStepBare(undefined, v)).to.throw();
  });

  describe('with array', function() {

    describe('should not change anything as long as both domains are unsolved', function() {

      function test(domain1, domain2) {
        it(`should not change anything (left-right): ${[domain1, domain2].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v1, v2)).to.eql(NO_CHANGES);
          expect(v1.dom, 'v1 dom').to.eql(domain1);
          expect(v2.dom, 'v2 dom').to.eql(domain2);
        });

        it(`should not change anything (right-left): ${[domain2, domain1].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v2, v1)).to.eql(NO_CHANGES);
          expect(v1.dom, 'v1 dom').to.eql(domain1);
          expect(v2.dom, 'v2 dom').to.eql(domain2);
        });
      }

      // these are the (non-solved) cases plucked from eq tests
      test(specDomainCreateRange(SUB, SUP), specDomainCreateRanges([0, 10], [20, 30]));
      test(specDomainCreateRange(SUP - 1, SUP), specDomainCreateRange(SUP - 1, SUP));
      test(specDomainCreateRange(20, 50), specDomainCreateRange(20, 50));
      test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainCreateRanges([0, 10], [20, 30], [40, 50]));
      test(specDomainCreateRanges([0, 10], [25, 25], [40, 50]), specDomainCreateRanges([0, 10], [25, 25], [40, 50]));
      test(specDomainCreateRange(SUP - 2, SUP), specDomainCreateRange(SUP - 2, SUP));
      test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainCreateRanges([5, 15], [25, 35]));
      test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainCreateRanges([SUB, SUP]));
      test(specDomainCreateRange(SUP - 2, SUP), specDomainCreateRange(SUP - 3, SUP - 1));
      test(specDomainCreateRange(SUP - 2, SUP), specDomainCreateRange(SUP - 4, SUP - 1));
    });

    describe('with one solved domain', function() {

      function test(solvedDomain, unsolvedDomainBefore, unsolvedDomainAfter, changes) {
        it(`should not change anything (right-left): ${[solvedDomain, unsolvedDomainBefore].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(solvedDomain));
          let v2 = fdvar_create('y', domain_clone(unsolvedDomainBefore));
          expect(propagator_neqStepBare(v1, v2)).to.equal(changes);
          expect(v1.dom, 'v1 dom').to.eql(solvedDomain);
          expect(v2.dom, 'v2 dom').to.eql(unsolvedDomainAfter);
        });

        it(`should remove solved domain from unsolve domain (left-right): ${[unsolvedDomainBefore, solvedDomain].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(solvedDomain));
          let v2 = fdvar_create('y', domain_clone(unsolvedDomainBefore));
          expect(propagator_neqStepBare(v2, v1)).to.equal(changes);
          expect(v1.dom, 'v1 dom').to.eql(solvedDomain);
          expect(v2.dom, 'v2 dom').to.eql(unsolvedDomainAfter);
        });
      }

      test(specDomainCreateRange(SUP, SUP), specDomainCreateRange(SUP - 1, SUP), specDomainCreateRange(SUP - 1, SUP - 1), SOME_CHANGES);
      test(specDomainCreateRange(SUP - 1, SUP - 1), specDomainCreateRange(SUP - 1, SUP), specDomainCreateRange(SUP, SUP), SOME_CHANGES);
      test(specDomainCreateRange(SUP, SUP), specDomainCreateRange(SUP - 50, SUP), specDomainCreateRange(SUP - 50, SUP - 1), SOME_CHANGES);
      test(specDomainCreateRange(20, 20), specDomainCreateRanges([20, SUP - 1]), specDomainCreateRange(21, SUP - 1), SOME_CHANGES);
      test(specDomainCreateRange(910, 910), specDomainCreateRanges([910, 910], [912, 950]), specDomainCreateRanges([912, 950]), SOME_CHANGES);
      test(specDomainCreateRange(910, 910), specDomainCreateRanges([90, 98], [910, 910], [912, 920]), specDomainCreateRanges([90, 98], [912, 920]), SOME_CHANGES);
      test(specDomainCreateRange(910, 910), specDomainCreateRanges([90, 910], [912, 950]), specDomainCreateRanges([90, 909], [912, 950]), SOME_CHANGES);
      test(specDomainCreateRange(91, 91), specDomainCreateRange(90, 93), specDomainCreateRanges([90, 90], [92, 93]), SOME_CHANGES);
    });

    describe('two solved domains', function() {

      function test(domain1, domain2) {
        it(`should be "solved" (left-right): ${[domain1, domain2].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v1, v2)).to.eql(NO_CHANGES);
          expect(v1.dom, 'v1 dom').to.eql(domain1);
          expect(v2.dom, 'v2 dom').to.eql(domain2);
        });

        it(`should be "solved" (right-left): ${[domain2, domain1].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v2, v1)).to.eql(NO_CHANGES);
          expect(v1.dom, 'v1 dom').to.eql(domain1);
          expect(v2.dom, 'v2 dom').to.eql(domain2);
        });

        it(`should reject if same (left-left): ${[domain1, domain1].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain1));
          expect(propagator_neqStepBare(v1, v2)).to.eql(REJECTED);
        });

        it(`should reject if same (right-right): ${[domain1, domain1].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain2));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v1, v2)).to.eql(REJECTED);
        });
      }

      test(specDomainCreateValue(SUP), specDomainCreateValue(SUP - 1));
      test(specDomainCreateValue(SUP - 1), specDomainCreateValue(SUP - 2));
      test(specDomainCreateValue(SUP - 1), specDomainCreateValue(SUP - 20));
      test(specDomainCreateValue(SUP), specDomainCreateValue(500));
      test(specDomainCreateValue(800), specDomainCreateValue(801));
    });
  });

  describe('with numbers', function() {

    describe('should not change anything as long as both domains are unsolved', function() {

      function test(domain1, domain2) {
        it(`should not change anything (left-right): ${[domain1, domain2].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v1, v2)).to.eql(NO_CHANGES);
          expect(v1.dom, 'v1 dom').to.eql(domain1);
          expect(v2.dom, 'v2 dom').to.eql(domain2);
        });

        it(`should not change anything (right-left): ${[domain2, domain1].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v2, v1)).to.eql(NO_CHANGES);
          expect(v1.dom, 'v1 dom').to.eql(domain1);
          expect(v2.dom, 'v2 dom').to.eql(domain2);
        });
      }

      test(specDomainSmallRange(0, 1), specDomainSmallRange(0, 1));
      test(specDomainSmallRange(2, 5), specDomainSmallRange(2, 5));
      test(specDomainSmallRange(0, 1), specDomainSmallRange(0, 2));
      test(specDomainSmallRange(0, 2), specDomainSmallRange(0, 3));
      test(specDomainSmallRange(0, 2), specDomainSmallRange(0, 4));
    });

    describe('with one solved domain', function() {

      function test(solvedDomain, unsolvedDomainBefore, unsolvedDomainAfter, changes) {
        it(`should not change anything (right-left): ${[solvedDomain, unsolvedDomainBefore].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(solvedDomain));
          let v2 = fdvar_create('y', domain_clone(unsolvedDomainBefore));
          expect(propagator_neqStepBare(v1, v2)).to.equal(changes);
          expect(v1.dom, 'v1 dom').to.eql(solvedDomain);
          expect(v2.dom, 'v2 dom').to.eql(unsolvedDomainAfter);
        });

        it(`should remove solved domain from unsolve domain (left-right): ${[unsolvedDomainBefore, solvedDomain].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(solvedDomain));
          let v2 = fdvar_create('y', domain_clone(unsolvedDomainBefore));
          expect(propagator_neqStepBare(v2, v1)).to.equal(changes);
          expect(v1.dom, 'v1 dom').to.eql(solvedDomain);
          expect(v2.dom, 'v2 dom').to.eql(unsolvedDomainAfter);
        });
      }

      test(specDomainSmallNums(0), specDomainSmallRange(0, 1), specDomainSmallRange(1, 1), SOME_CHANGES);
      test(specDomainSmallNums(1), specDomainSmallRange(0, 1), specDomainSmallRange(0, 0), SOME_CHANGES);
      test(specDomainSmallNums(0), specDomainSmallRange(0, 15), specDomainSmallRange(1, 15), SOME_CHANGES);
      test(specDomainSmallNums(2), specDomainSmallRange(2, 5), specDomainSmallRange(3, 5), SOME_CHANGES);
      test(specDomainSmallNums(10), specDomainSmallNums(10, 13, 14, 15), specDomainSmallRange(13, 15), SOME_CHANGES);
      test(specDomainSmallNums(10), specDomainSmallNums(0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15), specDomainSmallNums(0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 15), SOME_CHANGES);
      test(specDomainSmallNums(4), specDomainSmallNums(0, 1, 2, 3, 4, 10, 12, 13, 14, 15), specDomainSmallNums(0, 1, 2, 3, 10, 12, 13, 14, 15), SOME_CHANGES);
      test(specDomainSmallNums(1), specDomainSmallRange(0, 3), specDomainSmallNums(0, 2, 3), SOME_CHANGES);
    });

    describe('two solved domains', function() {

      function test(domain1, domain2) {
        it(`should be "solved" (left-right): ${[domain1, domain2].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v1, v2)).to.eql(NO_CHANGES);
          expect(v1.dom, 'v1 dom').to.eql(domain1);
          expect(v2.dom, 'v2 dom').to.eql(domain2);
        });

        it(`should be "solved" (right-left): ${[domain2, domain1].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v2, v1)).to.eql(NO_CHANGES);
          expect(v1.dom, 'v1 dom').to.eql(domain1);
          expect(v2.dom, 'v2 dom').to.eql(domain2);
        });

        it(`should reject if same (left-left): ${[domain1, domain1].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain1));
          let v2 = fdvar_create('y', domain_clone(domain1));
          expect(propagator_neqStepBare(v1, v2)).to.eql(REJECTED);
        });

        it(`should reject if same (right-right): ${[domain1, domain1].join('|')}`, function() {
          let v1 = fdvar_create('x', domain_clone(domain2));
          let v2 = fdvar_create('y', domain_clone(domain2));
          expect(propagator_neqStepBare(v1, v2)).to.eql(REJECTED);
        });
      }

      test(specDomainSmallNums(0), specDomainSmallNums(1));
      test(specDomainSmallNums(1), specDomainSmallNums(2));
      test(specDomainSmallNums(1), specDomainSmallNums(15));
      test(specDomainSmallNums(0), specDomainSmallNums(5));
      test(specDomainSmallNums(8), specDomainSmallNums(1));
    });
  });
});

