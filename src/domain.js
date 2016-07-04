import {
  EMPTY,
  NO_CHANGES,
  NO_SUCH_VALUE,
  NOT_FOUND,
  PAIR_SIZE,
  REJECTED,
  SOME_CHANGES,
  SUB,
  SUP,

  ASSERT,
  ASSERT_DOMAIN,
  ASSERT_DOMAIN_EMPTY_CHECK,
  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK,
  THROW,
} from './helpers';

// BODY_START

let PREV_CHANGED = true;
let FORCE_ARRAY = true;

// CSIS form = Canonical Sorted Interval Sequeunce form.
// Basically means the ranges in the domain are ordered
// ascending and no ranges overlap. We call this "simplified"

//let FIRST_RANGE = 0;
let FIRST_RANGE_LO = 0;
let FIRST_RANGE_HI = 1;
let LO_BOUND = 0;
let HI_BOUND = 1;

// Cache static Math functions
let MIN = Math.min;
let MAX = Math.max;
let FLOOR = Math.floor;
let CEIL = Math.ceil;

const ZERO = 1 << 0;
const ONE = 1 << 1;
const BOOL = ZERO | ONE;
const TWO = 1 << 2;
const THREE = 1 << 3;
const FOUR = 1 << 4;
const FIVE = 1 << 5;
const SIX = 1 << 6;
const SEVEN = 1 << 7;
const EIGHT = 1 << 8;
const NINE = 1 << 9;
const TEN = 1 << 10;
const ELEVEN = 1 << 11;
const TWELVE = 1 << 12;
const THIRTEEN = 1 << 13;
const FOURTEEN = 1 << 14;
const FIFTEEN = 1 << 15;
const SIXTEEN = 1 << 16;
const SEVENTEEN = 1 << 17;
const EIGHTEEN = 1 << 18;
const NINETEEN = 1 << 19;
const TWENTY = 1 << 20;
const TWENTYONE = 1 << 21;
const TWENTYTWO = 1 << 22;
const TWENTYTHREE = 1 << 23;
const TWENTYFOUR = 1 << 24;
const TWENTYFIVE = 1 << 25;
const TWENTYSIX = 1 << 26;
const TWENTYSEVEN = 1 << 27;
const TWENTYEIGHT = 1 << 28;
const TWENTYNINE = 1 << 29;
const THIRTY = 1 << 30;
const NUM_TO_FLAG = [
  ZERO, ONE, TWO, THREE, FOUR,
  FIVE, SIX, SEVEN, EIGHT, NINE,
  TEN, ELEVEN, TWELVE, THIRTEEN, FOURTEEN,
  FIFTEEN, SIXTEEN, SEVENTEEN, EIGHTEEN, NINETEEN,
  TWENTY, TWENTYONE, TWENTYTWO, TWENTYTHREE, TWENTYFOUR,
  TWENTYFIVE, TWENTYSIX, TWENTYSEVEN, TWENTYEIGHT,
  TWENTYNINE, THIRTY,
];
let FLAG_TO_NUM = {};
FLAG_TO_NUM[ZERO] = 0;
FLAG_TO_NUM[ONE] = 1;
FLAG_TO_NUM[TWO] = 2;
FLAG_TO_NUM[THREE] = 3;
FLAG_TO_NUM[FOUR] = 4;
FLAG_TO_NUM[FIVE] = 5;
FLAG_TO_NUM[SIX] = 6;
FLAG_TO_NUM[SEVEN] = 7;
FLAG_TO_NUM[EIGHT] = 8;
FLAG_TO_NUM[NINE] = 9;
FLAG_TO_NUM[TEN] = 10;
FLAG_TO_NUM[ELEVEN] = 11;
FLAG_TO_NUM[TWELVE] = 12;
FLAG_TO_NUM[THIRTEEN] = 13;
FLAG_TO_NUM[FOURTEEN] = 14;
FLAG_TO_NUM[FIFTEEN] = 15;
FLAG_TO_NUM[SIXTEEN] = 16;
FLAG_TO_NUM[SEVENTEEN] = 17;
FLAG_TO_NUM[EIGHTEEN] = 18;
FLAG_TO_NUM[NINETEEN] = 19;
FLAG_TO_NUM[TWENTY] = 20;
FLAG_TO_NUM[TWENTYONE] = 21;
FLAG_TO_NUM[TWENTYTWO] = 22;
FLAG_TO_NUM[TWENTYTHREE] = 23;
FLAG_TO_NUM[TWENTYFOUR] = 24;
FLAG_TO_NUM[TWENTYFIVE] = 25;
FLAG_TO_NUM[TWENTYSIX] = 26;
FLAG_TO_NUM[TWENTYSEVEN] = 27;
FLAG_TO_NUM[TWENTYEIGHT] = 28;
FLAG_TO_NUM[TWENTYNINE] = 29;
FLAG_TO_NUM[THIRTY] = 30;
const SMALL_MAX_NUM = 30;
// there are SMALL_MAX_NUM flags. if they are all on, this is the number value
// (oh and; 1<<31 is negative. >>>0 makes it unsigned. this is why 30 is max.)
const SMALL_MAX_FLAG = (1 << 31 >>> 0) - 1;

/**
 * returns whether domain covers given value
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_containsValue(domain, value) {
  if (typeof domain === 'number') return domain_containsValueNum(domain, value);
  return domain_containsValueArr(domain, value);
}
/**
 * returns whether domain covers given value
 * for numbered domains
 *
 * @param {$domain_num} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_containsValueNum(domain, value) {
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');

  return (domain & (1 << value)) > 0;
}
/**
 * returns whether domain covers given value
 * for array domains
 *
 * @param {$domain_arr} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_containsValueArr(domain, value) {
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain);
  return domain_rangeIndexOfArr(domain, value) !== NOT_FOUND;
}

/**
 * return the range index in given domain that covers given
 * value, or if the domain does not cover it at all
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {number}
 */
function domain_rangeIndexOfArr(domain, value) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  ASSERT_DOMAIN(domain);
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    if (value >= lo && value <= domain[index + 1]) {
      return index;
    }
  }
  return NOT_FOUND;
}

/**
 * @param {$domain} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_isValue(domain, value) {
  if (typeof domain === 'number') return domain_isValueNum(domain, value);
  return domain_isValueArr(domain, value);
}
/**
 * @param {$domain_num} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_isValueNum(domain, value) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  return domain === (1 << value);
}
/**
 * @param {$domain_arr} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_isValueArr(domain, value) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(domain, 'A_EXPECTING_DOMAIN');
  ASSERT_DOMAIN(domain);
  return domain.length === PAIR_SIZE && domain[LO_BOUND] === value && domain[HI_BOUND] === value;
}

/**
 * @param {$domain} domain
 * @returns {number}
 */
function domain_getValue(domain) {
  if (typeof domain === 'number') return domain_getValueNum(domain);
  return domain_getValueArr(domain);
}
/**
 * @param {$domain_num} domain
 * @returns {number}
 */
function domain_getValueNum(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  // With proper ES6 we could consider benchmarking Math.clz32
  // but even then we'd need to verify that the value was solved
  // We could also investigate a simple object hash instead of this switch...
  // Probably a simple check for 0123 and then a hash...?

  switch (domain) {
    case ZERO:
      return 0;
    case ONE:
      return 1;
    case TWO:
      return 2;
    case THREE:
      return 3;
    case FOUR:
      return 4;
    case FIVE:
      return 5;
    case SIX:
      return 6;
    case SEVEN:
      return 7;
    case EIGHT:
      return 8;
    case NINE:
      return 9;
    case TEN:
      return 10;
    case ELEVEN:
      return 11;
    case TWELVE:
      return 12;
    case THIRTEEN:
      return 13;
    case FOURTEEN:
      return 14;
    case FIFTEEN:
      return 15;
    case SIXTEEN:
      return 16;
    case SEVENTEEN:
      return 17;
    case EIGHTEEN:
      return 18;
    case NINETEEN:
      return 19;
    case TWENTY:
      return 20;
    case TWENTYONE:
      return 21;
    case TWENTYTWO:
      return 22;
    case TWENTYTHREE:
      return 23;
    case TWENTYFOUR:
      return 24;
    case TWENTYFIVE:
      return 25;
    case TWENTYSIX:
      return 26;
    case TWENTYSEVEN:
      return 27;
    case TWENTYEIGHT:
      return 28;
    case TWENTYNINE:
      return 29;
    case THIRTY:
      return 30;
  }
  return NO_SUCH_VALUE;
}
/**
 * @param {$domain_arr} domain
 * @returns {number}
 */
function domain_getValueArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  if (domain.length !== PAIR_SIZE) return NO_SUCH_VALUE;
  let lo = domain[LO_BOUND];
  let hi = domain[HI_BOUND];
  if (lo === hi) return lo;
  return NO_SUCH_VALUE;
}

/**
 * list of possible values to domain
 * returns a CSIS domain
 *
 * @param {number[]} list
 * @param {boolean} [clone=true]
 * @param {boolean} [sort=true]
 * @param {boolean} [_forceArray=false] Force creation of an array. Probably to convert a number for certain operations
 * @returns {number[]}
 */
