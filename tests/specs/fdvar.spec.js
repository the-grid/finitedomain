import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRanges,
} from '../fixtures/domain.fixt';

import {
  SOMETHING_CHANGED,
  ZERO_CHANGES,
} from '../../src/helpers';
import {
//  fdvar_clone,
//  fdvar_constrain,
  fdvar_create,
//  fdvar_createBool,
//  fdvar_createRange,
//  fdvar_createWide,
//  fdvar_forceEqInline,
//  fdvar_forceNeqInline,
//  fdvar_isRejected,
//  fdvar_isSolved,
//  fdvar_isUndetermined,
//  fdvar_isValue,
//  fdvar_upperBound,
//  fdvar_middleElement,
//  fdvar_lowerBound,
  fdvar_removeGteInline,
  fdvar_removeLteInline,
//  fdvar_setDomain,
//  fdvar_setToOne,
//  fdvar_setToZero,
//  fdvar_size,
} from '../../src/fdvar';

describe('fdvar.spec', function() {

  describe('fdvar_removeGteInline', function() {

    it('should exist', function() {
      expect(fdvar_removeGteInline).to.be.a('function');
    });

    it('should remove all elements greater to value', function() {
      let fdvar = fdvar_create('A', [10, 20, 30, 40]);
      let R = fdvar_removeGteInline(fdvar, 25);

      expect(fdvar.dom).to.eql(specDomainCreateRanges([10, 20]));
      expect(R).to.equal(SOMETHING_CHANGED);
    });

    it('should remove an element equal to value as well', function() {
      let fdvar = fdvar_create('A', [10, 20, 30, 40]);
      let R = fdvar_removeGteInline(fdvar, 30);

      expect(fdvar.dom).to.eql(specDomainCreateRanges([10, 20]));
      expect(R).to.equal(SOMETHING_CHANGED);
    });

    it('should be able to split up a range', function() {
      let fdvar = fdvar_create('A', [10, 20]);
      let R = fdvar_removeGteInline(fdvar, 15);

      expect(fdvar.dom).to.eql(specDomainCreateRanges([10, 14]));
      expect(R).to.equal(SOMETHING_CHANGED);
    });

    it('should accept zero', function() {
      let fdvar = fdvar_create('A', [10, 20]);
      let R = fdvar_removeGteInline(fdvar, 0);

      expect(fdvar.dom).to.eql([]);
      expect(R).to.equal(SOMETHING_CHANGED);
    });

    it('should accept empty array', function() {
      let fdvar = fdvar_create('A', []);
      let R = fdvar_removeGteInline(fdvar, 35);

      expect(fdvar.dom).to.eql([]);
      expect(R).to.equal(ZERO_CHANGES);
    });
  });

  describe('fdvar_removeLteInline', function() {

    it('should exist', function() {
      expect(fdvar_removeLteInline).to.be.a('function');
    });

    it('should remove all elements greater to value', function() {
      let fdvar = fdvar_create('A', [10, 20, 30, 40]);
      let R = fdvar_removeLteInline(fdvar, 25);

      expect(fdvar.dom).to.eql(specDomainCreateRanges([30, 40]));
      expect(R).to.equal(SOMETHING_CHANGED);
    });

    it('should remove an element equal to value as well', function() {
      let fdvar = fdvar_create('A', [10, 20, 30, 40]);
      let R = fdvar_removeLteInline(fdvar, 20);

      expect(fdvar.dom).to.eql(specDomainCreateRanges([30, 40]));
      expect(R).to.equal(SOMETHING_CHANGED);
    });

    it('should be able to split up a range', function() {
      let fdvar = fdvar_create('A', [10, 20]);
      let R = fdvar_removeLteInline(fdvar, 15);

      expect(fdvar.dom).to.eql(specDomainCreateRanges([16, 20]));
      expect(R).to.equal(SOMETHING_CHANGED);
    });

    it('should accept zero', function() {
      let fdvar = fdvar_create('A', [0, 20]);
      let R = fdvar_removeLteInline(fdvar, 0);

      expect(fdvar.dom).to.eql(specDomainCreateRanges([1, 20]));
      expect(R).to.equal(SOMETHING_CHANGED);
    });

    it('should accept empty array', function() {
      let fdvar = fdvar_create('A', []);
      let R = fdvar_removeLteInline(fdvar, 35);

      expect(fdvar.dom).to.eql([]);
      expect(R).to.equal(ZERO_CHANGES);
    });
  });
});
