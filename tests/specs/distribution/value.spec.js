import setup from '../../fixtures/helpers.spec';
import {
  spec_d_create_bool,
  spec_d_create_value,
  spec_d_create_range,
  spec_d_create_ranges,
  spec_d_create_zero,
} from '../../fixtures/domain.spec';
import finitedomain from '../../../src/index';
import {
  expect,
  assert,
} from 'chai';

let {
  distribute_getNextDomainForVar,
  distribution_valueByList,
  distribution_valueByMarkov,
  distribution_valueByMax,
  distribution_valueByMid,
  distribution_valueByMin,
  distribution_valueByMinMaxCycle,
  distribution_valueBySplitMax,
  distribution_valueBySplitMin,
} = finitedomain.distribution.value;

let {
  fdvar_create,
  fdvar_createBool,
} = finitedomain.fdvar;

describe('distribution/value.spec', function() {

  if (!finitedomain.__DEV_BUILD) {
    return;
  }

  it('fdvar_createBool should exist', function() {
    expect(fdvar_createBool).to.be.a('function');
  });

  describe('distribution_value_by_throw', function() {
    it('should throw', () => expect(_ => _distribute_getNextDomainForVar('throw')).to.throw('not expecting to pick this distributor'))
  });

  describe('distribution_valueByMin', function() {

    it('should exist', function() {
      expect(distribution_valueByMin).to.be.a('function');
    });

    it('should pick lo for FIRST_CHOICE ', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMin(fdvar, 0)).to.eql(spec_d_create_value(0));
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should pick hi for SECOND_CHOICE', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMin(fdvar, 1)).to.eql(spec_d_create_value(1));
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMin(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([10, 11], [13, 20]));

      expect(distribution_valueByMin(fdvar, 0)).to.eql(spec_d_create_value(10));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([10, 11], [13, 20]));

      expect(distribution_valueByMin(fdvar, 1)).to.eql(spec_d_create_ranges([11, 11], [13, 20]));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', spec_d_create_value(20));

      expect(() => distribution_valueByMin(fdvar, 0)).to.throw();
      expect(() => distribution_valueByMin(fdvar, 1)).to.throw();
    });

    it('should reject a "rejected" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', []);

      expect(() => distribution_valueByMin(fdvar, 0)).to.throw();
      expect(() => distribution_valueByMin(fdvar, 1)).to.throw();
    });
  });

  describe('distribution_value_by_max', function() {
    it('should exist', function() {
      expect(distribution_value_by_max).to.be.a('function');
    });

    it('should pick lo for FIRST_CHOICE ', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_value_by_max(fdvar, 0)).to.eql(spec_d_create_value(1));
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should pick hi for SECOND_CHOICE', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_value_by_max(fdvar, 1)).to.eql(spec_d_create_value(0));
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_value_by_max(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([10, 17], [19, 20]));

      expect(distribution_value_by_max(fdvar, 0)).to.eql(spec_d_create_value(20));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([10, 17], [19, 20]));

      expect(distribution_value_by_max(fdvar, 1)).to.eql(spec_d_create_ranges([10, 17], [19, 19]));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', spec_d_create_value(20));

      expect(() => distribution_value_by_max(fdvar, 0)).to.throw();
      expect(() => distribution_value_by_max(fdvar, 1)).to.throw();
    });

    it('should reject a "rejected" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', []);

      expect(() => distribution_value_by_max(fdvar, 0)).to.throw();
      expect(() => distribution_value_by_max(fdvar, 1)).to.throw();
    });
  });

  describe('distribution_value_by_mid', function() {
    it('should exist', function() {
      expect(distribution_value_by_mid).to.be.a('function');
    });

    it('should pick lo for FIRST_CHOICE ', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_value_by_mid(fdvar, 0)).to.eql(spec_d_create_value(1));
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should pick hi for SECOND_CHOICE', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_value_by_mid(fdvar, 1)).to.eql(spec_d_create_value(0));
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_value_by_mid(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([10, 12], [18, 20]));

      expect(distribution_value_by_mid(fdvar, 0)).to.eql(spec_d_create_value(18));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([10, 12], [18, 20]));

      expect(distribution_value_by_mid(fdvar, 1)).to.eql(spec_d_create_ranges([10, 12], [19, 20]));
    });

    it('should pick middle out', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(1, 3));

      expect(distribution_value_by_mid(fdvar, 0)).to.eql(spec_d_create_ranges([2, 2]));
      expect(distribution_value_by_mid(fdvar, 1)).to.eql(spec_d_create_ranges([1, 1], [3, 3]));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', spec_d_create_value(20));

      expect(() => distribution_value_by_mid(fdvar, 0)).to.throw();
      expect(() => distribution_value_by_mid(fdvar, 1)).to.throw();
    });

    it('should reject a "rejected" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', []);

      expect(() => distribution_value_by_mid(fdvar, 0)).to.throw();
      expect(() => distribution_value_by_mid(fdvar, 1)).to.throw();
    });
  });

  describe('distribution_valueBySplitMin', function() {
    it('should exist', function() {
      expect(distribution_valueBySplitMin).to.be.a('function');
    });

    it('should pick lower half for FIRST_CHOICE ', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(10, 20));

      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_range(10, 15));
      expect(fdvar.dom).to.eql(spec_d_create_range(10, 20));
    });

    it('should pick upper half for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(10, 20));

      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_range(16, 20));
      expect(fdvar.dom).to.eql(spec_d_create_range(10, 20));
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueBySplitMin(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_ranges([0, 1], [8, 10]));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_ranges([11, 12], [18, 20]));
    });

    it('should handle simple domains', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_range(1, 1));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_range(2, 2));

      fdvar = fdvar_create('A', spec_d_create_range(1, 3));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_range(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_range(3, 3));

      fdvar = fdvar_create('A', spec_d_create_range(1, 4));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_range(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_range(3, 4));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', spec_d_create_value(20));

      expect(() => distribution_valueBySplitMin(fdvar, 0)).to.throw();
      expect(() => distribution_valueBySplitMin(fdvar, 1)).to.throw();
    });

    it('should reject a "rejected" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', []);

      expect(() => distribution_valueBySplitMin(fdvar, 0)).to.throw();
      expect(() => distribution_valueBySplitMin(fdvar, 1)).to.throw();
    });
  });

  describe('distribution_valueBySplitMin', function() {

    it('should exist', function() {
      expect(distribution_valueBySplitMin).to.be.a('function');
    });

    it('should pick lower half for FIRST_CHOICE ', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(10, 20));

      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_range(10, 15));
      expect(fdvar.dom).to.eql(spec_d_create_range(10, 20));
    });

    it('should pick upper half for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(10, 20));

      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_range(16, 20));
      expect(fdvar.dom).to.eql(spec_d_create_range(10, 20));
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueBySplitMin(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_ranges([0, 1], [8, 10]));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_ranges([11, 12], [18, 20]));
    });

    it('should handle simple domains', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_range(1, 1));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_range(2, 2));

      fdvar = fdvar_create('A', spec_d_create_range(1, 3));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_range(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_range(3, 3));

      fdvar = fdvar_create('A', spec_d_create_range(1, 4));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(spec_d_create_range(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(spec_d_create_range(3, 4));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', spec_d_create_value(20));

      expect(() => distribution_valueBySplitMin(fdvar, 0)).to.throw();
      expect(() => distribution_valueBySplitMin(fdvar, 1)).to.throw();
    });

    it('should reject a "rejected" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', []);

      expect(() => distribution_valueBySplitMin(fdvar, 0)).to.throw();
      expect(() => distribution_valueBySplitMin(fdvar, 1)).to.throw();
    });
  });

  describe('distribution_valueBySplitMax', function() {

    it('should exist', function() {
      expect(distribution_valueBySplitMax).to.be.a('function');
    });

    it('should pick lower half for FIRST_CHOICE ', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(10, 20));

      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(spec_d_create_range(16, 20));
      expect(fdvar.dom).to.eql(spec_d_create_range(10, 20));
    });

    it('should pick upper half for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(10, 20));

      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(spec_d_create_range(10, 15));
      expect(fdvar.dom).to.eql(spec_d_create_range(10, 20));
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueBySplitMax(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(spec_d_create_bool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(spec_d_create_ranges([11, 12], [18, 20]));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', spec_d_create_ranges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(spec_d_create_ranges([0, 1], [8, 10]));
    });

    it('should handle simple domains', function() {
      let fdvar = fdvar_create('A', spec_d_create_range(1, 2));
      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(spec_d_create_range(2, 2));
      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(spec_d_create_range(1, 1));

      fdvar = fdvar_create('A', spec_d_create_range(1, 3));
      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(spec_d_create_range(3, 3));
      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(spec_d_create_range(1, 2));

      fdvar = fdvar_create('A', spec_d_create_range(1, 4));
      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(spec_d_create_range(3, 4));
      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(spec_d_create_range(1, 2));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', spec_d_create_value(20));

      expect(() => distribution_valueBySplitMax(fdvar, 0)).to.throw();
      expect(() => distribution_valueBySplitMax(fdvar, 1)).to.throw();
    });

    it('should reject a "rejected" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', []);

      expect(() => distribution_valueBySplitMax(fdvar, 0)).to.throw();
      expect(() => distribution_valueBySplitMax(fdvar, 1)).to.throw();
    });
  });
});