function domain_fromList(list, clone = true, sort = true, _forceArray = false) {
  if (!list.length) return EMPTY;
  if (sort) { // note: the list must be sorted for the algorithm below to work...
    if (clone) { // clone before sorting?
      list = list.slice(0);
    }
    list.sort((a, b) => a - b);
  }

  if (!_forceArray && list[0] >= 0 && list[list.length - 1] <= SMALL_MAX_NUM) {
    // create a number.
    let last = 0; // do confirm whether the list is ordered
    let d = 0;
    for (let i = 0; i < list.length; ++i) {
      let value = list[i];
      ASSERT(value >= last && (last = value) >= 0, 'LIST_SHOULD_BE_ORDERED_BY_NOW');
      d |= NUM_TO_FLAG[value];
    }
    return d;
  }

  let domain = [];
  let hi;
  let lo;
  for (let index = 0; index < list.length; index++) {
    let value = list[index];
    ASSERT(value >= SUB, 'A_OOB_INDICATES_BUG');
    ASSERT(value <= SUP, 'A_OOB_INDICATES_BUG');
    if (index === 0) {
      lo = value;
      hi = value;
    } else {
      ASSERT(value >= hi, 'LIST_SHOULD_BE_ORDERED_BY_NOW'); // imo it should not even contain dupe elements... but that may happen anyways
      if (value > hi + 1) {
        domain.push(lo, hi);
        lo = value;
      }
      hi = value;
    }
  }
  domain.push(lo, hi);
  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK(domain);
  return domain;
}

/**
 * Create a list of values given a numbered domain (bit wise flags)
 *
 * @param {$domain_num} domain
 * @returns {number[]}
 */
function domain_fromFlagsNum(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  if (domain === EMPTY) return [];
  let arr = [];
  let lo = -1;
  let hi = -1;

  if (ZERO & domain) {
    lo = 0;
    hi = 0;
  }
  if (ONE & domain) {
    if (lo !== 0) { // lo is either 0 or nothing
      lo = 1;
    }
    hi = 1; // there cannot be a gap yet
  }
  if (TWO & domain) {
    if (hi === 0) {
      arr.push(0, 0);
      lo = 2;
    } else if (hi !== 1) {
      // if hi isnt 0 and hi isnt 1 then hi isnt set and so lo isnt set
      lo = 2;
    }
    hi = 2;
  }
  if (THREE & domain) {
    if (hi < 0) { // this is the LSB that is set
      lo = 3;
    } else if (hi !== 2) { // there's a gap so push prev range now
      arr.push(lo, hi);
      lo = 3;
    }
    hi = 3;
  }
  // is the fifth bit or higher even set at all? for ~85% that is not the case at this point
  if (domain >= FOUR) {
    for (let i = 4; i <= SMALL_MAX_NUM; ++i) {
      if (NUM_TO_FLAG[i] & domain) {
        if (hi < 0) { // this is the LSB that is set
          lo = i;
        } else if (hi !== i - 1) { // there's a gap so push prev range now
          arr.push(lo, hi);
          lo = i;
        }
        hi = i;
      }
    }
  }

  // since the domain wasn't empty (checked at start) there
  // must now be an unpushed lo/hi pair left to push...
  arr.push(lo, hi);

  return arr;
}

/**
 * domain to list of possible values
 *
 * @param {$domain} domain
 * @returns {number[]}
 */
function domain_toList(domain) {
  if (typeof domain === 'number') return domain_toListNum(domain);
  return domain_toListArr(domain);
}
/**
 * domain to list of possible values
 *
 * @param {$domain_num} domain
 * @returns {number[]}
 */
function domain_toListNum(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  let list = [];
  for (let i = 0; i < 16; ++i) {
    if ((domain & NUM_TO_FLAG[i]) > 0) list.push(i);
  }
  return list;
}
/**
 * domain to list of possible values
 *
 * @param {$domain_arr} domain
 * @returns {number[]}
 */
function domain_toListArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(domain, 'A_EXPECTING_DOMAIN');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  let list = [];
  for (let i = 0; i < domain.length; i += PAIR_SIZE) {
    for (let n = domain[i], m = domain[i + 1]; n <= m; ++n) {
      list.push(n);
    }
  }
  return list;
}

/**
 * Given a list and domain, search items in the list in the domain and remove
 * the first element found this way, then return a deep clone of that result
 * Given domain is not harmed in this process.
 * If no items from list can be found, this function returns the empty domain.
 *
 * @param {$domain} domain
 * @param {number[]} list
 * @returns {$domain|number} NO_SUCH_VALUE (-1) means the result is empty, non-zero means new small domain
 */
function domain_removeNextFromList(domain, list) {
  if (typeof domain === 'number') return domain_removeNextFromListNum(domain, list);
  return domain_removeNextFromListArr(domain, list);
}
/**
 * Given a list and domain, search items in the list in the domain and remove
 * the first element found this way, then return a deep clone of that result
 * Given domain is not harmed in this process.
 * If no items from list can be found, this function returns the empty domain.
 *
 * @param {$domain_num} domain
 * @param {number[]} list
 * @returns {$domain|number} NO_SUCH_VALUE (-1) means the result is empty, non-zero means new small domain
 */
function domain_removeNextFromListNum(domain, list) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT(list, 'A_EXPECTING_LIST');
  for (let i = 0; i < list.length; ++i) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG');
    if (value < SMALL_MAX_NUM) { // 1<<100 = 16. non-small-domain numbers are valid here. so check.
      let flag = 1 << value;
      if (domain & flag) return domain ^ flag; // if the bit is set; unset it
    }
  }
  return NO_SUCH_VALUE;
}
/**
 * Given a list and domain, search items in the list in the domain and remove
 * the first element found this way, then return a deep clone of that result
 * Given domain is not harmed in this process.
 * If no items from list can be found, this function returns the empty domain.
 *
 * @param {$domain_arr} domain
 * @param {number[]} list
 * @returns {$domain|number} NO_SUCH_VALUE (-1) means the result is empty, non-zero means new small domain
 */
function domain_removeNextFromListArr(domain, list) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(list, 'A_EXPECTING_LIST');
  ASSERT(domain, 'A_EXPECTING_DOMAIN');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);

  for (let i = 0; i < list.length; i++) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG');
    let index = domain_rangeIndexOfArr(domain, value);
    if (index >= 0) {
      return _domain_deepCloneWithoutValueArr(domain, value, index);
    }
  }

  return NO_SUCH_VALUE;
}

/**
 * Return domain but without the value at given rangeIndex.
 * Does not update inline.
 * The rangeIndex should already be known and correct and
 * be the index of the lo of the range containing value.
 *
 * @param {$domain_arr} domain
 * @param {number} value
 * @param {number} rangeIndex
 * @returns {$domain}
 */
function _domain_deepCloneWithoutValueArr(domain, value, rangeIndex) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof value === 'number', 'VALUE_MUST_BE_A_NUMBER');
  ASSERT(typeof rangeIndex === 'number', 'RANGE_INDEX_MUST_BE_A_NUMBER');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  ASSERT(domain[rangeIndex] <= value, 'RANGE_LO_MUST_BE_LTE_VALUE');
  ASSERT(domain[rangeIndex + 1] >= value, 'RANGE_HI_MUST_BE_GTE_VALUE');

  // we have the range offset that should contain the value. the clone wont
  // affect ranges before or after. but we want to prevent a splice or shifts, so:
  let result;
  if (rangeIndex) {
    result = domain.slice(0, rangeIndex);
  } else {
    result = [];
  }

  for (let i = rangeIndex; i < domain.length; i += PAIR_SIZE) {
    let lo = domain[i];
    let hi = domain[i + 1];
    if (i !== rangeIndex) {
      result.push(lo, hi);
    } else { // so index is rangeIndex, so split
      if (lo !== value) {
        result.push(lo, value - 1);
      }
      if (hi !== value) {
        result.push(value + 1, hi);
      }
    }
  }

  ASSERT_DOMAIN(result);
  return result;
}

/**
 * @param {$domain} domain
 * @param {number[]} list
 * @returns {number} Can return NO_SUCH_VALUE
 */
function domain_getValueOfFirstContainedValueInList(domain, list) {
  if (typeof domain === 'number') return domain_getValueOfFirstContainedValueInListNum(domain, list);
  return domain_getValueOfFirstContainedValueInListArr(domain, list);
}
/**
 * @param {$domain_num} domain
 * @param {number[]} list
 * @returns {number} Can return NO_SUCH_VALUE
 */
function domain_getValueOfFirstContainedValueInListNum(domain, list) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_DOMAIN');
  ASSERT(list, 'EXPECTING_LIST');
  for (let i = 0; i < list.length; ++i) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG'); // internally all domains elements should be sound; SUB>=n>=SUP
    if (value <= SMALL_MAX_NUM && (domain & NUM_TO_FLAG[value]) > 0) return value;
  }
  return NO_SUCH_VALUE;
}
/**
 * @param {$domain_arr} domain
 * @param {number[]} list
 * @returns {number} Can return NO_SUCH_VALUE
 */
