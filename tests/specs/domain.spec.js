import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateEmpty,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateValue,
  specDomainFromNums,
  specDomainSmallEmpty,
  specDomainSmallNums,
  specDomainSmallRange,
} from '../fixtures/domain.fixt';

import {
  EMPTY,
  NO_SUCH_VALUE,
  SUP,
} from '../../src/helpers';
import {
  ZERO,
  ONE,
  TWO,
  THREE,
  FOUR,
  FIVE,
  SIX,
  SEVEN,
  EIGHT,
  NINE,
  TEN,
  ELEVEN,
  TWELVE,
  THIRTEEN,
  FOURTEEN,
  FIFTEEN,
  SIXTEEN,
  SEVENTEEN,
  EIGHTEEN,
  NINETEEN,
  TWENTY,
  TWENTYONE,
  TWENTYTWO,
  TWENTYTHREE,
  TWENTYFOUR,
  TWENTYFIVE,
  TWENTYSIX,
  TWENTYSEVEN,
  TWENTYEIGHT,
  TWENTYNINE,
  THIRTY,
  NUM_TO_FLAG,
  SMALL_MAX_NUM,

  NOT_FOUND,

  domain_addRangeNum,
  domain_clone,
  domain_closeGapsInline,
  domain_complement,
  domain_containsValue,
  //domain_createRange,
  //domain_createValue,
  domain_divby,
  domain_isEqual,
  domain_fromList,
  domain_fromFlagsNum,
  domain_getValue,
  domain_getValueOfFirstContainedValueInList,
  domain_intersection,
  domain_isRejected,
  domain_isSimplified,
  domain_isSolved,
  domain_isUndetermined,
  domain_isValue,
  domain_max,
  _domain_mergeOverlappingInline,
  //domain_middleElement,
  domain_min,
  domain_mul,
  domain_numarr,
  domain_rangeIndexOfArr,
  domain_removeGte,
  domain_removeLte,
  domain_removeNextFromList,
  domain_removeValue,
  //domain_sharesNoElements,
  domain_simplifyInlineArr,
  domain_size,
  _domain_sortByRangeInline,
  domain_toArr,
  domain_toList,
} from '../../src/domain';
import domain_minus from '../../src/doms/domain_minus';
import domain_plus from '../../src/doms/domain_plus';

const FLOOR_FRACTIONS = true;
const CEIL_FRACTIONS = false;

