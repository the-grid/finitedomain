// a domain, in this lib, is a set of numbers denoted by lo-hi range pairs (inclusive)
// for memory and performance reasons finitedomain has three different representations for a domain;
// - arrdom: an array with number pairs. mostly used by external apis because its easier to deal with. GC sensitive.
// - numdom: a 31bit field where each bit represents the inclusion of a value of its index (0 through 30). 31st bit unused
// - strdom: each value of an arrdom encoded as a double 16bit character. fixed range size (4 characters).

import {
  EMPTY,
  EMPTY_STR,
  NO_CHANGES,
  NO_SUCH_VALUE,
  NOT_FOUND,
  ARR_RANGE_SIZE,
  REJECTED,
  SOME_CHANGES,
  SUB,
  SUP,

  ASSERT,
  ASSERT_DOMAIN,
  ASSERT_DOMAIN_EMPTY_CHECK,
  THROW,
} from './helpers';
import {
  asmdomain_addRange,
  asmdomain_containsValue,
  asmdomain_createRange,
  asmdomain_createValue,
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
} from './asmdomain';

// BODY_START

let PREV_CHANGED = true;
let FORCE_ARRAY = 1;
let FORCE_STRING = 2;

// CSIS form = Canonical Sorted Interval Sequeunce form.
// Basically means the ranges in the domain are ordered
// ascending and no ranges overlap. We call this "simplified"

//let FIRST_RANGE = 0;
let FIRST_RANGE_LO = 0; // first and second char of a string
let FIRST_RANGE_HI = 2; // third and fourth char of a string
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

// size of values and ranges in a string domain
const STR_VALUE_SIZE = 2;
const STR_RANGE_SIZE = 4;

/**
 * Append given range to the end of given domain. Does not
 * check if the range belongs there! Dumbly appends.
 *
 * @param {$domain} domain
 * @param {number} lo
 * @param {number} hi
 * @returns {$domain}
 */
function domain_appendRange(domain, lo, hi) {
  if (typeof domain === 'number') {
    if (hi <= SMALL_MAX_NUM) return asmdomain_addRange(domain, lo, hi);
    domain = domain_numToStr(domain);
  }
  return domain_addRangeStr(domain, lo, hi);
}
/**
 * Append given range to the end of given domain. Does not
 * check if the range belongs there! Dumbly appends.
 *
 * @param {$domain_str} domain
 * @param {number} lo
 * @param {number} hi
 * @returns {$domain_str}
 */
function domain_addRangeStr(domain, lo, hi) {
  ASSERT(typeof domain === 'string', 'ONLY_WITH_STRINGS');

  return domain + domain_strEncodeRange(lo, hi);
}

/**
 * returns whether domain covers given value
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_containsValue(domain, value) {
  if (typeof domain === 'number') return asmdomain_containsValue(domain, value) === 1;
  return domain_containsValueStr(domain, value);
}
/**
 * returns whether domain covers given value
 * for array domains
 *
 * @param {$domain_arr} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_containsValueStr(domain, value) {
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain);
  return domain_rangeIndexOfStr(domain, value) !== NOT_FOUND;
}

/**
 * return the range index in given domain that covers given
 * value, or if the domain does not cover it at all
 *
 * @param {$domain_str} domain
 * @param {number} value
 * @returns {number} >=0 actual index on strdom or NOT_FOUND
 */
function domain_rangeIndexOfStr(domain, value) {
  ASSERT(typeof domain === 'string', 'USED_WITH_STRINGS');

  let len = domain.length;

  for (let index = 0; index < len; index += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, index);
    if (lo <= value) {
      let hi = domain_strDecodeValue(domain, index + STR_VALUE_SIZE);
      if (hi >= value) {
        // value is lo<=value<=hi
        return index;
      }
    } else {
      // value is between previous range and this one, aka: not found. proceed with next item in list
      break;
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
  ASSERT(domain || domain === EMPTY || domain === EMPTY_STR, 'A_EXPECTING_DOMAIN');
  ASSERT(value >= 0, 'DOMAINS_ONLY_CONTAIN_UINTS');
  if (typeof domain === 'number') return asmdomain_isValue(domain, value) === 1;
  return domain_isValueStr(domain, value);
}
/**
 * @param {$domain_str} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_isValueStr(domain, value) {
  ASSERT(typeof domain === 'string', 'USED_WITH_STRINGS');
  ASSERT_DOMAIN(domain);
  //return domain.length === RANGE_SIZE && domain_getValueStr(domain, LO_BOUND) === value && domain_getValueStr(domain, HI_BOUND) === value;
  return domain.length === STR_RANGE_SIZE && (domain_strDecodeValue(domain, FIRST_RANGE_LO) | domain_strDecodeValue(domain, FIRST_RANGE_HI)) === value;
}

/**
 * @param {$domain} domain
 * @returns {number}
 */
function domain_getValue(domain) {
  if (typeof domain === 'number') return asmdomain_getValue(domain);
  return domain_getValueStr(domain);
}
/**
 * @param {$domain_str} domain
 * @returns {number}
 */
function domain_getValueStr(domain) {
  ASSERT(typeof domain === 'string', 'USED_WITH_STRINGS');

  if (domain.length !== STR_RANGE_SIZE) return NO_SUCH_VALUE;
  let lo = domain_strDecodeValue(domain, FIRST_RANGE_LO);
  let hi = domain_strDecodeValue(domain, FIRST_RANGE_HI);
  if (lo === hi) return lo;
  return NO_SUCH_VALUE;
}
function domain_getValueArr(domain) {
  if (domain.length === ARR_RANGE_SIZE && domain[0] === domain[1]) return domain[0];
  return NO_SUCH_VALUE;
}
/**
 * @param {$domain_str} domain
 * @param {number} index
 * @returns {number}
 */
function domain_strDecodeValue(domain, index) {
  return (domain.charCodeAt(index) << 16) | domain.charCodeAt(index + 1);
}
/**
 * @param {number} value
 * @returns {string}
 */
function domain_strEncodeValue(value) {
  return String.fromCharCode((value >>> 16) & 0xffff, value & 0xffff);
}
/**
 * @param {number} lo
 * @param {number} hi
 * @returns {$domain_str} One range is still a valid domain
 */
function domain_strEncodeRange(lo, hi) {
  return String.fromCharCode((lo >>> 16) & 0xffff, lo & 0xffff, (hi >>> 16) & 0xffff, hi & 0xffff);
}

/**
 * list of possible values to domain
 * returns a CSIS domain
 *
 * @param {number[]} list
 * @param {boolean} [clone=true]
 * @param {boolean} [sort=true]
 * @param {boolean} [_forceArray=false] Force creation of an array. Probably to convert a number for certain operations
 * @returns {$domain_str}
 */
function domain_fromList(list, clone = true, sort = true, _forceArray = false) { // FIXME: force array
  if (!list.length) return EMPTY;
  if (sort) { // note: the list must be sorted for the algorithm below to work...
    if (clone) { // clone before sorting?
      list = list.slice(0);
    }
    list.sort((a, b) => a - b); // note: default sort is lexicographic!
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

  let domain = '';
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
        domain += domain_strEncodeRange(lo, hi);
        lo = value;
      }
      hi = value;
    }
  }

  return domain + domain_strEncodeRange(lo, hi);
}