function domain_getValueOfFirstContainedValueInListArr(domain, list) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_DOMAIN');
  ASSERT(list, 'EXPECTING_LIST');
  ASSERT_DOMAIN(domain);
  for (let i = 0; i < list.length; i++) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG'); // internally all domains elements should be sound; SUB>=n>=SUP
    if (domain_containsValueArr(domain, value)) {
      return value;
    }
  }
  return NO_SUCH_VALUE;
}

/**
 * The complement of a domain is such that domain U domain' = [SUB, SUP].
 * Assumes domain is in CSIS form
 * Returns a domain that covers any range in (SUB...SUP) that was not covered by given domain
 *
 * @param {$domain} domain
 * @returns {$domain}
 */
function domain_complement(domain) {
  // for simplicity sake, convert them back to arrays
  // TODO: i think we could just bitwise invert, convert to domain, swap out last element with SUP
  domain = domain_toArr(domain);

  ASSERT(domain, 'A_EXPECTING_A_DOMAIN');
  ASSERT_DOMAIN(domain); // should we reject for empty domains?
  if (!domain.length) THROW('EMPTY_DOMAIN_PROBABLY_BUG');

  let end = SUB;
  let result = [];
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    ASSERT(!end || end < lo, 'domain is supposed to be csis, so ranges dont overlap nor touch');
    if (lo > SUB) { // prevent [SUB,SUB] if first range starts at SUB; that'd be bad
      result.push(end, lo - 1);
    }
    end = domain[index + 1] + 1;
  }

  if (end <= SUP) { // <= so SUP is inclusive...
    result.push(end, SUP);
  }

  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK(domain);
  return result;
}

/**
 * All ranges will be ordered ascending and overlapping ranges are merged
 * This function first checks whether simplification is needed at all
 *
 * @param {$pairs|$domain_arr} domain
 * @returns {$domain}
 */
function domain_simplifyInlineArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(domain !== undefined, 'DOMAIN_REQUIRED');

  if (domain.length <= 2) return domain;

  // order ranges by lower bound, ascending (inline regardless)
  _domain_sortByRangeInline(domain);
  return _domain_mergeOverlappingInline(domain);
}
/**
 * @param {$domain_arr} domain
 */
function _domain_sortByRangeInline(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  let len = domain.length;
  ASSERT(len > 0, 'A_DOMAIN_SHOULD_NOT_BE_EMPTY');
  if (len >= 4) {
    _domain_quickSortInline(domain, 0, domain.length - PAIR_SIZE);
  }
}
/**
 * @param {$domain_arr} domain
 * @param {number} first
 * @param {number} last
 */
function _domain_quickSortInline(domain, first, last) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  if (first < last) {
    let pivot = _domain_partitionInline(domain, first, last);
    _domain_quickSortInline(domain, first, pivot - PAIR_SIZE);
    _domain_quickSortInline(domain, pivot + PAIR_SIZE, last);
  }
}
/**
 * @param {$domain_arr} domain
 * @param {number} first
 * @param {number} last
 * @returns {number}
 */
function _domain_partitionInline(domain, first, last) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  let pivotIndex = last;
  let pivot = domain[pivotIndex]; // TODO: i think we'd be better off with a different pivot? middle probably performs better
  let pivotR = domain[pivotIndex + 1];

  let index = first;
  for (let i = first; i < last; i += PAIR_SIZE) {
    let L = domain[i];
    if (L < pivot || (L === pivot && domain[i + 1] < pivotR)) {
      _domain_swapRangeInline(domain, index, i);
      index += PAIR_SIZE;
    }
  }
  _domain_swapRangeInline(domain, index, last);
  return index;
}
/**
 * @param {$domain_arr} domain
 * @param {number} A
 * @param {number} B
 * @private
 */
function _domain_swapRangeInline(domain, A, B) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  if (A !== B) {
    let x = domain[A];
    let y = domain[A + 1];
    domain[A] = domain[B];
    domain[A + 1] = domain[B + 1];
    domain[B] = x;
    domain[B + 1] = y;
  }
};
/**
 * @param {$domain_arr} domain
 * @returns {$domain}
 */
function _domain_mergeOverlappingInline(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  // assumes domain is sorted
  // assumes all ranges are "sound" (lo<=hi)
  let prevHi = SUB;
  let prevHiIndex = 0;
  let writeIndex = 0;
  for (let i = 0; i < domain.length; i += PAIR_SIZE) {
    let lo = domain[i];
    let hi = domain[i + 1];
    ASSERT(lo <= hi, 'ranges should be ascending');

    // in an ordered domain two consecutive ranges touch or overlap if the left-hi+1 is higher or equal to the right-lo
    if (prevHi + 1 >= lo && i !== 0) {
      // touching or overlapping.
      // note: prev and curr may completely enclose one another
      // Update the prev hi so prev covers both ranges, in any case
      if (hi > prevHi) {
        domain[prevHiIndex] = hi;
        prevHi = hi;
      }
    } else {
      domain[writeIndex] = lo;
      domain[writeIndex + 1] = hi;
      prevHiIndex = writeIndex + 1;
      writeIndex += PAIR_SIZE;
      prevHi = hi;
    }
  }
  domain.length = writeIndex; // if `domain` was a larger at the start this ensures extra elements are dropped from it
  for (let i = 0; i < domain.length; i++) {
    let test = domain[i];
    ASSERT(test >= SUB, 'merge should not result in sparse array');
    ASSERT(test <= SUP, 'should be within bounds');
  }
  return domain;
}

/**
 * Check if given domain is in simplified, CSIS form
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isSimplified(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  ASSERT(domain, 'A_EXPECTING_DOMAIN');
  if (domain.length === PAIR_SIZE) {
    ASSERT(domain[FIRST_RANGE_LO] >= SUB, 'A_RANGES_SHOULD_BE_GTE_SUB');
    ASSERT(domain[FIRST_RANGE_HI] <= SUP, 'A_RANGES_SHOULD_BE_LTE_SUP');
    ASSERT(domain[FIRST_RANGE_LO] <= domain[FIRST_RANGE_HI], 'A_RANGES_SHOULD_ASCEND');
    return true;
  }
  if (domain.length === 0) {
    return true;
  }
  ASSERT((domain.length % PAIR_SIZE) === 0, 'A_SHOULD_BE_EVEN');
  let phi = SUB;
  for (let index = 0, step = PAIR_SIZE; index < domain.length; index += step) {
    let lo = domain[index];
    let hi = domain[index + 1];
    ASSERT(lo >= SUB, 'A_RANGES_SHOULD_BE_GTE_SUB');
    ASSERT(hi <= SUP, 'A_RANGES_SHOULD_BE_LTE_SUP');
    ASSERT(lo <= hi, 'A_RANGES_SHOULD_ASCEND');
    // we need to simplify if the lo of the next range goes before or touches the hi of the previous range
    // TODO: i think it used or intended to optimize this by continueing to process this from the current domain, rather than the start.
    //       this function could return the offset to continue at... or -1 to signal "true"
    if (lo <= phi + 1) {
      return false;
    }
    phi = hi;
  }
  return true;
}

/**
 * Intersect two $domains. Does not harm the domains.
 * Intersection means the result only contains the values
 * that are contained in BOTH domains.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_intersection(domain1, domain2) {
  ASSERT(domain1 || domain1 === EMPTY && domain2 || domain2 === EMPTY, 'A_EXPECTING_TWO_DOMAINS');
  if (domain1 === domain2) return domain1;
  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';
  if (isNum1 && isNum2) return domain1 & domain2;
  if (isNum1) return domain_intersectionNumArr(domain1, domain2);
  if (isNum2) return domain_intersectionNumArr(domain2, domain1); // swapped!
  return domain_intersectionArrArr(domain1, domain2);
}
/**
 * Intersect the domain assuming domain1 is a numbered (small)
 * domain and domain2 is an array domain. The result will always
 * be a small domain and that's what this function intends to
 * optimize.
 *
 * @param {$domain_num} domain1
 * @param {$domain_arr} domain2
 * @returns {$domain_num}
 */
function domain_intersectionNumArr(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'ONLY_WITH_NUMBERS');
  ASSERT(typeof domain2 !== 'number', 'NOT_WITH_NUMBERS');

  let domain = EMPTY;
  for (let i = 0; i < domain2.length; i += PAIR_SIZE) {
    let lo = domain2[i];
    if (lo > SMALL_MAX_NUM) break;
    let hi = domain2[i + 1];

    for (let j = lo, m = MIN(SMALL_MAX_NUM, hi); j <= m; ++j) {
      let flag = NUM_TO_FLAG[j];
      if (domain1 & flag) domain |= flag; // could be: domain |= domain1 & NUMBER[j]; but this reads better?
    }
  }

  return domain;
}
/**
 * Intersect two $domains. Does not harm the domains.
 * Intersection means the result only contains the values
 * that are contained in BOTH domains.
 *
 * @param {$domain_arr} domain1
 * @param {$domain_arr} domain2
 * @returns {$domain}
 */
