import {
  EMPTY,
  MAX_SMALL,
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
const NUMBER = [ZERO, ONE, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, ELEVEN, TWELVE, THIRTEEN, FOURTEEN, FIFTEEN];
const FLAG_TO_NUM = {
  [ZERO]: 0,
  [ONE]: 1,
  [TWO]: 2,
  [THREE]: 3,
  [FOUR]: 4,
  [FIVE]: 5,
  [SIX]: 6,
  [SEVEN]: 7,
  [EIGHT]: 8,
  [NINE]: 9,
  [TEN]: 10,
  [ELEVEN]: 11,
  [TWELVE]: 12,
  [THIRTEEN]: 13,
  [FOURTEEN]: 14,
  [FIFTEEN]: 15,
};
const SMALL_DOMAIN_MAX = 15;


/**
 * returns whether domain covers given value
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_containsValue(domain, value) {
  if (typeof domain === 'number') {
    return value >= 0 && value <= 15 && (domain & NUMBER[value]) > 0; // or just (domain & (1 << value)) ?
  }

  ASSERT_DOMAIN(domain);
  return domain_rangeIndexOf(domain, value) !== NOT_FOUND;
}

/**
 * return the range index in given domain that covers given
 * value, or if the domain does not cover it at all
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {number}
 */
function domain_rangeIndexOf(domain, value) {
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
  if (typeof domain === 'number') {
    if (value < 0 || value > 15) return false;
    return domain === NUMBER[value];
  }

  ASSERT_DOMAIN(domain);
  return domain.length === PAIR_SIZE && domain[LO_BOUND] === value && domain[HI_BOUND] === value;
}

/**
 * Note: this is the (shared) second most called function of the library
 * (by a third of most, but still significantly more than the rest)
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_getValue(domain) {
  if (typeof domain === 'number') {
    // This function is called relatively often. eg it is the
    // second-most called function of the whole library. only
    // topped by isUndetermined
    // With proper ES6 we could consider benchmarking Math.clz32
    // but even then we'd need to verify that the value was solved

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
    }
    return NO_SUCH_VALUE;
  }

  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  if (domain.length !== PAIR_SIZE) {
    return NO_SUCH_VALUE;
  }
  let lo = domain[LO_BOUND];
  let hi = domain[HI_BOUND];
  if (lo === hi) {
    return lo;
  }
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

  if (!_forceArray && list[0] >= 0 && list[list.length - 1] <= 15) {
    // create a number.
    let last = 0; // do confirm whether the list is ordered
    let d = 0;
    for (let i = 0; i < list.length; ++i) {
      let value = list[i];
      ASSERT(value >= last && (last = value) >= 0, 'LIST_SHOULD_BE_ORDERED_BY_NOW');
      d |= NUMBER[value];
    }
    return d;
  }

  let domain = [];
  let hi;
  let lo;
  for (let index = 0; index < list.length; index++) {
    let value = list[index];
    ASSERT(value >= SUB, 'fd values range SUB~SUP');
    ASSERT(value <= SUP, 'fd values range SUB~SUP');
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

function domain_fromFlags(domain) {
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
    if (FOUR & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 4;
      } else if (hi !== 3) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 4;
      }
      hi = 4;
    }
    if (FIVE & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 5;
      } else if (hi !== 4) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 5;
      }
      hi = 5;
    }
    if (SIX & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 6;
      } else if (hi !== 5) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 6;
      }
      hi = 6;
    }
    if (SEVEN & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 7;
      } else if (hi !== 6) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 7;
      }
      hi = 7;
    }
    if (EIGHT & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 8;
      } else if (hi !== 7) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 8;
      }
      hi = 8;
    }
    if (NINE & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 9;
      } else if (hi !== 8) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 9;
      }
      hi = 9;
    }
    if (TEN & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 10;
      } else if (hi !== 9) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 10;
      }
      hi = 10;
    }
    if (ELEVEN & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 11;
      } else if (hi !== 10) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 11;
      }
      hi = 11;
    }
    if (TWELVE & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 12;
      } else if (hi !== 11) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 12;
      }
      hi = 12;
    }
    if (THIRTEEN & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 13;
      } else if (hi !== 12) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 13;
      }
      hi = 13;
    }
    if (FOURTEEN & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 14;
      } else if (hi !== 13) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 14;
      }
      hi = 14;
    }
    if (FIFTEEN & domain) {
      if (hi < 0) { // this is the LSB that is set
        lo = 15;
      } else if (hi !== 14) { // there's a gap so push prev range now
        arr.push(lo, hi);
        lo = 15;
      }
      hi = 15;
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
  if (typeof domain === 'number') {
    let a = [];
    for (let i = 0; i < 16; ++i) {
      if ((domain & NUMBER[i]) > 0) a.push(i);
    }
    return a;
  }

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
  if (typeof domain === 'number') {
    for (let i = 0; i < list.length; ++i) {
      let value = list[i];
      ASSERT(value >= SUB && value <= SUP, 'lists with oob values probably indicate a bug');
      let n = NUMBER[value];
      if (value <= 15 && (domain & n) > 0) {
        return domain ^ n; // the bit is set, this unsets it
      }
    }
    return NO_SUCH_VALUE;
  }

  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  for (let i = 0; i < list.length; i++) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'lists with oob values probably indicate a bug');
    let index = domain_rangeIndexOf(domain, value);
    if (index >= 0) {
      return _domain_deepCloneWithoutValue(domain, value, index);
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
 * @param {$domain} domain
 * @param {number} value
 * @param {number} rangeIndex
 * @returns {$domain}
 */
function _domain_deepCloneWithoutValue(domain, value, rangeIndex) {
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
  if (typeof domain === 'number') {
    for (let i = 0; i < list.length; ++i) {
      let value = list[i];
      ASSERT(value >= SUB && value <= SUP, 'OOB values probably indicate a bug in the code', list);
      if (value <= 15 && (domain & NUMBER[value]) > 0) return value;
    }
    return NO_SUCH_VALUE;
  }

  ASSERT_DOMAIN(domain);
  for (let i = 0; i < list.length; i++) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'OOB values probably indicate a bug in the code', list);
    if (domain_containsValue(domain, value)) {
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
 * @param {$pairs|$domain} domain
 * @returns {$domain}
 */
function domain_simplifyInline(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(domain !== undefined, 'DOMAIN_REQUIRED');

  if (domain.length <= 2) return domain;

  // order ranges by lower bound, ascending (inline regardless)
  domain_sortByRangeInline(domain);
  return domain_mergeOverlappingInline(domain);
}

/**
 * @param {$domain} domain
 */
function domain_sortByRangeInline(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  let len = domain.length;
  ASSERT(len > 0, 'input domain should not be empty', domain);
  if (len >= 4) {
    _domain_quickSortInline(domain, 0, domain.length - PAIR_SIZE);
  }
}

/**
 * @param {$domain} domain
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
 * @param {$domain} domain
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
 * @param {$domain} domain
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
 * Check if given domain is in simplified, CSIS form
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isSimplified(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  if (domain.length === PAIR_SIZE) {
    ASSERT(domain[FIRST_RANGE_LO] >= SUB);
    ASSERT(domain[FIRST_RANGE_HI] <= SUP);
    ASSERT(domain[FIRST_RANGE_LO] <= domain[FIRST_RANGE_HI]);
    return true;
  }
  if (domain.length === 0) {
    return true;
  }
  ASSERT((domain.length % PAIR_SIZE) === 0);
  let phi = SUB;
  for (let index = 0, step = PAIR_SIZE; index < domain.length; index += step) {
    let lo = domain[index];
    let hi = domain[index + 1];
    ASSERT(lo >= SUB);
    ASSERT(hi >= SUB);
    ASSERT(lo <= hi, 'ranges should be ascending', domain);
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
 * @param {$domain} domain
 * @returns {$domain}
 */
function domain_mergeOverlappingInline(domain) {
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
 * Intersection of two domains given in CSIS form.
 * (That means the result contains any number that occurs in
 * BOTH domains, but each value will only be present once.)
 * r is optional and if given it should be an array and
 * the domain pieces will be inserted into it, in which case
 * the result domain will be returned unsimplified.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_intersection(domain1, domain2) {
  if (typeof domain1 === 'number' && typeof domain2 === 'number') {
    return domain1 & domain2;
  }
  if (domain1 === EMPTY) return EMPTY;
  if (domain2 === EMPTY) return EMPTY;

  // for simplicity sake, convert them back to arrays
  if (typeof domain1 === 'number') domain1 = domain_fromFlags(domain1);
  if (typeof domain2 === 'number') domain2 = domain_fromFlags(domain2);

  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  let result = [];
  _domain_intersection(domain1, domain2, result);
  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK(result);
  return result;
}

/**
 * Recursively calls itself
 *
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @param {$domain} result
 */
function _domain_intersection(dom1, dom2, result) {
  ASSERT(typeof dom1 !== 'number', 'SHOULD_NOT_BE_USED_WITH_NUMBERS');
  ASSERT(typeof dom2 !== 'number', 'SHOULD_NOT_BE_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(dom1);
  ASSERT_DOMAIN(dom2);
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
      _domain_intersection(dom2, dom1, result);
    }
  } else if (len2 === PAIR_SIZE) {
    domain_intersectBoundsInto(dom1, dom2[LO_BOUND], dom2[HI_BOUND], result);
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
    _domain_intersection(d1, d3, result);
    _domain_intersection(d1, d4, result);
    _domain_intersection(d2, d3, result);
    _domain_intersection(d2, d4, result);
  }
}

/**
 * Add the intersection of two domains to result domain
 *
 * @param {number} lo1
 * @param {number} hi1
 * @param {number} lo2
 * @param {number} hi2
 * @param {$domain} result
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
 * @param {$domain} domain
 * @param {number} lo
 * @param {number} hi
 * @param {$domain} result
 */
function domain_intersectBoundsInto(domain, lo, hi, result) {
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
 * deep comparison of two domains
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
  if (isNum1) {
    if (domain_max(domain2) <= 15) return domain1 === domain_numarr(domain2);
    domain1 = domain_fromFlags(domain1);
  } else if (isNum2) {
    if (domain_max(domain1) <= 15) return domain2 === domain_numarr(domain1);
    domain2 = domain_fromFlags(domain2);
  }

  return domain_isEqualArr(domain1, domain2);
}

function domain_isEqualArr(domain1, domain2) {
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

  return _domain_isEqual(domain1, domain2, len);
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {number} len
 * @returns {boolean}
 */
function _domain_isEqual(domain1, domain2, len) {
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
 * Closes all the gaps between the intervals according to
 * the given gap value. All gaps less than this gap are closed.
 * Domain is not harmed
 *
 * @param {$domain} domain
 * @param {number} gap
 * @returns {$domain}
 */
function domain_closeGapsFresh(domain, gap) {
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
 * @param {$domain} domain
 * @returns {number}
 */
function _domain_smallestIntervalWidth(domain) {
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
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_closeGaps(domain1, domain2) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS');

  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);

  let change;
  do {
    change = NO_CHANGES;

    if (domain1.length > 2) {
      let domain = domain_closeGapsFresh(domain1, _domain_smallestIntervalWidth(domain2));
      change += domain1.length - domain.length;
      domain1 = domain;
    }

    if (domain2.length > 2) {
      let domain = domain_closeGapsFresh(domain2, _domain_smallestIntervalWidth(domain1));
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
  if (typeof domain1 === 'number') domain1 = domain_fromFlags(domain1);
  if (typeof domain2 === 'number') domain2 = domain_fromFlags(domain2);

  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT((domain1 != null) && (domain2 != null));

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

  return domain_simplifyInline(result);
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
  if (typeof domain1 === 'number') domain1 = domain_fromFlags(domain1);
  if (typeof domain2 === 'number') domain2 = domain_fromFlags(domain2);

  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT((domain1 != null) && (domain2 != null), 'domain 1 and 2?', domain1, domain2);

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

  return domain_simplifyInline(result);
}

/**
 * Return the number of elements this domain covers
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_size(domain) {
  if (typeof domain === 'number') {
    return domain_hammingWeight(domain);
  }

  ASSERT_DOMAIN_EMPTY_CHECK(domain);
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
  if (typeof domain === 'number') domain = domain_fromFlags(domain);

  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  let size = domain_size(domain);
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
 * Only use if callsite doesn't use first range again
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_min(domain) {
  if (typeof domain === 'number') {
    ASSERT(domain !== EMPTY, 'NON_EMPTY_DOMAIN_EXPECTED');
    ASSERT(domain > EMPTY && domain <= MAX_SMALL, 'NUMBER_DOMAIN_IS_OOB');

    // we often deal with domains [0, 0], [0, 1], and [1, 1]
    if (domain === ZERO) return 0;
    if (domain === ONE) return 1;
    if (domain === BOOL) return 0;

    if (domain & ZERO) return 0;
    if (domain & ONE) return 1;
    if (domain & TWO) return 2;
    if (domain & THREE) return 3;
    if (domain & FOUR) return 4;
    if (domain & FIVE) return 5;
    if (domain & SIX) return 6;
    if (domain & SEVEN) return 7;
    if (domain & EIGHT) return 8;
    if (domain & NINE) return 9;
    if (domain & TEN) return 10;
    if (domain & ELEVEN) return 11;
    if (domain & TWELVE) return 12;
    if (domain & THIRTEEN) return 13;
    if (domain & FOURTEEN) return 14;
    if (domain & FIFTEEN) return 15;
  }

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
  if (typeof domain === 'number') {
    ASSERT(domain !== EMPTY, 'NON_EMPTY_DOMAIN_EXPECTED');
    ASSERT(domain > EMPTY && domain <= MAX_SMALL, 'SHOULD_BE_FIXED_DOMAIN');

    // we often deal with domains [0, 0], [0, 1], and [1, 1]
    if (domain === ZERO) return 0;
    if (domain === ONE) return 1;
    if (domain === BOOL) return 1;

    if (domain & FIFTEEN) return 15;
    if (domain & FOURTEEN) return 14;
    if (domain & THIRTEEN) return 13;
    if (domain & TWELVE) return 12;
    if (domain & ELEVEN) return 11;
    if (domain & TEN) return 10;
    if (domain & NINE) return 9;
    if (domain & EIGHT) return 8;
    if (domain & SEVEN) return 7;
    if (domain & SIX) return 6;
    if (domain & FIVE) return 5;
    if (domain & FOUR) return 4;
    if (domain & THREE) return 3;
    if (domain & TWO) return 2;
    if (domain & ONE) return 1;
    if (domain & ZERO) return 1;
    ASSERT(false, 'SHOULD_NOT_GET_HERE');
  }

  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  return domain[domain.length - 1];
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
 * A domain is "solved" if it covers exactly one value. It is not solved if it is empty.
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isSolved(domain) {
  if (typeof domain === 'number') {
    // http://stackoverflow.com/questions/12483843/test-if-a-bitboard-have-only-one-bit-set-to-1
    return (domain & (domain - 1)) === 0 && domain > 0;
  }

  ASSERT_DOMAIN(domain);
  return domain.length === PAIR_SIZE && domain_firstRangeIsDetermined(domain);
}

/**
 * A domain is "determined" if it's either one value (solved) or none at all (rejected)
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isDetermined(domain) {
  if (typeof domain === 'number') {
    // http://stackoverflow.com/questions/12483843/test-if-a-bitboard-have-only-one-bit-set-to-1
    return (domain & (domain - 1)) === 0 || domain === EMPTY;
  }

  ASSERT_DOMAIN(domain);
  let len = domain.length;
  if (len === 0) {
    return true;
  }
  return len === PAIR_SIZE && domain_firstRangeIsDetermined(domain);
}

/**
 * A domain is "determined" if it's either one value (solved) or none at all (rejected)
 * This is the most called function of the library. 3x more than the number two.
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isUndetermined(domain) {
  if (typeof domain === 'number') {
    // http://stackoverflow.com/questions/12483843/test-if-a-bitboard-have-only-one-bit-set-to-1
    // this would check whether a domain has one bit set
    return (domain & (domain - 1)) !== 0 && domain !== 0;
  }
  // it's probably an error if the domain is empty so make that the last check
  return domain.length > 2 || domain[0] !== domain[1] && domain.length > 0;
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
  if (typeof domain === 'number') {
    return domain === EMPTY; // the domain contains no values if no bits are set
  }

  return domain.length === 0;
}

/**
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_firstRangeIsDetermined(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  ASSERT_DOMAIN(domain);
  return domain[LO_BOUND] === domain[HI_BOUND];
}

function domain_removeGteNumbered(domain, value) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_FOR_NUMBERS');

  if (value > 15) return domain;
  ASSERT(SUB >= 0, 'REVISIT_THIS_IF_SUB_CHANGES'); // meh.
  ASSERT(value >= 0, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT'); // so cannot be negative

  for (let i = value; i <= 15; ++i) {
    let n = NUMBER[i];
    domain = (domain | n) ^ n; // make sure bit is set, then "invert it"; so it always unsets bit.
  }

  return domain;
}

/**
 * Remove any value from domain that is bigger than or equal to given value.
 * Since domains are assumed to be in CSIS form, we can start from the back and
 * search for the first range that is smaller or contains given value. Prune
 * any range that follows it and trim the found range if it contains the value.
 * Returns whether the domain was changed somehow. Does not returned REJECTED
 * because propagator_ltStepBare will check this... I don't like that but it
 * still is the reason.
 * Does not harm domain.
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {$domain|number}
 */
function domain_removeGte(domain, value) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain); // needs to be csis for this trick to work
// TODO: if value<=15 numarr
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

    let lo = domain[i];
    let hi = domain[i + 1];

    if (lo > value) {
      if (!i) return []; // 678 -> empty
      return domain.slice(0, i); // 012 789
    }
    if (lo === value) {
      return domain.slice(0, i);
    } // 012 567 -> 012, 012 5 -> 012
    if (value <= hi) { // 012 456 -> 012 4, 012 45 -> 012 4
      let newDomain = domain.slice(0, i + 1);
      newDomain.push(value - 1);
      return newDomain;
    }
  }
  return NO_SUCH_VALUE; // 012 -> 012
}

function domain_removeLteNumbered(domain, value) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_FOR_NUMBERS');

  if (value > 15) value = 15;
  ASSERT(SUB >= 0, 'REVISIT_THIS_IF_SUB_CHANGES'); // meh.
  ASSERT(value >= 0, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT'); // so cannot be negative

  for (let i = 0; i <= value; ++i) {
    let n = NUMBER[i];
    domain = (domain | n) ^ n; // make sure bit is set, then "invert it"; so it always unsets bit.
  }

  return domain;
}

/**
 * Remove any value from domain that is lesser than or equal to given value.
 * Since domains are assumed to be in CSIS form, we can start from the front and
 * search for the first range that is smaller or contains given value. Prune
 * any range that preceeds it and trim the found range if it contains the value.
 * Returns whether the domain was changed somehow
 * Does not harm domain
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_removeLte(domain, value) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain); // needs to be csis for this trick to work

  let i = 0;
  for (; i < domain.length; i += PAIR_SIZE) {
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
      if (!i) return NO_SUCH_VALUE; // 012 -> 012
      return domain.slice(i); // 678 -> 678
    }
    if (hi === value) {
      // 45 89  => 89, 5  89  => 5 89
      return domain.slice(i + PAIR_SIZE);
    }
    if (value <= hi) {
      // 456 89 => 6 89, 56 89 => 6 89
      let newDomain = domain.slice(i);
      newDomain[0] = value + 1;
      return newDomain;
    }
  }
  return []; // 012 -> empty
}

function domain_forceEqNumbered(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT(typeof domain2 === 'number', 'ONLY_USED_WITH_NUMBERS');

  return domain1 & domain2;
}

/**
 * Does not harm input domains
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_forceEq(domain1, domain2) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS');

  ASSERT_DOMAIN_EMPTY_CHECK(domain1);
  ASSERT_DOMAIN_EMPTY_CHECK(domain2);

  let len1 = domain1.length;
  let len2 = domain2.length;
  let len = MIN(len1, len2);

  if (len === 0) {
    return EMPTY;
  }

  if (len === 0) return EMPTY;

  let i = 0;
  while (i < len) {
    if (domain1[i] !== domain2[i] || domain1[i + 1] !== domain2[i + 1]) break;
    i += PAIR_SIZE;
  }

  if (i >= len && len1 === len2) {
    // no changes so both domains are equal. assuming
    // all domains are immutable, just return either.
    return domain1;
  }

  let domain = [];
  let j = i;
  let lo1 = domain1[0];
  let hi1 = domain1[1];
  let lo2 = domain2[0];
  let hi2 = domain2[1];
  while (i < len1 && j < len2) {
    if (hi1 < lo2 || lo1 > hi1) {
      i += PAIR_SIZE;
      lo1 = domain1[i];
      hi1 = domain1[i + 1];
    } else if (hi2 < lo1 || lo2 > hi2) {
      j += PAIR_SIZE;
      lo2 = domain2[j];
      hi2 = domain2[j + 1];
    } else {
      // both ranges at least overlap because
      // neither hi is less than the others lo

      let hi = Math.min(hi1, hi2);
      domain.push(Math.max(lo1, lo2), hi);
      // the next low must be prev hi+2 (gap)
      lo1 = hi + 1;
      lo2 = hi + 1;
    }
  }

  return domain_numarr(domain);
}

function domain_removeValueNumbered(domain, value) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT(typeof value === 'number', 'CAN_ONLY_REMOVE_VALUES');

  if (value < 0 || value > 15) return domain;

  let n = NUMBER[value];
  return (domain | n) ^ n;
}

/**
 * @param {$domain} domain
 * @param {number} value
 * @returns {number}
 */
function domain_removeValue(domain, value) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof value === 'number', 'value should be a num', value);

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
      // does not have it at all. return the input domain to indicate no change
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
  if (typeof domain1 === 'number' && typeof domain2 === 'number') {
    return (domain1 & domain2) === 0;
  }

  // for simplicity sake, convert them back to arrays
  if (typeof domain1 === 'number') domain1 = domain_fromFlags(domain1);
  if (typeof domain2 === 'number') domain2 = domain_fromFlags(domain2);

  for (let i = 0; i < domain1.length; i += PAIR_SIZE) {
    let lo = domain1[i];
    let hi = domain1[i + 1];
    for (let j = 0; j < domain2.length; j += PAIR_SIZE) {
      // if range A is not before or after range B there is overlap
      if (hi >= domain2[j] && lo <= domain2[j + 1]) {
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
  if (value >= 0 && value <= 15) return NUMBER[value];

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
  if (lo >= 0 && hi <= 15) {
    let n = 0;
    for (let i = lo; i <= hi; ++i) {
      n |= NUMBER[i];
    }
    return n;
  }

  return [lo, hi];
}

/**
 * @param {$domain} domain
 * @param {boolean} forceArr Always return in array form?
 * @returns {$domain}
 */
function domain_clone(domain, forceArr) {
  if (typeof domain === 'number') {
    if (forceArr === FORCE_ARRAY) return domain_toArr(domain);
    return domain;
  }
  return domain.slice(0);
}

/**
 * Get a domain representation in array form
 *
 * @param {$domain} domain
 * @returns {$domain} (small domains will also be arrays)
 */
function domain_toArr(domain) {
  if (typeof domain === 'number') return domain_fromFlags(domain);
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
  if (domain_max(domain) > 15) return domain;

  let out = 0;
  for (let i = 0; i < len; i += PAIR_SIZE) {
    out = domain_addRangeToSmallDomain(out, domain[i], domain[i + 1]);
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
function domain_addRangeToSmallDomain(domain, from, to) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT(from >= SUB && to <= 15, 'SMALL_DOMAIN_RANGE_ONLY');

  // this switch is designed to case at lo and break at hi.
  // it prevents a very hot loop.
  switch (from) { /* eslint no-fallthrough: "off" */
    case 0:
      domain |= ZERO;
      // fall-through
    case 1:
      if (to < 1) break;
      domain |= ONE;
      // fall-through
    case 2:
      if (to < 2) break;
      domain |= TWO;
      // fall-through
    case 3:
      if (to < 3) break;
      domain |= THREE;
      // fall-through
    case 4:
      if (to < 4) break;
      domain |= FOUR;
      // fall-through
    case 5:
      if (to < 5) break;
      domain |= FIVE;
      // fall-through
    case 6:
      if (to < 6) break;
      domain |= SIX;
      // fall-through
    case 7:
      if (to < 7) break;
      domain |= SEVEN;
      // fall-through
    case 8:
      if (to < 8) break;
      domain |= EIGHT;
      // fall-through
    case 9:
      if (to < 9) break;
      domain |= NINE;
      // fall-through
    case 10:
      if (to < 10) break;
      domain |= TEN;
      // fall-through
    case 11:
      if (to < 11) break;
      domain |= ELEVEN;
      // fall-through
    case 12:
      if (to < 12) break;
      domain |= TWELVE;
      // fall-through
    case 13:
      if (to < 13) break;
      domain |= THIRTEEN;
      // fall-through
    case 14:
      if (to < 14) break;
      domain |= FOURTEEN;
      // fall-through
    case 15:
      if (to < 15) break;
      domain |= FIFTEEN;
  }

  return domain;
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
  if (domain_isRejected(newDom)) return REJECTED;
  if (domain_isEqual(newDom, oldDom)) return NO_CHANGES;
  return SOME_CHANGES;
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
  SMALL_DOMAIN_MAX,
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
  NUMBER,
  FLAG_TO_NUM,

  domain_addRangeToSmallDomain,
  domain_clone,
  domain_closeGaps,
  domain_complement,
  domain_containsValue,
  domain_createRange,
  domain_createValue,
  domain_divby,
  domain_isEqual,
  domain_forceEq,
  domain_forceEqNumbered,
  domain_fromFlags,
  domain_fromList,
  domain_getChangeState,
  domain_getValue,
  domain_getValueOfFirstContainedValueInList,
  domain_intersectBoundsInto,
  domain_intersection,
  domain_isDetermined,
  domain_isRejected,
  domain_isSolved,
  domain_isUndetermined,
  domain_isValue,
  domain_max,
  domain_middleElement,
  domain_min,
  domain_mul,
  domain_numarr,
  domain_removeGte,
  domain_removeGteNumbered,
  domain_removeLte,
  domain_removeLteNumbered,
  domain_removeNextFromList,
  domain_removeValue,
  domain_removeValueNumbered,
  domain_sharesNoElements,
  domain_simplifyInline,
  domain_size,
  domain_toArr,
  domain_toList,

  // __REMOVE_BELOW_FOR_DIST__
  // testing only:
  domain_rangeIndexOf,
  domain_isSimplified,
  domain_mergeOverlappingInline,
  domain_sortByRangeInline,
  // __REMOVE_ABOVE_FOR_DIST__
};
