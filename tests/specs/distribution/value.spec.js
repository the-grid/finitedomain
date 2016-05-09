import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateBool,
  specDomainCreateValue,
  specDomainCreateRange,
  specDomainCreateRanges,
} from '../../fixtures/domain.fixt';

import distribute_getNextDomainForVar, {
  _distribute_getNextDomainForVar,
  //distribution_valueByList,
  //distribution_valueByMarkov,
  distribution_valueByMax,
  distribution_valueByMid,
  distribution_valueByMin,
  //distribution_valueByMinMaxCycle,
  distribution_valueBySplitMax,
  distribution_valueBySplitMin,
} from '../../../src/distribution/value';
import {
  fdvar_create,
  fdvar_createBool,
} from '../../../src/fdvar';

describe('distribution/value.spec', function() {

  it('fdvar_createBool should exist', function() {
    expect(fdvar_createBool).to.be.a('function');
  });

  describe('distribution_valueByThrow', function() {

    it('should throw', function() {
      expect(_ => _distribute_getNextDomainForVar('throw')).to.throw('not expecting to pick this distributor');
    });

  });

  describe('distribution_valueByMin', function() {

    it('should exist', function() {
      expect(distribution_valueByMin).to.be.a('function');
    });

    it('should pick lo for FIRST_CHOICE ', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMin(fdvar, 0)).to.eql(specDomainCreateValue(0));
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should pick hi for SECOND_CHOICE', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMin(fdvar, 1)).to.eql(specDomainCreateValue(1));
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMin(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 11], [13, 20]));

      expect(distribution_valueByMin(fdvar, 0)).to.eql(specDomainCreateValue(10));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 11], [13, 20]));

      expect(distribution_valueByMin(fdvar, 1)).to.eql(specDomainCreateRanges([11, 11], [13, 20]));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', specDomainCreateValue(20));

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

  describe('distribution_valueByMax', function() {
    it('should exist', function() {
      expect(distribution_valueByMax).to.be.a('function');
    });

    it('should pick lo for FIRST_CHOICE ', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMax(fdvar, 0)).to.eql(specDomainCreateValue(1));
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should pick hi for SECOND_CHOICE', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMax(fdvar, 1)).to.eql(specDomainCreateValue(0));
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMax(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 17], [19, 20]));

      expect(distribution_valueByMax(fdvar, 0)).to.eql(specDomainCreateValue(20));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 17], [19, 20]));

      expect(distribution_valueByMax(fdvar, 1)).to.eql(specDomainCreateRanges([10, 17], [19, 19]));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', specDomainCreateValue(20));

      expect(() => distribution_valueByMax(fdvar, 0)).to.throw();
      expect(() => distribution_valueByMax(fdvar, 1)).to.throw();
    });

    it('should reject a "rejected" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', []);

      expect(() => distribution_valueByMax(fdvar, 0)).to.throw();
      expect(() => distribution_valueByMax(fdvar, 1)).to.throw();
    });
  });

  describe('distribution_valueByMid', function() {
    it('should exist', function() {
      expect(distribution_valueByMid).to.be.a('function');
    });

    it('should pick lo for FIRST_CHOICE ', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMid(fdvar, 0)).to.eql(specDomainCreateValue(1));
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should pick hi for SECOND_CHOICE', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMid(fdvar, 1)).to.eql(specDomainCreateValue(0));
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueByMid(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 12], [18, 20]));

      expect(distribution_valueByMid(fdvar, 0)).to.eql(specDomainCreateValue(18));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 12], [18, 20]));

      expect(distribution_valueByMid(fdvar, 1)).to.eql(specDomainCreateRanges([10, 12], [19, 20]));
    });

    it('should pick middle out', function() {
      let fdvar = fdvar_create('A', specDomainCreateRange(1, 3));

      expect(distribution_valueByMid(fdvar, 0)).to.eql(specDomainCreateRanges([2, 2]));
      expect(distribution_valueByMid(fdvar, 1)).to.eql(specDomainCreateRanges([1, 1], [3, 3]));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', specDomainCreateValue(20));

      expect(() => distribution_valueByMid(fdvar, 0)).to.throw();
      expect(() => distribution_valueByMid(fdvar, 1)).to.throw();
    });

    it('should reject a "rejected" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', []);

      expect(() => distribution_valueByMid(fdvar, 0)).to.throw();
      expect(() => distribution_valueByMid(fdvar, 1)).to.throw();
    });
  });

  describe('distribution_valueBySplitMin', function() {
    it('should exist', function() {
      expect(distribution_valueBySplitMin).to.be.a('function');
    });

    it('should pick lower half for FIRST_CHOICE ', function() {
      let fdvar = fdvar_create('A', specDomainCreateRange(10, 20));

      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRange(10, 15));
      expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
    });

    it('should pick upper half for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRange(10, 20));

      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRange(16, 20));
      expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueBySplitMin(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRanges([0, 1], [8, 10]));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRanges([11, 12], [18, 20]));
    });

    it('should handle simple domains', function() {
      let fdvar = fdvar_create('A', specDomainCreateRange(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRange(1, 1));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRange(2, 2));

      fdvar = fdvar_create('A', specDomainCreateRange(1, 3));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRange(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRange(3, 3));

      fdvar = fdvar_create('A', specDomainCreateRange(1, 4));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRange(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRange(3, 4));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', specDomainCreateValue(20));

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
      let fdvar = fdvar_create('A', specDomainCreateRange(10, 20));

      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRange(10, 15));
      expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
    });

    it('should pick upper half for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRange(10, 20));

      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRange(16, 20));
      expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueBySplitMin(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRanges([0, 1], [8, 10]));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRanges([11, 12], [18, 20]));
    });

    it('should handle simple domains', function() {
      let fdvar = fdvar_create('A', specDomainCreateRange(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRange(1, 1));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRange(2, 2));

      fdvar = fdvar_create('A', specDomainCreateRange(1, 3));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRange(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRange(3, 3));

      fdvar = fdvar_create('A', specDomainCreateRange(1, 4));
      expect(distribution_valueBySplitMin(fdvar, 0)).to.eql(specDomainCreateRange(1, 2));
      expect(distribution_valueBySplitMin(fdvar, 1)).to.eql(specDomainCreateRange(3, 4));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', specDomainCreateValue(20));

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
      let fdvar = fdvar_create('A', specDomainCreateRange(10, 20));

      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(specDomainCreateRange(16, 20));
      expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
    });

    it('should pick upper half for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRange(10, 20));

      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(specDomainCreateRange(10, 15));
      expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
    });

    it('should return undefined for third choice', function() {
      let fdvar = fdvar_createBool('A');

      expect(distribution_valueBySplitMax(fdvar, 2)).to.eql(undefined);
      expect(fdvar.dom).to.eql(specDomainCreateBool());
    });

    it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(specDomainCreateRanges([11, 12], [18, 20]));
    });

    it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
      let fdvar = fdvar_create('A', specDomainCreateRanges([0, 1], [8, 12], [18, 20]));

      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(specDomainCreateRanges([0, 1], [8, 10]));
    });

    it('should handle simple domains', function() {
      let fdvar = fdvar_create('A', specDomainCreateRange(1, 2));
      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(specDomainCreateRange(2, 2));
      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(specDomainCreateRange(1, 1));

      fdvar = fdvar_create('A', specDomainCreateRange(1, 3));
      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(specDomainCreateRange(3, 3));
      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(specDomainCreateRange(1, 2));

      fdvar = fdvar_create('A', specDomainCreateRange(1, 4));
      expect(distribution_valueBySplitMax(fdvar, 0)).to.eql(specDomainCreateRange(3, 4));
      expect(distribution_valueBySplitMax(fdvar, 1)).to.eql(specDomainCreateRange(1, 2));
    });

    it('should reject a "solved" var', function() {
      // note: only rejects with ASSERTs
      let fdvar = fdvar_create('A', specDomainCreateValue(20));

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