function domain_intersectionArrArr(domain1, domain2) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT(domain1 && domain2, 'A_EXPECTING_TWO_DOMAINS');

  let result = [];
  _domain_intersectionArrArr(domain1, domain2, result);
  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK(result);
  return domain_numarr(result);
}
/**
 * Recursively calls itself
 *
 * @param {$domain_arr} dom1
 * @param {$domain_arr} dom2
 * @param {$domain_arr} result
 */
function _domain_intersectionArrArr(dom1, dom2, result) {
  ASSERT(typeof dom1 !== 'number', 'SHOULD_NOT_BE_USED_WITH_NUMBERS');
  ASSERT(typeof dom2 !== 'number', 'SHOULD_NOT_BE_USED_WITH_NUMBERS');
  ASSERT(typeof result !== 'number', 'SHOULD_NOT_BE_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(dom1, 'EXPECTING_DOMAIN');
  ASSERT_DOMAIN(dom2, 'EXPECTING_DOMAIN');
  ASSERT_DOMAIN(result, 'EXPECTING_DOMAIN');
  let len1 = dom1.length;
  let len2 = dom2.length;

  ASSERT(len1 % PAIR_SIZE === 0, 'domains should have an even len');
  ASSERT(len2 % PAIR_SIZE === 0, 'domains should have an even len');

  if (len1 === 0 || len2 === 0) {
    return;
  }

  if (len1 === PAIR_SIZE) {
    if (len2 === PAIR_SIZE) {
      _domain_intersectRangeBound(dom1[LO_BOUND], dom1[HI_BOUND], dom2[LO_BOUND], dom2[HI_BOUND], result);
    } else {
      _domain_intersectionArrArr(dom2, dom1, result);
    }
  } else if (len2 === PAIR_SIZE) {
    _domain_intersectBoundsInto(dom1, dom2[LO_BOUND], dom2[HI_BOUND], result);
  } else {
    // Worst case. Both lengths are > 1. Divide and conquer.
    // Note: since the array contains pairs, make sure i and j are even.
    // but since they can only contain pairs, they must be even
    let i = ((len1 / PAIR_SIZE) >> 1) * PAIR_SIZE;
    let j = ((len2 / PAIR_SIZE) >> 1) * PAIR_SIZE;
    ASSERT(i % PAIR_SIZE === 0, `i should be even ${i}`);
    ASSERT(j % PAIR_SIZE === 0, `j should be even ${j}`);
    // TODO: get rid of this slicing, use index ranges instead
    let d1 = dom1.slice(0, i);
    let d2 = dom1.slice(i);
    let d3 = dom2.slice(0, j);
    let d4 = dom2.slice(j);
    _domain_intersectionArrArr(d1, d3, result);
    _domain_intersectionArrArr(d1, d4, result);
    _domain_intersectionArrArr(d2, d3, result);
    _domain_intersectionArrArr(d2, d4, result);
  }
}
/**
 * Add the intersection of two domains to result domain
 *
 * @param {number} lo1
 * @param {number} hi1
 * @param {number} lo2
 * @param {number} hi2
 * @param {$domain_arr} result
 */
function _domain_intersectRangeBound(lo1, hi1, lo2, hi2, result) {
  let min = MAX(lo1, lo2);
  let max = MIN(hi1, hi2);
  if (max >= min) {
    result.push(min, max);
  }
}
/**
 * Does not update domain, updates result
 *
 * @param {$domain_arr} domain
 * @param {number} lo
 * @param {number} hi
 * @param {$domain_arr} result
 */
function _domain_intersectBoundsInto(domain, lo, hi, result) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo2 = domain[index];
    let hi2 = domain[index + 1];
    if (lo2 <= hi && hi2 >= lo) {
      result.push(MAX(lo, lo2), MIN(hi, hi2));
    }
  }
}

/**
 * deep comparison of two $domains
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function domain_isEqual(domain1, domain2) {
  if (domain1 === domain2) return true;

  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';

  if (isNum1 && isNum2) return false;
  if (isNum1) return domain_isEqualNumArr(domain1, domain2);
  if (isNum2) return domain_isEqualNumArr(domain2, domain1); // swapped!
  return domain_isEqualArrArr(domain1, domain2);
}
/**
 * @param {$domain_num} domain1
 * @param {$domain_arr} domain2
 * @return {boolean}
 */
function domain_isEqualNumArr(domain1, domain2) {
  if (domain_max(domain2) > SMALL_MAX_NUM) return false;

  // fast checks
  let lod = domain2[LO_BOUND];
  if (domain1 & ZERO && lod > 0) return false;
  if (domain1 & ONE && lod > 1) return false;

  for (let i = 0, n = domain2.length; i < n; i += PAIR_SIZE) {
    let lo = domain2[i];
    if (lo > SMALL_MAX_NUM) break;
    let hi = domain2[i + 1];

    for (let j = lo, m = MIN(SMALL_MAX_NUM, hi); j <= m; ++j) {
      let flag = NUM_TO_FLAG[j];
      if (domain1 ^ flag) return false; // x^y is only "truthy" if x does not contain flag y
    }
  }
  return true;
}
/**
 * @param {$domain_arr} domain1
 * @param {$domain_arr} domain2
 * @returns {boolean}
 */
function domain_isEqualArrArr(domain1, domain2) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);

  let len = domain1.length;

  if (len !== domain2.length) {
    return false;
  }

  if (domain1 === domain2) { // does this ever happen?
    return true;
  }

  return _domain_isEqualArrArr(domain1, domain2, len);
}
/**
 * @param {$domain_arr} domain1
 * @param {$domain_arr} domain2
 * @param {number} len
 * @returns {boolean}
 */
function _domain_isEqualArrArr(domain1, domain2, len) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS');

  for (let i = 0; i < len; ++i) {
    if (domain1[i] !== domain2[i]) {
      return false;
    }
  }
  return true;
}

/**
 * The idea behind this function - which is primarily
 * intended for domain_plus and domain_minus and probably applies
 * to nothing else - is that when adding two intervals,
 * both intervals expand by the other's amount. This means
 * that when given two segmented domains, each continuous
 * subdomain expands by at least the interval of the smallest
 * subdomain of the other segmented domain. When such an expansion
 * occurs, any gaps between subdomains that are <= the smallest
 * subdomain's interval width get filled up, which we can exploit
 * to reduce the number of segments in a domain. Reducing the
 * number of domain segments helps reduce the N^2 complexity of
 * the subsequent domain consistent interval addition method.
 *
 * @param {$domain_arr} domain1
 * @param {$domain_arr} domain2
 * @returns {$domain_arr[]}
 */
function domain_closeGapsArr(domain1, domain2) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS');

  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT(domain1 && domain2, 'A_EXPECTING_TWO_DOMAINS');

  let change;
  do {
    change = NO_CHANGES;

    if (domain1.length > 2) {
      let domain = _domain_closeGapsFreshArr(domain1, _domain_smallestIntervalWidthArr(domain2));
      change += domain1.length - domain.length;
      domain1 = domain;
    }

    if (domain2.length > 2) {
      let domain = _domain_closeGapsFreshArr(domain2, _domain_smallestIntervalWidthArr(domain1));
      change += domain2.length - domain.length;
      domain2 = domain;
    }
  } while (change !== NO_CHANGES);

  return [
    domain1,
    domain2,
  ];
}
/**
 * Closes all the gaps between the intervals according to
 * the given gap value. All gaps less than this gap are closed.
 * Domain is not harmed
 *
 * @param {$domain_arr} domain
 * @param {number} gap
 * @returns {$domain}
 */
function _domain_closeGapsFreshArr(domain, gap) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  ASSERT_DOMAIN(domain);
  let result = [];
  let plo;
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    let hi = domain[index + 1];
    if (index === 0) {
      result.push(lo, hi);
      plo = lo;
    } else {
      if (hi - plo < gap) {
        result[result.length - 1] = hi;
      } else {
        result.push(lo, hi);
        plo = lo;
      }
    }
  }
  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK(result);
  return result;
}
/**
 * @param {$domain_arr} domain
 * @returns {number}
 */
function _domain_smallestIntervalWidthArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  let min_width = SUP;
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    let hi = domain[index + 1];
    let width = 1 + hi - lo;
    if (width < min_width) {
      min_width = width;
    }
  }
  return min_width;
}

/**
 * Does not harm input domains
 *
 * Note that this one isn't domain consistent.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_mul(domain1, domain2) {
  // for simplicity sake, convert them back to arrays
  if (typeof domain1 === 'number') domain1 = domain_fromFlagsNum(domain1);
  if (typeof domain2 === 'number') domain2 = domain_fromFlagsNum(domain2);

  // TODO domain_mulNum
  return domain_mulArr(domain1, domain2);
}
/**
 * Does not harm input domains
 *
 * Note that this one isn't domain consistent.
 *
 * @param {$domain_arr} domain1
 * @param {$domain_arr} domain2
 * @returns {$domain_arr}
 */