/**
 * domain to list of possible values
 *
 * @param {$domain} domain
 * @returns {number[]}
 */
function domain_toList(domain) {
  if (typeof domain === 'number') return domain_toListNum(domain);
  return domain_toListStr(domain);
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
 * @param {$domain_str} domain
 * @returns {number[]}
 */
function domain_toListStr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(domain, 'A_EXPECTING_DOMAIN');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);

  let list = [];
  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    for (let n = domain_strDecodeValue(domain, i), m = domain_strDecodeValue(domain, i + STR_VALUE_SIZE); n <= m; ++n) {
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
  return domain_removeNextFromListStr(domain, list);
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
 * @param {$domain_str} domain
 * @param {number[]} list
 * @returns {$domain|number} NO_SUCH_VALUE (-1) means the result is empty
 */
function domain_removeNextFromListStr(domain, list) {
  let r = _domain_removeNextFromListStr(domain, list); // replace empty string
  ASSERT(r || r === '', 'if it returns falsy it should be the empty string and not some other falsy');
  return r || EMPTY; // replace '' with 0
}
/**
 * See main function. This function may return the empty string as an empty domain.
 *
 * @param {$domain_str} domain
 * @param {number[]} list
 * @returns {$domain|number} NO_SUCH_VALUE (-1) means the result is empty
 */
function _domain_removeNextFromListStr(domain, list) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(list, 'A_EXPECTING_LIST');
  ASSERT(domain, 'A_EXPECTING_DOMAIN');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);

  let len = domain.length;

  for (let i = 0; i < list.length; i++) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG');

    for (let index = 0; index < len; index += STR_RANGE_SIZE) {
      let lo = domain_strDecodeValue(domain, index);
      if (lo <= value) {
        let hi = domain_strDecodeValue(domain, index + STR_VALUE_SIZE);
        if (hi >= value) {
          // value is lo<=value<=hi

          let before = domain.slice(0, index);
          let after = domain.slice(index + STR_RANGE_SIZE);

          if (hi === value) {
            // TODO: check numbered domain edge case. its not trivial, maybe we can cheese it by checking the return value (but only here)
            if (lo === value) {
              // lo=hi=value; drop this range completely
              return before + after; // TODO: i dont think this is correct yet for empty strings but maybe?
            }
            return before + domain_strEncodeRange(lo, hi - 1) + after;
          } else if (lo === value) {
            return before + domain_strEncodeRange(lo + 1, hi) + after;
          } else {
            // we get new two ranges...
            return before + domain_strEncodeRange(lo, value - 1) + domain_strEncodeRange(value + 1, hi) + after;
          }
        }
      } else {
        // value is between previous range and this one, aka: not found. proceed with next item in list
        break;
      }
    }
  }

  return NO_SUCH_VALUE;
}

/**
 * @param {$domain} domain
 * @param {number[]} list
 * @returns {number} Can return NO_SUCH_VALUE
 */
function domain_getValueOfFirstContainedValueInList(domain, list) {
  if (typeof domain === 'number') return domain_getValueOfFirstContainedValueInListNum(domain, list);
  return domain_getValueOfFirstContainedValueInListStr(domain, list);
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
    // 1<<100 = 16 and large numbers are valid here so do check
    if (value <= SMALL_MAX_NUM && (domain & (1 << value)) > 0) return value;
  }
  return NO_SUCH_VALUE;
}
/**
 * @param {$domain_str} domain
 * @param {number[]} list
 * @returns {number} Can return NO_SUCH_VALUE
 */
function domain_getValueOfFirstContainedValueInListStr(domain, list) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_DOMAIN');
  ASSERT(list, 'EXPECTING_LIST');
  ASSERT_DOMAIN(domain);
  for (let i = 0; i < list.length; i++) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG'); // internally all domains elements should be sound; SUB>=n>=SUP
    if (domain_containsValueStr(domain, value)) {
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
  if (typeof domain === 'number') domain = domain_numToStr(domain);

  ASSERT(typeof domain === 'string', 'ONLY_WITH_STRINGS');
  if (!domain) THROW('EMPTY_DOMAIN_PROBABLY_BUG');

  let end = SUB;
  let result = '';
  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, i);
    ASSERT(!end || end < lo, 'domain is supposed to be csis, so ranges dont overlap nor touch');
    if (lo > SUB) { // prevent [SUB,SUB] if first range starts at SUB; that'd be bad
      result += domain_strEncodeRange(end, lo - 1);
    }
    end = domain_strDecodeValue(domain, i + STR_VALUE_SIZE) + 1;
  }

  if (end <= SUP) { // <= so SUP is inclusive...
    result += domain_strEncodeRange(end, SUP);
  }

  return domain_numstr(result); // TODO: test edge case where the inverted domain is actually a small domain
}

/**
 * All ranges will be ordered ascending and overlapping ranges are merged
 * This function first checks whether simplification is needed at all
 *
 * @param {$domain_str|string} domain
 * @returns {$domain_str} ironically, not optimized to a number if possible
 */
function domain_simplifyStr(domain) {
  ASSERT(typeof domain === 'string', 'USED_WITH_STRINGS');
  if (!domain) return EMPTY_STR; // keep return type consistent, dont return EMPTY
  if (domain.length === STR_RANGE_SIZE) return domain;

  // order ranges, then merge overlapping ranges (TODO: can we squash this step together?)
  domain = _domain_quickSortRangesStr(domain);
  domain = _domain_mergeOverlappingRanges(domain);

  return domain;
}
/**
 * Sort all ranges in this pseudo-strdom from lo to hi. Domain
 * may already be csis but we're not sure. This function call
 * is part of the process of ensuring that.
 *
 * @param {$domain_str|string} domain MAY not be CSIS yet (that's probably why this function is called in the first place)
 * @returns {$domain_str|string} ranges in this string will be ordered but may still overlap
 */
