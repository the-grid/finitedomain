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
  SUB,
  SUP,

  REJECTED,
  ZERO_CHANGES,
} = finitedomain.helpers;

const {
  fdvar_create,
  fdvar_create_wide,
} = finitedomain.fdvar;

const {
  propagator_eq_step_bare,
} = finitedomain.propagators.eq;

describe("propagators/eq.spec", function() {

  if (!finitedomain.__DEV_BUILD) {
    return;
  }

  // in general after call v1 and v2 should be equal

  it('should exist', function() {
    expect(propagator_eq_step_bare).to.be.a('function');
  });

  it('should require two vars', function() {
    let v = fdvar_create_wide('x');

    expect(() => propagator_eq_step_bare()).to.throw();
    expect(() => propagator_eq_step_bare(v)).to.throw();
    expect(() => propagator_eq_step_bare(undefined, v)).to.throw();
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
    let v2 = fdvar_create('y', spec_d_create_ranges([0, 10], [20, 30]));

    expect(propagator_eq_step_bare(v1, v2)).to.be.above(0);
    expect(v1.dom).to.eql(spec_d_create_ranges([0, 10], [20, 30]));
    expect(v2.dom).to.eql(spec_d_create_ranges([0, 10], [20, 30]));
  });

  describe('when v1 == v2', function() {
    function test(domain) {
      it(`should not change anything: ${domain}`, function () {
        let v1 = fdvar_create('x', domain.slice(0));
        let v2 = fdvar_create('y', domain.slice(0));
        expect(propagator_eq_step_bare(v1, v2)).to.eql(ZERO_CHANGES);
        expect(v1.dom, 'v1 dom').to.eql(domain);
        expect(v2.dom, 'v2 dom').to.eql(domain);
      });
    }

    test(spec_d_create_range(SUB, SUB));
    test(spec_d_create_range(0, 0));
    test(spec_d_create_range(1, 1));
    test(spec_d_create_range(0, 1));
    test(spec_d_create_range(SUP, SUP));
    test(spec_d_create_range(20, 50));

    test(spec_d_create_ranges([0, 10], [20, 30], [40, 50]));
    test(spec_d_create_ranges([0, 10], [25, 25], [40, 50]));
    test(spec_d_create_ranges([0, 0], [2, 2]));
    test(spec_d_create_ranges([0, 0], [2, 3]));
  });

  describe('when v1 != v2', function() {

    function test(left, right, result, rejects) {
      it(`should not change anything (left-right): ${[left, right, result].join('|')}`, function() {
        let v1 = fdvar_create('x', left.slice(0));
        let v2 = fdvar_create('y', right.slice(0));

        if (rejects) {
          expect(propagator_eq_step_bare(v1, v2)).to.eql(REJECTED);
        } else {
          expect(propagator_eq_step_bare(v1, v2)).to.be.above(0);
        }
        expect(v1.dom, 'v1 dom').to.eql(result);
        expect(v2.dom, 'v2 dom').to.eql(result);
      });

      it(`should not change anything (right-left): ${[right, left, result].join('|')}`, function() {
        let v1 = fdvar_create('x', right.slice(0));
        let v2 = fdvar_create('y', left.slice(0));

        if (rejects) {
          expect(propagator_eq_step_bare(v1, v2)).to.eql(REJECTED);
        } else {
          expect(propagator_eq_step_bare(v1, v2)).to.be.above(0);
        }
        expect(v1.dom, 'v1 dom').to.eql(result);
        expect(v2.dom, 'v2 dom').to.eql(result);
      });
    }

    test(spec_d_create_range(0, 1),  spec_d_create_range(0, 0), spec_d_create_range(0, 0));
    test(spec_d_create_range(0, 1),  spec_d_create_range(1, 1), spec_d_create_range(1, 1));
    test(spec_d_create_range(SUB, 1),  spec_d_create_range(1, SUP), spec_d_create_range(1, 1));
    test(spec_d_create_ranges([0, 10], [20, 30], [40, 50]),  spec_d_create_range(5, 5), spec_d_create_range(5, 5));
    test(spec_d_create_ranges([0, 10], [20, 30], [40, 50]),  spec_d_create_ranges([5, 15], [25, 35]), spec_d_create_ranges([5, 10], [25, 30]));
    test(spec_d_create_ranges([0, 10], [20, 30], [40, 50]),  spec_d_create_ranges([SUB, SUP]), spec_d_create_ranges([0, 10], [20, 30], [40, 50]));
    test(spec_d_create_ranges([0, 0], [2, 2]),  spec_d_create_ranges([1, 1], [3, 3]), [], REJECTED);
    test(spec_d_create_ranges([0, 0], [2, 2]),  spec_d_create_ranges([1, 2], [4, 4]), spec_d_create_range(2,2));
  });
});
