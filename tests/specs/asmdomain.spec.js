import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainSmallEmpty,
  specDomainSmallNums,
  specDomainSmallRange,
} from '../fixtures/domain.fixt';

import {
  asmdomain_addRange,
  asmdomain_containsValue,
  asmdomain_createRange,
  asmdomain_createValue,
  asmdomain_createRangeZeroToMax,
  asmdomain_getValue,
  asmdomain_intersection,
  asmdomain_isSolved,
  asmdomain_isUndetermined,
  asmdomain_isValue,
  asmdomain_max,
  asmdomain_min,
  asmdomain_removeGte,
  asmdomain_removeLte,
  asmdomain_removeValue,
  asmdomain_sharesNoElements,
  asmdomain_size,
} from '../../src/asmdomain';

import {
  EMPTY,
  NO_SUCH_VALUE,
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

  NOT_FOUND,
} from '../../src/domain';

describe('src/asmdomain.spec', function() {

  describe('asmdomain_addRange', function() {

    it('should add a value to an empty domain', function() {
      expect(asmdomain_addRange(EMPTY, 15, 15)).to.eql(specDomainSmallNums(15));
    });

    it('should add range to empty domain', function() {
      expect(asmdomain_addRange(EMPTY, 8, 11)).to.eql(specDomainSmallNums(8, 9, 10, 11));
    });

    it('should add ignore existing values to empty domain', function() {
      expect(asmdomain_addRange(NINE, 8, 11)).to.eql(specDomainSmallNums(8, 9, 10, 11));
    });

    it('should add to existing values to empty domain', function() {
      expect(asmdomain_addRange(FIVE, 8, 11)).to.eql(specDomainSmallNums(5, 8, 9, 10, 11));
    });

    it('should add zero', function() {
      expect(asmdomain_addRange(specDomainSmallNums(8, 9, 10, 11), 0, 0)).to.eql(specDomainSmallNums(0, 8, 9, 10, 11));
    });

    it('should add 30', function() {
      expect(asmdomain_addRange(specDomainSmallNums(8, 9, 10, 11), 30, 30)).to.eql(specDomainSmallNums(8, 9, 10, 11, 30));
    });
  });

  describe('asmdomain_containsValue', function() {

    describe('should return 1 if domain contains given value', function() {

      it('one range in domain', function() {
        expect(asmdomain_containsValue(specDomainSmallRange(0, 10), 5)).to.equal(1);
      });

      it('multiple ranges in domain', function() {
        expect(asmdomain_containsValue(specDomainSmallNums(0, 1, 2, 4, 5, 8, 9, 10, 11), 9)).to.equal(1);
      });
    });

    describe('should return 0 if domain does not contain value', function() {

      it('empty array', function() {
        expect(asmdomain_containsValue(specDomainSmallEmpty(), 0)).to.equal(0);
      });

      it('one range in domain', function() {
        expect(asmdomain_containsValue(specDomainSmallRange(0, 10), 25)).to.equal(0);
      });

      it('multiple ranges in domain', function() {
        expect(asmdomain_containsValue(specDomainSmallNums(0, 1, 2, 4, 5, 8, 9, 10, 11), 6)).to.equal(0);
      });
    });
  });

  describe('asmdomain_createRange', function() {

    it('should work for all valid ranges', function() {
      // this brute force checks all valid small domain ranges 0~30 x 0~30
      for (let i = 0; i <= 30; ++i) {
        for (let j = i; j <= 30; ++j) {
          let domain = asmdomain_createRange(i, j);
          for (let k = 0; k <= 30; ++k) {
            expect(domain & NUM_TO_FLAG[k], i + 'x' + j + ',' + k).to.eql((k >= i && k <= j) ? NUM_TO_FLAG[k] : 0);
          }
        }
      }
    });
  });

  describe('asmdomain_createValue', function() {

    it('should work for all valid values', function() {
      for (let i = 0; i <= 30; ++i) {
        let domain = asmdomain_createValue(i);
        expect(domain).to.eql(NUM_TO_FLAG[i]);
      }
    });
  });

  describe('asmdomain_createRangeZeroToMax', function() {

    it('should work', function() {
      expect(asmdomain_createRangeZeroToMax(ZERO)).to.eql(ZERO);
      expect(asmdomain_createRangeZeroToMax(ONE)).to.eql(ZERO | ONE);
      expect(asmdomain_createRangeZeroToMax(TWO)).to.eql(ZERO | ONE | TWO);
      expect(asmdomain_createRangeZeroToMax(THREE)).to.eql(ZERO | ONE | TWO | THREE);
      expect(asmdomain_createRangeZeroToMax(FOUR)).to.eql(ZERO | ONE | TWO | THREE | FOUR);
      expect(asmdomain_createRangeZeroToMax(SIX)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX);
      expect(asmdomain_createRangeZeroToMax(SEVEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN);
      expect(asmdomain_createRangeZeroToMax(EIGHT)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT);
      expect(asmdomain_createRangeZeroToMax(NINE)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE);
      expect(asmdomain_createRangeZeroToMax(TEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN);
      expect(asmdomain_createRangeZeroToMax(ELEVEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN);
      expect(asmdomain_createRangeZeroToMax(TWELVE)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE);
      expect(asmdomain_createRangeZeroToMax(THIRTEEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN);
      expect(asmdomain_createRangeZeroToMax(FOURTEEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN);
      expect(asmdomain_createRangeZeroToMax(FIFTEEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN);
      expect(asmdomain_createRangeZeroToMax(SIXTEEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN);
      expect(asmdomain_createRangeZeroToMax(SEVENTEEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN);
      expect(asmdomain_createRangeZeroToMax(EIGHTEEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN);
      expect(asmdomain_createRangeZeroToMax(NINETEEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN);
      expect(asmdomain_createRangeZeroToMax(TWENTY)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY);
      expect(asmdomain_createRangeZeroToMax(TWENTYONE)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE);
      expect(asmdomain_createRangeZeroToMax(TWENTYTWO)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE | TWENTYTWO);
      expect(asmdomain_createRangeZeroToMax(TWENTYTHREE)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE | TWENTYTWO | TWENTYTHREE);
      expect(asmdomain_createRangeZeroToMax(TWENTYFOUR)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE | TWENTYTWO | TWENTYTHREE | TWENTYFOUR);
      expect(asmdomain_createRangeZeroToMax(TWENTYFIVE)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE | TWENTYTWO | TWENTYTHREE | TWENTYFOUR | TWENTYFIVE);
      expect(asmdomain_createRangeZeroToMax(TWENTYSIX)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE | TWENTYTWO | TWENTYTHREE | TWENTYFOUR | TWENTYFIVE | TWENTYSIX);
      expect(asmdomain_createRangeZeroToMax(TWENTYSEVEN)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE | TWENTYTWO | TWENTYTHREE | TWENTYFOUR | TWENTYFIVE | TWENTYSIX | TWENTYSEVEN);
      expect(asmdomain_createRangeZeroToMax(TWENTYEIGHT)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE | TWENTYTWO | TWENTYTHREE | TWENTYFOUR | TWENTYFIVE | TWENTYSIX | TWENTYSEVEN | TWENTYEIGHT);
      expect(asmdomain_createRangeZeroToMax(TWENTYNINE)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE | TWENTYTWO | TWENTYTHREE | TWENTYFOUR | TWENTYFIVE | TWENTYSIX | TWENTYSEVEN | TWENTYEIGHT | TWENTYNINE);
      expect(asmdomain_createRangeZeroToMax(THIRTY)).to.eql(ZERO | ONE | TWO | THREE | FOUR | FIVE | SIX | SEVEN | EIGHT | NINE | TEN | ELEVEN | TWELVE | THIRTEEN | FOURTEEN | FIFTEEN | SIXTEEN | SEVENTEEN | EIGHTEEN | NINETEEN | TWENTY | TWENTYONE | TWENTYTWO | TWENTYTHREE | TWENTYFOUR | TWENTYFIVE | TWENTYSIX | TWENTYSEVEN | TWENTYEIGHT | TWENTYNINE | THIRTY);
    });
  });

  describe('asmdomain_getValue', function() {

    it('should return NOT_FOUND if the domain is empty', function() {
      let A = specDomainSmallEmpty();
      expect(asmdomain_getValue(A)).to.equal(NOT_FOUND);
    });

    it('should return the value for each possible solved domain and NOT_FOUND otherwise', function() {
      for (let i = 0; i <= 30; ++i) {
        expect(asmdomain_getValue(specDomainSmallNums(i)), 'i=' + i).to.equal(i);
        expect(asmdomain_getValue(specDomainSmallNums(0, i, 30)), 'i=0,' + i + ',30').to.equal(NOT_FOUND);
      }
    });
  });

  describe('asmdomain_intersection', function() {

    it('should handle empty domains', function() {
      expect(asmdomain_intersection(specDomainSmallEmpty(), specDomainSmallEmpty())).to.eql(EMPTY);
    });

    it('should handle one empty domain', function() {
      expect(asmdomain_intersection(specDomainSmallRange(0, 1), specDomainSmallEmpty())).to.eql(specDomainSmallEmpty());
      expect(asmdomain_intersection(specDomainSmallEmpty(), specDomainSmallRange(0, 1))).to.eql(specDomainSmallEmpty());
    });

    it('should handle empty domain with multi range domain', function() {
      expect(asmdomain_intersection(specDomainSmallNums(0, 1, 3, 4, 5), specDomainSmallEmpty())).to.eql(specDomainSmallEmpty());
      expect(asmdomain_intersection(specDomainSmallEmpty(), specDomainSmallNums(0, 1, 3, 4, 5))).to.eql(specDomainSmallEmpty());
    });

    it('should handle single range domains', function() {
      expect(asmdomain_intersection(specDomainSmallRange(0, 1), specDomainSmallRange(3, 5))).to.eql(specDomainSmallEmpty());
      expect(asmdomain_intersection(specDomainSmallRange(3, 5), specDomainSmallRange(0, 1))).to.eql(specDomainSmallEmpty());
    });

    it('should intersect single range domains', function() {
      expect(asmdomain_intersection(specDomainSmallRange(0, 5), specDomainSmallRange(3, 10))).to.eql(specDomainSmallRange(3, 5));
      expect(asmdomain_intersection(specDomainSmallRange(3, 10), specDomainSmallRange(0, 5))).to.eql(specDomainSmallRange(3, 5));
    });

    it('should handle single range domain with multi range domain', function() {
      expect(asmdomain_intersection(specDomainSmallRange(10, 15), specDomainSmallRange(0, 1))).to.eql(specDomainSmallEmpty());
      expect(asmdomain_intersection(specDomainSmallRange(0, 1), specDomainSmallRange(10, 15))).to.eql(specDomainSmallEmpty());
    });

    it('should handle multi range domain with single range domain', function() {
      expect(asmdomain_intersection(specDomainSmallNums(5, 6, 7), specDomainSmallNums(0, 1, 10, 11, 12, 13, 14, 15))).to.eql(specDomainSmallEmpty());
      expect(asmdomain_intersection(specDomainSmallNums(0, 1, 10, 11, 12, 13, 14, 15), specDomainSmallNums(5, 6, 7))).to.eql(specDomainSmallEmpty());
    });

    it('should intersect single range domain with multi range domain', function() {
      expect(asmdomain_intersection(specDomainSmallNums(0, 1, 10, 11, 12, 13, 14, 15), specDomainSmallRange(5, 15))).to.eql(specDomainSmallRange(10, 15));
      expect(asmdomain_intersection(specDomainSmallRange(5, 15), specDomainSmallNums(0, 1, 10, 11, 12, 13, 14, 15))).to.eql(specDomainSmallRange(10, 15));
    });

    it('should return two ranges if a range in one domain intersects with two ranges of the other domain', function() {
      expect(asmdomain_intersection(specDomainSmallRange(5, 10), specDomainSmallNums(4, 5, 6, 9, 10, 11))).to.eql(specDomainSmallNums(5, 6, 9, 10));
      expect(asmdomain_intersection(specDomainSmallNums(4, 5, 6, 9, 10, 11), specDomainSmallRange(5, 10))).to.eql(specDomainSmallNums(5, 6, 9, 10));
    });
  });

  describe('asmdomain_isSolved', function() {

    it('should accept single values for each valid value', function() {
      for (let i = 0; i <= 30; ++i) {
        expect(asmdomain_isSolved(specDomainSmallNums(i)), 'i=' + i).to.equal(1);
      }
    });

    it('should see double values', function() {
      expect(asmdomain_isSolved(specDomainSmallNums(0, 1))).to.equal(0);
      expect(asmdomain_isSolved(specDomainSmallNums(0, 10))).to.equal(0);
      expect(asmdomain_isSolved(specDomainSmallNums(0, 15))).to.equal(0);
      expect(asmdomain_isSolved(specDomainSmallNums(10, 15))).to.equal(0);
      expect(asmdomain_isSolved(specDomainSmallNums(4, 6))).to.equal(0);
    });

    it('should see multiple values', function() {
      expect(asmdomain_isSolved(specDomainSmallNums(2, 5, 7, 9, 11, 12))).to.equal(0);
    });

    it('should return false for entire range', function() {
      expect(asmdomain_isSolved(specDomainSmallRange(0, 30))).to.equal(0);
    });

    it('should return false for empty', function() {
      expect(asmdomain_isSolved(specDomainSmallEmpty())).to.equal(0);
    });
  });

  describe('asmdomain_isUndetermined', function() {

    it('should accept single values for each valid value', function() {
      for (let i = 0; i <= 30; ++i) {
        expect(asmdomain_isUndetermined(specDomainSmallNums(i))).to.equal(0);
      }
    });

    it('should see double values', function() {
      expect(asmdomain_isUndetermined(specDomainSmallNums(0, 1))).to.equal(1);
      expect(asmdomain_isUndetermined(specDomainSmallNums(0, 10))).to.equal(1);
      expect(asmdomain_isUndetermined(specDomainSmallNums(0, 15))).to.equal(1);
      expect(asmdomain_isUndetermined(specDomainSmallNums(10, 15))).to.equal(1);
      expect(asmdomain_isUndetermined(specDomainSmallNums(4, 6))).to.equal(1);
    });

    it('should see multiple values', function() {
      expect(asmdomain_isUndetermined(specDomainSmallNums(2, 5, 7, 9, 11, 12))).to.equal(1);
    });

    it('should return 1 for entire range', function() {
      expect(asmdomain_isUndetermined(specDomainSmallRange(0, 15))).to.equal(1);
    });

    it('should return 0 for empty', function() {
      expect(asmdomain_isUndetermined(specDomainSmallEmpty())).to.equal(0);
    });
  });

  describe('asmdomain_isValue', function() {

    it('should return false if domain is empty', function() {
      expect(asmdomain_isValue(specDomainSmallEmpty(), 12)).to.equal(0);
    });

    it('should convert missing arg to 0', function() {
      expect(asmdomain_isValue(specDomainSmallNums(1, 2))).to.eql(0);
      expect(asmdomain_isValue(specDomainSmallNums(0, 1, 2))).to.eql(0);
      expect(asmdomain_isValue(specDomainSmallNums(0))).to.eql(1);
    });

    it('should return 0 for negative numbers', function() {
      expect(asmdomain_isValue(specDomainSmallNums(1, 2), -1)).to.eql(0);
    });

    it('should return false if domain has multiple values and one matches', function() {
      expect(asmdomain_isValue(specDomainSmallNums(5, 8, 10), 10)).to.equal(0);
    });

    it('should return true if domain has one value and it is the given value', function() {
      expect(asmdomain_isValue(specDomainSmallNums(0), 0)).to.equal(1);
      expect(asmdomain_isValue(specDomainSmallNums(1), 1)).to.equal(1);
      expect(asmdomain_isValue(specDomainSmallNums(10), 10)).to.equal(1);
      expect(asmdomain_isValue(specDomainSmallNums(15), 15)).to.equal(1);
    });

    it('should return false if domain does not match', function() {
      expect(asmdomain_isValue(specDomainSmallNums(0), 1), 'value 0').to.equal(0);
      expect(asmdomain_isValue(specDomainSmallNums(0, 1), 0), 'bool domain 0').to.equal(0);
      expect(asmdomain_isValue(specDomainSmallNums(0, 1), 1), 'bool domain 1').to.equal(0);
      expect(asmdomain_isValue(specDomainSmallNums(1), 0), 'value 1').to.equal(0);
      expect(asmdomain_isValue(specDomainSmallNums(15), 13), 'value 15').to.equal(0);
    });

    it('should handle values that are OOB for small domains', function() {
      expect(asmdomain_isValue(specDomainSmallNums(8), 16)).to.equal(0);
      expect(asmdomain_isValue(specDomainSmallNums(8), 300)).to.equal(0);
    });
  });

  describe('asmdomain_max', function() {

    it('should return NO_SUCH_VALUE for empty domains', function() {
      expect(asmdomain_max(EMPTY)).to.eql(NO_SUCH_VALUE);
    });

    it('should work for all small domains with single range', function() {
      for (let i = 0; i <= 30; ++i) {
        for (let j = i; j <= 30; ++j) {
          expect(asmdomain_max(specDomainSmallRange(i, j)), 'new: ' + i + '~' + j).to.eql(j);
        }
      }
    });
  });

  describe('asmdomain_min', function() {

    it('should return NO_SUCH_VALUE for empty domains', function() {
      expect(asmdomain_min(EMPTY)).to.eql(NO_SUCH_VALUE);
    });

    it('should work for all small domains with single range', function() {
      for (let i = 0; i <= 30; ++i) {
        for (let j = i; j <= 30; ++j) {
          expect(asmdomain_min(specDomainSmallRange(i, j)), 'new: ' + i + '~' + j).to.eql(i);
        }
      }
    });
  });

  describe('asmdomain_removeGte', function() {

    function gteTest(domain, value, expected) {
      it(`should gte [${domain}] >= ${value} -> [${expected}]`, function() {
        let result = asmdomain_removeGte(domain, value);

        expect(result).to.eql(expected);
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

  describe('asmdomain_removeLte', function() {

    function lteTest(domain, value, expected) {
      it(`should lte [${domain}] <= ${value} -> [${expected}]`, function() {
        let result = asmdomain_removeLte(domain, value);

        expect(result).to.eql(expected);
      });
    }

    lteTest(specDomainSmallNums(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10), 5, specDomainSmallNums(6, 7, 8, 9, 10));
    lteTest(specDomainSmallNums(4, 5, 6, 8, 9), 5, specDomainSmallNums(6, 8, 9));
    lteTest(specDomainSmallNums(4, 5, 8, 9), 5, specDomainSmallNums(8, 9));
    lteTest(specDomainSmallNums(5, 6, 7, 9), 5, specDomainSmallNums(6, 7, 9));
    lteTest(specDomainSmallNums(5, 8, 9), 5, specDomainSmallNums(8, 9));
    lteTest(specDomainSmallNums(5), 5, EMPTY);
    lteTest(specDomainSmallNums(6, 7, 8), 5, specDomainSmallNums(6, 7, 8));
    lteTest(specDomainSmallNums(0, 1, 2, 3, 4), 5, EMPTY);
  });

  describe('asmdomain_removeValue', function() {

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
        expect(asmdomain_removeValue(domain, value)).to.eql(output);
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

  describe('asmdomain_sharesNoElements', function() {

    it('should work for various small domains with single range', function() {
      for (let i = 0; i <= 30; ++i) {
        for (let j = i; j <= 30; ++j) {
          let A = specDomainSmallRange(i, Math.min(j, i + 5));
          let B = specDomainSmallRange(Math.max(i, i + 5), j);
          expect(asmdomain_sharesNoElements(A, B), i + '~' + j).to.eql((A & B) ? 0 : 1);
        }
      }
    });
  });

  describe('asmdomain_size', function() {

    it('should process empty domains', function() {
      expect(asmdomain_size(specDomainSmallEmpty())).to.equal(0);
    });

    it('should count the bits', function() {
      expect(asmdomain_size(specDomainSmallNums(2, 5, 7, 9, 11, 12))).to.equal(6);
    });

    it('should count single values for each valid value', function() {
      for (let i = 0; i <= 30; ++i) {
        expect(asmdomain_size(specDomainSmallNums(i))).to.equal(1);
      }
    });

    it('should count entire range', function() {
      expect(asmdomain_size(specDomainSmallRange(0, 30))).to.equal(31);
    });
  });
});