function _domain_quickSortRangesStr(domain) {
  ASSERT(typeof domain === 'string', 'USED_WITH_STRING');
  if (!domain) return EMPTY_STR; // keep return type consistent, dont return EMPTY

  let len = domain.length;
  if (len <= STR_RANGE_SIZE) return domain;

  // TODO: right now we convert to actual values and concat with "direct" string access. would it be faster to use slices? and would it be faster to do string comparisons with the slices and no decoding?

  let pivotIndex = 0; // TODO: i think we'd be better off with a different pivot? middle probably performs better
  let pivotLo = domain_strDecodeValue(domain, pivotIndex);
  let pivotHi = domain_strDecodeValue(domain, pivotIndex + STR_VALUE_SIZE);

  let left = '';
  let right = '';

  for (let i = STR_RANGE_SIZE; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, i);

    // TODO: if we change assumptions elsewhere we could drop the `hi` stuff from this function altogether
    if (lo < pivotLo || (lo === pivotLo && domain_strDecodeValue(domain, i + STR_VALUE_SIZE) < pivotHi)) {
      left += domain[i] + domain[i + 1] + domain[i + 2] + domain[i + 3];
    } else {
      right += domain[i] + domain[i + 1] + domain[i + 2] + domain[i + 3];
    }
  }

  return ('' +
    _domain_quickSortRangesStr(left) + // sort left part, without pivot
    domain[pivotIndex] +               // include pivot (4 chars)
    domain[pivotIndex + 1] +
    domain[pivotIndex + STR_VALUE_SIZE] +
    domain[pivotIndex + STR_VALUE_SIZE + 1] +
    _domain_quickSortRangesStr(right)  // sort right part, without pivot
  );
}
/**
 * @param {$domain_str|string} domain May already be csis but at least all ranges should be ordered and are lo<=hi
 * @returns {$domain_str}
 */
function _domain_mergeOverlappingRanges(domain) {
  ASSERT(typeof domain === 'string', 'USED_WITH_STRINGS');
  if (!domain) return EMPTY_STR; // prefer strings for return type consistency

  // assumes domain is sorted
  // assumes all ranges are "sound" (lo<=hi)

  let len = domain.length;
  if (len === STR_RANGE_SIZE) return domain;

  let newDomain = domain[FIRST_RANGE_LO] + domain[FIRST_RANGE_LO + 1];
  let lasthi = domain_strDecodeValue(domain, FIRST_RANGE_HI);
  let lasthindex = FIRST_RANGE_HI;

  for (let i = STR_RANGE_SIZE; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, i);
    let hi = domain_strDecodeValue(domain, i + STR_VALUE_SIZE);
    ASSERT(lo <= hi, 'ranges should be ascending');

    // either:
    // - lo <= lasthi, hi <= lasthi: last range consumes current range (drop it)
    // - lo <= lasthi+1: replace lasthi, last range is extended by current range
    // - lo >= lasthi+2: flush lasthi, replace lastlo and lasthi, current range becomes last range

    //if (lo <= lasthi && hi <= lasthi) {}
    //else
    if (lo <= lasthi + 1) {
      if (hi > lasthi) {
        lasthi = hi;
        lasthindex = i + STR_VALUE_SIZE;
      }
    } else {
      ASSERT(lo >= lasthi + 2, 'should be this now');
      newDomain += domain[lasthindex] + domain[lasthindex + 1] + domain[i] + domain[i + 1];
      lasthi = hi;
      lasthindex = i + STR_VALUE_SIZE;
    }
  }

  return newDomain + domain[lasthindex] + domain[lasthindex + 1];
}

/**
 * Check if given domain is in simplified, CSIS form
 *
 * @param {$domain_str} domain
 * @returns {boolean}
 */
function domain_isSimplified(domain) {
  ASSERT(typeof domain === 'string', 'USED_WITH_STRINGS');

  if (domain.length === STR_RANGE_SIZE) {
    ASSERT(domain_strDecodeValue(domain, FIRST_RANGE_LO) >= SUB, 'A_RANGES_SHOULD_BE_GTE_SUB');
    ASSERT(domain_strDecodeValue(domain, FIRST_RANGE_HI) <= SUP, 'A_RANGES_SHOULD_BE_LTE_SUP');
    ASSERT(domain_strDecodeValue(domain, FIRST_RANGE_LO) <= domain_strDecodeValue(domain, FIRST_RANGE_HI), 'A_RANGES_SHOULD_ASCEND');
    return true;
  }

  ASSERT((domain.length % STR_RANGE_SIZE) === 0, 'A_SHOULD_BE_EVEN');
  if (domain === EMPTY_STR) {
    return true;
  }

  let phi = SUB;
  for (let index = 0, len = domain.length; index < len; index += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, index);
    let hi = domain_strDecodeValue(domain, index + STR_VALUE_SIZE);
    ASSERT(lo >= SUB, 'A_RANGES_SHOULD_BE_GTE_SUB');
    ASSERT(hi <= SUP, 'A_RANGES_SHOULD_BE_LTE_SUP');
    ASSERT(lo <= hi, 'A_RANGES_SHOULD_ASCEND');
    // we need to simplify if the lo of the next range <= hi of the previous range
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
 * Intersect two $domains.
 * Intersection means the result only contains the values
 * that are contained in BOTH domains.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_intersection(domain1, domain2) {
  ASSERT((domain1 || domain1 === EMPTY || domain1 === EMPTY_STR) && (domain2 || domain2 === EMPTY || domain2 === EMPTY_STR), 'A_EXPECTING_TWO_DOMAINS');
  if (domain1 === domain2) return domain1;
  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';
  if (isNum1 && isNum2) return asmdomain_intersection(domain1, domain2);
  if (isNum1) return domain_intersectionNumStr(domain1, domain2);
  if (isNum2) return domain_intersectionNumStr(domain2, domain1); // swapped!
  return domain_intersectionStrStr(domain1, domain2);
}
/**
 * Intersect the domain assuming domain1 is a numbered (small)
 * domain and domain2 is an array domain. The result will always
 * be a small domain and that's what this function intends to
 * optimize.
 *
 * @param {$domain_num} domain_num
 * @param {$domain_str} domain_str
 * @returns {$domain_num} Always a numdom because we already know numbers higher than max_small cant occur in _both_ domains
 */
function domain_intersectionNumStr(domain_num, domain_str) {
  ASSERT(typeof domain_num === 'number', 'ONLY_WITH_NUMBERS');
  ASSERT(typeof domain_str === 'string', 'ONLY_WITH_STRINGS');

  let domain = EMPTY;
  for (let i = 0, len = domain_str.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain_str, i);
    if (lo > SMALL_MAX_NUM) break;
    let hi = domain_strDecodeValue(domain_str, i + STR_VALUE_SIZE);

    for (let j = lo, m = MIN(SMALL_MAX_NUM, hi); j <= m; ++j) {
      let flag = NUM_TO_FLAG[j];
      if (domain_num & flag) domain |= flag; // could be: domain |= domain1 & NUMBER[j]; but this reads better?
    }
  }

  return domain;
}
/**
 * Intersect two strdoms.
 * Intersection means the result only contains the values
 * that are contained in BOTH domains.
 *
 * @param {$domain_str} domain1
 * @param {$domain_str} domain2
 * @returns {$domain} can return a numdom
 */