function domain_mulArr(domain1, domain2) {
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT(domain1 && domain2, 'A_EXPECTING_TWO_DOMAINS');

  let result = [];
  for (let i = 0; i < domain1.length; i += PAIR_SIZE) {
    let loi = domain1[i];
    let hii = domain1[i + 1];

    for (let j = 0; j < domain2.length; j += PAIR_SIZE) {
      let loj = domain2[j];
      let hij = domain2[j + 1];

      result.push(MIN(SUP, loi * loj), MIN(SUP, hii * hij));
    }
  }

  return domain_simplifyInlineArr(result);
}

/**
 * Divide one range by another
 * Result has any integer values that are equal or between
 * the real results. This means fractions are floored/ceiled.
 * This is an expensive operation.
 * Zero is a special case.
 *
 * Does not harm input domains
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {boolean} [floorFractions=true] Include the floored lo of the resulting ranges?
 *         For example, <5,5>/<2,2> is <2.5,2.5>. If this flag is true, it will include
 *         <2,2>, otherwise it will not include anything for that division.
 * @returns {$domain}
 */
function domain_divby(domain1, domain2, floorFractions = true) {
  // for simplicity sake, convert them back to arrays
  if (typeof domain1 === 'number') domain1 = domain_fromFlagsNum(domain1);
  if (typeof domain2 === 'number') domain2 = domain_fromFlagsNum(domain2);

  // TODO: domain_divByNum
  return domain_divbyArrArr(domain1, domain2, floorFractions);
}
/**
 * Divide one range by another
 * Result has any integer values that are equal or between
 * the real results. This means fractions are floored/ceiled.
 * This is an expensive operation.
 * Zero is a special case.
 *
 * Does not harm input domains
 *
 * @param {$domain_arr} domain1
 * @param {$domain_arr} domain2
 * @param {boolean} [floorFractions=true] Include the floored lo of the resulting ranges?
 *         For example, <5,5>/<2,2> is <2.5,2.5>. If this flag is true, it will include
 *         <2,2>, otherwise it will not include anything for that division.
 * @returns {$domain_arr}
 */
function domain_divbyArrArr(domain1, domain2, floorFractions = true) {
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT(domain1 && domain2, 'A_EXPECTING_TWO_DOMAINS');

  let result = [];

  for (let i = 0; i < domain1.length; i += PAIR_SIZE) {
    let loi = domain1[i];
    let hii = domain1[i + 1];

    for (let j = 0; j < domain2.length; j += PAIR_SIZE) {
      let loj = domain2[j];
      let hij = domain2[j + 1];

      // cannot /0
      // we ignore it right now. should we...
      // - add a 0 or SUB or SUP for it
      // - throw an error / issue a warning for it
      if (hij > 0) {
        let lo = loi / hij;
        let hi = loj > 0 ? hii / loj : SUP;

        ASSERT(hi >= 0, 'hi could only be sub zero when domains allow negative numbers', hi);
        // we cant use fractions, so we'll only include any values in the
        // resulting domains that are _above_ the lo and _below_ the hi.
        let left = CEIL(MAX(0, lo));
        let right = FLOOR(hi);

        // if the fraction is within the same integer this could result in
        // lo>hi so we must prevent this case
        if (left <= right) {
          result.push(left, right);
        } else {
          ASSERT(FLOOR(lo) === FLOOR(hi), 'left>right when fraction is in same int, which can happen', lo, hi);
          if (floorFractions) {
            // only use the floored value
            // note: this is a choice. not both floor/ceil because then 5/2=2.5 becomes [2,3]. should be [2,2] or [3,3]
            result.push(right, right);
          }
        }
      }
    }
  }

  return domain_simplifyInlineArr(result);
}

/**
 * Return the number of elements this domain covers
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_size(domain) {
  if (typeof domain === 'number') return domain_sizeNum(domain);
  return domain_sizeArr(domain);
}
/**
 * Return the number of elements this domain covers
 *
 * @param {$domain_num} domain
 * @returns {number}
 */
function domain_sizeNum(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT(domain, 'A_EXPECTING_NONE_EMPTY_DOMAINS');
  return domain_hammingWeight(domain);
}
function domain_hammingWeight(domain) { // "count number of bits set"
  // http://stackoverflow.com/questions/109023/how-to-count-the-number-of-set-bits-in-a-32-bit-integer/109025#109025

  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');

  domain -= ((domain >>> 1) & 0x55555555);
  domain = (domain & 0x33333333) + ((domain >>> 2) & 0x33333333);
  domain = (((domain + (domain >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;

  return domain;

  /*
  // lookup table would be the following. doesn't appear to
  // make a noticeable difference even in stress test.

  // cache this as a constant
  let BITS_SET = new Uint8Array(0xffff);
  for (let i = 0, MAX = 0xffff; i <= MAX; ++i) {
    let domain = i;
    domain -= ((domain >>> 1) & 0x55555555);
    domain = (domain & 0x33333333) + ((domain >>> 2) & 0x33333333);
    domain = (((domain + (domain >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
    BITS_SET[i] = domain;
  }
  // then you can just do
  return BITS_SET[domain];
 */
}
/**
 * Return the number of elements this domain covers
 *
 * @param {$domain_arr} domain
 * @returns {number}
 */
function domain_sizeArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(domain && domain.length, 'A_EXPECTING_NONE_EMPTY_DOMAINS');
  let count = 0;
  for (let i = 0; i < domain.length; i += PAIR_SIZE) {
    let lo = domain[i];
    count += 1 + domain[i + 1] - lo; // TODO: add test to confirm this still works fine if SUB is negative
  }
  return count;
}

/**
 * Get the middle element of all elements in domain.
 * Not hi-lo/2 but the (size/2)th element.
 * For domains with an even number of elements it
 * will take the first value _above_ the middle,
 * in other words; index=ceil(count/2).
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_middleElement(domain) {
  // for simplicity sake, convert them back to arrays
  if (typeof domain === 'number') domain = domain_fromFlagsNum(domain);

  // TODO: domain_middleElementNum(domain);
  return domain_middleElementArr(domain);
}
/**
 * Get the middle element of all elements in domain.
 * Not hi-lo/2 but the (size/2)th element.
 * For domains with an even number of elements it
 * will take the first value _above_ the middle,
 * in other words; index=ceil(count/2).
 *
 * @param {$domain_arr} domain
 * @returns {number}
 */
function domain_middleElementArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  let size = domain_sizeArr(domain);
  let targetValue = FLOOR(size / 2);

  let lo;
  let hi;
  for (let i = 0; i < domain.length; i += PAIR_SIZE) {
    lo = domain[i];
    hi = domain[i + 1];

    let count = 1 + hi - lo;
    if (targetValue < count) {
      break;
    }

    targetValue -= count;
  }

  // `targetValue` should be the `nth` element in the current range (`lo-hi`)
  // so we can use `lo` and add the remainder of `targetValue` to get the mid value
  return lo + targetValue;
}

/**
 * Get lowest value in the domain
 * Only use if callsite doesn't need to cache first range (because array access)
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_min(domain) {
  if (typeof domain === 'number') return domain_minNum(domain);
  return domain_minArr(domain);
}
/**
 * Get lowest value in the domain
 *
 * @param {$domain_num} domain
 * @returns {number}
 */
function domain_minNum(domain) {
  // fast paths: these are by far the most used case in our situation
  if (domain === ZERO) return 0;
  if (domain === ONE) return 1;
  if (domain === BOOL) return 0;

  // TODO: in native es6 we should simply return Math.clz32(), otherwise do it ourselves.

  // Binary hack; from "Hacker's Delight", 2013, 2nd ed. p11, last case:
  // To get a single 0 on the position of the right-most 1 of the input
  // and ones otherwise;
  // ~x|(x-1) -> 0101110100 -> 1111111011
  // we can invert that result to get a single bit result:
  // (~(~x|(x-1))>>>1 -> 0101110100 -> 0000000010
  // we can simplify that to:
  // x&(~x-~1) -> x&(~x+1) -> 0101110100 -> 0000000100
  // this result we can check with a static jump table,
  // instead of having to AND for all possible results

  // basically; there will be one bit set and it will be the lowest
  // one of the input so we can compare to our constants:
  switch (domain & (~domain + 1)) {
    case ZERO: return 0;
    case ONE: return 1;
    case TWO: return 2;
    case THREE: return 3;
    case FOUR: return 4;
    case FIVE: return 5;
    case SIX: return 6;
    case SEVEN: return 7;
    case EIGHT: return 8;
    case NINE: return 9;
    case TEN: return 10;
    case ELEVEN: return 11;
    case TWELVE: return 12;
    case THIRTEEN: return 13;
    case FOURTEEN: return 14;
    case FIFTEEN: return 15;
    case SIXTEEN: return 16;
    case SEVENTEEN: return 17;
    case EIGHTEEN: return 18;
    case NINETEEN: return 19;
    case TWENTY: return 20;
    case TWENTYONE: return 21;
    case TWENTYTWO: return 22;
    case TWENTYTHREE: return 23;
    case TWENTYFOUR: return 24;
    case TWENTYFIVE: return 25;
    case TWENTYSIX: return 26;
    case TWENTYSEVEN: return 27;
    case TWENTYEIGHT: return 28;
    case TWENTYNINE: return 29;
    case THIRTY: return 30;
    default: return THROW('E_OOPSIE');
  }
}
/**
 * Get lowest value in the domain
 * Only use if callsite doesn't use first range again
 *
 * @param {$domain_arr} domain
 * @returns {number}
 */
function domain_minArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  return domain[LO_BOUND];
}

/**
 * Only use if callsite doesn't use last range again
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_max(domain) {
  if (typeof domain === 'number') return domain_maxNum(domain);
  return domain_maxArr(domain);
}
/**
 * Returns highest value in domain
 * Only use if callsite doesn't use last range again
 *
 * @param {$domain_num} domain
 * @returns {number}
 */
function domain_maxNum(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT(domain !== EMPTY, 'NON_EMPTY_DOMAIN_EXPECTED');
  ASSERT(domain > EMPTY, 'CANNOT_BE_EMPTY');
  ASSERT(domain <= SMALL_MAX_FLAG, 'SHOULD_BE_FIXED_DOMAIN');

  // we often deal with domains [0, 0], [0, 1], and [1, 1]
  if (domain === ZERO) return 0;
  if (domain === ONE) return 1;
  if (domain === BOOL) return 1;

  // TODO: probably want to do a quick lt branch here...

  // max cant be 0 or 1 at this point; we already checked those valid cases above
  if (domain < THREE) return 2;
  if (domain < FOUR) return 3;
  if (domain < FIVE) return 4;
  if (domain < SIX) return 5;
  if (domain < SEVEN) return 6;
  if (domain < EIGHT) return 7;
  if (domain < NINE) return 8;
  if (domain < TEN) return 9;
  if (domain < ELEVEN) return 10;
  if (domain < TWELVE) return 11;
  if (domain < THIRTEEN) return 12;
  if (domain < FOURTEEN) return 13;
  if (domain < FIFTEEN) return 14;
  if (domain < SIXTEEN) return 15;
  if (domain < SEVENTEEN) return 16;
  if (domain < EIGHTEEN) return 17;
  if (domain < NINETEEN) return 18;
  if (domain < TWENTY) return 19;
  if (domain < TWENTYONE) return 20;
  if (domain < TWENTYTWO) return 21;
  if (domain < TWENTYTHREE) return 22;
  if (domain < TWENTYFOUR) return 23;
  if (domain < TWENTYFIVE) return 24;
  if (domain < TWENTYSIX) return 25;
  if (domain < TWENTYSEVEN) return 26;
  if (domain < TWENTYEIGHT) return 27;
  if (domain < TWENTYNINE) return 28;
  if (domain < THIRTY) return 29;
  ASSERT(domain & THIRTY, 'SHOULD_BE_30');
  return 30;
}
/**
 * Returns highest value in domain
 * Only use if callsite doesn't use last range again
 *
 * @param {$domain_arr} domain
 * @returns {number}
 */
function domain_maxArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  return domain[domain.length - 1];
}