describe('src/domain.spec', function() {

  describe('domain_fromList', function() {

    it('should exist', function() {
      expect(domain_fromList).to.be.a('function');
    });

    it('should throw for empty lists', function() {
      expect(domain_fromList([])).to.eql(EMPTY);
    });

    it('should work with [0,0]', function() {
      expect(domain_fromList([0])).to.eql(specDomainSmallNums(0));
      expect(domain_fromList([0, 0])).to.eql(specDomainSmallNums(0));
    });

    it('should work with [0,1]', function() {
      expect(domain_fromList([0, 1])).to.eql(specDomainSmallNums(0, 1));
      expect(domain_fromList([1, 0])).to.eql(specDomainSmallNums(0, 1));
      expect(domain_fromList([0, 0, 1, 1])).to.eql(specDomainSmallNums(0, 1));
      expect(domain_fromList([1, 1, 0, 0])).to.eql(specDomainSmallNums(0, 1));
    });

    it('should throw with negative elements', function() {
      expect(() => domain_fromList([10, 1, -1, 0])).to.throw('A_OOB_INDICATES_BUG');
      expect(() => domain_fromList([10, 1, -1, 0, 10, 1, -1, 0, 10, 1, -1, 0])).to.throw('A_OOB_INDICATES_BUG');
    });

    it('should work with clone=true, sort=true', function() {
      let list = [4, 3, 8, 2];
      domain_fromList(list, true, true);

      expect(list).to.eql([4, 3, 8, 2]);
    });

    it('should work with clone=false, sort=true', function() {
      let list = [4, 3, 8, 2];
      domain_fromList(list, false, true);

      expect(list).to.eql([2, 3, 4, 8]);
    });

    it('should work with clone=true, sort=false, provided the list is sorted', function() {
      let list = [2, 3, 4, 8];
      domain_fromList(list, true, false);

      expect(list).to.eql([2, 3, 4, 8]);
    });

    it('should throw with sort=false if the list is unsorted', function() {
      let list = [2, 3, 8, 4];

      expect(_ => domain_fromList(list, false, false)).to.throw('LIST_SHOULD_BE_ORDERED_BY_NOW');
    });

    it('should work with clone=false, sort=false, provided the list is sorted', function() {
      let list = [2, 3, 4, 8];
      domain_fromList(list, true, false);

      expect(list).to.eql([2, 3, 4, 8]);
    });
  });

  describe('domain_getValue', function() {

    it('should exist', function() {
      expect(domain_getValue).to.be.a('function');
    });

    describe('with array', function() {

      it('should return NOT_FOUND if the domain has more than two values', function() {
        expect(domain_getValue([10, 20, 30, 40])).to.equal(NOT_FOUND);
      });

      it('should return NOT_FOUND if the domain is empty', function() {
        let A = [];
        A.__skipEmptyCheck = true; // circumvents certain protections
        expect(domain_getValue(A)).to.equal(NOT_FOUND);
      });

      it('should return NO_SUCH_VALUE if the two elements are not equal', function() {
        expect(domain_getValue([321, 1])).to.equal(NO_SUCH_VALUE);
      });

      it('should return 17 if both elements are 17', function() {
        expect(domain_getValue([17, 17])).to.equal(17);
      });

      it('should return 0 if both elements are 0', function() {
        expect(domain_getValue([0, 0])).to.equal(0);
      });
    });

    describe('with number', function() {

      it('should return NOT_FOUND if the domain has more than two values', function() {
        expect(domain_getValue(specDomainSmallNums(10, 12))).to.equal(NOT_FOUND);
      });

      it('should return NOT_FOUND if the domain is empty', function() {
        let A = specDomainSmallEmpty();
        expect(domain_getValue(A)).to.equal(NOT_FOUND);
      });

      it('should return 12 if it only contains 12', function() {
        expect(domain_getValue(specDomainSmallNums(12))).to.equal(12);
      });

      it('should return 0 if it only contains 0', function() {
        expect(domain_getValue(specDomainSmallNums(0))).to.equal(0);
      });
    });
  });

  describe('domain_toList', function() {

    it('should exist', function() {
      expect(domain_toList).to.be.a('function');
    });

    it('should require a domain', function() {
      expect(() => domain_toList()).to.throw('A_EXPECTING_DOMAIN');
    });

    describe('with array', function() {

      it('[[0,0]]', function() {
        expect(domain_toList(specDomainCreateRange(SUP, SUP))).to.eql([SUP]);
      });

      it('[[0,1]]', function() {
        expect(domain_toList(specDomainCreateRange(SUP - 1, SUP))).to.eql([SUP - 1, SUP]);
      });
    });

    describe('with number', function() {

      it('should accept empty domain', function() {
        expect(domain_toList(specDomainSmallEmpty())).to.eql([]);
      });

      it('[[0,0]]', function() {
        expect(domain_toList(specDomainSmallNums(0))).to.eql([0]);
      });

      it('[[0,1]]', function() {
        expect(domain_toList(specDomainSmallNums(0, 1))).to.eql([0, 1]);
      });
    });
  });

  describe('domain_removeNextFromList', function() {

    it('should exist', function() {
      expect(domain_removeNextFromList).to.be.a('function');
    });

    it('should require an array', function() {
      expect(() => domain_removeNextFromList(null, [0])).to.throw('A_EXPECTING_DOMAIN');
    });

    it('should require a list', function() {
      expect(() => domain_removeNextFromList([1, 2])).to.throw('A_EXPECTING_LIST');
    });

    describe('with array', function() {

      it('should return a fresh domain', function() {
        let A = specDomainCreateRange(SUP - 3, SUP);

        expect(domain_removeNextFromList(A, [0])).to.not.equal(A);
      });

      it('should return NO_SUCH_VALUE if no element in the list was found', function() {
        let A = specDomainCreateRanges([21, 210], [220, 230]);

        expect(domain_removeNextFromList(A, [20, 211, 213, 215, 2104])).to.eql(NO_SUCH_VALUE);
      });

      it('should not alter input domain', function() {
        let A = specDomainCreateRange(120, 123);

        expect(domain_removeNextFromList(A, [120])).to.eql(specDomainCreateRange(121, 123));
        expect(A).to.eql(specDomainCreateRange(120, 123));
      });

      it('should work with simple tests', function() {
        let A = specDomainCreateRange(120, 123);

        expect(domain_removeNextFromList(A, [120])).to.eql(specDomainCreateRange(121, 123));
        expect(domain_removeNextFromList(A, [120, 210, 29, 27])).to.eql(specDomainCreateRange(121, 123));
        expect(domain_removeNextFromList(A, [210, 29, 27, 120])).to.eql(specDomainCreateRange(121, 123));
        expect(domain_removeNextFromList(A, [121])).to.eql(specDomainCreateRanges([120, 120], [122, 123]));
        expect(domain_removeNextFromList(A, [122])).to.eql(specDomainCreateRanges([120, 121], [123, 123]));
        expect(domain_removeNextFromList(A, [123])).to.eql(specDomainCreateRange(120, 122));
        expect(domain_removeNextFromList(A, [299, 2100])).to.eql(NO_SUCH_VALUE);
      });

      it('should work with SUP domain', function() {
        let A = specDomainCreateRange(SUP, SUP);

        expect(domain_removeNextFromList(A, [SUP])).to.eql([]);
        expect(domain_removeNextFromList(A, [SUP, 210, 211])).to.eql([]);
        expect(domain_removeNextFromList(A, [210, 211, SUP, 212])).to.eql([]);
        expect(domain_removeNextFromList(A, [SUP - 1])).to.eql(NO_SUCH_VALUE);
        expect(domain_removeNextFromList(A, [SUP - 1, SUP - 2, SUP - 3])).to.eql(NO_SUCH_VALUE);
      });

      it('should skip the first value if not found', function() {
        let A = specDomainCreateRanges([20, 24], [210, 214]);

        expect(domain_removeNextFromList(A, [20])).to.eql(specDomainCreateRanges([21, 24], [210, 214]));
        expect(domain_removeNextFromList(A, [20, 210, 211])).to.eql(specDomainCreateRanges([21, 24], [210, 214]));
        expect(domain_removeNextFromList(A, [210, 211, 20, 212])).to.eql(specDomainCreateRanges([20, 24], [211, 214]));
        expect(domain_removeNextFromList(A, [21])).to.eql(specDomainCreateRanges([20, 20], [22, 24], [210, 214]));
        expect(domain_removeNextFromList(A, [2100, 212])).to.eql(specDomainCreateRanges([20, 24], [210, 211], [213, 214]));
        expect(domain_removeNextFromList(A, [212, 2100])).to.eql(specDomainCreateRanges([20, 24], [210, 211], [213, 214]));
      });

      it('should return NO_SUCH_VALUE if none of the values in the list are found', function() {
        let A = specDomainCreateRanges([20, 24], [210, 214], [220, 224]);

        expect(domain_removeNextFromList(A, [299, 25, 212, 211])).to.eql(specDomainCreateRanges([20, 24], [210, 211], [213, 214], [220, 224]));
        expect(domain_removeNextFromList(A, [299, 25])).to.eql(NO_SUCH_VALUE);
      });

      it('should throw for negative values', function() {
        let A = specDomainCreateRanges([20, 24], [210, 214], [220, 224]);

        expect(() => domain_removeNextFromList(A, [299, -1, 212, 211])).to.throw('A_OOB_INDICATES_BUG');
        expect(() => domain_removeNextFromList(A, [299, -1])).to.throw('A_OOB_INDICATES_BUG');
      });
    });

    describe('with number', function() {

      it('should return a new small domain', function() {
        let A = specDomainSmallRange(0, 3);

        expect(domain_removeNextFromList(A, [0])).to.equal(specDomainSmallRange(1, 3));
      });

      it('should return NO_SUCH_VALUE if no element in the list was found', function() {
        let A = specDomainSmallNums(1, 2, 5, 8, 11, 12, 13);

        expect(domain_removeNextFromList(A, [0, 3, 4, 9, 15])).to.eql(NO_SUCH_VALUE);
      });

      it('should work with simple tests', function() {
        let A = specDomainSmallRange(0, 3);

        expect(domain_removeNextFromList(A, [0])).to.eql(specDomainSmallRange(1, 3));
        expect(domain_removeNextFromList(A, [0, 10, 9, 7])).to.eql(specDomainSmallRange(1, 3));
        expect(domain_removeNextFromList(A, [10, 9, 7, 0])).to.eql(specDomainSmallRange(1, 3));
        expect(domain_removeNextFromList(A, [1])).to.eql(specDomainSmallNums(0, 2, 3));
        expect(domain_removeNextFromList(A, [2])).to.eql(specDomainSmallNums(0, 1, 3));
        expect(domain_removeNextFromList(A, [3])).to.eql(specDomainSmallRange(0, 2));
        expect(domain_removeNextFromList(A, [99, 100])).to.eql(NO_SUCH_VALUE);
      });

      it('should work with empty domain but always return NO_SUCH_VALUE', function() {
        let A = specDomainSmallEmpty();

        expect(domain_removeNextFromList(A, [0])).to.eql(NO_SUCH_VALUE);
        expect(domain_removeNextFromList(A, [0, 10, 11])).to.eql(NO_SUCH_VALUE);
        expect(domain_removeNextFromList(A, [10, 11, 0, 12])).to.eql(NO_SUCH_VALUE);
        expect(domain_removeNextFromList(A, [1])).to.eql(NO_SUCH_VALUE);
        expect(domain_removeNextFromList(A, [1, 2, 3, 4, 5])).to.eql(NO_SUCH_VALUE);
      });

      it('should skip the first value if not found', function() {
        let A = specDomainSmallNums(0, 1, 2, 3, 4, 10, 11, 12, 13, 14);

        expect(domain_removeNextFromList(A, [0])).to.eql(specDomainSmallNums(1, 2, 3, 4, 10, 11, 12, 13, 14));
        expect(domain_removeNextFromList(A, [0, 10, 11])).to.eql(specDomainSmallNums(1, 2, 3, 4, 10, 11, 12, 13, 14));
        expect(domain_removeNextFromList(A, [10, 11, 0, 12])).to.eql(specDomainSmallNums(0, 1, 2, 3, 4, 11, 12, 13, 14));
        expect(domain_removeNextFromList(A, [1])).to.eql(specDomainSmallNums(0, 2, 3, 4, 10, 11, 12, 13, 14));
        expect(domain_removeNextFromList(A, [100, 12])).to.eql(specDomainSmallNums(0, 1, 2, 3, 4, 10, 11, 13, 14));
        expect(domain_removeNextFromList(A, [12, 100])).to.eql(specDomainSmallNums(0, 1, 2, 3, 4, 10, 11, 13, 14));
      });

      it('should return NO_SUCH_VALUE if none of the values in the list are found', function() {
        let A = specDomainSmallNums(0, 1, 2, 3, 4, 7, 10, 11, 12, 13, 14);

        expect(domain_removeNextFromList(A, [99, 5, 12, 11])).to.eql(specDomainSmallNums(0, 1, 2, 3, 4, 7, 10, 11, 13, 14));
        expect(domain_removeNextFromList(A, [99, 5])).to.eql(NO_SUCH_VALUE);
      });

      it('should throw for negative values', function() {
        let A = specDomainSmallNums(0, 1, 2, 3, 4, 7, 10, 11, 12, 13, 14);

        expect(() => domain_removeNextFromList(A, [99, -1, 12, 11])).to.throw('A_OOB_INDICATES_BUG');
        expect(() => domain_removeNextFromList(A, [99, -1])).to.throw('A_OOB_INDICATES_BUG');
      });
    });
  });

  describe('domain_getValueOfFirstContainedValueInList ', function() {

    describe('with array', function() {

      it('should work with SUP range', function() {
        let A = specDomainCreateRange(SUP - 3, SUP);

        expect(domain_getValueOfFirstContainedValueInList(A, [SUP])).to.eql(SUP);
        expect(domain_getValueOfFirstContainedValueInList(A, [SUP, 10, 9, 7]), '[0,10,9,7]').to.eql(SUP);
        expect(domain_getValueOfFirstContainedValueInList(A, [10, 9, 7, SUP]), '[10,9,7,0]').to.eql(SUP);
        expect(domain_getValueOfFirstContainedValueInList(A, [SUP - 1])).to.eql(SUP - 1);
        expect(domain_getValueOfFirstContainedValueInList(A, [SUP - 2])).to.eql(SUP - 2);
        expect(domain_getValueOfFirstContainedValueInList(A, [SUP - 3])).to.eql(SUP - 3);
        expect(domain_getValueOfFirstContainedValueInList(A, [99, 100])).to.eql(NO_SUCH_VALUE);
      });

      it('should work with multiple ranges', function() {
        let A = specDomainCreateRanges([SUP - 14, SUP - 10], [SUP - 4, SUP]);

        expect(domain_getValueOfFirstContainedValueInList(A, [SUP])).to.eql(SUP);
        expect(domain_getValueOfFirstContainedValueInList(A, [SUP, SUP - 10, SUP - 11])).to.eql(SUP);
        expect(domain_getValueOfFirstContainedValueInList(A, [SUP - 10, SUP - 11, SUP, SUP - 12])).to.eql(SUP - 10);
        expect(domain_getValueOfFirstContainedValueInList(A, [SUP - 1])).to.eql(SUP - 1);
        expect(domain_getValueOfFirstContainedValueInList(A, [SUP - 100, SUP - 12])).to.eql(SUP - 12);
        expect(domain_getValueOfFirstContainedValueInList(A, [SUP - 12, SUP - 100])).to.eql(SUP - 12);
      });

      it('should return NO_SUCH_VALUE if the list not intersect with domain', function() {
        let A = specDomainCreateRanges([SUP - 24, SUP - 20], [SUP - 14, SUP - 10], [SUP - 4, SUP]);

        expect(domain_getValueOfFirstContainedValueInList(A, [99, 5, SUP - 12, 11])).to.eql(SUP - 12);
        expect(domain_getValueOfFirstContainedValueInList(A, [99, 5])).to.eql(NO_SUCH_VALUE);
      });

      it('should throw for negative values', function() {
        let A = specDomainCreateRanges([SUP - 24, SUP - 20], [SUP - 14, SUP - 10], [SUP - 4, SUP]);

        expect(() => domain_getValueOfFirstContainedValueInList(A, [99, -1, SUP - 12, 11])).to.throw('A_OOB_INDICATES_BUG');
        expect(() => domain_getValueOfFirstContainedValueInList(A, [99, -1])).to.throw('A_OOB_INDICATES_BUG');
      });
    });

    describe('with numbers', function() {

      it('should work with single range', function() {
        let A = specDomainSmallRange(0, 3);

        expect(domain_getValueOfFirstContainedValueInList(A, [0])).to.eql(0);
        expect(domain_getValueOfFirstContainedValueInList(A, [0, 10, 9, 7]), '[0,10,9,7]').to.eql(0);
        expect(domain_getValueOfFirstContainedValueInList(A, [10, 9, 7, 0]), '[10,9,7,0]').to.eql(0);
        expect(domain_getValueOfFirstContainedValueInList(A, [1])).to.eql(1);
        expect(domain_getValueOfFirstContainedValueInList(A, [2])).to.eql(2);
        expect(domain_getValueOfFirstContainedValueInList(A, [3])).to.eql(3);
        expect(domain_getValueOfFirstContainedValueInList(A, [99, 100])).to.eql(NO_SUCH_VALUE);
      });

      it('should work with zero domain', function() {
        let A = specDomainSmallNums(0);

        expect(domain_getValueOfFirstContainedValueInList(A, [0])).to.eql(0);
        expect(domain_getValueOfFirstContainedValueInList(A, [0, 10, 11])).to.eql(0);
        expect(domain_getValueOfFirstContainedValueInList(A, [10, 11, 0, 12])).to.eql(0);
        expect(domain_getValueOfFirstContainedValueInList(A, [1])).to.eql(NO_SUCH_VALUE);
        expect(domain_getValueOfFirstContainedValueInList(A, [1, 2, 3, 4, 5])).to.eql(NO_SUCH_VALUE);
      });

      it('should work with multiple ranges', function() {
        let A = specDomainSmallNums(0, 1, 2, 3, 4, 10, 11, 12, 13, 14);

        expect(domain_getValueOfFirstContainedValueInList(A, [0])).to.eql(0);
        expect(domain_getValueOfFirstContainedValueInList(A, [0, 10, 11])).to.eql(0);
        expect(domain_getValueOfFirstContainedValueInList(A, [10, 11, 0, 12])).to.eql(10);
        expect(domain_getValueOfFirstContainedValueInList(A, [1])).to.eql(1);
        expect(domain_getValueOfFirstContainedValueInList(A, [100, 12])).to.eql(12);
        expect(domain_getValueOfFirstContainedValueInList(A, [12, 100])).to.eql(12);
      });

      it('should return NO_SUCH_VALUE if the list not intersect with domain', function() {
        let A = specDomainSmallNums(0, 1, 2, 3, 4, 10, 11, 12, 13, 14);

        expect(domain_getValueOfFirstContainedValueInList(A, [99, 5, 12, 11])).to.eql(12);
        expect(domain_getValueOfFirstContainedValueInList(A, [99, 5])).to.eql(NO_SUCH_VALUE);
      });

      it('should throw for negative values', function() {
        let A = specDomainSmallNums(0, 1, 2, 3, 4, 10, 11, 12, 13, 14);

        expect(() => domain_getValueOfFirstContainedValueInList(A, [99, -1, 12, 11])).to.throw('A_OOB_INDICATES_BUG');
        expect(() => domain_getValueOfFirstContainedValueInList(A, [99, -1])).to.throw('A_OOB_INDICATES_BUG');
      });
    });
  });

  describe('domain_containsValue', function() {

    it('should exist', function() {
      expect(domain_containsValue).to.be.a('function');
    });

    describe('with array', function() {
      describe('should return true if domain contains given value', function() {

        it('one range in domain', function() {
          expect(domain_containsValue(specDomainCreateRange(SUP - 10, SUP), SUP - 5)).to.equal(true);
        });

        it('multiple ranges in domain', function() {
          expect(domain_containsValue(specDomainCreateRanges([SUP - 60, SUP - 50], [SUP - 30, SUP - 20], [SUP - 10, SUP]), SUP - 25)).to.equal(true);
        });
      });

      describe('should return false if domain does not contain value', function() {

        it('empty array', function() {
          expect(domain_containsValue(specDomainCreateEmpty(), 0)).to.equal(false);
        });

        it('one range in domain', function() {
          expect(domain_containsValue(specDomainCreateRange(SUP - 10, SUP), 25)).to.equal(false);
        });

        it('multiple ranges in domain', function() {
          expect(domain_containsValue(specDomainCreateRanges([SUP - 60, SUP - 50], [SUP - 30, SUP - 20], [SUP - 10, SUP]), SUP - 15)).to.equal(false);
        });
      });
    });

    describe('with number', function() {

      describe('should return true if domain contains given value', function() {

        it('one range in domain', function() {
          expect(domain_containsValue(specDomainSmallRange(0, 10), 5)).to.equal(true);
        });

        it('multiple ranges in domain', function() {
          expect(domain_containsValue(specDomainSmallNums(0, 1, 2, 4, 5, 8, 9, 10, 11), 9)).to.equal(true);
        });
      });

      describe('should return false if domain does not contain value', function() {

        it('empty array', function() {
          expect(domain_containsValue(specDomainSmallEmpty(), 0)).to.equal(false);
        });

        it('one range in domain', function() {
          expect(domain_containsValue(specDomainSmallRange(0, 10), 25)).to.equal(false);
        });

        it('multiple ranges in domain', function() {
          expect(domain_containsValue(specDomainSmallNums(0, 1, 2, 4, 5, 8, 9, 10, 11), 6)).to.equal(false);
        });
      });
    });
  });

  describe('domain_rangeIndexOf', function() {

    it('should exist', function() {
      expect(domain_rangeIndexOfArr).to.be.a('function');
    });

    describe('should return index of range offset that encloses value', function() {
      // note: not range index, but index on the set of numbers which represents range pairs

      it('one range in domain', function() {
        expect(domain_rangeIndexOfArr(specDomainCreateRange(SUP - 10, SUP), SUP - 5)).to.eql(0);
      });

      it('multiple ranges in domain', function() {
        expect(domain_rangeIndexOfArr(specDomainCreateRanges([SUP - 60, SUP - 50], [SUP - 30, SUP - 20], [SUP - 10, SUP]), SUP - 25)).to.eql(2);
        expect(domain_rangeIndexOfArr(specDomainCreateRanges([SUP - 60, SUP - 50], [SUP - 30, SUP - 20], [SUP - 10, SUP]), SUP - 5)).to.eql(4);
      });
    });

    describe('should return NOT_FOUND if domain does not contain value', function() {

      it('empty array', function() {
        expect(domain_rangeIndexOfArr([], 0)).to.eql(NOT_FOUND);
      });

      it('one range in domain', function() {
        expect(domain_rangeIndexOfArr(specDomainCreateRange(SUP - 10, SUP), SUP - 25)).to.eql(NOT_FOUND);
      });

      it('multiple ranges in domain', function() {
        expect(domain_rangeIndexOfArr(specDomainCreateRanges([SUP - 60, SUP - 50], [SUP - 30, SUP - 20], [SUP - 10, SUP]), SUP - 15)).to.eql(NOT_FOUND);
      });
    });
  });

  describe('domain_isValue', function() {

    it('should exist', function() {
      expect(domain_isValue).to.be.a('function');
    });

    it('should require a domain', function() {
      expect(() => domain_isValue()).to.throw('A_EXPECTING_DOMAIN');
    });

    describe('with array', function() {

      it('should return false if domain is empty', function() {
        expect(domain_isValue([])).to.equal(false);
      });

      it('should be able to check without arg (but return false)', function() {
        expect(domain_isValue(specDomainCreateEmpty())).to.equal(false);
      });

      it('should return false if only range is not one value', function() {
        expect(domain_isValue(specDomainCreateRange(110, 120), 110)).to.equal(false);
      });

      it('should return true if the only range is given value', function() {
        expect(domain_isValue(specDomainCreateRange(SUP, SUP), SUP)).to.equal(true);
        expect(domain_isValue(specDomainCreateRange(SUP - 1, SUP - 1), SUP - 1)).to.equal(true);
        expect(domain_isValue(specDomainCreateRange(SUP - 10, SUP - 10), SUP - 10)).to.equal(true);
        expect(domain_isValue(specDomainCreateRange(SUP - 527, SUP - 527), SUP - 527)).to.equal(true);
      });

      it('should return false if value does not match', function() {
        expect(domain_isValue(specDomainCreateRanges([SUP, SUP]), SUP - 1), 'value 0').to.equal(false);
        expect(domain_isValue(specDomainCreateRanges([SUP - 1, SUP]), SUP), 'bool domain 0').to.equal(false);
        expect(domain_isValue(specDomainCreateRanges([SUP - 1, SUP]), SUP), 'bool domain 1').to.equal(false);
        expect(domain_isValue(specDomainCreateRanges([SUP - 1, SUP - 1]), SUP), 'value 1').to.equal(false);
        expect(domain_isValue(specDomainCreateRanges([SUP - 50, SUP - 50]), SUP - 25), 'value 50').to.equal(false);
      });

      it('should not even consider domains when range count isnt 1', function() {
        expect(domain_isValue(specDomainCreateEmpty()), 'empty').to.equal(false);
        expect(domain_isValue(specDomainCreateRanges([SUP - 3, SUP - 3], [SUP - 1, SUP - 1]), SUP - 1), 'first range 1 with second range').to.equal(false);
        expect(domain_isValue(specDomainCreateRanges([SUP - 3, SUP - 3], [SUP - 1, SUP - 1]), SUP - 3), 'first range 1 with second range 3').to.equal(false);
        expect(domain_isValue(specDomainCreateRanges([SUP - 50, SUP - 50], [SUP - 20, SUP - 10]), SUP - 50), 'two ranges').to.equal(false);
      });
    });

    describe('with number', function() {

      it('should return false if domain is empty', function() {
        expect(domain_isValue(specDomainSmallEmpty(), 12)).to.equal(false);
      });

      it('should be able to check without arg (but return false)', function() {
        expect(domain_isValue(specDomainSmallEmpty())).to.equal(false);
      });

      it('should return false if domain has multiple values and one matches', function() {
        expect(domain_isValue(specDomainSmallNums(5, 8, 10), 10)).to.equal(false);
      });

      it('should return true if domain has one value and it is the given value', function() {
        expect(domain_isValue(specDomainSmallNums(0), 0)).to.equal(true);
        expect(domain_isValue(specDomainSmallNums(1), 1)).to.equal(true);
        expect(domain_isValue(specDomainSmallNums(10), 10)).to.equal(true);
        expect(domain_isValue(specDomainSmallNums(15), 15)).to.equal(true);
      });

      it('should return false if domain does not match', function() {
        expect(domain_isValue(specDomainSmallNums(0), 1), 'value 0').to.equal(false);
        expect(domain_isValue(specDomainSmallNums(0, 1), 0), 'bool domain 0').to.equal(false);
        expect(domain_isValue(specDomainSmallNums(0, 1), 1), 'bool domain 1').to.equal(false);
        expect(domain_isValue(specDomainSmallNums(1), 0), 'value 1').to.equal(false);
        expect(domain_isValue(specDomainSmallNums(15), 13), 'value 15').to.equal(false);
      });

      it('should handle values that are OOB for small domains', function() {
        expect(domain_isValue(specDomainSmallNums(8), -1)).to.equal(false);
        expect(domain_isValue(specDomainSmallNums(8), 16)).to.equal(false);
        expect(domain_isValue(specDomainSmallNums(8), 300)).to.equal(false);
      });
    });
  });

  describe('domain_removeValue', function() {

    it('should exist', function() {
      expect(domain_removeValue).to.be.a('function');
    });

    it('should reject an invalid value', function() { // (only numbers are valid values)
      expect(() => domain_removeValue(EMPTY, '15')).to.throw('CAN_ONLY_REMOVE_VALUES');
    });

    describe('with array', function() {

      it('should require a domain', function() {
        expect(() => domain_removeValue(null, 15)).to.throw('EXPECTING_DOMAIN');
      });

      // target: 5
      // 012 456 89 -> 012 4 6 89
      // 012 567    -> 012 67
      // 01 345     -> 01 34
      // 01 345 89  -> 01 34 89
      // 012 5 789  -> 012 789
      // 5 789      -> 789
      // 012 5      -> 012
      // 789        -> 789
      // 012        -> 012
      // 5          -> empty
      // empty      -> empty

      function test(domain, value, output) {
        it(`should remove [${value}] from [${domain}] resulting in [${output}]`, function() {
          let clone = domain_clone(domain);
          let result = domain_removeValue(domain_clone(domain), value);

          expect(domain, 'should not change').to.eql(clone);
          expect(result).to.eql(output);
        });
      }

      test(specDomainCreateRanges([100, 102], [104, 106], [108, 109]), 105, specDomainCreateRanges([100, 102], [104, 104], [106, 106], [108, 109]));
      test(specDomainCreateRanges([100, 102], [104, 106]), 105, specDomainCreateRanges([100, 102], [104, 104], [106, 106]));
      test(specDomainCreateRanges([100, 101], [103, 105]), 105, specDomainCreateRanges([100, 101], [103, 104]));
      test(specDomainCreateRanges([100, 101], [103, 105], [108, 109]), 105, specDomainCreateRanges([100, 101], [103, 104], [108, 109]));
      test(specDomainCreateRanges([100, 102], [105, 105], [107, 109]), 105, specDomainCreateRanges([100, 102], [107, 109]));
      test(specDomainCreateRanges([105, 105], [107, 109]), 105, specDomainCreateRanges([107, 109]));
      test(specDomainCreateRanges([100, 102], [105, 105]), 105, specDomainCreateRanges([100, 102]));
      test(specDomainCreateRanges([107, 109]), 105, specDomainCreateRanges([107, 109]));
      test(specDomainCreateRanges([100, 102]), 105, specDomainCreateRanges([100, 102]));
      test(specDomainCreateRanges([105, 105]), 105, specDomainCreateEmpty(true));
    });

    describe('with numbers', function() {

      // target: 5
      // 012 456 89 -> 012 4 6 89
      // 012 567    -> 012 67
      // 01 345     -> 01 34
      // 01 345 89  -> 01 34 89
      // 012 5 789  -> 012 789
      // 5 789      -> 789
      // 012 5      -> 012
      // 789        -> 789
      // 012        -> 012
      // 5          -> empty
      // empty      -> empty

      function test(domain, value, output) {
        it(`should remove [${value}] from [${domain}] resulting in [${output}]`, function() {
          expect(domain_removeValue(domain, value)).to.eql(output);
        });
      }

      test(specDomainSmallNums(0, 1, 2, 4, 5, 6, 8, 9), 5, specDomainSmallNums(0, 1, 2, 4, 6, 8, 9));
      test(specDomainSmallNums(0, 1, 2, 4, 5, 6), 5, specDomainSmallNums(0, 1, 2, 4, 6));
      test(specDomainSmallNums(0, 1, 3, 4, 5), 5, specDomainSmallNums(0, 1, 3, 4));
      test(specDomainSmallNums(0, 1, 3, 4, 5, 8, 9), 5, specDomainSmallNums(0, 1, 3, 4, 8, 9));
      test(specDomainSmallNums(0, 1, 2, 5, 7, 8, 9), 5, specDomainSmallNums(0, 1, 2, 7, 8, 9));
      test(specDomainSmallNums(5, 7, 8, 9), 5, specDomainSmallNums(7, 8, 9));
      test(specDomainSmallNums(0, 1, 2, 5), 5, specDomainSmallNums(0, 1, 2));
      test(specDomainSmallNums(7, 8, 9), 5, specDomainSmallNums(7, 8, 9));
      test(specDomainSmallNums(0, 1, 2), 5, specDomainSmallNums(0, 1, 2));
      test(specDomainSmallNums(5), 5, specDomainSmallNums());
    });
  });

  describe('domain_isSimplified', function() {

    it('should exist', function() {
      // exposed for testing only
      expect(domain_isSimplified).to.be.a('function');
    });

    it('should require a domain', function() {
      expect(() => domain_isSimplified()).to.throw('A_EXPECTING_DOMAIN');
    });

    it('should throw for domains as numbers', function() {
      expect(_ => domain_isSimplified(specDomainSmallNums(1))).to.throw('NOT_USED_WITH_NUMBERS');
    });

    it('should accept empty domain', function() {
      expect(domain_isSimplified([])).to.equal(true);
    });

    describe('single ranged domain', function() {

      it('should accept domain with proper range', function() {
        expect(domain_isSimplified(specDomainCreateRange(80, 90))).to.equal(true);
      });

      it('should accept domain with proper range of 1', function() {
        expect(domain_isSimplified(specDomainCreateRange(90, 90))).to.equal(true);
      });

      it('should reject domain with inverted range', function() {
        expect(() => domain_isSimplified(specDomainCreateRange(91, 90))).to.throw('A_RANGES_SHOULD_ASCEND');
      });
    });

    describe('multiple ranges in domain', function() {

      it('should accept multiple properly ordered non-overlapping ranges', function() {
        expect(domain_isSimplified(specDomainCreateRanges([95, 910], [915, 920]))).to.equal(true);
        //expect(domain_isSimplified specDomainCreateRanges([5, 6], [7, 8], [9, 10])).to.equal(true);
        //expect(domain_isSimplified specDomainCreateRanges([5, 6], [7, 8], [9, 10], [100, 200])).to.equal(true);
      });

      it('should throw if two ranges overlap despite ordering', function() {
        expect(domain_isSimplified(specDomainCreateRanges([910, 915], [913, 919], [950, 960]))).to.equal(false); // start
        expect(domain_isSimplified(specDomainCreateRanges([91, 93], [910, 915], [913, 919], [970, 975]))).to.equal(false); // middle
        expect(domain_isSimplified(specDomainCreateRanges([91, 93], [910, 915], [916, 919], [918, 925]))).to.equal(false); //end
      });

      it('should reject if two ranges touch', function() {
        expect(domain_isSimplified(specDomainCreateRanges([90, 91], [91, 92]))).to.equal(false);
      });

      it('should reject if at least one range is inverted', function() {
        expect(() => domain_isSimplified(specDomainCreateRanges([915, 910], [940, 950], [955, 960]))).to.throw('A_RANGES_SHOULD_ASCEND'); // start
        expect(() => domain_isSimplified(specDomainCreateRanges([910, 915], [950, 940], [955, 960]))).to.throw('A_RANGES_SHOULD_ASCEND'); // middle
        expect(() => domain_isSimplified(specDomainCreateRanges([910, 915], [940, 950], [965, 960]))).to.throw('A_RANGES_SHOULD_ASCEND'); // end
      });
    });
  });

  describe('domain_min', function() {

    it('should exist', function() {
      expect(domain_min).to.be.a('function');
    });

    it('with array', function() {
      expect(domain_min(specDomainCreateRanges([0, 10], [100, 300]))).to.eql(0);
      expect(domain_min(specDomainCreateRanges([0, 10], [100, SUP]))).to.eql(0);
      expect(domain_min(specDomainCreateRanges([1, 1], [100, SUP]))).to.eql(1);
      expect(domain_min(specDomainCreateRanges([100, 100]))).to.eql(100);
      expect(domain_min(specDomainCreateRanges([SUP, SUP]))).to.eql(SUP);
      expect(domain_min(specDomainCreateRanges([SUP - 1, SUP]))).to.eql(SUP - 1);
    });

    it('with number', function() {
      for (let i = 0; i <= SMALL_MAX_NUM; ++i) {
        // basically trying each small domain range from [0,30] to [30,30]
        expect(domain_min(specDomainSmallNums(i)), i + ' | i').to.eql(i);
        expect(domain_min(specDomainSmallNums(i, 30)), i + ' | 30').to.eql(i);
      }
    });
  });

  describe('domain_max', function() {

    it('should exist', function() {
      expect(domain_max).to.be.a('function');
    });

    it('with array', function() {
      expect(domain_max(specDomainCreateRanges([0, 10], [100, 300]))).to.eql(300);
      expect(domain_max(specDomainCreateRanges([0, 10], [100, SUP]))).to.eql(SUP);
      expect(domain_max(specDomainCreateRanges([1, 1], [100, SUP]))).to.eql(SUP);
      expect(domain_max(specDomainCreateRanges([100, 100]))).to.eql(100);
      expect(domain_max(specDomainCreateRanges([SUP, SUP]))).to.eql(SUP);
      expect(domain_max(specDomainCreateRanges([SUP - 1, SUP]))).to.eql(SUP);
    });

    it('with number', function() {
      for (let i = 0; i <= SMALL_MAX_NUM; ++i) {
        // basically trying each small domain range from [0,30] to [30,30]
        expect(domain_max(specDomainSmallNums(0, i)), '0 | ' + i).to.eql(i);
      }
    });
  });

  describe('domain_mergeOverlappingInline', function() {

    it('should exist', function() {
      expect(_domain_mergeOverlappingInline).to.be.a('function');
    });

    it('should throw for domains as numbers', function() {
      expect(_ => _domain_mergeOverlappingInline(specDomainSmallNums(1))).to.throw('NOT_USED_WITH_NUMBERS');
    });

    describe('empty domain', function() {

      it('should return empty array for empty domain', function() {
        expect(_domain_mergeOverlappingInline(specDomainCreateEmpty())).to.eql(specDomainCreateEmpty());
      });

      it('should return same array', function() {
        let arr = specDomainCreateEmpty();

        expect(_domain_mergeOverlappingInline(arr)).to.equal(arr);
      });
    });

    describe('non-empty domain', function() {

      describe('return value', function() {

        it('should be same array if unchanged', function() {
          let arr = specDomainCreateRanges([90, 91], [910, 920], [930, 940]);

          expect(_domain_mergeOverlappingInline(arr)).to.equal(arr);
          expect(arr).to.eql(specDomainCreateRanges([90, 91], [910, 920], [930, 940]));
        });

        it('should be same array if changed', function() {
          let arr = specDomainCreateRanges([90, 91], [910, 920], [920, 940]);

          expect(_domain_mergeOverlappingInline(arr)).to.equal(arr);
          expect(arr).to.eql(specDomainCreateRanges([90, 91], [910, 940]));
        });

        it('should be same array for single range', function() {
          let arr = specDomainCreateRange(90, 91);

          expect(_domain_mergeOverlappingInline(arr)).to.equal(arr);
          expect(arr).to.eql(specDomainCreateRange(90, 91));
        });
      });

      it('should return same range for single range domain', function() {
        expect(_domain_mergeOverlappingInline(specDomainCreateRange(910, 9100))).to.eql(specDomainCreateRange(910, 9100));
        expect(_domain_mergeOverlappingInline(specDomainCreateRange(930, 9213))).to.eql(specDomainCreateRange(930, 9213));
        expect(_domain_mergeOverlappingInline(specDomainCreateRange(90, 91))).to.eql(specDomainCreateRange(90, 91));
      });

      it('should return same if not overlapping', function() {
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([910, 9100], [9200, 9300]))).to.eql(specDomainCreateRanges([910, 9100], [9200, 9300]));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 90], [92, 92]))).to.eql(specDomainCreateRanges([90, 90], [92, 92]));
      });

      it('should merge if two domains overlap', function() {
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 91], [91, 92]))).to.eql(specDomainCreateRange(90, 92));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 950], [925, 975]))).to.eql(specDomainCreateRange(90, 975));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([9213, 9278], [9244, 9364]))).to.eql(specDomainCreateRange(9213, 9364));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([910, 920], [930, 940], [935, 945], [950, 960]))).to.eql(specDomainCreateRanges([910, 920], [930, 945], [950, 960]));
      });

      it('should merge if two domains touch', function() {
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 90], [91, 91]))).to.eql(specDomainCreateRange(90, 91));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 91], [92, 93]))).to.eql(specDomainCreateRange(90, 93));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 910], [910, 920]))).to.eql(specDomainCreateRange(90, 920));
      });

      it('should chain merges', function() {
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 90], [91, 91], [92, 92]))).to.eql(specDomainCreateRange(90, 92));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 91], [91, 92], [92, 93]))).to.eql(specDomainCreateRange(90, 93));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 90], [91, 92], [92, 93]))).to.eql(specDomainCreateRange(90, 93));
      });

      it('should make sure resulting range wraps both ranges', function() {
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 90], [90, 91]))).to.eql(specDomainCreateRange(90, 91));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 91], [90, 90]))).to.eql(specDomainCreateRange(90, 91));
        expect(_domain_mergeOverlappingInline(specDomainCreateRanges([90, 910], [914, 916], [915, 920], [916, 919], [917, 918]))).to.eql(specDomainCreateRanges([90, 910], [914, 920]));
      });
    });
  });

  describe('domain_simplifyInline', function() {

    describe('should exist', function() {

      it('domain_simplifyInline', function() {
        expect(domain_simplifyInlineArr).to.be.a('function');
      });
    });

    it('should throw for domains as numbers', function() {
      expect(_ => domain_simplifyInlineArr(specDomainSmallNums(1))).to.throw('NOT_USED_WITH_NUMBERS');
    });

    it('should throw without a domain', function() {
      expect(() => domain_simplifyInlineArr()).to.throw('DOMAIN_REQUIRED');
    });

    it('should work with empty domain', function() {
      let arr = [];

      expect(domain_simplifyInlineArr(arr)).to.equal(arr);
    });

    it('should work with single ranged domain', function() {
      let arr = specDomainCreateRange(90, 91);

      expect(domain_simplifyInlineArr(arr)).to.equal(arr);
    });

    it('should work if domain is not changed', function() {
      let arr = specDomainCreateRanges([91, 92], [920, 930]);

      expect(domain_simplifyInlineArr(arr)).to.equal(arr);
    });

    it('should work if domain is changed', function() {
      let arr = specDomainCreateRanges([91, 92], [92, 93]);

      expect(domain_simplifyInlineArr(arr)).to.equal(arr);
      expect(arr).to.eql(specDomainCreateRange(91, 93));
    });

    it('should merge unordered overlapping ranges', () =>
      // properly tested in sub-function
      expect(domain_simplifyInlineArr(specDomainCreateRanges([92, 93], [91, 92]))).to.eql(specDomainCreateRange(91, 93))
    );
  });

  describe('domain_intersection', function() {

    it('should exist', function() {
      expect(domain_intersection).to.be.a('function');
    });

    it('should require two domains', function() {
      expect(() => domain_intersection()).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_intersection([])).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_intersection(null, [])).to.throw('A_EXPECTING_TWO_DOMAINS');
    });

    describe('with array', function() {

      it('should handle empty domains', function() {
        expect(domain_intersection([], [])).to.eql(EMPTY);
      });

      it('should return a fresh array', function() {
        let arr1 = [];
        let arr2 = [];
        let out = domain_intersection(arr1, arr2);

        expect(arr1).to.not.equal(out);
        expect(arr2).to.not.equal(out);
      });

      it('should handle empty domain with single element domain', function() {
        expect(domain_intersection(specDomainCreateEmpty(), specDomainCreateRange(90, 91))).to.eql(EMPTY);
      });

      it('should handle empty domain with multi element domain', function() {
        expect(domain_intersection(specDomainCreateEmpty(), specDomainCreateRanges([90, 91], [93, 95]))).to.eql(EMPTY);
      });

      it('should handle single element domain with empty domain', function() {
        expect(domain_intersection(specDomainCreateRange(90, 91), specDomainCreateEmpty())).to.eql(EMPTY);
      });

      it('should handle single element domain with empty domain', function() {
        expect(domain_intersection(specDomainCreateRanges([90, 91], [93, 95]), specDomainCreateEmpty())).to.eql(EMPTY);
      });

      it('should handle single element domains', function() {
        expect(domain_intersection(specDomainCreateRange(90, 91), specDomainCreateRange(93, 95))).to.eql(EMPTY);
      });

      it('should intersect single element domains', function() {
        expect(domain_intersection(specDomainCreateRange(90, 95), specDomainCreateRange(93, 100))).to.eql(specDomainCreateRange(93, 95));
      });

      it('should intersect single element domains reversed', function() {
        expect(domain_intersection(specDomainCreateRange(93, 100), specDomainCreateRange(90, 95))).to.eql(specDomainCreateRange(93, 95));
      });

      it('should handle single element domain with multi element domain', function() {
        expect(domain_intersection(specDomainCreateRange(90, 91), specDomainCreateRanges([10, 20], [30, 40]))).to.eql(EMPTY);
      });

      it('should handle multi element domain with single element domain', function() {
        expect(domain_intersection(specDomainCreateRanges([0, 1], [10, 120]), specDomainCreateRange(130, 140))).to.eql(EMPTY);
      });

      it('should intersect single element domain with multi element domain', function() {
        expect(domain_intersection(specDomainCreateRange(5, 16, true), specDomainCreateRanges([10, 20], [30, 40]))).to.eql(specDomainSmallRange(10, 16, true));
      });

      it('should intersect multi element domain with single element domain', function() {
        expect(domain_intersection(specDomainCreateRanges([0, 1], [25, 35]), specDomainCreateRange(30, 40))).to.eql(specDomainCreateRange(30, 35));
      });

      it('should handle multi element domains', function() {
        expect(domain_intersection(specDomainCreateRanges([0, 1], [10, 120]), specDomainCreateRanges([130, 140], [150, 160]))).to.eql(EMPTY);
      });

      it('should intersect multi element domains', function() {
        expect(domain_intersection(specDomainCreateRanges([0, 1], [10, 35]), specDomainCreateRanges([30, 40], [50, 60]))).to.eql(specDomainCreateRange(30, 35));
      });

      it('should return two ranges if a range in one domain intersects with two ranges of the other domain', function() {
        expect(domain_intersection(specDomainCreateRange(15, 35), specDomainCreateRanges([10, 20], [30, 40]))).to.eql(specDomainCreateRanges([15, 20], [30, 35]));
      });

      it('should divide and conquer some random tests 1', function() {
        // copy(JSON.stringify(function f(n) {
        //   var arr = [];
        //   while (--n > 0) {
        //     var t = Math.floor(Math.random() * 100);
        //     arr.push(t, t+Math.floor(Math.random() * 20));
        //   }
        //   return arr;
        // }(10).map(function(a){
        //   return [Math.min(a[0],a[1]), Math.max(a[0], a[1])];
        // })).replace(/,/g, ', '))

        let a = specDomainCreateRanges([10, 23], [29, 38], [49, 49], [54, 68], [77, 78], [84, 100]);
        let b = specDomainCreateRanges([1, 1], [3, 21], [25, 38], [54, 67], [70, 84], [88, 107]);

        expect(domain_intersection(a, b)).to.eql(specDomainCreateRanges([10, 21], [29, 38], [54, 67], [77, 78], [84, 84], [88, 100]));
      });

      it('should divide and conquer some random tests 2', function() {
        let a = specDomainCreateRanges([17, 23], [37, 78], [85, 104]);
        let b = specDomainCreateRanges([6, 25], [47, 56], [58, 60], [64, 67], [83, 103]);

        expect(domain_intersection(a, b)).to.eql(specDomainCreateRanges([17, 23], [47, 56], [58, 60], [64, 67], [85, 103]));
      });

      it('should divide and conquer some random tests 3', function() {
        let a = specDomainCreateRanges([9, 36], [54, 66], [74, 77], [84, 96]);
        let b = specDomainCreateRange(1, 75);

        expect(domain_intersection(a, b)).to.eql(specDomainCreateRanges([9, 36], [54, 66], [74, 75]));
      });
    });

    describe('with number', function() {

      it('should handle empty domains', function() {
        expect(domain_intersection(specDomainSmallEmpty(), [])).to.eql(EMPTY);
      });

      it('should return a small domain', function() {
        let arr1 = specDomainSmallEmpty();
        let arr2 = specDomainSmallEmpty();
        let out = domain_intersection(arr1, arr2);

        expect(out).to.equal(specDomainSmallEmpty());
      });

      it('should handle empty domain with single element domain', function() {
        expect(domain_intersection(specDomainSmallEmpty(), specDomainSmallRange(0, 1))).to.eql(specDomainSmallEmpty());
      });

      it('should handle empty domain with multi element domain', function() {
        expect(domain_intersection(specDomainSmallEmpty(), specDomainSmallNums(0, 1, 3, 4, 5))).to.eql(specDomainSmallEmpty());
      });

      it('should handle single element domain with empty domain', function() {
        expect(domain_intersection(specDomainSmallRange(0, 1), specDomainSmallEmpty())).to.eql(specDomainSmallEmpty());
        expect(domain_intersection(specDomainSmallEmpty(), specDomainSmallRange(0, 1))).to.eql(specDomainSmallEmpty());
        expect(domain_intersection(specDomainSmallNums(0, 1, 3, 4, 5), specDomainSmallEmpty())).to.eql(specDomainSmallEmpty());
        expect(domain_intersection(specDomainSmallEmpty(), specDomainSmallNums(0, 1, 3, 4, 5))).to.eql(specDomainSmallEmpty());
      });

      it('should handle single element domains', function() {
        expect(domain_intersection(specDomainSmallRange(0, 1), specDomainSmallRange(3, 5))).to.eql(specDomainSmallEmpty());
        expect(domain_intersection(specDomainSmallRange(3, 5), specDomainSmallRange(0, 1))).to.eql(specDomainSmallEmpty());
      });

      it('should intersect single element domains', function() {
        expect(domain_intersection(specDomainSmallRange(0, 5), specDomainSmallRange(3, 10))).to.eql(specDomainSmallRange(3, 5));
        expect(domain_intersection(specDomainSmallRange(3, 10), specDomainSmallRange(0, 5))).to.eql(specDomainSmallRange(3, 5));
      });

      it('should handle single element domain with multi element domain', function() {
        expect(domain_intersection(specDomainSmallRange(10, 15), specDomainSmallRange(0, 1))).to.eql(specDomainSmallEmpty());
        expect(domain_intersection(specDomainSmallRange(0, 1), specDomainSmallRange(10, 15))).to.eql(specDomainSmallEmpty());
      });

      it('should handle multi element domain with single element domain', function() {
        expect(domain_intersection(specDomainSmallNums(5, 6, 7), specDomainSmallNums(0, 1, 10, 11, 12, 13, 14, 15))).to.eql(specDomainSmallEmpty());
        expect(domain_intersection(specDomainSmallNums(0, 1, 10, 11, 12, 13, 14, 15), specDomainSmallNums(5, 6, 7))).to.eql(specDomainSmallEmpty());
      });

      it('should intersect single element domain with multi element domain', function() {
        expect(domain_intersection(specDomainSmallNums(0, 1, 10, 11, 12, 13, 14, 15), specDomainSmallRange(5, 15))).to.eql(specDomainSmallRange(10, 15));
        expect(domain_intersection(specDomainSmallRange(5, 15), specDomainSmallNums(0, 1, 10, 11, 12, 13, 14, 15))).to.eql(specDomainSmallRange(10, 15));
      });

      it('should return two ranges if a range in one domain intersects with two ranges of the other domain', function() {
        expect(domain_intersection(specDomainSmallRange(5, 10), specDomainSmallNums(4, 5, 6, 9, 10, 11))).to.eql(specDomainSmallNums(5, 6, 9, 10));
        expect(domain_intersection(specDomainSmallNums(4, 5, 6, 9, 10, 11), specDomainSmallRange(5, 10))).to.eql(specDomainSmallNums(5, 6, 9, 10));
      });
    });
  });

  describe('domain_equal', function() {

    it('should exist', function() {
      expect(domain_isEqual).to.be.a('function');
    });

    describe('with arrays', function() {

      it('should return false unconditionally if domain lengths are unequal', function() {
        expect(domain_isEqual(specDomainCreateEmpty(), specDomainCreateRange(91, 910))).to.equal(false);
        expect(domain_isEqual(specDomainCreateRange(91, 100), specDomainCreateEmpty())).to.equal(false);
        expect(domain_isEqual(specDomainCreateRanges([91, 91], [100, 100]), specDomainCreateRange(91, 91))).to.equal(false);
      });

      it('should be able to compare single element domains', function() {
        expect(domain_isEqual(specDomainCreateRange(32, 84), specDomainCreateRange(32, 84))).to.equal(true);
      });

      it('should return true for same reference', function() {
        let domain = specDomainCreateRange(32, 84);

        expect(domain_isEqual(domain, domain)).to.equal(true);
      });

      it('should reject if any bound is different', function() {
        expect(domain_isEqual(specDomainCreateRange(1, 84), specDomainCreateRange(32, 84))).to.equal(false);
        expect(domain_isEqual(specDomainCreateRange(1, 84), specDomainCreateRange(1, 34))).to.equal(false);
        expect(domain_isEqual(specDomainCreateRange(32, 100), specDomainCreateRange(132, 184))).to.equal(false);
      });

      it('should be able to deep comparison accept', function() {
        let A = specDomainCreateRanges([1, 1], [3, 21], [25, 38], [54, 67], [70, 84], [88, 107]);
        let B = specDomainCreateRanges([1, 1], [3, 21], [25, 38], [54, 67], [70, 84], [88, 107]);
        expect(domain_isEqual(A, B)).to.equal(true);
      });

      it('should be able to deep comparison reject', function() {
        let A = specDomainCreateRanges([1, 1], [3, 21], [26, 39], [54, 67], [70, 84], [88, 107]);
        let B = specDomainCreateRanges([1, 1], [3, 21], [25, 38], [54, 67], [70, 84], [88, 107]);

        expect(domain_isEqual(A, B)).to.equal(false);
      });
    });

    describe('with numbers', function() {

      it('should do a direct comparison if both args are numbers', function() {
        let A = specDomainSmallNums(2, 3, 6, 7, 8);
        let B = specDomainSmallNums(2, 3, 6, 7, 8);

        expect(domain_isEqual(A, B)).to.equal(true);
      });

      it('should do a direct comparison if both args are numbers', function() {
        let A = specDomainSmallNums(2, 3, 6, 7, 8);
        let B = specDomainSmallNums(1, 3, 6, 7, 8);

        expect(domain_isEqual(A, B)).to.equal(false);
      });
    });
  });

  describe('domain_complement', function() {

    it('should exist', function() {
      expect(domain_complement).to.be.a('function');
      expect(SUP).to.be.a('number');
    });

    it('should require a domain', function() {
      expect(() => domain_complement()).to.throw('A_EXPECTING_A_DOMAIN');
    });

    describe('with array', function() {

      it('should throw for an empty array', function() {
        expect(_ => domain_complement([])).to.throw('EMPTY_DOMAIN_PROBABLY_BUG');
      });

      it('should invert a domain', function() {
        let A = specDomainCreateRanges([5, 10], [100, 200]);
        let E = specDomainCreateRanges([0, 4], [11, 99], [201, SUP]);

        expect(domain_complement(A)).to.eql(E);
      });

      it('should handle domains starting at 0 properly', function() {
        let A = specDomainCreateRange(0, 100);
        let E = specDomainCreateRanges([101, SUP]);

        expect(domain_complement(A)).to.eql(E);
      });

      it('should handle domains ending at SUP properly', function() {
        let A = specDomainCreateRanges([100, SUP]);
        let E = specDomainCreateRange(0, 99);

        expect(domain_complement(A)).to.eql(E);
      });

      it('should handle domains starting at 0 and ending at SUP properly', function() {
        let A = specDomainCreateRanges([0, 500], [600, 900], [1000, SUP]);
        let E = specDomainCreateRanges([501, 599], [901, 999]);

        expect(domain_complement(A)).to.eql(E);
      });

      it('should add 0 if starting at 1', function() {
        let A = specDomainCreateRange(1, 100);
        let E = specDomainCreateRanges([0, 0], [101, SUP]);

        expect(domain_complement(A)).to.eql(E);
      });

      it('should add SUP if ending at SUP-1', function() {
        let A = specDomainCreateRange(100, SUP - 1);
        let E = specDomainCreateRanges([0, 99], [SUP, SUP]);

        expect(domain_complement(A)).to.eql(E);
      });

      it('should return a fresh array', function() {
        let A = specDomainCreateRanges([10, 23], [29, 38], [49, 49], [54, 68], [77, 78], [84, 100]);

        expect(domain_complement(A)).to.not.equal(A);
      });

      it('should not change the input domain', function() {
        let A = specDomainCreateRanges([10, 23], [29, 38], [49, 49], [54, 68], [77, 78], [84, 100]);
        let E = A.slice(0);

        domain_complement(A);

        expect(A).to.eql(E);
      });

      it('should return same value when applied twice', function() {
        let A = specDomainCreateRanges([10, 23], [29, 38], [49, 49], [54, 68], [77, 78], [84, 100]);
        let E = A.slice(0);

        expect(domain_complement(domain_complement(A))).to.eql(E);
      });
    });

    describe('with numbers', function() {

      it('should throw for an empty array', function() {
        let A = specDomainSmallEmpty();

        expect(_ => domain_complement(A)).to.throw('EMPTY_DOMAIN_PROBABLY_BUG');
      });

      it('should invert a domain', function() {
        let A = specDomainSmallRange(5, 10);
        let E = specDomainCreateRanges([0, 4], [11, SUP]);

        expect(domain_complement(A)).to.eql(E);
      });

      it('should handle domains starting at 0 properly', function() {
        let A = specDomainSmallRange(0, 11);
        let E = specDomainCreateRanges([12, SUP]);

        expect(domain_complement(A)).to.eql(E);
      });

      it.skip('should handle domains ending at SUP properly', function() {
        let A = specDomainCreateRanges([10, SUP]);
        let E = specDomainSmallRange(0, 9);

        expect(domain_complement(A)).to.eql(E);
      });

      it.skip('should handle domains starting at 0 and ending at SUP properly', function() {
        let A = specDomainCreateRanges([0, 5], [10, SUP]);
        let E = specDomainSmallRange(6, 9);

        expect(domain_complement(A)).to.eql(E);
      });

      it('should add 0 if starting at 1', function() {
        let A = specDomainSmallRange(1, 10);
        let E = specDomainCreateRanges([0, 0], [11, SUP]);

        expect(domain_complement(A)).to.eql(E);
      });

      it.skip('should return same value when applied twice', function() {
        let A = specDomainSmallRange(3, 8);

        expect(domain_complement(domain_complement(A))).to.eql(A); // should be a "pure function" https://en.wikipedia.org/wiki/Pure_function
      });
    });
  });

  // TOFIX
  describe.skip('domain_closeGapsInline', function() {

    it('should exist', function() {
      expect(domain_closeGapsInline).to.be.a('function');
    });

    it('should requires two domains', function() {
      expect(() => domain_closeGapsInline()).to.throw('fixme');
      expect(() => domain_closeGapsInline([])).to.throw('fixme');
      expect(() => domain_closeGapsInline(undefined, [])).to.throw('fixme');
    });

    it('should accept empty domains', function() {
      expect(domain_closeGapsInline([], [])).to.eql(undefined);
    });

    it('should not change anything if left domain is empty', function() {
      let a = [];
      let b = specDomainCreateRanges([10, 23], [29, 38], [49, 49], [54, 68], [77, 78], [84, 100]);
      let a_clone = a.slice(0);
      let b_clone = b.slice(0);

      expect(domain_closeGapsInline(a, b)).to.eql(undefined);
      expect(a).to.eql(a_clone);
      expect(b).to.eql(b_clone);
    });

    it('should not change anything if right domain is empty', function() {
      let a = specDomainCreateRanges([10, 23], [29, 38], [49, 49], [54, 68], [77, 78], [84, 100]);
      let b = [];
      let a_clone = a.slice(0);
      let b_clone = b.slice(0);

      expect(domain_closeGapsInline(a, b)).to.eql(undefined);
      expect(a).to.eql(a_clone);
      expect(b).to.eql(b_clone);
    });

    it('should close gaps in right domain of len of only range in left domain', function() {
      let a = specDomainCreateRange(10, 20); // note: len is 11 because ranges are inclusive
      let b = specDomainCreateRanges([100, 110], [120, 200], [300, 310], [321, 400]); // both gaps should be closed

      expect(domain_closeGapsInline(a, b)).to.eql(undefined);
      expect(a).to.eql(specDomainCreateRange(10, 20)); // had no gaps to close
      expect(b).to.eql(specDomainCreateRanges([100, 200], [300, 400]));
    });

    it('should not close bigger gaps', function() {
      let a = specDomainCreateRange(10, 20); // note: len is 11 because ranges are inclusive
      let b = specDomainCreateRanges([300, 310], [322, 400]); // gap is 12

      expect(domain_closeGapsInline(a, b)).to.eql(undefined);
      expect(a).to.eql(specDomainCreateRange(10, 20));
      expect(b).to.eql(specDomainCreateRanges([300, 310], [322, 400]));
    });

    it('should close gaps in left domain of len of only range in right domain', function() {
      let a = specDomainCreateRanges([100, 110], [120, 200], [300, 310], [321, 400]); // both gaps should be closed
      let b = specDomainCreateRange(10, 20); // note: len is 11 because ranges are inclusive

      expect(domain_closeGapsInline(a, b)).to.eql(undefined);
      expect(a).to.eql(specDomainCreateRanges([100, 200], [300, 400]));
      expect(b).to.eql(specDomainCreateRange(10, 20)); // had no gaps to close
    });

    it('should close gaps in left and right', function() {
      let a = specDomainCreateRanges([100, 110], [120, 200], [300, 310], [321, 400]); // both gaps should be closed
      let b = specDomainCreateRange(10, 20); // note: len is 11 because ranges are inclusive

      expect(domain_closeGapsInline(a, b)).to.eql(undefined);
      expect(a).to.eql(specDomainCreateRanges([100, 200], [300, 400]));
      expect(b).to.eql(specDomainCreateRange(10, 20)); // had no gaps to close
    });

    return it('should revisit domains after one (double) cycle if min size grew', function() {
      let a = specDomainCreateRanges([1, 2], [4, 5], [8, 900]);
      let b = specDomainCreateRanges([1, 2], [4, 5], [8, 900]);

      expect(domain_closeGapsInline(a, b)).to.eql(undefined);
      // first min size is 2, so 1~2..4~5 is closed but not 4~5-8~900,
      // then min size becomes 5 and 1~5..8~900 is closed.
      // (that holds both ways) so we end up with 1~900
      expect(a).to.eql(specDomainCreateRange(1, 900));
      expect(b).to.eql(specDomainCreateRange(1, 900));
    });
  });

  describe('domain_plus', function() {

    it('should exist', function() {
      expect(domain_plus).to.be.a('function');
    });

    it('should require domains', function() {
      expect(() => domain_plus()).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_plus([])).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_plus(null, [])).to.throw('A_EXPECTING_TWO_DOMAINS');
    });

    it('should accept empty domains', function() {
      expect(domain_plus(specDomainCreateEmpty(), specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));
    });

    it('should accept empty domains', function() {
      expect(domain_plus(specDomainCreateEmpty(), specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));

      let a = [];
      expect(domain_plus(a, specDomainCreateEmpty())).to.not.equal(a);

      a = [];
      expect(domain_plus(specDomainCreateEmpty(), a)).to.not.equal(a);
    });

    describe('with array', function() {

      it('should add two ranges', function() {
        let A = specDomainSmallRange(5, 10);
        let B = specDomainCreateRange(50, 60);
        let E = specDomainCreateRange(55, 70);

        expect(domain_plus(A, B)).to.eql(E);
      });

      it('should add two domains', function() {
        let A = specDomainCreateRanges([5, 10], [20, 35]);
        let B = specDomainCreateRanges([50, 60], [110, 128]);
        let E = specDomainCreateRanges([55, 95], [115, 163]);

        expect(domain_plus(A, B)).to.eql(E);
      });

      it('should add two domains', function() {
        let A = specDomainCreateRanges([0, 1], [4, 12], [15, 17], [100, 100]);
        let B = specDomainCreateRanges([0, 1], [4, 12], [15, 17], [100, 100]);
        let E = specDomainCreateRanges([0, 2], [4, 34], [100, 101], [104, 112], [115, 117], [200, 200]);

        expect(domain_plus(A, B)).to.eql(E);
      });

      it('should not exceed SUP (SUP+1)', function() {
        // since [SUP,SUP] + [1,1] would be [SUP+1,SUP+1] the result is OOB and empty
        // let's hope this never really hurts us irl... but we must have this protection
        // or it may introduce inconsistent domains into the internals, which is bad.
        let A = specDomainCreateValue(SUP);
        let B = specDomainCreateValue(1, true);
        let E = specDomainCreateEmpty(true);

        expect(domain_plus(A, B)).to.eql(E);
      });

      it('should not exceed SUP (1+SUP)', function() {
        // since [1,1] + [SUP,SUP] would be [SUP+1,SUP+1] the result is OOB and empty
        // let's hope this never really hurts us irl... but we must have this protection
        // or it may introduce inconsistent domains into the internals, which is bad.
        let A = specDomainCreateValue(1, true);
        let B = specDomainCreateValue(SUP);
        let E = specDomainCreateEmpty(true);

        expect(domain_plus(A, B)).to.eql(E);
      });
    });
    describe('with numbers', function() {

      it('should add two ranges', function() {
        let A = specDomainSmallRange(5, 10);
        let B = specDomainCreateRange(50, 60);
        let E = specDomainCreateRange(55, 70);

        expect(domain_plus(A, B)).to.eql(E);
      });

      it('should add two domains', function() {
        let A = specDomainCreateRanges([5, 10], [20, 35]);
        let B = specDomainCreateRanges([50, 60], [110, 128]);
        let E = specDomainCreateRanges([55, 95], [115, 163]);

        expect(domain_plus(A, B)).to.eql(E);
      });

      it('should add two domains', function() {
        let A = specDomainSmallNums(0, 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);
        let B = specDomainSmallNums(0, 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);
        let E = specDomainCreateRanges([0, 2], [4, 34]);

        expect(domain_plus(A, B)).to.eql(E);
      });

      it('should add small numbers to a small domain', function() {
        // regression. numbers 0 ~ 3 are hardcoded explicitly, 4+ is loop
        // make sure total does not exceed the small domain cap
        for (let i = 0; i < 7; ++i) {
          for (let j = 0; j < 8; ++j) {
            if (i !== 8 || j !== 8) { // 16
              expect(domain_plus(NUM_TO_FLAG[i], NUM_TO_FLAG[j]), i + ' + ' + j).to.eql(NUM_TO_FLAG[i + j]);
            }
          }
        }
      });
    });
  });

  describe('domain_size', function() {

    it('should exist', function() {
      expect(domain_size).to.be.a('function');
    });

    it('should require a domain', function() {
      expect(_ => domain_size()).to.throw('A_EXPECTING_NONE_EMPTY_DOMAINS');
      expect(_ => domain_size([])).to.throw('A_EXPECTING_NONE_EMPTY_DOMAINS');
      expect(_ => domain_size(0)).to.throw('A_EXPECTING_NONE_EMPTY_DOMAINS');
    });

    describe('with array', function() {

      it('should count the values', function() {
        expect(domain_size(specDomainCreateRanges([0, 1], [4, 12], [115, 117]))).to.equal(14);
      });
    });

    describe('with numbers', function() {

      it('should count the bits', function() {
        expect(domain_size(specDomainSmallNums(2, 5, 7, 9, 11, 12))).to.equal(6);
      });

      it('should count single values for each valid value', function() {
        expect(domain_size(specDomainSmallNums(0))).to.equal(1);
        expect(domain_size(specDomainSmallNums(1))).to.equal(1);
        expect(domain_size(specDomainSmallNums(2))).to.equal(1);
        expect(domain_size(specDomainSmallNums(3))).to.equal(1);
        expect(domain_size(specDomainSmallNums(4))).to.equal(1);
        expect(domain_size(specDomainSmallNums(5))).to.equal(1);
        expect(domain_size(specDomainSmallNums(6))).to.equal(1);
        expect(domain_size(specDomainSmallNums(7))).to.equal(1);
        expect(domain_size(specDomainSmallNums(8))).to.equal(1);
        expect(domain_size(specDomainSmallNums(9))).to.equal(1);
        expect(domain_size(specDomainSmallNums(10))).to.equal(1);
        expect(domain_size(specDomainSmallNums(11))).to.equal(1);
        expect(domain_size(specDomainSmallNums(12))).to.equal(1);
        expect(domain_size(specDomainSmallNums(13))).to.equal(1);
        expect(domain_size(specDomainSmallNums(14))).to.equal(1);
        expect(domain_size(specDomainSmallNums(15))).to.equal(1);
      });

      it('should count entire range', function() {
        expect(domain_size(specDomainSmallRange(0, 15))).to.equal(16);
      });
    });
  });

  describe('domain_mul', function() {

    it('should exist', function() {
      expect(domain_mul).to.be.a('function');
    });

    it('should require domains', function() {
      expect(() => domain_mul()).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_mul([])).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_mul(null, [])).to.throw('A_EXPECTING_TWO_DOMAINS');
    });

    it('should accept empty domains', function() {

      expect(domain_mul(specDomainCreateEmpty(), specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));
      let a = [];
      expect(domain_mul(a, specDomainCreateEmpty())).to.not.equal(a);
      a = [];
      expect(domain_mul(specDomainCreateEmpty(), a)).to.not.equal(a);
    });

    it('should return empty domain if one is empty', function() {

      let a = specDomainSmallNums(0, 1, 4, 5, 7, 8, 10, 11, 12, 15, 16, 17);
      expect(domain_mul(a, specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));
      expect(domain_mul(specDomainCreateEmpty(), a)).to.eql(specDomainCreateEmpty(1));
      expect(domain_mul(specDomainCreateEmpty(), specDomainCreateEmpty())).to.not.equal(specDomainCreateEmpty());
    });

    it('should multiply two ranges', function() {
      let A = specDomainSmallRange(5, 10, true);
      let B = specDomainCreateRange(50, 60);
      let E = specDomainCreateRange(250, 600);

      expect(domain_mul(A, B)).to.eql(E);
    });

    it('should multiply two domains', function() {
      let A = specDomainCreateRanges([5, 10], [20, 35]);
      let B = specDomainCreateRanges([50, 60], [110, 128]);
      let E = specDomainCreateRanges([250, 2100], [2200, 4480]);

      expect(domain_mul(A, B)).to.eql(E);
    });

    it('should multiply two domains', function() {
      let A = specDomainSmallNums(0, 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);
      let B = specDomainSmallNums(0, 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);
      let E = specDomainCreateRanges([0, 204], [225, 289]);

      expect(domain_mul(A, B)).to.eql(E);
    });
  });

  describe('domain_minus', function() {

    it('should exist', function() {
      expect(domain_minus).to.be.a('function');
    });

    it('should require domains', function() {
      expect(() => domain_minus()).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_minus(specDomainCreateEmpty())).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_minus(null, specDomainCreateEmpty())).to.throw('A_EXPECTING_TWO_DOMAINS');
    });

    it('should accept empty domains', function() {
      expect(domain_minus(specDomainCreateEmpty(), specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));
    });

    it('should accept empty domains', function() {
      expect(domain_minus(specDomainCreateEmpty(), specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));

      let a = specDomainCreateEmpty();
      expect(domain_minus(a, specDomainCreateEmpty())).to.not.equal(a);

      a = specDomainCreateEmpty();
      expect(domain_minus(specDomainCreateEmpty(), a)).to.not.equal(a);
    });

    it('should return empty domain if one is empty', function() {
      let A = specDomainCreateRanges([0, 1], [4, 5], [7, 8], [10, 12], [15, 117]);

      expect(domain_minus((A.slice(0)), specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));
      expect(domain_minus(specDomainCreateEmpty(), (A.slice(0)))).to.eql(specDomainCreateEmpty(1));
    });

    it('should subtract one range by another', function() {
      let A = specDomainSmallRange(5, 10);
      let B = specDomainCreateRange(50, 60);

      expect(domain_minus(A, B)).to.eql(specDomainSmallEmpty());
    });

    it('should subtract one domain by another', function() {
      let A = specDomainCreateRanges([5, 10], [20, 35]);
      let B = specDomainCreateRanges([50, 60], [110, 128]);

      expect(domain_minus(A, B)).to.eql(specDomainCreateEmpty(1));
    });

    it('should subtract one domain by another 2', function() {
      let A = specDomainCreateRanges([0, 1], [4, 12], [15, 117]);
      let B = specDomainCreateRanges([0, 1], [4, 12], [15, 117]);
      let E = specDomainCreateRange(0, 117);

      // ->
      // [-1, 1, -12, -3, -117, -14, 3, 12, -8, 8, -113, -3, 14, 117, 3, 113, -102, 102]
      // [0, 1, 3, 12, 0, 8, 14, 117, 3, 113, 0, 102]
      // [0, 117]

      expect(domain_minus(A, B)).to.eql(E);
    });

    it('should not break zero zero shortcut arr', function() {
      let A = specDomainCreateRanges([0, 1], [4, 12], [15, 117]);
      let B = specDomainCreateRanges([0, 0], [3, 8], [15, 52]);
      let E = specDomainCreateRange(0, 117);

      // ->
      // [-1, 1, -12, -3, -117, -14, 3, 12, -8, 8, -113, -3, 14, 117, 3, 113, -102, 102]
      // [0, 1, 3, 12, 0, 8, 14, 117, 3, 113, 0, 102]
      // [0, 117]

      expect(domain_minus(A, B)).to.eql(E);
    });

    it('should not break zero zero shortcut arr num', function() {
      let A = specDomainCreateRanges([0, 1], [4, 12], [15, 117]);
      let B = specDomainSmallNums(0, 3, 4, 5, 6, 7, 8, 15, 16, 17, 18, 19, 20, 21, 22);
      let E = specDomainCreateRange(0, 117);

      expect(domain_minus(A, B)).to.eql(E);
    });

    it('should not break zero zero shortcut num arr', function() {
      let A = specDomainSmallNums(0, 3, 4, 5, 6, 7, 8, 15, 16, 17, 18, 19, 20, 21, 22);
      let B = specDomainCreateRanges([0, 1], [4, 12], [15, 117]);
      let E = specDomainSmallRange(0, 22);

      expect(domain_minus(A, B)).to.eql(E);
    });

    it('should not break zero zero shortcut num', function() {
      let A = specDomainSmallNums(0, 1, 4, 5, 6, 7, 10, 11, 12, 20, 20, 25, 26);
      let B = specDomainSmallNums(0, 3, 4, 5, 6, 7, 8, 15, 22);
      let E = specDomainSmallRange(0, 26);

      expect(domain_minus(A, B)).to.eql(E);
    });

    it('should shortcut loop', function() {
      for (let i = 0; i < SMALL_MAX_NUM; ++i) {
        let A = specDomainSmallNums(0, i);
        let B = specDomainSmallNums(0, SMALL_MAX_NUM);
        let E = specDomainSmallRange(0, i);

        expect(domain_minus(A, B), '0..' + i).to.eql(E);
      }
    });
  });

  describe('domain_divby', function() {

    it('should exist', function() {
      expect(domain_divby).to.be.a('function');
      expect(SUP).to.a('number');
    });

    it('should require domains', function() {
      expect(() => domain_divby()).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_divby(specDomainCreateEmpty())).to.throw('A_EXPECTING_TWO_DOMAINS');
      expect(() => domain_divby(null, specDomainCreateEmpty())).to.throw('A_EXPECTING_TWO_DOMAINS');
    });

    it('should accept empty domains', function() {
      expect(domain_divby(specDomainCreateEmpty(), specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));
    });

    it('should accept empty domains', function() {
      expect(domain_divby(specDomainCreateEmpty(), specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));

      let A = [];
      expect(domain_divby(A, specDomainCreateEmpty())).to.not.equal(A);

      A = [];
      expect(domain_divby(specDomainCreateEmpty(), A)).to.not.equal(A);
    });

    it('should return empty domain if one is empty', function() {
      let A = specDomainCreateRanges([0, 1], [4, 5], [7, 8], [10, 12], [15, 117]);

      expect(domain_divby((A.slice(0)), specDomainCreateEmpty())).to.eql(specDomainCreateEmpty(1));
      expect(domain_divby(specDomainCreateEmpty(), (A.slice(0)))).to.eql(specDomainCreateEmpty(1));
    });

    it('should divide one range from another', function() {
      let A = specDomainCreateRange(50, 60);
      let B = specDomainCreateRange(5, 10, true);
      let E = specDomainCreateRange(5, 12, true);

      expect(domain_divby(A, B)).to.eql(E);
    });

    it('should divide one domain from another; floored', function() {
      let A = specDomainCreateRanges([5, 10], [20, 35]);
      let b = specDomainCreateRanges([50, 60], [110, 128]);
      let E = specDomainCreateRange(0, 0, true);

      expect(domain_divby(A, b, FLOOR_FRACTIONS)).to.eql(E); // would be [0.0390625, 0.7] which gets floored to [0, 0.7] so [0,0]
    });

    it('should divide one domain from another (2); floored', function() {
      let A = specDomainSmallNums(1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);
      let B = specDomainSmallNums(1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);
      let E = specDomainSmallNums(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);

      expect(domain_divby(A, B, FLOOR_FRACTIONS)).to.eql(domain_toArr(E));
    });

    it('should divide one domain from another; integer', function() {
      let A = specDomainCreateRanges([5, 10], [20, 35]);
      let B = specDomainCreateRanges([50, 60], [110, 128]);
      let E = [];

      expect(domain_divby(A, B, CEIL_FRACTIONS)).to.eql(E); // would be [0.0390625, 0.7] but there are no ints in between that so its empty
    });

    it('should divide one domain from another (2); integer', function() {
      let A = specDomainSmallNums(1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);
      let B = specDomainSmallNums(1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);
      let E = specDomainSmallNums(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17);

      expect(domain_divby(A, B, CEIL_FRACTIONS)).to.eql(domain_toArr(E));
    });

    it('divide by zero should blow up', function() {
      let A = specDomainCreateRanges([0, 1], [4, 12], [15, 117]);
      let B = specDomainCreateRanges([0, 1], [4, 12], [15, 117]);
      let E = specDomainCreateRanges([0, SUP]);

      expect(domain_divby(A, B)).to.eql(E);
    });

    describe('simple examples', function() {
      function doit(a, b, c) {
        it(`should pass [${a}] / [${b}] = [${c}]`, function() {
          expect(domain_divby(a, b)).to.eql(c);
        });
      }

      doit([50, 60], [5, 5], [10, 12]);
      doit([50, 50, 60, 60], [5, 5], [10, 10, 12, 12]);
      doit([50, 60], [5, 5, 10, 10], [5, 6, 10, 12]);
      doit([50, 60], [5, 10], [5, 12]);
      doit([0, 0], [5, 10], [0, 0]);
      doit([0, 1], [5, 10], [0, 0]); // because all results are <1
      doit([0, 10], [2, 2], [0, 5]);
      doit([5, 10], [0, 0], []);
      doit([5, 10], [0, 1], [5, SUP]);
    });
  });

  describe('domain_isSolved', function() {

    it('should exist', function() {
      expect(domain_isSolved).to.be.a('function');
    });

    describe('with array', function() {
      it('should return true if a domain covers exactly one value', function() {
        expect(domain_isSolved(specDomainCreateValue(SUP))).to.equal(true);
        expect(domain_isSolved(specDomainCreateValue(SUP - 1))).to.equal(true);
        expect(domain_isSolved(specDomainCreateValue(SUP - 18))).to.equal(true);
      });

      it('should return false if a domain is empty', function() {
        expect(domain_isSolved([])).to.equal(false);
      });

      it('should return false if a domain covers more than one value', function() {
        expect(domain_isSolved(specDomainCreateRange(90, 91))).to.equal(false);
        expect(domain_isSolved(specDomainCreateRange(918, 920))).to.equal(false);
        expect(domain_isSolved(specDomainCreateRange(SUP - 50, SUP))).to.equal(false);
        expect(domain_isSolved(specDomainCreateRanges([SUP - 10, SUP - 5], [SUP - 1, SUP]))).to.equal(false);
        expect(domain_isSolved(specDomainCreateRanges([0, 1], [5, SUP]))).to.equal(false);
        expect(domain_isSolved(specDomainCreateRanges([5, 8], [50, SUP]))).to.equal(false);
        expect(domain_isSolved(specDomainCreateRanges([5, 8], [23, 34], [50, SUP]))).to.equal(false);
      });
    });

    describe('with numbers', function() {

      it('should accept single values for each valid value', function() {
        expect(domain_isSolved(specDomainSmallNums(0))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(1))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(2))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(3))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(4))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(5))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(6))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(7))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(8))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(9))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(10))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(11))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(12))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(13))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(14))).to.equal(true);
        expect(domain_isSolved(specDomainSmallNums(15))).to.equal(true);
      });

      it('should see double values', function() {
        expect(domain_isSolved(specDomainSmallNums(0, 1))).to.equal(false);
        expect(domain_isSolved(specDomainSmallNums(0, 10))).to.equal(false);
        expect(domain_isSolved(specDomainSmallNums(0, 15))).to.equal(false);
        expect(domain_isSolved(specDomainSmallNums(10, 15))).to.equal(false);
        expect(domain_isSolved(specDomainSmallNums(4, 6))).to.equal(false);
      });

      it('should see multiple values', function() {
        expect(domain_isSolved(specDomainSmallNums(2, 5, 7, 9, 11, 12))).to.equal(false);
      });

      it('should return false for entire range', function() {
        expect(domain_isSolved(specDomainSmallRange(0, 15))).to.equal(false);
      });

      it('should return false for empty', function() {
        expect(domain_isSolved(specDomainSmallEmpty())).to.equal(false);
      });
    });
  });

  describe('domain_isRejected', function() {

    it('should exist', function() {
      expect(domain_isRejected).to.be.a('function');
    });

    describe('with array', function() {

      it('should return true if a domain is empty', function() {
        expect(domain_isRejected([])).to.equal(true);
      });

      it('should return false if a domain covers exactly one value', function() {
        expect(domain_isRejected(specDomainCreateValue(SUP - 1))).to.equal(false);
        expect(domain_isRejected(specDomainCreateValue(SUP - 18))).to.equal(false);
        expect(domain_isRejected(specDomainCreateValue(SUP))).to.equal(false);
      });

      it('should return false if a domain covers more than one value', function() {
        expect(domain_isRejected(specDomainCreateRange(SUP - 1, SUP))).to.equal(false);
        expect(domain_isRejected(specDomainCreateRange(SUP - 20, SUP - 20))).to.equal(false);
        expect(domain_isRejected(specDomainCreateRange(50, SUP))).to.equal(false);
        expect(domain_isRejected(specDomainCreateRange(0, SUP))).to.equal(false);
        expect(domain_isRejected(specDomainCreateRanges([SUP - 10, SUP - 5], [SUP - 1, SUP]))).to.equal(false);
        expect(domain_isRejected(specDomainCreateRanges([0, 1], [5, SUP]))).to.equal(false);
        expect(domain_isRejected(specDomainCreateRanges([5, 8], [50, SUP]))).to.equal(false);
        expect(domain_isRejected(specDomainCreateRanges([5, 8], [23, 34], [50, SUP]))).to.equal(false);
      });
    });

    describe('with numbers', function() {

      it('should accept single values for each valid value', function() {
        expect(domain_isRejected(specDomainSmallNums(0))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(1))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(2))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(3))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(4))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(5))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(6))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(7))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(8))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(9))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(10))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(11))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(12))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(13))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(14))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(15))).to.equal(false);
      });

      it('should see double values', function() {
        expect(domain_isRejected(specDomainSmallNums(0, 1))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(0, 10))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(0, 15))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(10, 15))).to.equal(false);
        expect(domain_isRejected(specDomainSmallNums(4, 6))).to.equal(false);
      });

      it('should see multiple values', function() {
        expect(domain_isRejected(specDomainSmallNums(2, 5, 7, 9, 11, 12))).to.equal(false);
      });

      it('should return false for entire range', function() {
        expect(domain_isRejected(specDomainSmallRange(0, 15))).to.equal(false);
      });

      it('should return false for empty', function() {
        expect(domain_isRejected(specDomainSmallEmpty())).to.equal(true);
      });
    });
  });

  describe('domain_isUndetermined', function() {

    it('should exist', function() {
      expect(domain_isUndetermined).to.be.a('function');
    });

    describe('with array', function() {

      it('should return false if a domain is empty', function() {
        expect(domain_isUndetermined([])).to.equal(false);
      });

      it('should return false if a domain covers exactly one value', function() {
        expect(domain_isUndetermined(specDomainCreateValue(SUP - 1))).to.equal(false);
        expect(domain_isUndetermined(specDomainCreateValue(SUP - 18))).to.equal(false);
        expect(domain_isUndetermined(specDomainCreateValue(SUP))).to.equal(false);
      });

      it('should return true if a domain covers more than one value', function() {
        expect(domain_isUndetermined(specDomainCreateRange(SUP - 1, SUP))).to.equal(true);
        expect(domain_isUndetermined(specDomainCreateRange(SUP - 20, SUP - 18))).to.equal(true);
        expect(domain_isUndetermined(specDomainCreateRange(50, SUP))).to.equal(true);
        expect(domain_isUndetermined(specDomainCreateRange(0, SUP))).to.equal(true);
        expect(domain_isUndetermined(specDomainCreateRanges([SUP - 10, SUP - 5], [SUP - 1, SUP]))).to.equal(true);
        expect(domain_isUndetermined(specDomainCreateRanges([0, 1], [5, SUP]))).to.equal(true);
        expect(domain_isUndetermined(specDomainCreateRanges([5, 8], [50, SUP]))).to.equal(true);
        expect(domain_isUndetermined(specDomainCreateRanges([5, 8], [23, 34], [50, SUP]))).to.equal(true);
      });
    });

    describe('with numbers', function() {

      it('should accept single values for each valid value', function() {
        expect(domain_isUndetermined(specDomainSmallNums(0))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(1))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(2))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(3))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(4))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(5))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(6))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(7))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(8))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(9))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(10))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(11))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(12))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(13))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(14))).to.equal(false);
        expect(domain_isUndetermined(specDomainSmallNums(15))).to.equal(false);
      });

      it('should see double values', function() {
        expect(domain_isUndetermined(specDomainSmallNums(0, 1))).to.equal(true);
        expect(domain_isUndetermined(specDomainSmallNums(0, 10))).to.equal(true);
        expect(domain_isUndetermined(specDomainSmallNums(0, 15))).to.equal(true);
        expect(domain_isUndetermined(specDomainSmallNums(10, 15))).to.equal(true);
        expect(domain_isUndetermined(specDomainSmallNums(4, 6))).to.equal(true);
      });

      it('should see multiple values', function() {
        expect(domain_isUndetermined(specDomainSmallNums(2, 5, 7, 9, 11, 12))).to.equal(true);
      });

      it('should return true for entire range', function() {
        expect(domain_isUndetermined(specDomainSmallRange(0, 15))).to.equal(true);
      });

      it('should return false for empty', function() {
        expect(domain_isUndetermined(specDomainSmallEmpty())).to.equal(false);
      });
    });
  });

  describe('domain_sortByRange', function() {

    it('should exist', function() {
      expect(_domain_sortByRangeInline).to.be.a('function');
    });

    it('should throw for emtpy domains', function() {
      expect(() => _domain_sortByRangeInline([])).to.throw('A_DOMAIN_SHOULD_NOT_BE_EMPTY');
    });

    it('should return nothing', function() {
      expect(_domain_sortByRangeInline([0, 1])).to.equal(undefined);
    });

    it('should keep pairs sorted', function() {
      let arr = [0, 1, 2, 3];
      _domain_sortByRangeInline(arr);

      expect(arr).to.eql([0, 1, 2, 3]);
    });

    it('should sort range pairs by lo', function() {
      let arr = [2, 3, 0, 1];
      _domain_sortByRangeInline(arr);

      expect(arr).to.eql([0, 1, 2, 3]);
    });

    it('should sort range pairs by hi if lo is equal', function() {
      let arr = [2, 3, 2, 1];
      _domain_sortByRangeInline(arr);

      expect(arr).to.eql([2, 1, 2, 3]);
    });

    it('should not change domain if already sorted even when lo is equal', function() {
      let arr = [2, 3, 2, 6];
      _domain_sortByRangeInline(arr);

      expect(arr).to.eql([2, 3, 2, 6]);
    });

    it('should accept solved domains', function() {
      let arr = [50, 50];
      _domain_sortByRangeInline(arr);

      expect(arr).to.eql([50, 50]);
    });

    it('should allow single value ranges', function() {
      let arr = [0, 1, 5, 10, 3, 3];
      _domain_sortByRangeInline(arr);

      expect(arr).to.eql([0, 1, 3, 3, 5, 10]);
    });

    it('should work with 4 ranges', function() {
      let arr = [20, 30, 0, 1, 5, 10, 3, 3];
      _domain_sortByRangeInline(arr);

      expect(arr).to.eql([0, 1, 3, 3, 5, 10, 20, 30]);
    });

    it('should work with 5 ranges', function() {
      let arr = [20, 30, 0, 1, 18, 19, 5, 10, 3, 3];
      _domain_sortByRangeInline(arr);

      expect(arr).to.eql([0, 1, 3, 3, 5, 10, 18, 19, 20, 30]);
    });

    it('should work with 50 ranges', function() {
      // arr = []
      // for i in [0...50]
      //   arr.push (x=Mathf.floor(Math.random() * 100)), x + Math.floor(Math.random() * 100)

      let arr = [61, 104, 78, 130, 6, 92, 34, 51, 86, 109, 0, 32, 39, 62, 91, 96, 49, 134, 91, 163, 42, 105, 22, 78, 78, 133, 13, 111, 49, 141, 41, 134, 34, 57, 19, 27, 25, 64, 18, 75, 75, 151, 88, 127, 30, 74, 11, 59, 84, 107, 54, 91, 3, 85, 97, 167, 55, 103, 81, 174, 32, 55, 28, 87, 42, 69, 31, 118, 99, 137, 12, 94, 31, 98, 69, 162, 52, 89, 85, 126, 93, 160, 20, 53, 82, 88, 8, 46, 29, 75, 97, 146, 13, 35, 51, 125, 5, 18, 88, 178];
      let out = [0, 32, 3, 85, 5, 18, 6, 92, 8, 46, 11, 59, 12, 94, 13, 35, 13, 111, 18, 75, 19, 27, 20, 53, 22, 78, 25, 64, 28, 87, 29, 75, 30, 74, 31, 98, 31, 118, 32, 55, 34, 51, 34, 57, 39, 62, 41, 134, 42, 69, 42, 105, 49, 134, 49, 141, 51, 125, 52, 89, 54, 91, 55, 103, 61, 104, 69, 162, 75, 151, 78, 130, 78, 133, 81, 174, 82, 88, 84, 107, 85, 126, 86, 109, 88, 127, 88, 178, 91, 96, 91, 163, 93, 160, 97, 146, 97, 167, 99, 137];

      _domain_sortByRangeInline(arr);
      expect(arr).to.eql(out);
    });

    it('should work with 51 ranges', function() {

      let arr = [4, 13, 67, 101, 38, 70, 99, 144, 65, 126, 45, 110, 86, 183, 73, 134, 84, 112, 64, 83, 63, 90, 18, 64, 52, 116, 87, 134, 35, 125, 13, 94, 23, 30, 97, 117, 64, 82, 77, 134, 61, 72, 63, 76, 38, 111, 33, 96, 5, 98, 5, 50, 52, 121, 18, 30, 70, 155, 8, 56, 4, 15, 21, 98, 95, 166, 83, 148, 33, 62, 0, 72, 57, 107, 60, 133, 66, 163, 48, 130, 90, 163, 56, 123, 14, 26, 90, 92, 9, 64, 4, 4, 17, 22, 9, 78, 25, 66, 87, 95, 64, 145];
      let out = [0, 72, 4, 4, 4, 13, 4, 15, 5, 50, 5, 98, 8, 56, 9, 64, 9, 78, 13, 94, 14, 26, 17, 22, 18, 30, 18, 64, 21, 98, 23, 30, 25, 66, 33, 62, 33, 96, 35, 125, 38, 70, 38, 111, 45, 110, 48, 130, 52, 116, 52, 121, 56, 123, 57, 107, 60, 133, 61, 72, 63, 76, 63, 90, 64, 82, 64, 83, 64, 145, 65, 126, 66, 163, 67, 101, 70, 155, 73, 134, 77, 134, 83, 148, 84, 112, 86, 183, 87, 95, 87, 134, 90, 92, 90, 163, 95, 166, 97, 117, 99, 144];

      _domain_sortByRangeInline(arr);
      expect(arr).to.eql(out);
    });

    it('should work with 250 ranges', function() {
      // this should be very fast.

      let arr = [56, 103, 54, 76, 81, 144, 30, 103, 38, 50, 3, 25, 37, 80, 2, 44, 67, 82, 80, 88, 37, 67, 25, 76, 47, 105, 16, 97, 46, 78, 21, 111, 14, 113, 47, 84, 55, 63, 15, 19, 54, 75, 40, 57, 34, 85, 62, 71, 16, 52, 70, 152, 1, 42, 86, 126, 97, 109, 9, 38, 91, 140, 27, 48, 54, 115, 3, 18, 1, 35, 17, 66, 38, 65, 33, 123, 7, 70, 68, 150, 64, 86, 77, 167, 73, 159, 0, 97, 76, 155, 2, 50, 48, 116, 52, 136, 31, 43, 65, 163, 20, 41, 70, 146, 83, 120, 79, 135, 9, 98, 16, 67, 55, 144, 0, 26, 70, 97, 9, 67, 39, 98, 14, 102, 67, 89, 44, 140, 97, 132, 90, 99, 61, 108, 71, 126, 31, 72, 17, 26, 98, 162, 32, 125, 51, 115, 96, 176, 39, 83, 77, 147, 20, 24, 18, 26, 12, 17, 45, 110, 57, 74, 28, 49, 7, 11, 32, 43, 43, 50, 5, 70, 42, 139, 81, 83, 20, 33, 77, 107, 52, 101, 36, 78, 49, 74, 90, 118, 36, 74, 4, 87, 62, 109, 15, 60, 11, 34, 85, 184, 27, 115, 2, 52, 37, 102, 40, 132, 87, 117, 94, 163, 48, 70, 50, 139, 97, 137, 31, 31, 42, 78, 28, 29, 70, 147, 8, 87, 87, 140, 59, 142, 43, 110, 3, 76, 39, 59, 57, 137, 54, 128, 72, 82, 66, 81, 30, 39, 69, 122, 5, 102, 81, 170, 94, 102, 25, 31, 95, 190, 66, 107, 1, 48, 54, 81, 60, 117, 2, 69, 31, 42, 90, 92, 13, 37, 58, 94, 83, 160, 96, 145, 59, 80, 27, 35, 60, 71, 57, 102, 93, 115, 43, 106, 62, 72, 74, 131, 93, 101, 32, 51, 80, 139, 17, 87, 9, 11, 2, 71, 57, 59, 38, 71, 81, 153, 59, 136, 65, 94, 23, 106, 77, 139, 1, 91, 27, 44, 96, 173, 56, 139, 44, 119, 85, 132, 26, 33, 63, 80, 73, 125, 69, 98, 6, 34, 27, 53, 74, 160, 46, 108, 88, 174, 97, 154, 7, 90, 89, 133, 1, 46, 76, 161, 85, 110, 31, 100, 97, 164, 66, 93, 71, 156, 1, 70, 99, 123, 84, 126, 2, 17, 65, 163, 68, 102, 5, 71, 95, 97, 28, 49, 34, 62, 22, 47, 76, 145, 0, 65, 38, 117, 95, 161, 46, 105, 93, 130, 48, 48, 90, 180, 67, 115, 21, 54, 18, 111, 98, 107, 12, 38, 0, 92, 7, 66, 25, 57, 29, 65, 9, 81, 5, 14, 3, 40, 6, 102, 65, 92, 17, 101, 11, 98, 55, 110, 85, 168, 51, 90, 38, 99, 75, 143, 84, 139, 85, 114, 41, 59, 9, 55, 77, 166, 25, 107, 40, 125, 72, 160, 53, 90, 0, 50, 28, 28, 51, 140, 3, 24, 85, 154, 30, 42, 62, 106, 46, 89, 4, 65, 45, 62, 92, 175, 23, 51, 32, 100, 37, 102];
      let out = [0, 26, 0, 50, 0, 65, 0, 92, 0, 97, 1, 35, 1, 42, 1, 46, 1, 48, 1, 70, 1, 91, 2, 17, 2, 44, 2, 50, 2, 52, 2, 69, 2, 71, 3, 18, 3, 24, 3, 25, 3, 40, 3, 76, 4, 65, 4, 87, 5, 14, 5, 70, 5, 71, 5, 102, 6, 34, 6, 102, 7, 11, 7, 66, 7, 70, 7, 90, 8, 87, 9, 11, 9, 38, 9, 55, 9, 67, 9, 81, 9, 98, 11, 34, 11, 98, 12, 17, 12, 38, 13, 37, 14, 102, 14, 113, 15, 19, 15, 60, 16, 52, 16, 67, 16, 97, 17, 26, 17, 66, 17, 87, 17, 101, 18, 26, 18, 111, 20, 24, 20, 33, 20, 41, 21, 54, 21, 111, 22, 47, 23, 51, 23, 106, 25, 31, 25, 57, 25, 76, 25, 107, 26, 33, 27, 35, 27, 44, 27, 48, 27, 53, 27, 115, 28, 28, 28, 29, 28, 49, 28, 49, 29, 65, 30, 39, 30, 42, 30, 103, 31, 31, 31, 42, 31, 43, 31, 72, 31, 100, 32, 43, 32, 51, 32, 100, 32, 125, 33, 123, 34, 62, 34, 85, 36, 74, 36, 78, 37, 67, 37, 80, 37, 102, 37, 102, 38, 50, 38, 65, 38, 71, 38, 99, 38, 117, 39, 59, 39, 83, 39, 98, 40, 57, 40, 125, 40, 132, 41, 59, 42, 78, 42, 139, 43, 50, 43, 106, 43, 110, 44, 119, 44, 140, 45, 62, 45, 110, 46, 78, 46, 89, 46, 105, 46, 108, 47, 84, 47, 105, 48, 48, 48, 70, 48, 116, 49, 74, 50, 139, 51, 90, 51, 115, 51, 140, 52, 101, 52, 136, 53, 90, 54, 75, 54, 76, 54, 81, 54, 115, 54, 128, 55, 63, 55, 110, 55, 144, 56, 103, 56, 139, 57, 59, 57, 74, 57, 102, 57, 137, 58, 94, 59, 80, 59, 136, 59, 142, 60, 71, 60, 117, 61, 108, 62, 71, 62, 72, 62, 106, 62, 109, 63, 80, 64, 86, 65, 92, 65, 94, 65, 163, 65, 163, 66, 81, 66, 93, 66, 107, 67, 82, 67, 89, 67, 115, 68, 102, 68, 150, 69, 98, 69, 122, 70, 97, 70, 146, 70, 147, 70, 152, 71, 126, 71, 156, 72, 82, 72, 160, 73, 125, 73, 159, 74, 131, 74, 160, 75, 143, 76, 145, 76, 155, 76, 161, 77, 107, 77, 139, 77, 147, 77, 166, 77, 167, 79, 135, 80, 88, 80, 139, 81, 83, 81, 144, 81, 153, 81, 170, 83, 120, 83, 160, 84, 126, 84, 139, 85, 110, 85, 114, 85, 132, 85, 154, 85, 168, 85, 184, 86, 126, 87, 117, 87, 140, 88, 174, 89, 133, 90, 92, 90, 99, 90, 118, 90, 180, 91, 140, 92, 175, 93, 101, 93, 115, 93, 130, 94, 102, 94, 163, 95, 97, 95, 161, 95, 190, 96, 145, 96, 173, 96, 176, 97, 109, 97, 132, 97, 137, 97, 154, 97, 164, 98, 107, 98, 162, 99, 123];

      _domain_sortByRangeInline(arr);
      expect(arr).to.eql(out);
    });
  });

  describe('domain_removeGte', function() {

    it('should exist', function() {
      expect(domain_removeGte).to.be.a('function');
    });

    it('should accept an empty domain', function() {
      expect(() => domain_removeGte([], 5)).not.to.throw();
    });

    // case: v=5
    // 012 456 => 012 4
    // 012 45  => 012 4
    // 012 567 => 012
    // 012 5   => 012
    // 012 678 => 012
    // 5       => empty
    // 012     => NONE
    // 678     => empty

    describe('with array', function() {

      function gteTest(domain, value, expected) {
        it(`should gte [${domain}] >= ${value} -> [${expected}]`, function() {
          let clone = domain_clone(domain);
          let result = domain_removeGte(domain, value);

          expect(result).to.eql(expected);
          expect(domain).to.eql(clone);
        });
      }

      //gteTest(specDomainCreateRanges([100, 110]), 105, specDomainCreateRanges([100, 104]));
      //gteTest(specDomainCreateRanges([100, 102], [104, 106]), 105, specDomainCreateRanges([100, 102], [104, 104]));
      //gteTest(specDomainCreateRanges([100, 102], [104, 105]), 105, specDomainCreateRanges([100, 102], [104, 104]));
      //gteTest(specDomainCreateRanges([100, 102], [105, 107]), 105, specDomainCreateRanges([100, 102]));
      //gteTest(specDomainCreateRanges([100, 102], [105, 105]), 105, specDomainCreateRanges([100, 102]));
      //gteTest(specDomainCreateRanges([100, 102], [106, 108]), 105, specDomainCreateRanges([100, 102]));
      gteTest(specDomainCreateRanges([105, 105]), 105, EMPTY);
      //gteTest(specDomainCreateRanges([100, 102]), 105, specDomainCreateRanges([100, 102]));
      //gteTest(specDomainCreateRanges([106, 108]), 105, EMPTY);
    });

    describe('with numbers', function() {

      function gteTest(domain, value, expected) {
        it(`should gte [${domain}] >= ${value} -> [${expected}]`, function() {
          let clone = domain_clone(domain);
          let result = domain_removeGte(domain, value);

          expect(result).to.eql(expected);
          expect(domain).to.eql(clone);
        });
      }

      gteTest(specDomainSmallNums(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10), 5, specDomainSmallNums(0, 1, 2, 3, 4));
      gteTest(specDomainSmallNums(0, 1, 2, 4, 5, 6), 5, specDomainSmallNums(0, 1, 2, 4));
      gteTest(specDomainSmallNums(0, 1, 2, 4, 5), 5, specDomainSmallNums(0, 1, 2, 4));
      gteTest(specDomainSmallNums(0, 1, 2, 5, 6, 7), 5, specDomainSmallNums(0, 1, 2));
      gteTest(specDomainSmallNums(0, 1, 2, 5), 5, specDomainSmallNums(0, 1, 2));
      gteTest(specDomainSmallNums(0, 1, 2, 6, 7, 8), 5, specDomainSmallNums(0, 1, 2));
      gteTest(specDomainSmallNums(5), 5, EMPTY);
      gteTest(specDomainSmallNums(0, 1, 2), 5, specDomainSmallNums(0, 1, 2));
      gteTest(specDomainSmallNums(6, 7, 8), 5, EMPTY);
    });
  });

  describe('domain_toArr', function() {

    it('should exist', function() {
      expect(domain_toArr).to.be.a('function');
    });

    it('should work with a bool', function() {
      expect(domain_toArr(specDomainCreateRange(0, 1, true))).to.eql(specDomainCreateRange(0, 1, true));
      expect(domain_toArr(specDomainSmallNums(0, 1))).to.eql(specDomainCreateRange(0, 1, true));
    });
  });

  describe('domain_removeLte', function() {

    it('should exist', function() {
      expect(domain_removeLte).to.be.a('function');
    });

    it('should accept an empty domain', function() {
      expect(() => domain_removeLte([], 5)).not.to.throw();
    });

    // case: v=5
    // 456 89 => 6 89
    // 45  89 => 89
    // 567 9  => 67 9
    // 5   89 => 89
    // 5      => empty
    // 678    => NONE
    // 012    => empty

    describe('with array', function() {

      function gteTest(domain, value, expected) {
        it(`should lte [${domain}] <= ${value} -> [${expected}]`, function() {
          let clone = domain_clone(domain);
          let result = domain_removeLte(domain, value);

          expect(result).to.eql(expected);
          expect(domain).to.eql(clone);
        });
      }

      gteTest(specDomainCreateRanges([100, 110]), 105, specDomainCreateRanges([106, 110]));
      gteTest(specDomainCreateRanges([104, 106], [108, 109]), 105, specDomainCreateRanges([106, 106], [108, 109]));
      gteTest(specDomainCreateRanges([104, 105], [108, 109]), 105, specDomainCreateRanges([108, 109]));
      gteTest(specDomainCreateRanges([105, 107], [109, 109]), 105, specDomainCreateRanges([106, 107], [109, 109]));
      gteTest(specDomainCreateRanges([105, 105], [108, 109]), 105, specDomainCreateRanges([108, 109]));
      gteTest(specDomainCreateRanges([105, 105]), 105, EMPTY);
      gteTest(specDomainCreateRanges([106, 108]), 105, specDomainCreateRanges([106, 108]));
      gteTest(specDomainCreateRanges([100, 104]), 105, EMPTY);
    });

    describe('with numbers', function() {

      function gteTest(domain, value, expected) {
        it(`should lte [${domain}] <= ${value} -> [${expected}]`, function() {
          let clone = domain_clone(domain);
          let result = domain_removeLte(domain, value);

          expect(result, domain_toArr(result) + ' -> ' + domain_toArr(expected)).to.eql(expected);
          expect(domain).to.eql(clone);
        });
      }

      gteTest(specDomainSmallNums(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10), 5, specDomainSmallNums(6, 7, 8, 9, 10));
      gteTest(specDomainSmallNums(4, 5, 6, 8, 9), 5, specDomainSmallNums(6, 8, 9));
      gteTest(specDomainSmallNums(4, 5, 8, 9), 5, specDomainSmallNums(8, 9));
      gteTest(specDomainSmallNums(5, 6, 7, 9), 5, specDomainSmallNums(6, 7, 9));
      gteTest(specDomainSmallNums(5, 8, 9), 5, specDomainSmallNums(8, 9));
      gteTest(specDomainSmallNums(5), 5, EMPTY);
      gteTest(specDomainSmallNums(6, 7, 8), 5, specDomainSmallNums(6, 7, 8));
      gteTest(specDomainSmallNums(0, 1, 2, 3, 4), 5, EMPTY);
    });
  });

  describe('domain_fromFlags and domain_toList and domain_numarr and domain_fromList', function() {

    describe('number domain', function() {

      it('should work with all permutations', function() {
        // 13 is an arbitrary number (ok, prime) to not waste toooo much time on this
        for (let i = 0; i <= 0xffff; i += 27) {
          let list = [];
          if (i & ZERO) list.push(0);
          if (i & ONE) list.push(1);
          if (i & TWO) list.push(2);
          if (i & THREE) list.push(3);
          if (i & FOUR) list.push(4);
          if (i & FIVE) list.push(5);
          if (i & SIX) list.push(6);
          if (i & SEVEN) list.push(7);
          if (i & EIGHT) list.push(8);
          if (i & NINE) list.push(9);
          if (i & TEN) list.push(10);
          if (i & ELEVEN) list.push(11);
          if (i & TWELVE) list.push(12);
          if (i & THIRTEEN) list.push(13);
          if (i & FOURTEEN) list.push(14);
          if (i & FIFTEEN) list.push(15);
          if (i & SIXTEEN) list.push(16);
          if (i & SEVENTEEN) list.push(17);
          if (i & EIGHTEEN) list.push(18);
          if (i & NINETEEN) list.push(19);
          if (i & TWENTY) list.push(20);
          if (i & TWENTYONE) list.push(21);
          if (i & TWENTYTWO) list.push(22);
          if (i & TWENTYTHREE) list.push(23);
          if (i & TWENTYFOUR) list.push(24);
          if (i & TWENTYFIVE) list.push(25);
          if (i & TWENTYSIX) list.push(26);
          if (i & TWENTYSEVEN) list.push(27);
          if (i & TWENTYEIGHT) list.push(28);
          if (i & TWENTYNINE) list.push(29);
          if (i & THIRTY) list.push(30);

          let expNum = specDomainSmallNums(...list);
          let expArr = specDomainFromNums(...list);

          let outFromFlags = domain_fromFlagsNum(i);
          let outToList = domain_toList(i);
          let outNumarr = domain_numarr(expArr);
          let outFromList = domain_fromList(list);

          expect(i).to.eql(expNum); // more of a confirmation that the specs are proper
          expect(outFromFlags).to.eql(expArr);
          expect(outToList).to.eql(list);
          expect(outNumarr).to.eql(i);
          expect(outFromList).to.eql(i);
        }
      });
    });
  });

  describe('domain_addRangeToSmallDomain', function() {

    it('should add a value to an empty domain', function() {
      expect(domain_addRangeNum(EMPTY, 15, 15)).to.eql(FIFTEEN);
    });
  });
});
// TODO test cases