function domain_intersectionStrStr(domain1, domain2) {
  ASSERT(typeof domain1 === 'string', 'ONLY_WITH_STRINGS');
  ASSERT(typeof domain2 === 'string', 'ONLY_WITH_STRINGS');

  let newDomain = _domain_intersectionStrStr(domain1, domain2);
  return domain_numstr(newDomain);
}
/**
 * Recursively calls itself
 *
 * @param {$domain_str} domain1
 * @param {$domain_str} domain2
 * @returns {$domain_str} always a strdom
 */
function _domain_intersectionStrStr(domain1, domain2) {
  ASSERT(typeof domain1 === 'string', 'ONLY_WITH_STRINGS');
  ASSERT(typeof domain2 === 'string', 'ONLY_WITH_STRINGS');

  let newDomain = EMPTY_STR;

  let len1 = domain1.length;
  let len2 = domain2.length;

  if (len1 + len2 === 0) return newDomain;

  let index1 = 0;
  let index2 = 0;

  let lo1 = domain_strDecodeValue(domain1, FIRST_RANGE_LO);
  let hi1 = domain_strDecodeValue(domain1, FIRST_RANGE_HI);
  let lo2 = domain_strDecodeValue(domain2, FIRST_RANGE_LO);
  let hi2 = domain_strDecodeValue(domain2, FIRST_RANGE_HI);

  while (true) {
    if (hi1 < lo2) {
      index1 += STR_RANGE_SIZE;
      if (index1 >= len1) break;
      lo1 = domain_strDecodeValue(domain1, index1);
      hi1 = domain_strDecodeValue(domain1, index1 + STR_VALUE_SIZE);
    } else if (hi2 < lo1) {
      index2 += STR_RANGE_SIZE;
      if (index2 >= len2) break;
      lo2 = domain_strDecodeValue(domain2, index2);
      hi2 = domain_strDecodeValue(domain2, index2 + STR_VALUE_SIZE);
    } else {
      ASSERT((lo1 <= lo2 && hi1 >= lo2) || (lo2 <= lo1 && hi2 >= lo1), 'both ranges must overlap at least for some element because neither ends before the other');

      let mh = MIN(hi1, hi2);
      newDomain += domain_strEncodeRange(MAX(lo1, lo2), mh);

      // put all ranges after the one we just added...
      mh += 2; // last added range + 1 position gap
      lo1 = lo2 = mh;
      ASSERT(hi1 < mh || hi2 < mh, 'at least one range should be moved forward now');
      if (hi1 < mh) {
        index1 += STR_RANGE_SIZE;
        if (index1 >= len1) break;
        lo1 = domain_strDecodeValue(domain1, index1);
        hi1 = domain_strDecodeValue(domain1, index1 + STR_VALUE_SIZE);
      }
      if (hi2 < mh) {
        index2 += STR_RANGE_SIZE;
        if (index2 >= len2) break;
        lo2 = domain_strDecodeValue(domain2, index2);
        hi2 = domain_strDecodeValue(domain2, index2 + STR_VALUE_SIZE);
      }
    }
  }

  return newDomain;
}

function domain_debug(domain) {
  if (typeof domain === 'number') return 'numdom([' + domain_numToArr(domain) + '])';
  if (typeof domain === 'string') return 'strdom([' + domain_strToArr(domain) + '])';
  if (domain instanceof Array) return 'arrdom([' + domain + '])';
  return '???dom(' + domain + ')';
}

/**
 * deep comparison of two $domains
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function domain_isEqual(domain1, domain2) {
  // whether domain is a string or a number, we can === it
  return domain1 === domain2;
}

/**
 * The idea behind this function - which is primarily
 * intended for domain_plus and domain_minus and probably applies
 * to nothing else - is that when adding two intervals,
 * both intervals expand by the other's amount. This means
 * that when given two segmented domains, each continuous
 * range expands by at least the interval of the smallest
 * range of the other segmented domain. When such an expansion
 * occurs, any gaps between subdomains that are <= the smallest
 * range's interval width get filled up, which we can exploit
 * to reduce the number of segments in a domain. Reducing the
 * number of domain segments helps reduce the N^2 complexity of
 * the subsequent domain consistent interval addition method.
 *
 * @param {$domain_str} domain1
 * @param {$domain_str} domain2
 * @returns {$domain_str[]}
 */
function domain_closeGapsStr(domain1, domain2) {
  ASSERT(typeof domain1 === 'string', 'USED_WITH_STRINGS');
  ASSERT(typeof domain2 === 'string', 'USED_WITH_STRINGS');

  if (domain1 && domain2) {
    let change;
    do {
      change = NO_CHANGES;

      if (domain1.length > STR_RANGE_SIZE) {
        let smallestRangeSize = domain_smallestRangeSize(domain2);
        let domain = _domain_closeGapsStr(domain1, smallestRangeSize);
        change += domain1.length - domain.length;
        domain1 = domain;
      }

      if (domain2.length > STR_RANGE_SIZE) {
        let smallestRangeSize = domain_smallestRangeSize(domain1);
        let domain = _domain_closeGapsStr(domain2, smallestRangeSize);
        change += domain2.length - domain.length;
        domain2 = domain;
      }
    } while (change !== NO_CHANGES);
  }

  // TODO: we could return a concatted string and prefix the split, instead of this temporary array...
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
 * @param {$domain_str} domain
 * @param {number} gap
 * @returns {$domain_str} (min/max won't be eliminated and input should be a "large" domain)
 */
function _domain_closeGapsStr(domain, gap) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  let newDomain = domain[FIRST_RANGE_LO] + domain[FIRST_RANGE_LO + 1];
  let lasthi = domain_strDecodeValue(domain, FIRST_RANGE_HI);
  let lasthindex = FIRST_RANGE_HI;

  for (let i = STR_RANGE_SIZE, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, i);
    let hi = domain_strDecodeValue(domain, i + STR_VALUE_SIZE);

    if ((lo - lasthi) > gap) {
      newDomain += domain[lasthindex] + domain[lasthindex + 1] + domain[i] + domain[i + 1];
    }
    lasthi = hi;
    lasthindex = i + STR_VALUE_SIZE;
  }

  newDomain += domain[lasthindex] + domain[lasthindex + 1];

  return newDomain;
}
/**
 * @param {$domain_str} domain
 * @returns {number}
 */
function domain_smallestRangeSize(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  let min_width = SUP;

  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, i);
    let hi = domain_strDecodeValue(domain, i + STR_VALUE_SIZE);
    let width = 1 + hi - lo;
    if (width < min_width) {
      min_width = width;
    }
  }
  return min_width;
}

/**
 * Note that this one isn't domain consistent.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_mul(domain1, domain2) {
  // for simplicity sake, convert them back to arrays
  if (typeof domain1 === 'number') domain1 = domain_numToStr(domain1);
  if (typeof domain2 === 'number') domain2 = domain_numToStr(domain2);

  // TODO domain_mulNum
  return domain_mulStrStr(domain1, domain2);
}
/**
 * Note that this one isn't domain consistent.
 *
 * @param {$domain_str} domain1
 * @param {$domain_str} domain2
 * @returns {$domain_str} a strdom can never become a numdom when multiplying (can only grow or become zero)
 */