/**
 * A domain is "solved" if it covers exactly one value. It is not solved if it is empty.
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isSolved(domain) {
  if (typeof domain === 'number') return domain_isSolvedNum(domain);
  return domain_isSolvedArr(domain);
}
/**
 * A domain is "solved" if it covers exactly one value. It is not solved if it is empty.
 *
 * @param {$domain_num} domain
 * @returns {boolean}
 */
function domain_isSolvedNum(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  // http://stackoverflow.com/questions/12483843/test-if-a-bitboard-have-only-one-bit-set-to-1
  return (domain & (domain - 1)) === 0 && domain > 0;
}
/**
 * A domain is "solved" if it covers exactly one value. It is not solved if it is empty.
 *
 * @param {$domain_arr} domain
 * @returns {boolean}
 */
function domain_isSolvedArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain);
  return domain.length === PAIR_SIZE && _domain_firstRangeIsDeterminedArr(domain);
}

/**
 * A domain is "determined" if it's either one value (solved) or none at all (rejected)
 * This is the most called function of the library. 3x more than the number two.
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isUndetermined(domain) {
  if (typeof domain === 'number') return domain_isUndeterminedNum(domain);
  return domain_isUndeterminedArr(domain);
}
/**
 * A domain is "determined" if it's either one value (solved) or none at all (rejected)
 * This is the most called function of the library. 3x more than the number two.
 *
 * @param {$domain_num} domain
 * @returns {boolean}
 */
function domain_isUndeterminedNum(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  // http://stackoverflow.com/questions/12483843/test-if-a-bitboard-have-only-one-bit-set-to-1
  // this would check whether a domain has one bit set
  return (domain & (domain - 1)) !== 0 && domain !== 0;
}
/**
 * A domain is "determined" if it's either one value (solved) or none at all (rejected)
 * This is the most called function of the library. 3x more than the number two.
 *
 * @param {$domain_arr} domain
 * @returns {boolean}
 */
function domain_isUndeterminedArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  // it's probably an error if the domain is empty so make that the last check
  return domain.length > PAIR_SIZE || (domain[LO_BOUND] !== domain[HI_BOUND] && domain.length > 0);
}

/**
 * A domain is "rejected" if it covers no values. This means every given
 * value would break at least one constraint so none could be used.
 *
 * Note: this is the (shared) second most called function of the library
 * (by a third of most, but still significantly more than the rest)
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isRejected(domain) {
  return typeof domain === 'number' ? domain === EMPTY : domain.length === 0;
}

/**
 * @param {$domain_arr} domain
 * @returns {boolean}
 */
function _domain_firstRangeIsDeterminedArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  ASSERT_DOMAIN(domain);
  return domain[LO_BOUND] === domain[HI_BOUND];
}

/**
 * Remove all values from domain that are greater
 * than or equal to given value
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {$domain}
 */
function domain_removeGte(domain, value) {
  if (typeof domain === 'number') return domain_removeGteNum(domain, value);
  return domain_removeGteArr(domain, value);
}
/**
 * Remove all values from domain that are greater
 * than or equal to given value
 *
 * @param {$domain_num} domain
 * @param {number} value
 * @returns {$domain_num}
 */
function domain_removeGteNum(domain, value) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_FOR_NUMBERS');

  ASSERT(SUB >= 0, 'REVISIT_THIS_IF_SUB_CHANGES'); // meh.
  ASSERT(value >= 0, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT'); // so cannot be negative

  // see https://github.com/the-grid/finitedomain/issues/112 for details on this "hack"
  return domain & ((1 << value) - 1);
}
/**
 * Remove any value from domain that is bigger than or equal to given value.
 * Since domains are assumed to be in CSIS form, we can start from the back and
 * search for the first range that is smaller or contains given value. Prune
 * any range that follows it and trim the found range if it contains the value.
 * Returns whether the domain was changed somehow. Does not returned REJECTED
 * because propagator_ltStepBare will check this... I don't like that but it
 * still is the reason.
 * Does not harm domain. May return the same domain (if nothing changes).
 *
 * @param {$domain_arr} domain
 * @param {number} value
 * @returns {$domain}
 */
function domain_removeGteArr(domain, value) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain); // needs to be csis for this trick to work

  let i = 0;
  for (; i < domain.length; i += PAIR_SIZE) {
    // case: v=5
    // 012 456 // => 012 4
    // 012 45  // => 012 4
    // 012 567 // => 012
    // 012 5   // => 012
    // 012 678 // => 012
    // 012     // => NONE
    // 678     // => empty

    // TODO: if we know the returned domain is a small domain we should prevent the slice at all.

    let lo = domain[i];
    let hi = domain[i + 1];

    if (lo > value) {
      if (!i) return EMPTY; // 678 -> empty
      let newDomain = domain.slice(0, i); // 012 789
      if (hi <= SMALL_MAX_NUM) return domain_numarrChecked(newDomain, i);
      return newDomain;
    }
    if (lo === value) {
      if (!i) return EMPTY;
      let newDomain = domain.slice(0, i); // 012 567 -> 012, 012 5 -> 012
      if (hi <= SMALL_MAX_NUM) return domain_numarrChecked(newDomain, i);
      return newDomain;
    }
    if (value <= hi) { // 012 456 -> 012 4, 012 45 -> 012 4
      let newDomain = domain.slice(0, i + 1);
      let newHi = value - 1;
      newDomain.push(newHi);
      if (newHi <= SMALL_MAX_NUM) return domain_numarrChecked(newDomain, i + 2);
      return newDomain;
    }
  }
  return domain; // 012 -> 012
}

/**
 * Remove all values from domain that are lower
 * than or equal to given value
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {$domain}
 */
function domain_removeLte(domain, value) {
  if (typeof domain === 'number') return domain_removeLteNum(domain, value);
  return domain_removeLteArr(domain, value);
}
/**
 * Remove all values from domain that are lower
 * than or equal to given value
 *
 * @param {$domain_num} domain
 * @param {number} value
 * @returns {$domain_num}
 */
