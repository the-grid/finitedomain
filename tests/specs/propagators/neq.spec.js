import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainCreateRanges,
} from '../../fixtures/domain.fixt';

import {
  SUB,
  SUP,

  REJECTED,
  ZERO_CHANGES,
} from '../../../src/helpers';
import {
  fdvar_create,
  fdvar_createWide,
} from '../../../src/fdvar';
import {
  propagator_neqStepBare,
} from '../../../src/propagators/neq';

describe('propagators/neq.spec', function() {
  // in general after call v1 and v2 should be equal

  it('should exist', function() {
    expect(propagator_neqStepBare).to.be.a('function');
  });

  it('should require two vars', function() {
    let v = fdvar_createWide('x');

    expect(() => propagator_neqStepBare()).to.throw();
    expect(() => propagator_neqStepBare(v)).to.throw();
    expect(() => propagator_neqStepBare(undefined, v)).to.throw();
  });

  //it('should reject for empty domains', function() {
  //  let v1 = fdvar_create('x', []);
  //  let v2 = fdvar_create('y', []);
  //
  //  expect(neq_step_bare(v1, v2)).to.eql(REJECTED);
  //});
  //
  //it('should reject for empty left domain', function() {
  //  let v1 = fdvar_create('x', []);
  //  let v2 = fdvar_createWide('y');
  //
  //  expect(neq_step_bare(v1, v2)).to.eql(REJECTED);
  //});
  //
  //it('should reject for empty right domain', function() {
  //  let v1 = fdvar_createWide('x');
  //  let v2 = fdvar_create('y', []);
  //
  //  expect(neq_step_bare(v1, v2)).to.eql(REJECTED);
  //});

  describe('should not change anything as long as both domains are unsolved', function() {

    function test(domain1, domain2 = domain1.slice(0)) {
      for (let i = 0; i < domain1.length; i++) {
        if (typeof domain1[i] !== 'number') {
          throw new Error(`bad test, fixme! neq.spec.1: [${domain1}] [${domain2}]`);
        }
      }
      for (let j = 0; j < domain2.length; j++) {
        if (typeof domain2[j] !== 'number') {
          throw new Error(`bad test, fixme! neq.spec.2: [${domain1}] [${domain2}]`);
        }
      }

      it(`should not change anything (left-right): ${[domain1, domain2].join('|')}`, function() {
        let v1 = fdvar_create('x', domain1.slice(0));
        let v2 = fdvar_create('y', domain2.slice(0));
        expect(propagator_neqStepBare(v1, v2)).to.eql(ZERO_CHANGES);
        expect(v1.dom, 'v1 dom').to.eql(domain1);
        expect(v2.dom, 'v2 dom').to.eql(domain2);
      });

      it(`should not change anything (right-left): ${[domain2, domain1].join('|')}`, function() {
        let v1 = fdvar_create('x', domain2.slice(0));
        let v2 = fdvar_create('y', domain1.slice(0));
        expect(propagator_neqStepBare(v1, v2)).to.eql(ZERO_CHANGES);
        expect(v1.dom, 'v1 dom').to.eql(domain2);
        expect(v2.dom, 'v2 dom').to.eql(domain1);
      });
    }

    // these are the (non-solved) cases plucked from eq tests
    test(specDomainCreateRange(SUB, SUP), specDomainCreateRanges([0, 10], [20, 30]));
    test(specDomainCreateRange(0, 1));
    test(specDomainCreateRange(20, 50));
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]));
    test(specDomainCreateRanges([0, 10], [25, 25], [40, 50]));
    test(specDomainCreateRanges([0, 0], [2, 2]));
    test(specDomainCreateRanges([0, 0], [2, 3]));
    test(specDomainCreateRange(SUB, 1), specDomainCreateRange(1, SUP));
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainCreateRanges([5, 15], [25, 35]), specDomainCreateRanges([5, 10], [25, 30]));
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainCreateRanges([SUB, SUP]), specDomainCreateRanges([0, 10], [20, 30], [40, 50]));
    test(specDomainCreateRanges([0, 0], [2, 2]), specDomainCreateRanges([1, 1], [3, 3]), [], REJECTED);
    test(specDomainCreateRanges([0, 0], [2, 2]), specDomainCreateRanges([1, 2], [4, 4]), specDomainCreateRange(2, 2));
  });

  describe('with one solved domain', function() {

    function test(value, domain1, result) {
      let domain2 = specDomainCreateRange(value, value);

      it(`should remove solved domain from unsolve domain (left-right): ${[domain1, domain2].join('|')}`, function() {
        let v1 = fdvar_create('x', domain1.slice(0));
        let v2 = fdvar_create('y', domain2.slice(0));
        expect(propagator_neqStepBare(v1, v2)).to.be.above(0);
        expect(v1.dom, 'v1 dom').to.eql(result);
        expect(v2.dom, 'v2 dom').to.eql(domain2);
      });

      it(`should not change anything (right-left): ${[domain2, domain1].join('|')}`, function() {
        let v1 = fdvar_create('x', domain2.slice(0));
        let v2 = fdvar_create('y', domain1.slice(0));
        expect(propagator_neqStepBare(v1, v2)).to.be.above(0);
        expect(v1.dom, 'v1 dom').to.eql(domain2);
        expect(v2.dom, 'v2 dom').to.eql(result);
      });
    }

    test(0, specDomainCreateRange(0, 1), specDomainCreateRanges([1, 1]));
    test(1, specDomainCreateRange(0, 1), specDomainCreateRanges([0, 0]));
    test(SUB, specDomainCreateRange(SUB, 50), specDomainCreateRanges([SUB + 1, 50]));
    test(SUP, specDomainCreateRange(20, SUP), specDomainCreateRanges([20, SUP - 1]));
    test(10, specDomainCreateRanges([10, 10], [12, 50]), specDomainCreateRanges([12, 50]));
    test(10, specDomainCreateRanges([0, 8], [10, 10], [12, 20]), specDomainCreateRanges([0, 8], [12, 20]));
    test(10, specDomainCreateRanges([0, 10], [12, 50]), specDomainCreateRanges([0, 9], [12, 50]));
    test(1, specDomainCreateRange(0, 3), specDomainCreateRanges([0, 0], [2, 3]));
  });

  describe('two solved domains', function() {

    function test(value1, value2) {
      let domain1 = specDomainCreateRange(value1, value1);
      let domain2 = specDomainCreateRange(value2, value2);

      it(`should be "solved" (left-right): ${[domain1, domain2].join('|')}`, function() {
        let v1 = fdvar_create('x', domain1.slice(0));
        let v2 = fdvar_create('y', domain2.slice(0));
        expect(propagator_neqStepBare(v1, v2)).to.eql(ZERO_CHANGES);
        expect(v1.dom, 'v1 dom').to.eql(domain1);
        expect(v2.dom, 'v2 dom').to.eql(domain2);
      });

      it(`should be "solved" (right-left): ${[domain2, domain1].join('|')}`, function() {
        let v1 = fdvar_create('x', domain2.slice(0));
        let v2 = fdvar_create('y', domain1.slice(0));
        expect(propagator_neqStepBare(v1, v2)).to.eql(ZERO_CHANGES);
        expect(v1.dom, 'v1 dom').to.eql(domain2);
        expect(v2.dom, 'v2 dom').to.eql(domain1);
      });

      it(`should reject if same (left-left): ${[domain1, domain1].join('|')}`, function() {
        let v1 = fdvar_create('x', domain1.slice(0));
        let v2 = fdvar_create('y', domain1.slice(0));
        expect(propagator_neqStepBare(v1, v2)).to.eql(REJECTED);
      });
    }

    test(0, 1);
    test(1, 2);
    test(1, 20);
    test(SUB, 10);
    test(10, SUP);
    test(SUB, SUP);
  });
});