function domain_mulStrStr(domain1, domain2) {
  ASSERT(typeof domain1 === 'string', 'ONLY_WITH_STRINGS');
  ASSERT(typeof domain2 === 'string', 'ONLY_WITH_STRINGS');

  let result = '';
  for (let i = 0, leni = domain1.length; i < leni; i += STR_RANGE_SIZE) {
    let loi = domain_strDecodeValue(domain1, i);
    let hii = domain_strDecodeValue(domain1, i + STR_VALUE_SIZE);

    for (let j = 0, lenj = domain2.length; j < lenj; j += STR_RANGE_SIZE) {
      let loj = domain_strDecodeValue(domain2, j);
      let hij = domain_strDecodeValue(domain2, j + STR_VALUE_SIZE);

      result += domain_strEncodeRange(MIN(SUP, loi * loj), MIN(SUP, hii * hij));
    }
  }

  // TODO: is it worth doing this step immediately?
  return domain_numstr(domain_simplifyStr(result));
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
  if (typeof domain1 === 'number') domain1 = domain_numToStr(domain1);
  if (typeof domain2 === 'number') domain2 = domain_numToStr(domain2);

  // TODO: domain_divByNum
  return domain_divbyStrStr(domain1, domain2, floorFractions);
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
 * @param {$domain_str} domain1
 * @param {$domain_str} domain2
 * @param {boolean} [floorFractions=true] Include the floored lo of the resulting ranges?
 *         For example, <5,5>/<2,2> is <2.5,2.5>. If this flag is true, it will include
 *         <2,2>, otherwise it will not include anything for that division.
 * @returns {$domain} strdom could become numdom after a div
 */
function domain_divbyStrStr(domain1, domain2, floorFractions = true) {
  ASSERT(typeof domain1 === 'string', 'ONLY_WITH_STRINGS');
  ASSERT(typeof domain2 === 'string', 'ONLY_WITH_STRINGS');

  let result = '';
  for (let i = 0, leni = domain1.length; i < leni; i += STR_RANGE_SIZE) {
    let loi = domain_strDecodeValue(domain1, i);
    let hii = domain_strDecodeValue(domain1, i + STR_VALUE_SIZE);

    for (let j = 0, lenj = domain2.length; j < lenj; j += STR_RANGE_SIZE) {
      let loj = domain_strDecodeValue(domain2, j);
      let hij = domain_strDecodeValue(domain2, j + STR_VALUE_SIZE);

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
          result += domain_strEncodeRange(left, right);
        } else {
          ASSERT(FLOOR(lo) === FLOOR(hi), 'left>right when fraction is in same int, which can happen', lo, hi);
          if (floorFractions) {
            // only use the floored value
            // note: this is a choice. not both floor/ceil because then 5/2=2.5 becomes [2,3]. should be [2,2] or [3,3]
            result += domain_strEncodeRange(right, right);
          }
        }
      }
    }
  }

  return domain_numstr(domain_simplifyStr(result));
}

/**
 * Return the number of elements this domain covers
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_size(domain) {
  ASSERT(domain || domain === 0, 'REQUIRES_DOMAIN');
  if (typeof domain === 'number') return asmdomain_size(domain);
  return domain_sizeStr(domain);
}
/**
 * Return the number of elements this domain covers
 *
 * @param {$domain_str} domain
 * @returns {number}
 */
function domain_sizeStr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(domain && domain.length, 'A_EXPECTING_NON_EMPTY_DOMAINS');

  let count = 0;

  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    // TODO: add test to confirm this still works fine if SUB is negative
    count += 1 + domain_strDecodeValue(domain, i + STR_VALUE_SIZE) - domain_strDecodeValue(domain, i);
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
  if (typeof domain === 'number') domain = domain_numToStr(domain);

  // TODO: domain_middleElementNum(domain);
  return domain_middleElementStr(domain);
}
/**
 * Get the middle element of all elements in domain.
 * Not hi-lo/2 but the (size/2)th element.
 * For domains with an even number of elements it
 * will take the first value _above_ the middle,
 * in other words; index=ceil(count/2).
 *
 * @param {$domain_str} domain
 * @returns {number}
 */
function domain_middleElementStr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  let size = domain_sizeStr(domain);
  let targetValue = FLOOR(size / 2);

  let lo;
  let hi;
  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    lo = domain_strDecodeValue(domain, i);
    hi = domain_strDecodeValue(domain, i + STR_VALUE_SIZE);

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
  if (typeof domain === 'number') return asmdomain_min(domain);
  return domain_minStr(domain);
}
/**
 * Get lowest value in the domain
 * Only use if callsite doesn't use first range again
 *
 * @param {$domain_str} domain
 * @returns {number}
 */
function domain_minStr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  return domain_strDecodeValue(domain, FIRST_RANGE_LO);
}

/**
 * Only use if callsite doesn't use last range again
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_max(domain) {
  if (typeof domain === 'number') return asmdomain_max(domain);
  return domain_maxStr(domain);
}
/**
 * Returns highest value in domain
 * Only use if callsite doesn't use last range again
 *
 * @param {$domain_str} domain
 * @returns {number}
 */
function domain_maxStr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  // last encoded value in the string should be the hi of the last range. so max is last value
  return domain_strDecodeValue(domain, domain.length - STR_VALUE_SIZE);
}
/**
 * Returns highest value in domain
 * Only use if callsite doesn't use last range again
 *
 * @param {$domain_arr} domain
 * @returns {number}
 */
function domain_maxArr(domain) {
  let len = domain.length;
  if (len === 0) return NO_SUCH_VALUE;
  return domain[len - 1];
}

/**
 * A domain is "solved" if it covers exactly one value. It is not solved if it is empty.
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isSolved(domain) {
  if (typeof domain === 'number') return asmdomain_isSolved(domain) === 1;
  return domain_isSolvedStr(domain);
}
/**
 * A domain is "solved" if it covers exactly one value. It is not solved if it is empty.
 *
 * @param {$domain_str} domain
 * @returns {boolean}
 */
function domain_isSolvedStr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  // TODO: could do this by comparing strings, no need to convert
  return domain.length === STR_RANGE_SIZE && domain_strDecodeValue(domain, FIRST_RANGE_LO) === domain_strDecodeValue(domain, FIRST_RANGE_HI);
}

/**
 * A domain is "determined" if it's either one value (solved) or none at all (rejected)
 * This is the most called function of the library. 3x more than the number two.
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isUndetermined(domain) {
  if (typeof domain === 'number') return asmdomain_isUndetermined(domain) === 1;
  return domain_isUndeterminedStr(domain);
}
/**
 * A domain is "determined" if it's either one value (solved) or none at all (rejected)
 * This is the most called function of the library. 3x more than the number two.
 *
 * @param {$domain_str} domain
 * @returns {boolean}
 */
