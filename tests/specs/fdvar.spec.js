import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateEmpty,
  specDomainSmallEmpty,
  specDomainSmallNums,
  specDomainSmallRange,
} from '../fixtures/domain.fixt';

import {
  NO_CHANGES,
  SOME_CHANGES,
  SUP,
} from '../../src/helpers';
import {
  fdvar_create,
  fdvar_removeGteInline,
  fdvar_removeLteInline,
} from '../../src/fdvar';

describe('fdvar.spec', function() {

  describe('fdvar_create', function() {

    it('should exist', function() {
      expect(fdvar_create).to.be.a('function');
    });

    it('should work with array domain', function() {
      let A = fdvar_create('A', specDomainCreateRange(30, SUP));

      expect(A.dom).to.eql(specDomainCreateRange(30, SUP));
    });

    it('should work with numbered domain', function() {
      let A = fdvar_create('A', specDomainSmallRange(0, 10));

      expect(A.dom).to.eql(specDomainSmallRange(0, 10));
    });
  });

  describe('fdvar_removeGteInline', function() {

    it('should exist', function() {
      expect(fdvar_removeGteInline).to.be.a('function');
    });

    describe('with array', function() {

      it('should remove all elements gte to value', function() {
        let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40]));
        let R = fdvar_removeGteInline(fdvar, 25);

        expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should remove an element equal to value as well', function() {
        let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40]));
        let R = fdvar_removeGteInline(fdvar, 30);

        expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should be able to split up a range', function() {
        let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20]));
        let R = fdvar_removeGteInline(fdvar, 15);

        expect(fdvar.dom).to.eql(specDomainSmallRange(10, 14));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should accept zero', function() {
        let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20]));
        let R = fdvar_removeGteInline(fdvar, 0);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should accept empty array', function() {
        let fdvar = fdvar_create('A', specDomainCreateEmpty());
        let R = fdvar_removeGteInline(fdvar, 35);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(NO_CHANGES);
      });

      it('should remove SUP from SUP', function() {
        let fdvar = fdvar_create('A', specDomainCreateRanges([SUP, SUP]));
        let R = fdvar_removeGteInline(fdvar, SUP);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(SOME_CHANGES);
      });
    });

    describe('with number', function() {

      it('should remove all elements gte to value', function() {
        let fdvar = fdvar_create('A', specDomainSmallRange(5, 12));
        let R = fdvar_removeGteInline(fdvar, 9);

        expect(fdvar.dom).to.eql(specDomainSmallNums(5, 6, 7, 8));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should remove an element equal to value as well', function() {
        let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
        let R = fdvar_removeGteInline(fdvar, 6);

        expect(fdvar.dom).to.eql(specDomainSmallNums(1, 2, 3));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should be able to split up a range', function() {
        let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 4, 5, 6));
        let R = fdvar_removeGteInline(fdvar, 4);

        expect(fdvar.dom).to.eql(specDomainSmallNums(1, 2, 3));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should accept zero', function() {
        let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 4));
        let R = fdvar_removeGteInline(fdvar, 0);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should accept empty array', function() {
        let fdvar = fdvar_create('A', specDomainSmallEmpty());
        let R = fdvar_removeGteInline(fdvar, 35);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(NO_CHANGES);
      });

      it('should remove 0 from 0', function() {
        let fdvar = fdvar_create('A', specDomainSmallNums(0));
        let R = fdvar_removeGteInline(fdvar, 0);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(SOME_CHANGES);
      });
    });
  });

  describe('fdvar_removeLteInline', function() {

    it('should exist', function() {
      expect(fdvar_removeLteInline).to.be.a('function');
    });

    describe('with array', function() {

      it('should remove all elements lte to value', function() {
        let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40]));
        let R = fdvar_removeLteInline(fdvar, 25);

        expect(fdvar.dom).to.eql(specDomainCreateRange(30, 40));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should be able to split up a range', function() {
        let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20]));
        let R = fdvar_removeLteInline(fdvar, 15);

        expect(fdvar.dom).to.eql(specDomainCreateRanges([16, 20]));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should accept zero', function() {
        let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20]));
        let R = fdvar_removeLteInline(fdvar, 0);

        expect(fdvar.dom).to.eql(specDomainCreateRanges([10, 20]));
        expect(R).to.equal(NO_CHANGES);
      });

      it('should accept empty array', function() {
        let fdvar = fdvar_create('A', specDomainCreateEmpty());
        let R = fdvar_removeLteInline(fdvar, 35);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(NO_CHANGES);
      });

      it('should remove SUP from SUP', function() {
        let fdvar = fdvar_create('A', specDomainCreateRanges([SUP, SUP]));
        let R = fdvar_removeLteInline(fdvar, SUP);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(SOME_CHANGES);
      });
    });

    describe('with number', function() {

      it('should remove all elements lte to value', function() {
        let fdvar = fdvar_create('A', specDomainSmallRange(5, 12));
        let R = fdvar_removeLteInline(fdvar, 9);

        expect(fdvar.dom).to.eql(specDomainSmallNums(10, 11, 12));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should remove an element equal to value as well', function() {
        let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
        let R = fdvar_removeLteInline(fdvar, 6);

        expect(fdvar.dom).to.eql(specDomainSmallNums(7, 8));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should be able to split up a range', function() {
        let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 4, 5, 6));
        let R = fdvar_removeLteInline(fdvar, 4);

        expect(fdvar.dom).to.eql(specDomainSmallNums(5, 6));
        expect(R).to.equal(SOME_CHANGES);
      });

      it('should accept zero', function() {
        let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 4));
        let R = fdvar_removeLteInline(fdvar, 0);

        expect(fdvar.dom).to.eql(specDomainSmallNums(1, 2, 3, 4));
        expect(R).to.equal(NO_CHANGES);
      });

      it('should accept empty array', function() {
        let fdvar = fdvar_create('A', specDomainSmallEmpty());
        let R = fdvar_removeLteInline(fdvar, 35);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(NO_CHANGES);
      });

      it('should remove 0 from 0', function() {
        let fdvar = fdvar_create('A', specDomainSmallNums(0));
        let R = fdvar_removeLteInline(fdvar, 0);

        expect(fdvar.dom).to.eql(specDomainSmallEmpty());
        expect(R).to.equal(SOME_CHANGES);
      });
    });
  });
});
