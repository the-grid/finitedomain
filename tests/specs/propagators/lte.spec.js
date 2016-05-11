import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainCreateRanges,
} from '../../fixtures/domain.fixt';

import {
  REJECTED,
  SOMETHING_CHANGED,
  ZERO_CHANGES,
} from '../../../src/helpers';
import {
  fdvar_create,
  fdvar_createWide,
} from '../../../src/fdvar';
import {
  propagator_lteStepBare,
} from '../../../src/propagators/lte';

describe('propagators/lte.spec', function() {
  // in general after call, max(v1) should be < max(v2) and min(v2) should be > min(v1)
  // it makes sure v1 and v2 have no values that can't possibly result in fulfilling <

  it('should exist', function() {
    expect(propagator_lteStepBare).to.be.a('function');
  });

  it('should require two vars', function() {
    let v = fdvar_createWide('x');

    expect(() => propagator_lteStepBare()).to.throw();
    expect(() => propagator_lteStepBare(v)).to.throw();
    expect(() => propagator_lteStepBare(undefined, v)).to.throw();
  });

  //it('should reject for empty domains', function() {
  //  let v1 = fdvar_create('x', []);
  //  let v2 = fdvar_create('y', []);
  //
  //  expect(lte_step_bare(v1, v2)).to.eql(REJECTED);
  //});
  //
  //it('should reject for empty left domain', function() {
  //  let v1 = fdvar_create('x', []);
  //  let v2 = fdvar_createWide('y');
  //
  //  expect(lte_step_bare(v1, v2)).to.eql(REJECTED);
  //});
  //
  //it('should reject for empty right domain', function() {
  //  let v1 = fdvar_createWide('x');
  //  let v2 = fdvar_create('y', []);
  //
  //  expect(lte_step_bare(v1, v2)).to.eql(REJECTED);
  //});

  it('should not change if v1 already <= v2', function() {
    let v1 = fdvar_create('x', specDomainCreateRange(0, 10));
    let v2 = fdvar_create('y', specDomainCreateRange(20, 30));
    expect(propagator_lteStepBare(v1, v2)).to.eql(ZERO_CHANGES);

    v1 = fdvar_create('x', specDomainCreateRange(0, 10));
    v2 = fdvar_create('y', specDomainCreateRange(11, 30));
    expect(propagator_lteStepBare(v1, v2)).to.eql(ZERO_CHANGES);

    v1 = fdvar_create('x', specDomainCreateRange(0, 0));
    v2 = fdvar_create('y', specDomainCreateRange(1, 1));
    expect(propagator_lteStepBare(v1, v2)).to.eql(ZERO_CHANGES);

    v1 = fdvar_create('x', specDomainCreateRange(0, 0));
    v2 = fdvar_create('y', specDomainCreateRange(1, 1));
    expect(propagator_lteStepBare(v1, v2)).to.eql(ZERO_CHANGES);

    v1 = fdvar_create('x', specDomainCreateRange(0, 20));
    v2 = fdvar_create('y', specDomainCreateRange(20, 30));
    expect(propagator_lteStepBare(v1, v2)).to.eql(ZERO_CHANGES);

    v1 = fdvar_create('x', specDomainCreateRange(0, 0));
    v2 = fdvar_create('y', specDomainCreateRange(0, 0));
    expect(propagator_lteStepBare(v1, v2)).to.eql(ZERO_CHANGES);
  });

  describe('when max(v1) > max(v2)', function() {

    function test(lo1, hi1, lo2, hi2, resultLo, resultHi, result) {
      it(`should (only) trunc values from v1 [${[lo1, hi1, lo2, hi2, resultLo, resultHi]}]`, function() {
        let v1 = fdvar_create('x', specDomainCreateRange(lo1, hi1));
        let v2 = fdvar_create('y', specDomainCreateRange(lo2, hi2));
        let r = propagator_lteStepBare(v1, v2);

        expect(v1.dom, 'v1 after').to.eql((result === REJECTED && []) || specDomainCreateRange(resultLo, resultHi));
        expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(lo2, hi2));
        if (result != null) expect(r).to.eql(result);
      });
    }

    test(0, 20, 5, 15, 0, 15);
    test(0, 15, 5, 15, 0, 15, ZERO_CHANGES);
    test(0, 10, 5, 15, 0, 10, ZERO_CHANGES);
  });

  it('should reject when v1 and v2 are solved and v1>v2', function() {
    let v1 = fdvar_create('x', specDomainCreateRange(10, 10));
    let v2 = fdvar_create('y', specDomainCreateRange(5, 5));
    let r = propagator_lteStepBare(v1, v2);

    // depending on implementation v1 and v2 may be cleared, one of them cleared, or not changed. but must reject regardless...
    //expect(v1.dom, 'v1 after').to.eql []
    //expect(v2.dom, 'v2 after').to.eql []
    expect(r).to.eql(REJECTED);
  });

  describe('when min(v1) > min(v2)', function() {
    function test(lo1, hi1, lo2, hi2, resultLo, resultHi, result) {
      it(`should (only) trunc values from v2 [${[lo1, hi1, lo2, hi2, resultLo, resultHi]}]`, function() {
        let v1 = fdvar_create('x', specDomainCreateRange(lo1, hi1));
        let v2 = fdvar_create('y', specDomainCreateRange(lo2, hi2));
        let r = propagator_lteStepBare(v1, v2);

        expect(v1.dom, 'v1 after').to.eql(specDomainCreateRange(lo1, hi1));
        expect(v2.dom, 'v2 after').to.eql((result === REJECTED && []) || specDomainCreateRange(resultLo, resultHi));
        if (result != null) expect(r).to.eql(result);
      });
    }

    test(5, 14, 0, 15, 5, 15);
    test(5, 10, 5, 15, 5, 15, ZERO_CHANGES);
    test(5, 10, 7, 15, 7, 15, ZERO_CHANGES);
  });
  //test 10,10, 5,5, 5,5, REJECTED # note: this is the same test as in v1>=v2 because v1 is checked first. so not possible here.

  it('when both min/max v1 > min/max v2', function() {
    let v1 = fdvar_create('x', specDomainCreateRange(1, 3));
    let v2 = fdvar_create('y', specDomainCreateRange(0, 2));
    let r = propagator_lteStepBare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRange(1, 2));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(1, 2));
    expect(r).to.eql(SOMETHING_CHANGED);
  });

  it('should pass two equal domains', function() {
    let v1 = fdvar_create('x', specDomainCreateRange(0, 1));
    let v2 = fdvar_create('y', specDomainCreateRange(0, 1));
    let r = propagator_lteStepBare(v1, v2);

    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRange(0, 1));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(0, 1));
    expect(r).to.eql(ZERO_CHANGES);
  });

  it('should handle multiple ranges too', function() {
    let v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 150]));
    let v2 = fdvar_create('y', specDomainCreateRange(0, 100));
    propagator_lteStepBare(v1, v2);

    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 100]));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(10, 100));
  });

  it('should be able to drop last range in v1', function() {
    let v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [120, 150]));
    let v2 = fdvar_create('y', specDomainCreateRange(0, 100));
    propagator_lteStepBare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98]));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(10, 100));

    v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 150]));
    v2 = fdvar_create('y', specDomainCreateRange(0, 100));
    propagator_lteStepBare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 100]));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(10, 100));

    v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 150]));
    v2 = fdvar_create('y', specDomainCreateRange(0, 99));
    propagator_lteStepBare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98]));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(10, 99));

    v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 100])); // last is single value
    v2 = fdvar_create('y', specDomainCreateRange(0, 99));
    propagator_lteStepBare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98]));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(10, 99));
  });

  it('should be able to drop first range in v1', function() {
    let v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
    let v2 = fdvar_create('y', specDomainCreateRanges([0, 9], [20, 100]));
    propagator_lteStepBare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRanges([20, 100]));

    v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
    v2 = fdvar_create('y', specDomainCreateRanges([0, 10], [20, 100]));
    propagator_lteStepBare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRanges([10, 10], [20, 100]));

    v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
    v2 = fdvar_create('y', specDomainCreateRanges([0, 5], [20, 100]));
    propagator_lteStepBare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRanges([20, 100]));

    v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
    v2 = fdvar_create('y', specDomainCreateRanges([9, 9], [20, 100]));  // first is single value
    propagator_lteStepBare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
    expect(v2.dom, 'v2 after').to.eql(specDomainCreateRanges([20, 100]));
  });
});