function domain_isUndeterminedStr(domain) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  // TODO: could do this by comparing strings, no need to convert
  return domain.length > STR_RANGE_SIZE || domain_strDecodeValue(domain, FIRST_RANGE_LO) !== domain_strDecodeValue(domain, FIRST_RANGE_HI);
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
  return !domain; // typeof domain === 'number' ? domain === EMPTY_NUM : domain === EMPTY_STR;
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
  ASSERT(domain || domain === EMPTY || domain === EMPTY_STR, 'REQUIRES_DOMAIN');
  ASSERT(typeof value === 'number' && value >= 0, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT'); // so cannot be negative
  if (typeof domain === 'number') return asmdomain_removeGte(domain, value);
  return domain_removeGteStr(domain, value);
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
 * @param {$domain_str} domain_str
 * @param {number} value
 * @returns {$domain}
 */
function domain_removeGteStr(domain_str, value) {
  ASSERT(typeof domain_str === 'string', 'USED_WITH_STRINGS');

  for (let i = 0, len = domain_str.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain_str, i);
    let hi = domain_strDecodeValue(domain_str, i + STR_VALUE_SIZE);

    // case: v=5
    // 012 456 // => 012 4
    // 012 45  // => 012 4
    // 012 567 // => 012
    // 012 5   // => 012
    // 012 678 // => 012
    // 012     // => NONE
    // 678     // => empty

    // TODO: if we know the returned domain is a small domain we should prevent the slice at all.

    if (lo > value) {
      // 67 9    -> empty
      // 012 789 -> 012
      let newDomain = domain_str.slice(0, i);
      return domain_numstr(newDomain);
    }
    if (lo === value) {
      // 567 9   -> empty
      // 012 567 -> 012
      // 012 5   -> 012
      let newDomain = domain_str.slice(0, i);
      return domain_numstr(newDomain);
    }
    if (value <= hi) {
      // 012 456 -> 012 4
      // 012 45  -> 012 4
      let newDomain = domain_str.slice(0, i + STR_VALUE_SIZE) + domain_strEncodeValue(value - 1);
      if (value - 1 <= SMALL_MAX_NUM) return domain_strToNum(newDomain, i + STR_RANGE_SIZE);
      return newDomain;
    }
  }
  return domain_str; // 012 -> 012
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
  ASSERT(domain || domain === EMPTY || domain === EMPTY_STR, 'REQUIRES_DOMAIN');
  ASSERT(typeof value === 'number' && value >= 0, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT'); // so cannot be negative
  if (typeof domain === 'number') return asmdomain_removeLte(domain, value);
  return domain_removeLteStr(domain, value);
}
/**
 * Remove any value from domain that is lesser than or equal to given value.
 * Since domains are assumed to be in CSIS form, we can start from the front and
 * search for the first range that is smaller or contains given value. Prune
 * any range that preceeds it and trim the found range if it contains the value.
 * Returns whether the domain was changed somehow
 * Does not harm domain
 *
 * @param {$domain_str} domain_str
 * @param {number} value
 * @returns {$domain}
 */
function domain_removeLteStr(domain_str, value) {
  ASSERT(typeof domain_str === 'string', 'USED_WITH_STRINGS');

  for (let i = 0, len = domain_str.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain_str, i);
    let hi = domain_strDecodeValue(domain_str, i + STR_VALUE_SIZE);

    // case: v=5
    // 456 89 => 6 89
    // 45 89  => 89
    // 56 89  => 6 89
    // 5  89  => 5 89
    // 6788   => 67 9
    // 789    => NONE
    // 012    => empty

    if (lo > value) {
      if (!i) return domain_str; // 678 -> 678

      // 234 678 -> 678
      let newDomain = domain_str.slice(i);
      return domain_numstr(newDomain);
    }
    if (hi === value) {
      // 45 89  => 89, 5  89  => 5 89
      let newDomain = domain_str.slice(i + STR_RANGE_SIZE);
      return domain_numstr(newDomain);
    }
    if (value <= hi) {
      // 456 89 => 6 89, 56 89 => 6 89

      let newDomain = domain_strEncodeValue(value + 1) + domain_str.slice(i + STR_VALUE_SIZE);
      return domain_numstr(newDomain);
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
  ASSERT(domain || domain === EMPTY || domain === EMPTY_STR, 'REQUIRES_DOMAIN');
  ASSERT(typeof value === 'number' && value >= 0, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT'); // so cannot be negative
  if (typeof domain === 'number') return asmdomain_removeValue(domain, value);
  return domain_removeValueStr(domain, value);
}
/**
 * @param {$domain_str} domain
 * @param {number} value
 * @returns {$domain}
 */
function domain_removeValueStr(domain, value) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBERS');

  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, i);
    let hi = domain_strDecodeValue(domain, i + STR_VALUE_SIZE);

    if (value === lo) {
      let newDomain = domain.slice(0, i);
      if (value !== hi) newDomain += domain_strEncodeRange(value + 1, hi);
      return domain_numstr(newDomain + domain.slice(i + STR_RANGE_SIZE));
    }
    if (value === hi) {
      // note: we already checked value==lo so no need to do that again
      let newDomain =
        domain.slice(0, i) +
        domain_strEncodeRange(lo, value - 1) +
        domain.slice(i + STR_RANGE_SIZE);
      return domain_numstr(newDomain);
    }
    if (value < lo) {
      // value sits between prev range (if not start) and current range so domain
      // does not have it at all. return the input domain to indicate "no change"
      return domain;
    }
    if (value < hi) {
      // split up range to remove the value. we already confirmed that range
      // does not start or end at value, so just split it
      let newDomain =
        domain.slice(0, i) +
        domain_strEncodeRange(lo, value - 1) +
        domain_strEncodeRange(value + 1, hi) +
        domain.slice(i + STR_RANGE_SIZE);
      return domain_numstr(newDomain);
    }
  }
  // value must be higher than the max of domain because domain does not contain it
  // return domain to indicate no change
  ASSERT(domain_isRejected(domain) || domain_max(domain) < value, 'MAX_DOMAIN_SHOULD_BE_UNDER_VALUE');
  // "no change"
  return domain;
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
  if (isNum1 && isNum2) return asmdomain_sharesNoElements(domain1, domain2) === 1;
  if (isNum1) return domain_sharesNoElementsNumStr(domain1, domain2);
  if (isNum2) return domain_sharesNoElementsNumStr(domain2, domain1);
  return domain_sharesNoElementsStrStr(domain1, domain2);
}
/**
 * Check if every element in one domain not
 * occur in the other domain and vice versa
 *
 * @param {$domain_num} domain_num
 * @param {$domain_str} domain_str
 * @returns {boolean}
 */
