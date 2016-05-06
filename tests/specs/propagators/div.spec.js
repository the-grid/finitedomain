import setup from '../../fixtures/helpers.spec';
import {
  specDomainCreateBool,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateValue,
} from '../../fixtures/domain.spec';
import {
  expect,
  assert,
} from 'chai';

import Solver from '../../../src/solver';
import {
  SUB,
  SUP,

  REJECTED,
  ZERO_CHANGES,
} from '../../../src/helpers';
import {
  fdvar_create,
  fdvar_create_wide,
} from '../../../src/fdvar';
import {
  propagator_eqStepBare,
} from '../../../src/propagators/eq';

describe("propagators/eq.spec", function() {
  // in general after call v1 and v2 should be equal

  it('should exist', function() {
    expect(propagator_eqStepBare).to.be.a('function');
  });

  it('should require two vars', function() {
    let v = fdvar_create_wide('x');

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
  //  let v2 = fdvar_create_wide('y');
  //  expect(eq_step_bare(v1, v2)).to.eql(REJECTED);
  //});
  //
  //it('should reject for empty right domain', function() {
  //
  //  let v1 = fdvar_create_wide('x');
  //  let v2 = fdvar_create('y', []);
  //  expect(eq_step_bare(v1, v2)).to.eql(REJECTED);
  //});

  it('should split a domain if it covers multiple ranges of other domain', function() {
    let v1 = fdvar_create_wide('x');
    let v2 = fdvar_create('y', specDomainCreateRanges([0, 10], [20, 30]));

    expect(propagator_eqStepBare(v1, v2)).to.be.above(0);
    expect(v1.dom).to.eql(specDomainCreateRanges([0, 10], [20, 30]));
    expect(v2.dom).to.eql(specDomainCreateRanges([0, 10], [20, 30]));
  });

  describe('when v1 == v2', function() {

    function test(domain) {
      it(`should not change anything: ${domain}`, function () {
        let v1 = fdvar_create('x', domain.slice(0));
        let v2 = fdvar_create('y', domain.slice(0));
        expect(propagator_eqStepBare(v1, v2)).to.eql(ZERO_CHANGES);
        expect(v1.dom, 'v1 dom').to.eql(domain);
        expect(v2.dom, 'v2 dom').to.eql(domain);
      });
    }

    test(specDomainCreateRange(SUB, SUB));
    test(specDomainCreateRange(0, 0));
    test(specDomainCreateRange(1, 1));
    test(specDomainCreateRange(0, 1));
    test(specDomainCreateRange(SUP, SUP));
    test(specDomainCreateRange(20, 50));

    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]));
    test(specDomainCreateRanges([0, 10], [25, 25], [40, 50]));
    test(specDomainCreateRanges([0, 0], [2, 2]));
    test(specDomainCreateRanges([0, 0], [2, 3]));
  });

  describe('when v1 != v2', function() {

    function test(left, right, result, rejects) {
      it(`should not change anything (left-right): ${[left, right, result].join('|')}`, function() {
        let v1 = fdvar_create('x', left.slice(0));
        let v2 = fdvar_create('y', right.slice(0));

        if (rejects) {
          expect(propagator_eqStepBare(v1, v2)).to.eql(REJECTED);
        } else {
          expect(propagator_eqStepBare(v1, v2)).to.be.above(0);
        }
        expect(v1.dom, 'v1 dom').to.eql(result);
        expect(v2.dom, 'v2 dom').to.eql(result);
      });

      it(`should not change anything (right-left): ${[right, left, result].join('|')}`, function() {
        let v1 = fdvar_create('x', right.slice(0));
        let v2 = fdvar_create('y', left.slice(0));

        if (rejects) {
          expect(propagator_eqStepBare(v1, v2)).to.eql(REJECTED);
        } else {
          expect(propagator_eqStepBare(v1, v2)).to.be.above(0);
        }
        expect(v1.dom, 'v1 dom').to.eql(result);
        expect(v2.dom, 'v2 dom').to.eql(result);
      });
    }

    test(specDomainCreateRange(0, 1),  specDomainCreateRange(0, 0), specDomainCreateRange(0, 0));
    test(specDomainCreateRange(0, 1),  specDomainCreateRange(1, 1), specDomainCreateRange(1, 1));
    test(specDomainCreateRange(SUB, 1),  specDomainCreateRange(1, SUP), specDomainCreateRange(1, 1));
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]),  specDomainCreateRange(5, 5), specDomainCreateRange(5, 5));
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]),  specDomainCreateRanges([5, 15], [25, 35]), specDomainCreateRanges([5, 10], [25, 30]));
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]),  specDomainCreateRanges([SUB, SUP]), specDomainCreateRanges([0, 10], [20, 30], [40, 50]));
    test(specDomainCreateRanges([0, 0], [2, 2]),  specDomainCreateRanges([1, 1], [3, 3]), [], REJECTED);
    test(specDomainCreateRanges([0, 0], [2, 2]),  specDomainCreateRanges([1, 2], [4, 4]), specDomainCreateRange(2,2));
  });
});
