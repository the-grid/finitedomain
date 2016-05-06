import setup from '../../fixtures/helpers.spec';
import {
  spec_d_create_bool,
  spec_d_create_range,
  spec_d_create_ranges,
  spec_d_create_value,
} from '../../fixtures/domain.spec';
import finitedomain from '../../../src/index';
import {
  expect,
  assert,
} from 'chai';

const {
  REJECTED,
  ZERO_CHANGES,
} = finitedomain.helpers;

const {
  fdvar_create,
  fdvar_create_wide,
} = finitedomain.fdvar;

const {
  propagator_lt_step_bare,
} = finitedomain.propagators.lt;

describe("propagators/lt.spec", function() {

  if (!finitedomain.__DEV_BUILD) {
    return;
  }

  // in general after call, max(v1) should be < max(v2) and min(v2) should be > min(v1)
  // it makes sure v1 and v2 have no values that can't possibly result in fulfilling <

  it('should exist', function() {
    expect(propagator_lt_step_bare).to.be.a('function');
  });

  it('should require two vars', function() {
    let v = fdvar_create_wide('x');

    expect(() => propagator_lt_step_bare()).to.throw();
    expect(() => propagator_lt_step_bare(v)).to.throw();
    expect(() => propagator_lt_step_bare(undefined, v)).to.throw();
  });

  //it('should reject for empty domains', function() {
  //
  //  let v1 = fdvar_create('x', []);
  //  let v2 = fdvar_create('y', []);
  //  expect(lt_step_bare(v1, v2)).to.eql(REJECTED);
  //});
  //
  //it('should reject for empty left domain', function() {
  //
  //  let v1 = fdvar_create('x', []);
  //  let v2 = fdvar_create_wide('y');
  //  expect(lt_step_bare(v1, v2)).to.eql(REJECTED);
  //});
  //
  //it('should reject for empty right domain', function() {
  //
  //  let v1 = fdvar_create_wide('x');
  //  let v2 = fdvar_create('y', []);
  //  expect(lt_step_bare(v1, v2)).to.eql(REJECTED);
  //});

  it('should not change if v1 already < v2', function() {
    let v1 = fdvar_create('x', spec_d_create_range(0, 10));
    let v2 = fdvar_create('y', spec_d_create_range(20, 30));
    expect(propagator_lt_step_bare(v1, v2)).to.eql(ZERO_CHANGES);

    v1 = fdvar_create('x', spec_d_create_range(0, 10));
    v2 = fdvar_create('y', spec_d_create_range(11, 30));
    expect(propagator_lt_step_bare(v1, v2)).to.eql(ZERO_CHANGES);

    v1 = fdvar_create('x', spec_d_create_range(0, 0));
    v2 = fdvar_create('y', spec_d_create_range(1, 1));
    expect(propagator_lt_step_bare(v1, v2)).to.eql(ZERO_CHANGES);

    v1 = fdvar_create('x', spec_d_create_range(0, 0));
    v2 = fdvar_create('y', spec_d_create_range(1, 1));
    expect(propagator_lt_step_bare(v1, v2)).to.eql(ZERO_CHANGES);
  });

  describe('when max(v1) >= max(v2)', function() {

    function test(lo1, hi1, lo2, hi2, resultLo, resultHi, result) {
      it(`should (only) trunc values from v1 [${[lo1, hi1, lo2, hi2, resultLo, resultHi]}]`, function () {
        let v1 = fdvar_create('x', spec_d_create_range(lo1, hi1));
        let v2 = fdvar_create('y', spec_d_create_range(lo2, hi2));
        let r = propagator_lt_step_bare(v1, v2);

        expect(v1.dom, 'v1 after').to.eql((result === REJECTED && []) || spec_d_create_range(resultLo, resultHi));
        expect(v2.dom, 'v2 after').to.eql(spec_d_create_range(lo2, hi2));

        return (result != null) && expect(r).to.eql(result);
      });
    }

    test(0,20, 5,15, 0,14);
    test(0,10, 5,15, 0,10, ZERO_CHANGES);
  });

  it('should reject when v1 and v2 are solved and v1>v2', function() {
    let v1 = fdvar_create('x', spec_d_create_range(10, 10));
    let v2 = fdvar_create('y', spec_d_create_range(5, 5));
    let r = propagator_lt_step_bare(v1, v2);

    // depending on implementation v1 and v2 may be cleared, one of them cleared, or not changed. but must reject regardless...
    //expect(v1.dom, 'v1 after').to.eql []
    //expect(v2.dom, 'v2 after').to.eql []
    expect(r).to.eql(REJECTED);
  });

  describe('when min(v1) >= min(v2)', function() {

    function test(lo1, hi1, lo2, hi2, resultLo, resultHi, result) {
      it(`should (only) trunc values from v2 [${[lo1, hi1, lo2, hi2, resultLo, resultHi]}]`, function () {
        let v1 = fdvar_create('x', spec_d_create_range(lo1, hi1));
        let v2 = fdvar_create('y', spec_d_create_range(lo2, hi2));
        let r = propagator_lt_step_bare(v1, v2);

        expect(v1.dom, 'v1 after').to.eql(spec_d_create_range(lo1, hi1));
        expect(v2.dom, 'v2 after').to.eql((result === REJECTED && []) || spec_d_create_range(resultLo, resultHi));

        return (result != null) && expect(r).to.eql(result);
      });
    }

    test(5,14, 0,15, 6,15);
    test(5,10, 7,15, 7,15, ZERO_CHANGES);
  });
  //test 10,10, 5,5, 5,5, REJECTED # note: this is the same test as in v1>=v2 because v1 is checked first. so not possible here.

  describe('when both min/max v1 >= min/max v2', function() {

    function test(lo1, hi1, lo2, hi2, resultLo1, resultHi1, resultLo2, resultHi2, result) {
      it(`should (only) trunc values from v2 [${[lo1, hi1, lo2, hi2, resultLo1, resultHi1, resultLo2, resultHi2, result]}]`, function () {
        let v1 = fdvar_create('x', spec_d_create_range(lo1, hi1));
        let v2 = fdvar_create('y', spec_d_create_range(lo2, hi2));
        let r = propagator_lt_step_bare(v1, v2);
        expect(v1.dom, 'v1 after').to.eql(spec_d_create_range(resultLo1, resultHi1));
        expect(v2.dom, 'v2 after').to.eql(spec_d_create_range(resultLo2, resultHi2));
        return (result != null) && expect(r).to.eql(result);
      });
    }

    test(5,20, 0,10, 5,9, 6,10);
    test(5,20, 5,20, 5,19, 6,20);
  });

  it('should handle multiple ranges too', function() {
    let v1 = fdvar_create('x', spec_d_create_ranges([10, 20], [30, 40], [50, 60], [70, 150]));
    let v2 = fdvar_create('y', spec_d_create_range(0, 100));
    propagator_lt_step_bare(v1, v2);

    expect(v1.dom, 'v1 after').to.eql(spec_d_create_ranges([10, 20], [30, 40], [50, 60], [70, 99]));
    expect(v2.dom, 'v2 after').to.eql(spec_d_create_range(11, 100));
  });

  it('should be able to drop last range in v1', function() {
    let v1 = fdvar_create('x', spec_d_create_ranges([10, 20], [30, 40], [50, 60], [70, 98], [120, 150]));
    let v2 = fdvar_create('y', spec_d_create_range(0, 100));
    propagator_lt_step_bare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(spec_d_create_ranges([10, 20], [30, 40], [50, 60], [70, 98]));
    expect(v2.dom, 'v2 after').to.eql(spec_d_create_range(11, 100));

    v1 = fdvar_create('x', spec_d_create_ranges([10, 20], [30, 40], [50, 60], [70, 98], [100, 150]));
    v2 = fdvar_create('y', spec_d_create_range(0, 100));
    propagator_lt_step_bare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(spec_d_create_ranges([10, 20], [30, 40], [50, 60], [70, 98]));
    expect(v2.dom, 'v2 after').to.eql(spec_d_create_range(11, 100));

    v1 = fdvar_create('x', spec_d_create_ranges([10, 20], [30, 40], [50, 60], [70, 98], [100, 100])); // last is single value
    v2 = fdvar_create('y', spec_d_create_range(0, 100));
    propagator_lt_step_bare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(spec_d_create_ranges([10, 20], [30, 40], [50, 60], [70, 98]));
    expect(v2.dom, 'v2 after').to.eql(spec_d_create_range(11, 100));
  });

  it('should be able to drop first range in v1', function() {
    let v1 = fdvar_create('x', spec_d_create_ranges([10, 20], [30, 40], [50, 60]));
    let v2 = fdvar_create('y', spec_d_create_ranges([0, 10], [20, 100]));
    propagator_lt_step_bare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(spec_d_create_ranges([10, 20], [30, 40], [50, 60]));
    expect(v2.dom, 'v2 after').to.eql(spec_d_create_ranges([20, 100]));

    v1 = fdvar_create('x', spec_d_create_ranges([10, 20], [30, 40], [50, 60]));
    v2 = fdvar_create('y', spec_d_create_ranges([0, 5], [20, 100]));
    propagator_lt_step_bare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(spec_d_create_ranges([10, 20], [30, 40], [50, 60]));
    expect(v2.dom, 'v2 after').to.eql(spec_d_create_ranges([20, 100]));

    v1 = fdvar_create('x', spec_d_create_ranges([10, 20], [30, 40], [50, 60]));
    v2 = fdvar_create('y', spec_d_create_ranges([10, 10], [20, 100]));  // first is single value
    propagator_lt_step_bare(v1, v2);
    expect(v1.dom, 'v1 after').to.eql(spec_d_create_ranges([10, 20], [30, 40], [50, 60]));
    expect(v2.dom, 'v2 after').to.eql(spec_d_create_ranges([20, 100]));
  });
});