function domain_sharesNoElementsNumStr(domain_num, domain_str) {
  let strIndex = 0;
  let strlen = domain_str.length;
  for (let numIndex = 0; numIndex <= SMALL_MAX_NUM; ++numIndex) {
    if (domain_num & (1 << numIndex)) {
      // find numIndex (as value) in domain_str. return true when
      // found. return false if number above small_max_num is found
      while (strIndex < strlen) {
        let lo = domain_strDecodeValue(domain_str, strIndex);
        let hi = domain_strDecodeValue(domain_str, strIndex + STR_VALUE_SIZE);

        // there is overlap if numIndex is within current range so return false
        if (numIndex >= lo && numIndex <= hi) return false;
        // the next value in domain_num can not be smaller and the previous
        // domain_str range was below that value and the next range is beyond
        // the small domain max so there can be no more matching values
        if (lo > SMALL_MAX_NUM) return true;
        // this range is bigger than target value so the value doesnt
        // exist; skip to next value
        if (lo > numIndex) break;

        strIndex += STR_RANGE_SIZE;
      }
      if (strIndex >= strlen) return true;
    }
  }
  // checked all values in domain_num (can code reach here?
  // i think it'll always return early in the inner loop?)
  return true;
}
/**
 * Check if every element in one domain not
 * occur in the other domain and vice versa
 *
 * @param {$domain_str} domain1
 * @param {$domain_str} domain2
 * @returns {boolean}
 */
function domain_sharesNoElementsStrStr(domain1, domain2) {
  let len1 = domain1.length;
  let len2 = domain2.length;

  let index1 = 0;
  let index2 = 0;

  let lo1 = domain_strDecodeValue(domain1, FIRST_RANGE_LO);
  let hi1 = domain_strDecodeValue(domain1, FIRST_RANGE_HI);
  let lo2 = domain_strDecodeValue(domain2, FIRST_RANGE_LO);
  let hi2 = domain_strDecodeValue(domain2, FIRST_RANGE_HI);

  while (true) {
    if (hi1 < lo2) {
      index1 += STR_RANGE_SIZE;
      if (index1 >= len1) break;
      lo1 = domain_strDecodeValue(domain1, index1);
      hi1 = domain_strDecodeValue(domain1, index1 + STR_VALUE_SIZE);
    } else if (hi2 < lo1) {
      index2 += STR_RANGE_SIZE;
      if (index2 >= len2) break;
      lo2 = domain_strDecodeValue(domain2, index2);
      hi2 = domain_strDecodeValue(domain2, index2 + STR_VALUE_SIZE);
    } else {
      ASSERT(lo1 <= hi2 && hi1 <= lo2, 'both ranges must overlap at least for some element because neither ends before the other');
      return false;
    }
  }
  // no overlaps found
  return true;
}

/**
 * @param {number} value
 * @returns {$domain}
 */
function domain_createValue(value) {
  ASSERT(value >= SUB, 'domain_createValue: value should be within valid range');
  ASSERT(value <= SUP, 'domain_createValue: value should be within valid range');

  if (value <= SMALL_MAX_NUM) return asmdomain_createValue(value);
  return domain_strEncodeRange(value, value);
}
/**
 * @param {number} lo
 * @param {number} hi
 * @returns {$domain}
 */
function domain_createRange(lo, hi) {
  ASSERT(lo >= SUB && hi <= SUP && lo <= hi, 'expecting sanitized inputs');

  if (hi <= SMALL_MAX_NUM) return asmdomain_createRange(lo, hi);
  return domain_strEncodeRange(lo, hi);
}

/**
 * @param {$domain} domain
 * @param {boolean} [force] Always return in array or string form?
 * @returns {$domain}
 */
function domain_clone(domain, force) {
  if (force === FORCE_ARRAY) return domain_toArr(domain, true);
  if (force === FORCE_STRING) return domain_toStr(domain);
  return domain; // TODO: eliminate this function. domains are strings and numbers now. array cases should be consolidated to config explicitly.
}

/**
 * Get a domain representation in array form
 *
 * @param {$domain} domain
 * @param {boolean} [clone] If input is array, slice the array? (other cases will always return a fresh array)
 * @returns {$domain_arr} (small domains will also be arrays)
 */
function domain_toArr(domain, clone) {
  if (typeof domain === 'number') return domain_numToArr(domain);
  if (typeof domain === 'string') return domain_strToArr(domain);
  ASSERT(domain instanceof Array, 'can only be array now');
  if (clone) return domain.slice(0);
  return domain;
}
/**
 * Get a domain representation in string form
 *
 * @param {$domain} domain
 * @returns {$domain_str} (small domains will also be strings)
 */
function domain_toStr(domain) {
  if (typeof domain === 'number') return domain_numToStr(domain);
  if (typeof domain === 'string') return domain;
  ASSERT(domain instanceof Array, 'can only be array now');
  return domain_arrToStr(domain);
}
/**
 * Get a domain representation in smallest form but never return an arrdom
 *
 * @param {$domain} domain
 * @returns {$domain_str|$domain_num}
 */
function domain_toNumstr(domain) {
  if (typeof domain === 'number') return domain;
  if (typeof domain === 'string') return domain_numstr(domain);
  ASSERT(domain instanceof Array, 'can only be array now');
  return domain_arrToNumstr(domain);
}
/**
 * Create an array domain from a numbered domain (bit wise flags)
 *
 * @param {$domain_num} domain
 * @returns {$domain_arr}
 */
function domain_numToArr(domain) {
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
 * Explicitly create an strdom from a numdom
 *
 * @param {$domain_num} domain
 * @returns {$domain_str}
 */
function domain_numToStr(domain) {
  ASSERT(typeof domain === 'number', 'ONLY_USED_WITH_NUMBERS');
  if (domain === EMPTY) return EMPTY_STR;

  let str = '';
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
      str = domain_strEncodeRange(0, 0);
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
      str += domain_strEncodeRange(lo, hi);
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
          str += domain_strEncodeRange(lo, hi);
          lo = i;
        }
        hi = i;
      }
    }
  }

  // since the domain wasn't empty (checked at start) there
  // must now be an unpushed lo/hi pair left to push...
  str += domain_strEncodeRange(lo, hi);

  return str;
}
/**
 * Create an array domain from a string domain
 *
 * @param {$domain_str} domain
 * @returns {$domain_arr}
 */
function domain_strToArr(domain) {
  ASSERT(typeof domain === 'string', 'ONLY_USED_WITH_STRINGS');

  if (domain === EMPTY) return [];

  let arr = [];
  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, i);
    let hi = domain_strDecodeValue(domain, i + STR_VALUE_SIZE);

    arr.push(lo, hi);
  }
  return arr;
}
/**
 * Convert an array domain to number domain
 *
 * @param {$domain_arr} domain_arr
 * @returns {$domain_num}
 */
