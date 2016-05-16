import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainSmallEmpty,
  specDomainSmallRange,
} from '../../fixtures/domain.fixt';

import {
  SUB,
  SUP,
  REJECTED,
  SOMETHING_CHANGED,
  ZERO_CHANGES,
} from '../../../src/helpers';
import {
  fdvar_create,
  fdvar_createRange,
} from '../../../src/fdvar';
import {
  propagator_ltStepBare,
} from '../../../src/propagators/lt';

describe('propagators/lt.spec', function() {
  // in general after call, max(v1) should be < max(v2) and min(v2) should be > min(v1)
  // it makes sure v1 and v2 have no values that can't possibly result in fulfilling <

  it('should exist', function() {
    expect(propagator_ltStepBare).to.be.a('function');
  });

  it('should require two vars', function() {
    let v = fdvar_createRange('x', SUB, SUP);

    expect(() => propagator_ltStepBare()).to.throw();
    expect(() => propagator_ltStepBare(v)).to.throw();
    expect(() => propagator_ltStepBare(undefined, v)).to.throw();
  });

  describe('with array', function() {

    it('should throw for empty domain', function() {
      let v1 = fdvar_create('x', specDomainCreateRange(90, 100));
      let v2 = fdvar_create('y', specDomainCreateRange(200, 300));
      expect(_ => propagator_ltStepBare(v1, v2)).not.to.throw();
      expect(_ => propagator_ltStepBare(fdvar_create('x', specDomainSmallEmpty()), v2)).to.throw('Domain should not be empty but was set empty (ASSERT_DOMAIN_EMPTY_CHECK is disabled so no trace');
      expect(_ => propagator_ltStepBare(v1, fdvar_create('x', specDomainSmallEmpty()))).to.throw('Domain should not be empty but was set empty (ASSERT_DOMAIN_EMPTY_CHECK is disabled so no trace');
      expect(_ => propagator_ltStepBare(fdvar_create('x', specDomainSmallEmpty()), fdvar_create('y', specDomainSmallEmpty()))).to.throw('Domain should not be empty but was set empty (ASSERT_DOMAIN_EMPTY_CHECK is disabled so no trace');
    });

    it('should remove any value from v1 that is gte to max(v2)', function() {
      let v1 = fdvar_create('x', specDomainCreateRange(90, 100));
      let v2 = fdvar_create('y', specDomainCreateRange(95, 99));
      expect(propagator_ltStepBare(v1, v2)).to.eql(SOMETHING_CHANGED);
      expect(v1.dom).to.eql(specDomainCreateRange(90, 98));
      expect(v2.dom).to.eql(specDomainCreateRange(95, 99));
    });

    it('should remove SUP if both ranges end there', function() {
      let v1 = fdvar_create('x', specDomainCreateRange(90, SUP));
      let v2 = fdvar_create('y', specDomainCreateRange(95, SUP));
      expect(propagator_ltStepBare(v1, v2)).to.eql(SOMETHING_CHANGED);
      expect(v1.dom).to.eql(specDomainCreateRange(90, SUP - 1));
      expect(v2.dom).to.eql(specDomainCreateRange(95, SUP));
    });

    it('should not affect domains when v1 < v2', function() {
      let v1 = fdvar_create('x', specDomainCreateRange(90, 100));
      let v2 = fdvar_create('y', specDomainCreateRange(101, 101));
      expect(propagator_ltStepBare(v1, v2)).to.eql(ZERO_CHANGES);
      expect(v1.dom).to.eql(specDomainCreateRange(90, 100));
      expect(v2.dom).to.eql(specDomainCreateRange(101, 101));
    });

    it('should not affect overlapping ranges when max(v1) < max(v2)', function() {
      let v1 = fdvar_create('x', specDomainCreateRange(90, 150));
      let v2 = fdvar_create('y', specDomainCreateRange(100, 200));
      expect(propagator_ltStepBare(v1, v2)).to.eql(ZERO_CHANGES);
      expect(v1.dom).to.eql(specDomainCreateRange(90, 150));
      expect(v2.dom).to.eql(specDomainCreateRange(100, 200));
    });

    it('should reject if min(v1) > max(v2)', function() {
      let v1 = fdvar_create('x', specDomainCreateRange(190, 200));
      let v2 = fdvar_create('y', specDomainCreateRange(100, 150));
      expect(propagator_ltStepBare(v1, v2)).to.eql(REJECTED);
      expect(v1.dom).to.eql(specDomainSmallEmpty());
      expect(v2.dom).to.eql(specDomainSmallEmpty());
    });

    it('should reduce v2 if v1 is solved and > min(v2)', function() {
      let v1 = fdvar_create('x', specDomainCreateRange(200, 200));
      let v2 = fdvar_create('y', specDomainCreateRange(100, 300));
      expect(propagator_ltStepBare(v1, v2)).to.eql(SOMETHING_CHANGED);
      expect(v1.dom).to.eql(specDomainCreateRange(200, 200));
      expect(v2.dom).to.eql(specDomainCreateRange(201, 300));
    });

    it('should not change if v1 is solved and == min(v2)', function() {
      let v1 = fdvar_create('x', specDomainCreateRange(200, 200));
      let v2 = fdvar_create('y', specDomainCreateRange(200, 300));
      expect(propagator_ltStepBare(v1, v2)).to.eql(SOMETHING_CHANGED);
      expect(v1.dom).to.eql(specDomainCreateRange(200, 200));
      expect(v2.dom).to.eql(specDomainCreateRange(201, 300));
    });

    it('should be able to drop last range in v1', function() {
      let v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [120, 150]));
      let v2 = fdvar_create('y', specDomainCreateRange(0, 100));
      propagator_ltStepBare(v1, v2);
      expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98]));
      expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(11, 100));

      v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 150]));
      v2 = fdvar_create('y', specDomainCreateRange(0, 100));
      propagator_ltStepBare(v1, v2);
      expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98]));
      expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(11, 100));

      v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 100])); // last is single value
      v2 = fdvar_create('y', specDomainCreateRange(0, 100));
      propagator_ltStepBare(v1, v2);
      expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98]));
      expect(v2.dom, 'v2 after').to.eql(specDomainCreateRange(11, 100));
    });

    it('should be able to drop first range in v1', function() {
      let v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      let v2 = fdvar_create('y', specDomainCreateRanges([0, 10], [20, 100]));
      propagator_ltStepBare(v1, v2);
      expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      expect(v2.dom, 'v2 after').to.eql(specDomainCreateRanges([20, 100]));

      v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      v2 = fdvar_create('y', specDomainCreateRanges([0, 5], [20, 100]));
      propagator_ltStepBare(v1, v2);
      expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      expect(v2.dom, 'v2 after').to.eql(specDomainCreateRanges([20, 100]));

      v1 = fdvar_create('x', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      v2 = fdvar_create('y', specDomainCreateRanges([10, 10], [20, 100]));  // first is single value
      propagator_ltStepBare(v1, v2);
      expect(v1.dom, 'v1 after').to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      expect(v2.dom, 'v2 after').to.eql(specDomainCreateRanges([20, 100]));
    });
  });

  describe('with numbers', function() {

    it('should throw for empty domain', function() {
      let v1 = fdvar_create('x', specDomainSmallRange(9, 10));
      let v2 = fdvar_create('y', specDomainSmallRange(11, 15));

      expect(_ => propagator_ltStepBare(v1, v2)).not.to.throw();
      expect(_ => propagator_ltStepBare(fdvar_create('x', specDomainSmallEmpty()), v2)).to.throw('Domain should not be empty but was set empty (ASSERT_DOMAIN_EMPTY_CHECK is disabled so no trace');
      expect(_ => propagator_ltStepBare(v1, fdvar_create('x', specDomainSmallEmpty()))).to.throw('Domain should not be empty but was set empty (ASSERT_DOMAIN_EMPTY_CHECK is disabled so no trace');
      expect(_ => propagator_ltStepBare(fdvar_create('x', specDomainSmallEmpty()), fdvar_create('y', specDomainSmallEmpty()))).to.throw('Domain should not be empty but was set empty (ASSERT_DOMAIN_EMPTY_CHECK is disabled so no trace');
    });

    it('should remove any value from v1 that is gte to max(v2)', function() {
      let v1 = fdvar_create('x', specDomainSmallRange(0, 10));
      let v2 = fdvar_create('y', specDomainSmallRange(5, 9));
      expect(propagator_ltStepBare(v1, v2)).to.eql(SOMETHING_CHANGED);
      expect(v1.dom).to.eql(specDomainSmallRange(0, 8));
      expect(v2.dom).to.eql(specDomainSmallRange(5, 9));
    });

    it('should remove SUP if both ranges end there', function() {
      let v1 = fdvar_create('x', specDomainSmallRange(0, 15));
      let v2 = fdvar_create('y', specDomainSmallRange(5, 15));
      expect(propagator_ltStepBare(v1, v2)).to.eql(SOMETHING_CHANGED);
      expect(v1.dom).to.eql(specDomainSmallRange(0, 14));
      expect(v2.dom).to.eql(specDomainSmallRange(5, 15));
    });

    it('should not affect domains when v1 < v2', function() {
      let v1 = fdvar_create('x', specDomainSmallRange(0, 10));
      let v2 = fdvar_create('y', specDomainSmallRange(11, 15));
      expect(propagator_ltStepBare(v1, v2)).to.eql(ZERO_CHANGES);
      expect(v1.dom).to.eql(specDomainSmallRange(0, 10));
      expect(v2.dom).to.eql(specDomainSmallRange(11, 15));
    });

    it('should not affect overlapping ranges when min(v2) <= max(v1) < max(v2)', function() {
      let v1 = fdvar_create('x', specDomainSmallRange(0, 13));
      let v2 = fdvar_create('y', specDomainSmallRange(10, 15));
      expect(propagator_ltStepBare(v1, v2)).to.eql(ZERO_CHANGES);
      expect(v1.dom).to.eql(specDomainSmallRange(0, 13));
      expect(v2.dom).to.eql(specDomainSmallRange(10, 15));
    });

    it('should reject if min(v1) > max(v2)', function() {
      let v1 = fdvar_create('x', specDomainSmallRange(11, 15));
      let v2 = fdvar_create('y', specDomainSmallRange(5, 8));
      expect(propagator_ltStepBare(v1, v2)).to.eql(REJECTED);
      expect(v1.dom).to.eql(specDomainSmallEmpty());
      expect(v2.dom).to.eql(specDomainSmallEmpty());
    });

    it('should reduce v2 if v1 is solved and > min(v2)', function() {
      let v1 = fdvar_create('x', specDomainSmallRange(8, 8));
      let v2 = fdvar_create('y', specDomainSmallRange(5, 10));
      expect(propagator_ltStepBare(v1, v2)).to.eql(SOMETHING_CHANGED);
      expect(v1.dom).to.eql(specDomainSmallRange(8, 8));
      expect(v2.dom).to.eql(specDomainSmallRange(9, 10));
    });

    it('should reduce if v1 is solved and == min(v2)', function() {
      let v1 = fdvar_create('x', specDomainSmallRange(7, 7));
      let v2 = fdvar_create('y', specDomainSmallRange(7, 13));
      expect(propagator_ltStepBare(v1, v2)).to.eql(SOMETHING_CHANGED);
      expect(v1.dom).to.eql(specDomainSmallRange(7, 7));
      expect(v2.dom).to.eql(specDomainSmallRange(8, 13));
    });
  });
});