function domain_removeLteNum(domain, value) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_FOR_NUMBERS');

  if (value > SMALL_MAX_NUM) value = SMALL_MAX_NUM;
  ASSERT(SUB >= 0, 'REVISIT_THIS_IF_SUB_CHANGES'); // meh.
  ASSERT(value >= SUB, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT');

  // see https://github.com/the-grid/finitedomain/issues/112 for this magic.
  let n = (1 << (value + 1)) - 1;
  // first turn on all left-most bits regardless of state. then we can turn them off by xor. other bits unaffected.
  return (domain | n) ^ n;
}
/**
 * Remove any value from domain that is lesser than or equal to given value.
 * Since domains are assumed to be in CSIS form, we can start from the front and
 * search for the first range that is smaller or contains given value. Prune
 * any range that preceeds it and trim the found range if it contains the value.
 * Returns whether the domain was changed somehow
 * Does not harm domain
 *
 * @param {$domain_arr} domain
 * @param {number} value
 * @returns {$domain}
 */
function domain_removeLteArr(domain, value) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain); // needs to be csis for this trick to work

  let len = domain.length;
  let i = 0;
  for (; i < len; i += PAIR_SIZE) {
    // case: v=5
    // 456 89 => 6 89
    // 45 89  => 89
    // 56 89  => 6 89
    // 5  89  => 5 89
    // 6788   => 67 9
    // 789    => NONE
    // 012    => empty

    let lo = domain[i];
    let hi = domain[i + 1];

    if (lo > value) {
      if (!i) return domain; // 678 -> 678

      // 234 678 -> 678
      let newDomain = domain.slice(i);
      let newLen = len - i;
      if (!newLen) return EMPTY;
      if (newDomain[newLen - 1] <= SMALL_MAX_NUM) return domain_numarrChecked(newDomain, newLen);
      return newDomain;
    }
    if (hi === value) {
      // 45 89  => 89, 5  89  => 5 89
      let newDomain = domain.slice(i + PAIR_SIZE);
      let newLen = len - (i + PAIR_SIZE);
      if (!newLen) return EMPTY;
      if (newDomain[newLen - 1] <= SMALL_MAX_NUM) return domain_numarrChecked(newDomain, newLen);
      return newDomain;
    }
    if (value <= hi) {
      // 456 89 => 6 89, 56 89 => 6 89
      if (i === len) return EMPTY;
      let newDomain = domain.slice(i);
      let newLen = len - i;
      newDomain[LO_BOUND] = value + 1;
      if (newDomain[newLen - 1] <= SMALL_MAX_NUM) return domain_numarrChecked(newDomain, newLen);
      return newDomain;
    }
  }
  return EMPTY; // 012 -> empty
}

/**
 * Remove given value from given domain and return
 * the new domain that doesn't contain it.
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {$domain}
 */
function domain_removeValue(domain, value) {
  if (typeof domain === 'number') return domain_removeValueNum(domain, value);
  return domain_removeValueArr(domain, value);
}
/**
 * @param {$domain_num} domain
 * @param {number} value
 * @returns {$domain_num}
 */
function domain_removeValueNum(domain, value) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT(typeof value === 'number', 'CAN_ONLY_REMOVE_VALUES');

  if (value < 0 || value > SMALL_MAX_NUM) return domain;

  let n = NUM_TO_FLAG[value];
  return (domain | n) ^ n;
}
/**
 * @param {$domain_arr} domain
 * @param {number} value
 * @returns {$domain_arr}
 */
function domain_removeValueArr(domain, value) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(domain, 'EXPECTING_DOMAIN');
  ASSERT(typeof value === 'number', 'CAN_ONLY_REMOVE_VALUES');

  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    let hi = domain[index + 1];
    if (value === lo) {
      let newDomain = domain.slice(0, index);
      if (value !== hi) newDomain.push(value + 1, hi);
      return domain_streamFrom(domain, newDomain, index + PAIR_SIZE);
    }
    if (value === hi) {
      let newDomain = domain.slice(0, index + 1);
      newDomain.push(value - 1); // lo cannot be value as we already checked that
      return domain_streamFrom(domain, newDomain, index + PAIR_SIZE);
    }
    if (value < lo) {
      // value sits between prev range (if not start) and current range so domain
      // does not have it at all. return the input domain to indicate "no change"
      return domain;
    }
    if (value < hi) {
      // split up range to remove the value. we already confirmed that range
      // does not start or end at value, so just split it
      let newDomain = domain.slice(0, index + 1);
      newDomain.push(value - 1, value + 1, hi);
      return domain_streamFrom(domain, newDomain, index + PAIR_SIZE);
    }
  }
  // value must be higher than the max of domain so domain does not contain it
  // return domain to indicate no change
  ASSERT(domain_isRejected(domain) || domain_max(domain) < value, 'MAX_DOMAIN_SHOULD_BE_UNDER_VALUE');
  // "no change"
  return domain;
}

/**
 * Add all elements in source start at index `from` to the target
 *
 * @param {$domain} source
 * @param {$domain} target
 * @param {number} from
 * @returns {$domain}
 */
function domain_streamFrom(source, target, from) {
  for (let i = from; i < source.length; ++i) target.push(source[i]);
  return target;
}

/**
 * Check if every element in one domain not
 * occur in the other domain and vice versa
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function domain_sharesNoElements(domain1, domain2) {
  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';
  if (isNum1 && isNum2) return domain_sharesNoElementsNumNum(domain1, domain2);
  if (isNum1) return domain_sharesNoElementsNumArr(domain1, domain2);
  if (isNum2) return domain_sharesNoElementsNumArr(domain2, domain1);
  return domain_sharesNoElementsArrArr(domain1, domain2);
}
/**
 * Check if every element in one domain not
 * occur in the other domain and vice versa
 *
 * @param {$domain_num} domain1
 * @param {$domain_num} domain2
 * @returns {boolean}
 */
function domain_sharesNoElementsNumNum(domain1, domain2) {
  return (domain1 & domain2) === 0;
}
/**
 * Check if every element in one domain not
 * occur in the other domain and vice versa
 *
 * @param {$domain_num} domain1
 * @param {$domain_arr} domain2
 * @returns {boolean}
 */
function domain_sharesNoElementsNumArr(domain1, domain2) {
  let index = 0;
  while (index < domain2.length) {
    let lo = domain2[index + LO_BOUND];
    let hi = domain2[index + HI_BOUND];
    for (let i = lo, j = Math.min(hi, SMALL_MAX_NUM); i <= j; ++i) { // TODO: add test that confirms <= not <
      if (domain1 & NUM_TO_FLAG[i]) return false;
    }
    index += PAIR_SIZE;
  }
  return true;
}
/**
 * Check if every element in one domain not
 * occur in the other domain and vice versa
 *
 * @param {$domain_arr} domain1
 * @param {$domain_arr} domain2
 * @returns {boolean}
 */
function domain_sharesNoElementsArrArr(domain1, domain2) {
  for (let i = 0; i < domain1.length; i += PAIR_SIZE) {
    let lo = domain1[i + LO_BOUND];
    let hi = domain1[i + HI_BOUND];
    for (let j = 0; j < domain2.length; j += PAIR_SIZE) {
      // if range A is not before or after range B there is overlap
      if (hi >= domain2[j + LO_BOUND] && lo <= domain2[j + HI_BOUND]) {
        // if there is overlap both domains share at least one element
        return false;
      }
    }
  }
  // no range in domain1 proved to overlap with a range in domain2
  return true;
}

/**
 * @param {number} value
 * @returns {$domain}
 */
function domain_createValue(value) {
  if (value >= 0 && value <= SMALL_MAX_NUM) return NUM_TO_FLAG[value];

  ASSERT(value >= SUB, 'domain_createValue: value should be within valid range');
  ASSERT(value <= SUP, 'domain_createValue: value should be within valid range');
  return [value, value];
}
/**
 * @param {number} lo
 * @param {number} hi
 * @returns {$domain}
 */
function domain_createRange(lo, hi) {
  if (lo >= 0 && hi <= SMALL_MAX_NUM) {
    let n = 0;
    for (let i = lo; i <= hi; ++i) {
      n |= NUM_TO_FLAG[i];
    }
    return n;
  }
  return [lo, hi];
}
/**
 * Return a small domain range [0, max(domain)]
 * This is an optimization, using the small domain and
 * comparing it against flags explicitly allows us to
 * skip some trivial steps.
 *
 * @param {$domain_num} domain
 * @returns {$domain_num}
 */
function domain_createRangeZeroToMax(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT(domain !== EMPTY, 'NON_EMPTY_DOMAIN_EXPECTED');
  ASSERT(domain > EMPTY, 'CANNOT_BE_EMPTY');
  ASSERT(domain <= SMALL_MAX_FLAG, 'SHOULD_BE_FIXED_DOMAIN');

  // basically... this trick copies a one to all the positions
  // on its right while zeroes change nothing. that way all zeroes
  // to the right of a one become one but leading zeroes don't change
  // Source: http://stackoverflow.com/questions/53161/find-the-highest-order-bit-in-c
  // (slightly modified for this purpose) which apparently has it from Hacker's Delight.
  domain |= (domain >> 1);
  domain |= (domain >> 2);
  domain |= (domain >> 4);
  domain |= (domain >> 8);
  domain |= (domain >> 16);
  return domain;
}

/**
 * @param {$domain} domain
 * @param {boolean} forceArr Always return in array form?
 * @returns {$domain}
 */