function domain_arrToNumstr(domain_arr) {
  ASSERT(domain_arr instanceof Array, 'ARRAYS_ONLY');

  let len = domain_arr.length;
  if (len === 0) return EMPTY;

  ASSERT(typeof domain_arr[domain_arr.length - 1] === 'number');
  let max = domain_maxArr(domain_arr);
  if (max <= SMALL_MAX_NUM) return _domain_arrToNum(domain_arr, len);

  return domain_arrToStr(domain_arr);
}
/**
 * Convert an arrdom to a strdom
 *
 * @param {$domain_arr} domain_arr
 * @returns {$domain_str}
 */
function domain_arrToStr(domain_arr) {
  ASSERT(domain_arr instanceof Array, 'ARRAYS_ONLY');

  let str = '';
  for (let i = 0, len = domain_arr.length; i < len; i += ARR_RANGE_SIZE) {
    let lo = domain_arr[i];
    let hi = domain_arr[i + 1];
    ASSERT(typeof lo === 'number');
    ASSERT(typeof hi === 'number');

    str += domain_strEncodeRange(lo, hi);
  }

  return str;
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
function domain_arrToNum(domain) {
  if (typeof domain === 'number') return domain;

  let len = domain.length;
  if (len === 0) return 0;

  ASSERT(domain_min(domain) >= SUB, 'SHOULD_BE_VALID_DOMAIN'); // no need to check in dist
  if (domain_max(domain) > SMALL_MAX_NUM) return domain;

  return _domain_arrToNum(domain, len);
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
function _domain_arrToNum(domain, len) {
  ASSERT(typeof domain !== 'number', 'NOT_USED_WITH_NUMBER');
  ASSERT(domain[domain.length - 1] <= SMALL_MAX_NUM, 'SHOULD_BE_SMALL_DOMAIN', domain);
  let out = 0;
  for (let i = 0; i < len; i += ARR_RANGE_SIZE) {
    out = asmdomain_addRange(out, domain[i], domain[i + 1]);
  }
  return out;
}

/**
 * Accept a domain and if it is an array, try to reduce it
 * to a number if its max value is low enough for it.
 * Otherwise return a string domain, even if input was an
 * array domain.
 *
 * @param {$domain} domain
 * @returns {$domain}
 */
function domain_numstr(domain) {
  // number is ideal
  if (typeof domain === 'number') return domain;

  let len = domain.length; // either array or string, doesn't matter
  if (len === 0) return EMPTY;

  if (typeof domain === 'string') {
    ASSERT(domain_minStr(domain) >= SUB, 'SHOULD_BE_VALID_DOMAIN');
    if (domain_maxStr(domain) <= SMALL_MAX_NUM) return domain_strToNum(domain, len);
    return domain;
  }

  ASSERT(domain instanceof Array, 'should be array if not num or str');
  return domain_arrToNumstr(domain);
}
/**
 * Convert string domain to number domain. Assumes domain
 * is eligible to be a small domain.
 *
 * @param {$domain_str} domain
 * @param {number} len Length of the domain array (domain.length! not range count)
 * @returns {$domain_num}
 */
function domain_strToNum(domain, len) {
  ASSERT(typeof domain === 'string', 'USED_WITH_STRINGS');
  ASSERT(domain.length === len, 'len should be cache of domain.length');
  ASSERT(domain_max(domain) <= SMALL_MAX_NUM, 'SHOULD_BE_SMALL_DOMAIN', domain, domain_max(domain));

  let out = EMPTY;
  for (let i = 0; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain, i);
    let hi = domain_strDecodeValue(domain, i + STR_VALUE_SIZE);
    out = asmdomain_addRange(out, lo, hi);
  }
  return out;
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
function domain_validateOldArr(domain) {
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

  ASSERT(domain instanceof Array, 'DOMAIN_SHOULD_BE_ARRAY', domain);
  return domain;
}

/**
 * Domain input validation
 * Have to support and transform legacy domain formats of domains of domains
 * and transform them to flat domains with lo/hi pairs
 *
 * @param {$domain_arr} domain
 * @returns {string|undefined}
 */
function domain_confirmDomain(domain) {
  for (let i = 0; i < domain.length; i += ARR_RANGE_SIZE) {
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
  ASSERT((domain.length % ARR_RANGE_SIZE) === 0, 'other tests should have caught uneven domain lengths');
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
 * @param {$domain_arr|number[][]} domain
 * @returns {$domain_arr}
 */
function domain_tryToFixLegacyDomain(domain) {
  let fixed = [];
  for (let i = 0; i < domain.length; i++) {
    let rangeArr = domain[i];
    if (!(rangeArr instanceof Array)) {
      return;
    }
    if (rangeArr.length !== ARR_RANGE_SIZE) {
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
  FIRST_RANGE_LO,
  FIRST_RANGE_HI,
  FORCE_ARRAY,
  FORCE_STRING,
  LO_BOUND,
  HI_BOUND,
  NO_CHANGES,
  NOT_FOUND,
  ARR_RANGE_SIZE,
  PREV_CHANGED,
  SMALL_MAX_FLAG,
  SMALL_MAX_NUM,
  SOME_CHANGES,
  STR_VALUE_SIZE,
  STR_RANGE_SIZE,

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

  domain_appendRange,
  domain_arrToNum,
  domain_arrToNumstr,
  domain_arrToStr,
  domain_clone,
  domain_closeGapsStr,
  domain_complement,
  domain_containsValue,
  domain_containsValueStr,
  domain_createRange,
  domain_createValue,
  domain_debug,
  domain_divby,
  domain_isEqual,
  domain_numToArr,
  domain_fromList,
  domain_getChangeState,
  domain_getValue,
  domain_getValueArr,
  domain_getValueStr,
  domain_getValueOfFirstContainedValueInList,
  domain_intersection,
  domain_intersectionStrStr,
  domain_isRejected,
  domain_isSolved,
  domain_isSolvedStr,
  domain_isUndetermined,
  domain_isUndeterminedStr,
  domain_isValue,
  domain_isValueStr,
  domain_max,
  domain_middleElement,
  domain_min,
  domain_mul,
  domain_numstr,
  domain_numToStr,
  domain_strToNum,
  domain_removeGte,
  domain_removeGteStr,
  domain_removeLte,
  domain_removeLteStr,
  domain_removeNextFromList,
  domain_removeValue,
  domain_removeValueStr,
  domain_sharesNoElements,
  domain_simplifyStr,
  domain_size,
  domain_strDecodeValue,
  domain_strEncodeRange,
  domain_strEncodeValue,
  domain_toArr,
  domain_toList,
  domain_toStr,
  domain_toNumstr,
  domain_validateOldArr,

  // __REMOVE_BELOW_FOR_DIST__
  // testing only:
  domain_rangeIndexOfStr,
  domain_isSimplified,
  _domain_mergeOverlappingRanges,
  _domain_quickSortRangesStr,
  // __REMOVE_ABOVE_FOR_DIST__
};