function domain_clone(domain, forceArr) {
  if (typeof domain === 'number') {
    if (forceArr === FORCE_ARRAY) return domain_toArr(domain);
    return domain_cloneNum(domain);
  }
  return domain_cloneArr(domain);
}
/**
 * @param {$domain_num} domain
 * @returns {$domain_num} The same number :)
 */
function domain_cloneNum(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  return domain;
}
/**
 * Shallow clone! Only slices the array
 *
 * @param {$domain_arr} domain
 * @returns {$domain_arr} A slice, only
 */
function domain_cloneArr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  // note: if you want to optimize this to return a number if possible, do update the force array stuff in domain_clone
  return domain.slice(0);
}

/**
 * Get a domain representation in array form
 *
 * @param {$domain} domain
 * @returns {$domain} (small domains will also be arrays)
 */
function domain_toArr(domain) {
  if (typeof domain === 'number') return domain_fromFlagsNum(domain);
  return domain;
}
/**
 * Accept a domain and if it is an array, try to reduce it
 * to a number. Either returns the original input or a
 * numeric representation if the domain fits in a number.
 * Pretty much a noop for numbers since they can't grow to
 * array domains, and by design so.
 *
 * @param {$domain} domain
 * @returns {$domain}
 */
function domain_numarr(domain) {
  if (typeof domain === 'number') return domain;

  let len = domain.length;
  if (len === 0) return 0;

  ASSERT(domain_min(domain) >= SUB, 'SHOULD_BE_VALID_DOMAIN'); // no need to check in dist
  if (domain_max(domain) > SMALL_MAX_NUM) return domain;

  return domain_numarrChecked(domain, len);
}
/**
 * Same as domain_numarr but without protections
 * (as an optimization step). Used internally.
 * Assumes given domain is in array form and that
 * its highest value is <= SMALL_MAX_NUM.
 *
 * @param {$domain_arr} domain
 * @param {number} len Length of the domain array (domain.length! not range count)
 * @returns {$domain_num}
 */
function domain_numarrChecked(domain, len) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBER');
  ASSERT(domain[domain.length - 1] <= SMALL_MAX_NUM, 'SHOULD_BE_SMALL_DOMAIN', domain);
  let out = 0;
  for (let i = 0; i < len; i += PAIR_SIZE) {
    out = domain_addRangeNum(out, domain[i], domain[i + 1]);
  }
  return out;
}

/**
 * Add all numbers within given range [lo, hi) to given (small) domain
 *
 * @param {$domain_num} domain
 * @param {number} from
 * @param {number} to
 * @returns {$domain_num}
 */
function domain_addRangeNum(domain, from, to) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT(from >= SUB && to <= SMALL_MAX_NUM, 'SMALL_DOMAIN_RANGE_ONLY');

  // what we do is:
  // - create a 1
  // - move the 1 to the left, `1+to-from` times
  // - subtract 1 to get a series of `to-from` ones
  // - shift those ones `from` times to the left
  // - OR that result with the domain and return it

  return domain | (((1 << (1 + to - from)) - 1) << from);
}

/**
 * Given two domains compare the new domain to the old domain and
 * return REJECTED if the new domain is empty, NO_CHANGES if the
 * new domain is equal to the old domain, and SOME_CHANGES otherwise.
 *
 * @param {$domain} newDom
 * @param {$domain} oldDom
 * @returns {$fd_changeState}
 */
function domain_getChangeState(newDom, oldDom) {
  if (domain_isEqual(newDom, oldDom)) return NO_CHANGES;
  if (domain_isRejected(newDom)) return REJECTED;
  return SOME_CHANGES;
}

/**
 * validate domains, filter and fix legacy domains, throw for bad inputs
 *
 * @param {$domain} domain
 * @returns {number[]}
 */
function domain_validate(domain) {
  ASSERT(domain instanceof Array, 'DOMAIN_SHOULD_BE_ARRAY', domain);

  // support legacy domains and validate input here
  let msg = domain_confirmDomain(domain);
  if (msg) {
    let fixedDomain = domain_tryToFixLegacyDomain(domain);
    //console.error('Fixed domain '+domain+' to '+fixedDomain);
    //THROW('Fixed domain '+domain+' to '+fixedDomain);
    if (fixedDomain) {
      //if (console && console.warn) {
      //  console.warn(msg, domain, 'auto-converted to', fixedDomain);
      //}
    } else {
      if (console && console.warn) {
        console.warn(msg, domain, 'unable to fix');
      }
      THROW(`Fatal: unable to fix domain: ${JSON.stringify(domain)}`);
    }
    domain = fixedDomain;
  }
  return domain_toArr(domain);
}

/**
 * Domain input validation
 * Have to support and transform legacy domain formats of domains of domains
 * and transform them to flat domains with lo/hi pairs
 *
 * @param {number[]} domain
 * @returns {string|undefined}
 */
function domain_confirmDomain(domain) {
  for (let i = 0; i < domain.length; i += PAIR_SIZE) {
    let lo = domain[i];
    let hi = domain[i + 1];
    let e = domain_confirmDomainElement(lo);
    if (e) {
      return e;
    }
    let f = domain_confirmDomainElement(hi);
    if (f) {
      return f;
    }

    if (lo < SUB) {
      return `Domain contains a number lower than SUB (${lo} < ${SUB}), this is probably a bug`;
    }
    if (hi > SUP) {
      return `Domain contains a number higher than SUP (${hi} > ${SUP}), this is probably a bug`;
    }
    if (lo > hi) {
      return `Found a lo/hi pair where lo>hi, expecting all pairs lo<=hi (${lo}>${hi})`;
    }
  }
  ASSERT((domain.length % PAIR_SIZE) === 0, 'other tests should have caught uneven domain lengths');
}

/**
 * @param {number} n
 * @returns {string|undefined}
 */
function domain_confirmDomainElement(n) {
  if (typeof n !== 'number') {
    if (n instanceof Array) {
      return 'Detected legacy domains (arrays of arrays), expecting flat array of lo-hi pairs';
    }
    return 'Expecting array of numbers, found something else (#{n}), this is probably a bug';
  }
  if (isNaN(n)) {
    return 'Domain contains an actual NaN, this is probably a bug';
  }
}

/**
 * Try to convert old array of arrays domain to new
 * flat array of number pairs domain. If any validation
 * step fails, return nothing.
 *
 * @param {number[]} domain
 * @returns {number[]}
 */
function domain_tryToFixLegacyDomain(domain) {
  let fixed = [];
  for (let i = 0; i < domain.length; i++) {
    let rangeArr = domain[i];
    if (!(rangeArr instanceof Array)) {
      return;
    }
    if (rangeArr.length !== PAIR_SIZE) {
      return;
    }
    let lo = rangeArr[LO_BOUND];
    let hi = rangeArr[HI_BOUND];
    if (lo > hi) {
      return;
    }
    fixed.push(lo, hi);
  }
  return fixed;
}


// BODY_STOP

export {
  FORCE_ARRAY,
  LO_BOUND,
  HI_BOUND,
  NO_CHANGES,
  NOT_FOUND,
  PAIR_SIZE,
  PREV_CHANGED,
  SMALL_MAX_FLAG,
  SMALL_MAX_NUM,
  SOME_CHANGES,

  ZERO,
  ONE,
  BOOL,
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
  FLAG_TO_NUM,

  domain_addRangeNum,
  domain_clone,
  domain_cloneArr,
  domain_closeGapsArr,
  domain_complement,
  domain_containsValue,
  domain_containsValueArr,
  domain_containsValueNum,
  domain_createRange,
  domain_createRangeZeroToMax,
  domain_createValue,
  domain_divby,
  domain_isEqual,
  domain_fromFlagsNum,
  domain_fromList,
  domain_getChangeState,
  domain_getValue,
  domain_getValueArr,
  domain_getValueNum,
  domain_getValueOfFirstContainedValueInList,
  domain_intersection,
  domain_intersectionArrArr,
  domain_isRejected,
  domain_isSolved,
  domain_isSolvedArr,
  domain_isSolvedNum,
  domain_isUndetermined,
  domain_isUndeterminedArr,
  domain_isUndeterminedNum,
  domain_isValue,
  domain_isValueArr,
  domain_isValueNum,
  domain_max,
  domain_middleElement,
  domain_min,
  domain_mul,
  domain_numarr,
  domain_numarrChecked,
  domain_removeGte,
  domain_removeGteArr,
  domain_removeGteNum,
  domain_removeLte,
  domain_removeLteArr,
  domain_removeLteNum,
  domain_removeNextFromList,
  domain_removeValue,
  domain_removeValueArr,
  domain_removeValueNum,
  domain_sharesNoElements,
  domain_simplifyInlineArr,
  domain_size,
  domain_toArr,
  domain_toList,
  domain_validate,

  // __REMOVE_BELOW_FOR_DIST__
  // testing only:
  domain_rangeIndexOfArr,
  domain_isSimplified,
  _domain_mergeOverlappingInline,
  _domain_sortByRangeInline,
  // __REMOVE_ABOVE_FOR_DIST__
};
