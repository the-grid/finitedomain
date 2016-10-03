
// a domain, in this lib, is a set of numbers denoted by lo-hi range pairs (inclusive)
// for memory and performance reasons finitedomain has three different representations for a domain;
// - arrdom: an array with number pairs. mostly used by external apis because its easier to deal with. GC sensitive.
// - numdom: a 31bit field where each bit represents the inclusion of a value of its index (0 through 30). 31st bit unused
// - strdom: each value of an arrdom encoded as a double 16bit character. fixed range size (4 characters).

import {
  EMPTY,
  EMPTY_STR,
  NO_SUCH_VALUE,
  NOT_FOUND,
  ARR_RANGE_SIZE,
  SMALL_MAX_FLAG,
  SMALL_MAX_NUM,
  SOLVED_FLAG,
  SUB,
  SUP,

  ASSERT,
  ASSERT_ANYDOM,
  ASSERT_ARRDOM,
  ASSERT_BITDOM,
  ASSERT_NUMDOM,
  ASSERT_NORDOM,
  ASSERT_SOLDOM,
  ASSERT_STRDOM,
  THROW,
} from './helpers';

// BODY_START

let PREV_CHANGED = true;
let FORCE_ARRAY = 1;
let FORCE_STRING = 2;

// CSIS form = Canonical Sorted Interval Sequeunce form.
// Basically means the ranges in the domain are ordered
// ascending and no ranges overlap. We call this "simplified"

//let FIRST_RANGE = 0;
let STR_FIRST_RANGE_LO = 0; // first and second char of a string
let STR_FIRST_RANGE_HI = 2; // third and fourth char of a string
let ARR_FIRST_RANGE_LO = 0;
let ARR_FIRST_RANGE_HI = 1;

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

// size of values and ranges in a string domain
const STR_VALUE_SIZE = 2;
const STR_RANGE_SIZE = 4;

/**
 * Append given range to the end of given domain. Does not
 * check if the range belongs there! Dumbly appends.
 *
 * @param {$nordom} domain
 * @param {number} lo
 * @param {number} hi
 * @returns {$domain}
 */
function domain_appendRange(domain, lo, hi) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') {
    // note: this function should not receive numdoms with a SOLVED_FLAG set
    // it is only used in temporary array cases, the flag must be set afterwards
    ASSERT(domain < SOLVED_FLAG, 'not expecting solved numdoms');
    if (hi <= SMALL_MAX_NUM) return domain_bit_addRange(domain, lo, hi);
    domain = domain_numToStr(domain);
  }
  return domain_str_addRange(domain, lo, hi);
}
function domain_bit_addRange(domain, lo, hi) {
  ASSERT_BITDOM(domain);
  // what we do is:
  // - create a 1
  // - move the 1 to the left, `1+to-from` times
  // - subtract 1 to get a series of `to-from` ones
  // - shift those ones `from` times to the left
  // - OR that result with the domain and return it

  let range = (((1 << (1 + (hi | 0) - (lo | 0))) - 1) << lo);
  return domain | range;
}
function domain_str_addRange(domain, lo, hi) {
  ASSERT_STRDOM(domain);
  ASSERT(lo >= 0);
  ASSERT(hi <= SUP);
  ASSERT(lo <= hi);

  return domain + domain_str_encodeRange(lo, hi);
}

/**
 * returns whether domain covers given value
 *
 * @param {$nordom} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_containsValue(domain, value) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') return domain_num_containsValue(domain, value);
  return domain_str_containsValue(domain, value);
}
function domain_num_containsValue(domain, value) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_sol_containsValue(domain, value);
  return domain_bit_containsValue(domain, value);
}
function domain_sol_containsValue(domain, value) {
  ASSERT_SOLDOM(domain);
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');
  ASSERT(value >= SUB);
  ASSERT(value <= SUP);

  return (domain ^ SOLVED_FLAG) === value;
}
function domain_bit_containsValue(domain, value) {
  ASSERT_BITDOM(domain);
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');
  ASSERT(value >= SUB);
  ASSERT(value <= SUP);

  return (domain & (1 << value)) !== 0;
}
function domain_str_containsValue(domain, value) {
  ASSERT_STRDOM(domain);
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');
  ASSERT(value >= SUB);
  ASSERT(value <= SUP);

  return domain_str_rangeIndexOf(domain, value) !== NOT_FOUND;
}

/**
 * return the range index in given domain that covers given
 * value, or if the domain does not cover it at all
 *
 * @param {$strdom} domain
 * @param {number} value
 * @returns {number} >=0 actual index on strdom or NOT_FOUND
 */
function domain_str_rangeIndexOf(domain, value) {
  ASSERT_STRDOM(domain);
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');
  ASSERT(value >= SUB);
  ASSERT(value <= SUP);

  let len = domain.length;

  for (let index = 0; index < len; index += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(domain, index);
    if (lo <= value) {
      let hi = domain_str_decodeValue(domain, index + STR_VALUE_SIZE);
      if (hi >= value) {
        // value is lo<=value<=hi
        return index;
      }
    } else {
      // value is between previous range and this one, aka: not found.
      break;
    }
  }

  return NOT_FOUND;
}

/**
 * Is given domain solved to given value?
 * A domain is solved if it contains exactly one value.
 *
 * @param {$nordom} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_isValue(domain, value) {
  ASSERT_NORDOM(domain);
  // TODO: in a sound system this can shortcut anything that's not a soldom

  if (typeof domain === 'number') return domain_num_isValue(domain, value);
  return domain_str_isValue(domain, value);
}
function domain_num_isValue(domain, value) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_sol_isValue(domain, value);
  return domain_bit_isValue(domain, value);
}
function domain_sol_isValue(domain, value) {
  ASSERT_SOLDOM(domain);
  ASSERT(value >= 0, 'DOMAINS_ONLY_CONTAIN_UINTS');

  return (domain ^ SOLVED_FLAG) === value;
}
function domain_bit_isValue(domain, value) {
  ASSERT_BITDOM(domain);
  ASSERT(value >= 0, 'DOMAINS_ONLY_CONTAIN_UINTS');

  if (value > SMALL_MAX_NUM) return false;
  return domain === (1 << value);
}
function domain_str_isValue(domain, value) {
  ASSERT_STRDOM(domain);
  ASSERT(value >= 0, 'DOMAINS_ONLY_CONTAIN_UINTS');

  return domain.length === STR_RANGE_SIZE && (domain_str_decodeValue(domain, STR_FIRST_RANGE_LO) | domain_str_decodeValue(domain, STR_FIRST_RANGE_HI)) === value;
}

/**
 * Check if given domain is solved. If so, return the value
 * to which it was solved. Otherwise return NO_SUCH_VALUE.
 *
 * @param {$nordom} domain
 * @returns {number}
 */
function domain_getValue(domain) {
  ASSERT_NORDOM(domain);
  // TODO: in a sound system we'd only have to check for soldoms...

  if (typeof domain === 'number') return domain_num_getValue(domain);
  return domain_str_getValue(domain);
}
function domain_num_getValue(domain) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_sol_getValue(domain);
  return domain_bit_getValue(domain);
}
function domain_sol_getValue(domain) {
  ASSERT_SOLDOM(domain);

  return domain ^ SOLVED_FLAG;
}
function domain_bit_getValue(domain) {
  ASSERT_BITDOM(domain);

  var lo = domain_bit_min(domain);
  return (domain === (1 << lo)) ? lo : NO_SUCH_VALUE;
}
function domain_str_getValue(domain) {
  ASSERT_STRDOM(domain);

  if (domain.length !== STR_RANGE_SIZE) return NO_SUCH_VALUE;
  let lo = domain_str_decodeValue(domain, STR_FIRST_RANGE_LO);
  let hi = domain_str_decodeValue(domain, STR_FIRST_RANGE_HI);
  if (lo === hi) return lo;
  return NO_SUCH_VALUE;
}
function domain_arr_getValue(domain) {
  ASSERT_ARRDOM(domain);
  if (domain.length === ARR_RANGE_SIZE && domain[0] === domain[1]) return domain[0];
  return NO_SUCH_VALUE;
}
/**
 * @param {$strdom} domain
 * @param {number} index
 * @returns {number}
 */
function domain_str_decodeValue(domain, index) {
  ASSERT_STRDOM(domain);

  return (domain.charCodeAt(index) << 16) | domain.charCodeAt(index + 1);
}
/**
 * @param {number} value
 * @returns {string} not a $strdom but half of one
 */
function domain_str_encodeValue(value) {
  return String.fromCharCode((value >>> 16) & 0xffff, value & 0xffff);
}
/**
 * @param {number} lo
 * @param {number} hi
 * @returns {$strdom} One range is still a valid domain
 */
function domain_str_encodeRange(lo, hi) {
  return String.fromCharCode((lo >>> 16) & 0xffff, lo & 0xffff, (hi >>> 16) & 0xffff, hi & 0xffff);
}

/**
 * External API only. Always returns an arrdom.
 *
 * @param {number[]} list
 * @returns {$arrdom}
 */
function domain_fromListToArrdom(list) {
  if (!list.length) return [];
  list = list.slice(0);
  list.sort((a, b) => a - b); // note: default sort is lexicographic!

  let arrdom = [];
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
        arrdom.push(lo, hi);
        lo = value;
      }
      hi = value;
    }
  }

  arrdom.push(lo, hi);

  return arrdom;
}

/**
 * domain to list of possible values
 *
 * @param {$nordom} domain
 * @returns {number[]}
 */
function domain_toList(domain) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') return domain_num_toList(domain);
  return domain_str_toList(domain);
}
function domain_num_toList(domain) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_sol_toList(domain);
  return domain_bit_toList(domain);
}
function domain_sol_toList(domain) {
  ASSERT_SOLDOM(domain);

  return [domain ^ SOLVED_FLAG];
}
function domain_bit_toList(domain) {
  ASSERT_BITDOM(domain);

  let list = [];
  for (let i = 0; i < 16; ++i) {
    if ((domain & NUM_TO_FLAG[i]) > 0) list.push(i);
  }
  return list;
}
function domain_str_toList(domain) {
  ASSERT_STRDOM(domain);

  let list = [];
  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    for (let n = domain_str_decodeValue(domain, i), m = domain_str_decodeValue(domain, i + STR_VALUE_SIZE); n <= m; ++n) {
      list.push(n);
    }
  }
  return list;
}

/**
 * Given a list and domain, search items in the list in the domain and return
 * a domain with the first element found this way removed.
 * If no items from list can be found this function returns NO_SUCH_VALUE (-1)
 *
 * @param {$nordom} domain
 * @param {number[]} list
 * @returns {$nordom|number} NO_SUCH_VALUE (-1) means the result is empty, non-zero means new small domain
 */
function domain_removeNextFromList(domain, list) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') return domain_num_removeNextFromList(domain, list);
  return domain_str_removeNextFromList(domain, list);
}
function domain_num_removeNextFromList(numdom, list) {
  ASSERT_NUMDOM(numdom);
  ASSERT(list && list instanceof Array, 'A_EXPECTING_LIST');

  if (numdom >= SOLVED_FLAG) return domain_sol_removeNextFromList(numdom, list);
  return domain_bit_removeNextFromList(numdom, list);
}
function domain_sol_removeNextFromList(soldom, list) {
  ASSERT_SOLDOM(soldom);
  ASSERT(list && list instanceof Array, 'A_EXPECTING_LIST');

  let solvedValue = soldom ^ SOLVED_FLAG;
  if (list.indexOf(solvedValue) >= 0) return EMPTY;
  return soldom;
}
function domain_bit_removeNextFromList(bitdom, list) {
  ASSERT_BITDOM(bitdom);
  ASSERT(list && list instanceof Array, 'A_EXPECTING_LIST');

  for (let i = 0; i < list.length; ++i) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG');
    if (value < SMALL_MAX_NUM) { // 1<<100 = 16. non-small-domain numbers are valid here. so check.
      let flag = 1 << value;
      if (bitdom & flag) return domain_bitToSmallest(bitdom ^ flag); // if the bit is set; unset it
    }
  }
  return NO_SUCH_VALUE;
}
function domain_str_removeNextFromList(domain, list) {
  ASSERT_STRDOM(domain);
  ASSERT(list && list instanceof Array, 'A_EXPECTING_LIST');

  let len = domain.length;

  for (let i = 0; i < list.length; i++) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG');

    let lastLo = -1;
    let lastHi = -1;
    for (let index = 0; index < len; index += STR_RANGE_SIZE) {
      let lo = domain_str_decodeValue(domain, index);
      if (lo <= value) {
        let hi = domain_str_decodeValue(domain, index + STR_VALUE_SIZE);
        if (hi >= value) {
          // value is lo<=value<=hi
          return _domain_str_removeValue(domain, len, index, lo, hi, value, lastLo, lastHi);
        }
        lastLo = lo;
        lastHi = hi;
      } else {
        // value is between previous range and this one, aka: not found. proceed with next item in list
        break;
      }
    }
  }

  return NO_SUCH_VALUE;
}

/**
 * @param {$nordom} domain
 * @param {number[]} list
 * @returns {number} Can return NO_SUCH_VALUE
 */
function domain_getValueOfFirstContainedValueInList(domain, list) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') return domain_num_getValueOfFirstContainedValueInList(domain, list);
  return domain_str_getValueOfFirstContainedValueInList(domain, list);
}
function domain_num_getValueOfFirstContainedValueInList(domain, list) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_sol_getValueOfFirstContainedValueInList(domain, list);
  return domain_bit_getValueOfFirstContainedValueInList(domain, list);
}
function domain_sol_getValueOfFirstContainedValueInList(domain, list) {
  ASSERT_SOLDOM(domain);
  ASSERT(list && list instanceof Array, 'A_EXPECTING_LIST');

  let solvedValue = domain ^ SOLVED_FLAG;
  if (list.indexOf(solvedValue) >= 0) return solvedValue;
  return NO_SUCH_VALUE;
}
function domain_bit_getValueOfFirstContainedValueInList(domain, list) {
  ASSERT_BITDOM(domain);
  ASSERT(list && list instanceof Array, 'A_EXPECTING_LIST');

  for (let i = 0; i < list.length; ++i) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG'); // internally all domains elements should be sound; SUB>=n>=SUP
    // 1<<100 = 16 and large numbers are valid here so do check
    if (value <= SMALL_MAX_NUM && (domain & (1 << value)) > 0) return value;
  }
  return NO_SUCH_VALUE;
}
function domain_str_getValueOfFirstContainedValueInList(domain, list) {
  ASSERT_STRDOM(domain);
  ASSERT(list && list instanceof Array, 'A_EXPECTING_LIST');

  for (let i = 0; i < list.length; i++) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'A_OOB_INDICATES_BUG'); // internally all domains elements should be sound; SUB>=n>=SUP
    if (domain_str_containsValue(domain, value)) {
      return value;
    }
  }
  return NO_SUCH_VALUE;
}

/**
 * All ranges will be ordered ascending and overlapping ranges are merged
 * This function first checks whether simplification is needed at all
 * Should normalize all return values.
 *
 * @param {$strdom|string} domain
 * @returns {$strdom} ironically, not optimized to a number if possible
 */
function domain_str_simplify(domain) {
  ASSERT_STRDOM(domain);

  if (!domain) return EMPTY; // keep return type consistent, dont return EMPTY
  if (domain.length === STR_RANGE_SIZE) return domain_toSmallest(domain);

  // order ranges, then merge overlapping ranges (TODO: can we squash this step together?)
  domain = _domain_str_quickSortRanges(domain);
  domain = _domain_str_mergeOverlappingRanges(domain);

  return domain_toSmallest(domain);
}
/**
 * Sort all ranges in this pseudo-strdom from lo to hi. Domain
 * may already be csis but we're not sure. This function call
 * is part of the process of ensuring that.
 *
 * @param {$domain_str|string} domain MAY not be CSIS yet (that's probably why this function is called in the first place)
 * @returns {$domain_str|string} ranges in this string will be ordered but may still overlap
 */
function _domain_str_quickSortRanges(domain) {
  ASSERT_STRDOM(domain);

  if (!domain) return EMPTY_STR; // keep return type consistent, dont return EMPTY

  let len = domain.length;
  if (len <= STR_RANGE_SIZE) return domain;

  // TODO: right now we convert to actual values and concat with "direct" string access. would it be faster to use slices? and would it be faster to do string comparisons with the slices and no decoding?

  let pivotIndex = 0; // TODO: i think we'd be better off with a different pivot? middle probably performs better
  let pivotLo = domain_str_decodeValue(domain, pivotIndex);
  let pivotHi = domain_str_decodeValue(domain, pivotIndex + STR_VALUE_SIZE);

  let left = EMPTY_STR;
  let right = EMPTY_STR;

  for (let i = STR_RANGE_SIZE; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(domain, i);

    // TODO: if we change assumptions elsewhere we could drop the `hi` stuff from this function altogether
    if (lo < pivotLo || (lo === pivotLo && domain_str_decodeValue(domain, i + STR_VALUE_SIZE) < pivotHi)) {
      left += domain[i] + domain[i + 1] + domain[i + 2] + domain[i + 3];
    } else {
      right += domain[i] + domain[i + 1] + domain[i + 2] + domain[i + 3];
    }
  }

  return ('' +
    _domain_str_quickSortRanges(left) + // sort left part, without pivot
    domain[pivotIndex] +               // include pivot (4 chars)
    domain[pivotIndex + 1] +
    domain[pivotIndex + STR_VALUE_SIZE] +
    domain[pivotIndex + STR_VALUE_SIZE + 1] +
    _domain_str_quickSortRanges(right)  // sort right part, without pivot
  );
}
/**
 * @param {$domain_str|string} domain May already be csis but at least all ranges should be ordered and are lo<=hi
 * @returns {$domain_str}
 */
function _domain_str_mergeOverlappingRanges(domain) {
  ASSERT_STRDOM(domain);
  if (!domain) return EMPTY_STR; // prefer strings for return type consistency

  // assumes domain is sorted
  // assumes all ranges are "sound" (lo<=hi)

  let len = domain.length;
  if (len === STR_RANGE_SIZE) return domain;

  let newDomain = domain[STR_FIRST_RANGE_LO] + domain[STR_FIRST_RANGE_LO + 1]; // just copy the first two characters...
  let lasthi = domain_str_decodeValue(domain, STR_FIRST_RANGE_HI);
  let lasthindex = STR_FIRST_RANGE_HI;

  for (let i = STR_RANGE_SIZE; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(domain, i);
    let hi = domain_str_decodeValue(domain, i + STR_VALUE_SIZE);
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
 * Intersect two $domains.
 * Intersection means the result only contains the values
 * that are contained in BOTH domains.
 *
 * @param {$nordom} domain1
 * @param {$nordom} domain2
 * @returns {$nordom}
 */
function domain_intersection(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);

  if (domain1 === domain2) return domain1;
  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';

  if (isNum1 && isNum2) return domain_numnum_intersection(domain1, domain2);
  if (isNum1) return domain_numstr_intersection(domain1, domain2);
  if (isNum2) return domain_numstr_intersection(domain2, domain1); // swapped!
  return domain_strstr_intersection(domain1, domain2);
}
function domain_numnum_intersection(domain1, domain2) {
  ASSERT_NUMDOM(domain1);
  ASSERT_NUMDOM(domain2);

  let sol1 = domain1 >= SOLVED_FLAG;
  let sol2 = domain2 >= SOLVED_FLAG;
  if (sol1) {
    if (sol2) return domain_solsol_intersect(domain1, domain2);
    return domain_solbit_intersect(domain1, domain2);
  }
  if (sol2) return domain_solbit_intersect(domain2, domain1);

  return domain_bitbit_intersect(domain1, domain2);
}
function domain_solbit_intersect(soldom, bitdom) {
  ASSERT_SOLDOM(soldom);
  ASSERT_BITDOM(bitdom);

  let solvedValue = soldom ^ SOLVED_FLAG;
  if (solvedValue <= SMALL_MAX_NUM && (bitdom & (1 << solvedValue))) return soldom;
  return EMPTY;
}
function domain_solsol_intersect(domain1, domain2) {
  ASSERT_SOLDOM(domain1);
  ASSERT_SOLDOM(domain2);

  if (domain1 === domain2) return domain1;
  return EMPTY;
}
function domain_bitbit_intersect(domain1, domain2) {
  ASSERT_BITDOM(domain1);
  ASSERT_BITDOM(domain2);

  return domain_bitToSmallest(domain1 & domain2);
}
function domain_numstr_intersection(numdom, strdom) {
  ASSERT_NUMDOM(numdom);
  ASSERT_STRDOM(strdom);

  if (numdom >= SOLVED_FLAG) return domain_solstr_intersect(numdom, strdom);
  return domain_bitstr_intersect(numdom, strdom);
}
function domain_solstr_intersect(soldom, strdom) {
  ASSERT_SOLDOM(soldom);
  ASSERT_STRDOM(strdom);

  let solvedValue = soldom ^ SOLVED_FLAG;

  for (let i = 0, len = strdom.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(strdom, i);
    let hi = domain_str_decodeValue(strdom, i + STR_VALUE_SIZE);
    // once a range is found beyond the solved value we can never find solved value in domain_str
    if (solvedValue < lo) break;
    // when lo<=value<=hi the intersection is non-empty. return the solved domain.
    if (solvedValue <= hi) return soldom;
  }
  return EMPTY;
}
function domain_bitstr_intersect(bitdom, strdom) {
  ASSERT_BITDOM(bitdom);
  ASSERT_STRDOM(strdom);

  // TODO: intersect in a "zipper" O(max(n,m)) algorithm instead of O(n*m). see _domain_strstr_intersection
  let domain = EMPTY;
  for (let i = 0, len = strdom.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(strdom, i);
    if (lo > SMALL_MAX_NUM) break;
    let hi = domain_str_decodeValue(strdom, i + STR_VALUE_SIZE);

    for (let j = lo, m = MIN(SMALL_MAX_NUM, hi); j <= m; ++j) {
      let flag = NUM_TO_FLAG[j];
      if (bitdom & flag) domain |= flag; // could be: domain |= domain1 & NUMBER[j]; but this reads better?
    }
  }

  return domain_bitToSmallest(domain);
}
function domain_strstr_intersection(domain1, domain2) {
  ASSERT_STRDOM(domain1);
  ASSERT_STRDOM(domain2);

  let len1 = domain1.length;
  let len2 = domain2.length;

  if ((len1 | len2) === 0) return EMPTY;

  let newDomain = EMPTY_STR;

  let index1 = 0;
  let index2 = 0;

  let lo1 = domain_str_decodeValue(domain1, STR_FIRST_RANGE_LO);
  let hi1 = domain_str_decodeValue(domain1, STR_FIRST_RANGE_HI);
  let lo2 = domain_str_decodeValue(domain2, STR_FIRST_RANGE_LO);
  let hi2 = domain_str_decodeValue(domain2, STR_FIRST_RANGE_HI);

  while (true) {
    if (hi1 < lo2) {
      index1 += STR_RANGE_SIZE;
      if (index1 >= len1) break;
      lo1 = domain_str_decodeValue(domain1, index1);
      hi1 = domain_str_decodeValue(domain1, index1 + STR_VALUE_SIZE);
    } else if (hi2 < lo1) {
      index2 += STR_RANGE_SIZE;
      if (index2 >= len2) break;
      lo2 = domain_str_decodeValue(domain2, index2);
      hi2 = domain_str_decodeValue(domain2, index2 + STR_VALUE_SIZE);
    } else {
      ASSERT((lo1 <= lo2 && lo2 <= hi1) || (lo2 <= lo1 && lo1 <= hi2), '_domain_strstr_intersection: both ranges must overlap at least for some element because neither ends before the other [' + lo1 + ',' + hi1 + ' - ' + lo2 + ',' + hi2 + ']');

      let mh = MIN(hi1, hi2);
      newDomain += domain_str_encodeRange(MAX(lo1, lo2), mh);

      // put all ranges after the one we just added...
      mh += 2; // last added range + 1 position gap
      lo1 = lo2 = mh;
      ASSERT(hi1 < mh || hi2 < mh, 'at least one range should be moved forward now');
      if (hi1 < mh) {
        index1 += STR_RANGE_SIZE;
        if (index1 >= len1) break;
        lo1 = domain_str_decodeValue(domain1, index1);
        hi1 = domain_str_decodeValue(domain1, index1 + STR_VALUE_SIZE);
      }
      if (hi2 < mh) {
        index2 += STR_RANGE_SIZE;
        if (index2 >= len2) break;
        lo2 = domain_str_decodeValue(domain2, index2);
        hi2 = domain_str_decodeValue(domain2, index2 + STR_VALUE_SIZE);
      }
    }
  }

  return domain_toSmallest(newDomain);
}

/**
 * Return a simple string showing the given domain in array
 * form and the representation type that was passed on.
 *
 * @param {$domain} domain
 * @returns {string}
 */
function domain__debug(domain) {
  if (typeof domain === 'number') {
    if (domain >= SOLVED_FLAG) return 'numdom([' + (domain ^ SOLVED_FLAG) + ',' + (domain ^ SOLVED_FLAG) + '])';
    return 'numdom([' + domain_numToArr(domain) + '])';
  }
  if (typeof domain === 'string') return 'strdom([' + domain_strToArr(domain) + '])';
  if (domain instanceof Array) return 'arrdom([' + domain + '])';
  return '???dom(' + domain + ')';
}

/**
 * deep comparison of two $domains
 *
 * @param {$nordom} domain1
 * @param {$nordom} domain2
 * @returns {boolean}
 */
function domain_isEqual(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);

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
 * @param {$strdom} domain1
 * @param {$strdom} domain2
 * @returns {$strdom[]} NOT smallest! call sites depend on strdom, and they will take care of normalization
 */
function domain_str_closeGaps(domain1, domain2) {
  ASSERT_STRDOM(domain1);
  ASSERT_STRDOM(domain2);

  if (domain1 && domain2) {
    let change;
    do {
      change = 0;

      if (domain1.length > STR_RANGE_SIZE) {
        let smallestRangeSize = domain_str_smallestRangeSize(domain2);
        let domain = _domain_str_closeGaps(domain1, smallestRangeSize);
        change += domain1.length - domain.length;
        domain1 = domain;
      }

      if (domain2.length > STR_RANGE_SIZE) {
        let smallestRangeSize = domain_str_smallestRangeSize(domain1);
        let domain = _domain_str_closeGaps(domain2, smallestRangeSize);
        change += domain2.length - domain.length;
        domain2 = domain;
      }
    } while (change !== 0);
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
 * @param {$strdom} domain
 * @param {number} gap
 * @returns {$strdom} (min/max won't be eliminated and input should be a "large" domain)
 */
function _domain_str_closeGaps(domain, gap) {
  ASSERT_STRDOM(domain);

  let newDomain = domain[STR_FIRST_RANGE_LO] + domain[STR_FIRST_RANGE_LO + 1];
  let lasthi = domain_str_decodeValue(domain, STR_FIRST_RANGE_HI);
  let lasthindex = STR_FIRST_RANGE_HI;

  for (let i = STR_RANGE_SIZE, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(domain, i);
    let hi = domain_str_decodeValue(domain, i + STR_VALUE_SIZE);

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
 * @param {$strdom} domain
 * @returns {number}
 */
function domain_str_smallestRangeSize(domain) {
  ASSERT_STRDOM(domain);

  let min_width = SUP;

  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(domain, i);
    let hi = domain_str_decodeValue(domain, i + STR_VALUE_SIZE);
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
 * @param {$nordom} domain1
 * @param {$nordom} domain2
 * @returns {$domain}
 */
function domain_mul(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);

  // TOFIX: quick shortcut for solved domains

  // for simplicity sake, convert them back to arrays
  if (typeof domain1 === 'number') domain1 = domain_numToStr(domain1);
  if (typeof domain2 === 'number') domain2 = domain_numToStr(domain2);

  // TODO domain_mulNum
  return domain_strstr_mul(domain1, domain2);
}
function domain_strstr_mul(domain1, domain2) {
  ASSERT_STRDOM(domain1);
  ASSERT_STRDOM(domain2);

  let result = EMPTY_STR;
  for (let i = 0, leni = domain1.length; i < leni; i += STR_RANGE_SIZE) {
    let loi = domain_str_decodeValue(domain1, i);
    let hii = domain_str_decodeValue(domain1, i + STR_VALUE_SIZE);

    for (let j = 0, lenj = domain2.length; j < lenj; j += STR_RANGE_SIZE) {
      let loj = domain_str_decodeValue(domain2, j);
      let hij = domain_str_decodeValue(domain2, j + STR_VALUE_SIZE);

      result += domain_str_encodeRange(MIN(SUP, loi * loj), MIN(SUP, hii * hij));
    }
  }

  // TODO: is it worth doing this step immediately?
  return domain_str_simplify(result);
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
 * @param {$nordom} domain1
 * @param {$nordom} domain2
 * @param {boolean} [floorFractions=true] Include the floored lo of the resulting ranges?
 *         For example, <5,5>/<2,2> is <2.5,2.5>. If this flag is true, it will include
 *         <2,2>, otherwise it will not include anything for that division.
 * @returns {$nordom}
 */
function domain_divby(domain1, domain2, floorFractions = true) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);

  // TOFIX: add quick shortcut for solved domains

  // for simplicity sake, convert them back to arrays
  if (typeof domain1 === 'number') domain1 = domain_numToStr(domain1);
  if (typeof domain2 === 'number') domain2 = domain_numToStr(domain2);

  // TODO: domain_divByNum
  return domain_strstr_divby(domain1, domain2, floorFractions);
}
function domain_strstr_divby(domain1, domain2, floorFractions = true) {
  ASSERT_STRDOM(domain1);
  ASSERT_STRDOM(domain2);

  let result = EMPTY_STR;
  for (let i = 0, leni = domain1.length; i < leni; i += STR_RANGE_SIZE) {
    let loi = domain_str_decodeValue(domain1, i);
    let hii = domain_str_decodeValue(domain1, i + STR_VALUE_SIZE);

    for (let j = 0, lenj = domain2.length; j < lenj; j += STR_RANGE_SIZE) {
      let loj = domain_str_decodeValue(domain2, j);
      let hij = domain_str_decodeValue(domain2, j + STR_VALUE_SIZE);

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
          result += domain_str_encodeRange(left, right);
        } else {
          ASSERT(FLOOR(lo) === FLOOR(hi), 'left>right when fraction is in same int, which can happen', lo, hi);
          if (floorFractions) {
            // only use the floored value
            // note: this is a choice. not both floor/ceil because then 5/2=2.5 becomes [2,3]. should be [2,2] or [3,3]
            result += domain_str_encodeRange(right, right);
          }
        }
      }
    }
  }

  return domain_str_simplify(result);
}

/**
 * Return the number of elements this domain covers
 *
 * @param {$nordom} domain
 * @returns {number}
 */
function domain_size(domain) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') return domain_num_size(domain);
  return domain_str_size(domain);
}
function domain_num_size(domain) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return 1;
  return domain_bit_size(domain);
}
function domain_bit_size(domain) {
  ASSERT_BITDOM(domain);

  // need to work on this one because it requires 64bits. should be doable, to revisit later
//      domain = (domain - (((domain >>> 1) & 0x55555555))) | 0;
//      domain = ((domain & 0x33333333) + ((domain >>> 2) & 0x33333333)) | 0;
//      domain = ((+((domain + (domain >>> 4)) & 0x0F0F0F0F) * +0x01010101)|0) >>> 24;
//      return domain;

  // hot paths; binary
  // the empty domain is "free"
  switch (domain) {
    case 0: return 0; // empty domain
    case 1: return 1;
    case 2: return 1;
    case 3: return 2;
  }

  return (
      (domain & 1) +
      ((domain >> 1) & 1) +
      ((domain >> 2) & 1) +
      ((domain >> 3) & 1) +
      ((domain >> 4) & 1) +
      ((domain >> 5) & 1) +
      ((domain >> 6) & 1) +
      ((domain >> 7) & 1) +
      ((domain >> 8) & 1) +
      ((domain >> 9) & 1) +
      ((domain >> 10) & 1) +
      ((domain >> 11) & 1) +
      ((domain >> 12) & 1) +
      ((domain >> 13) & 1) +
      ((domain >> 14) & 1) +
      ((domain >> 15) & 1) +
      ((domain >> 16) & 1) +
      ((domain >> 17) & 1) +
      ((domain >> 18) & 1) +
      ((domain >> 19) & 1) +
      ((domain >> 20) & 1) +
      ((domain >> 21) & 1) +
      ((domain >> 22) & 1) +
      ((domain >> 23) & 1) +
      ((domain >> 24) & 1) +
      ((domain >> 25) & 1) +
      ((domain >> 26) & 1) +
      ((domain >> 27) & 1) +
      ((domain >> 28) & 1) +
      ((domain >> 29) & 1) +
      ((domain >> 30) & 1) +
      ((domain >> 31) & 1)
    ) | 0;
}
function domain_str_size(domain) {
  ASSERT_STRDOM(domain);
  ASSERT(domain && domain.length, 'A_EXPECTING_NON_EMPTY_DOMAINS');

  let count = 0;

  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    // TODO: add test to confirm this still works fine if SUB is negative
    count += 1 + domain_str_decodeValue(domain, i + STR_VALUE_SIZE) - domain_str_decodeValue(domain, i);
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
 * @param {$nordom} domain
 * @returns {number} can return
 */
function domain_middleElement(domain) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') {
    if (domain >= SOLVED_FLAG) return domain ^ SOLVED_FLAG;
    // for simplicity sake, convert them back to arrays
    domain = domain_numToStr(domain);
  }

  // TODO: domain_middleElementNum(domain);
  return domain_str_middleElement(domain);
}
function domain_str_middleElement(domain) {
  ASSERT_STRDOM(domain);

  if (!domain) return NO_SUCH_VALUE;

  let size = domain_str_size(domain);
  let targetValue = FLOOR(size / 2);

  let lo;
  let hi;
  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    lo = domain_str_decodeValue(domain, i);
    hi = domain_str_decodeValue(domain, i + STR_VALUE_SIZE);

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
 * @param {$nordom} domain
 * @returns {number}
 */
function domain_min(domain) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') return domain_num_min(domain);
  return domain_str_min(domain);
}
function domain_num_min(domain) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_sol_min(domain);
  return domain_bit_min(domain);
}
function domain_sol_min(domain) {
  ASSERT_SOLDOM(domain);

  return domain ^ SOLVED_FLAG;
}
function domain_bit_min(domain) {
  ASSERT_BITDOM(domain);

  // This is also called a "bitscan" or "bitscan forward" because
  // in a small domain we want to know the index of the least
  // significant bit that is set. A different way of looking at
  // this is that we'd want to know the number of leading zeroes
  // ("clz") in the number because we would just need to +1 that
  // to get our desired value. There are various solutiosn to
  // this problem but some are not feasible to implement in JS
  // because we can't rely on low level optimizations. And
  // certainly we can't use the cpu machine instruction.
  //
  // Be aware that there are about a million ways to do this,
  // even to do this efficiently. Mileage under JS varies hto.
  //
  // ES6 _does_ expose `Math.clz32()` so if we can be certain
  // it is natively supported we should go with that and hope
  // it becomes a single instruction. Don't rely on a polyfill.

  // fast paths: these are by far the most used case in our situation
  if ((domain | 0) === 1) return 0;
  if ((domain | 0) === 2) return 1;
  if ((domain | 0) === 3) return 0;

  // from https://graphics.stanford.edu/~seander/bithacks.html#ZerosOnRightModLookup
  // the table lookup is unfortunate. the mod is probably slow for us but hard to tell
  // the difference so let's not care for now.
  switch (((domain & -domain) % 37) | 0) {
    case 0:
      //return 32;
      return -1; // note: we dont use bits 31 and 32 so we can check for empty domain here "for free"
    case 1: // does not exist within 32bits
      return 0;
    case 2:
      return 1;
    case 3:
      return 26;
    case 4:
      return 2;
    case 5:
      return 23;
    case 6:
      return 27;
    case 7: // does not exist within 32bits
      return 0;
    case 8:
      return 3;
    case 9:
      return 16;
    case 10:
      return 24;
    case 11:
      return 30; // should not be possible. implies soldom (to 30).
    case 12:
      return 28;
    case 13:
      return 11;
    case 14: // does not exist within 32bits
      return 0;
    case 15:
      return 13;
    case 16:
      return 4;
    case 17:
      return 7;
    case 18:
      return 17;
    case 19: // does not exist within 32bits
      return 0;
    case 20:
      return 25;
    case 21:
      return 22;
    case 22:
      //return 31;
      return -1; // we dont use the last bit
    case 23:
      return 15;
    case 24:
      return 29;
    case 25:
      return 10;
    case 26:
      return 12;
    case 27:
      return 6;
    case 28: // does not exist within 32bits
      return 0;
    case 29:
      return 21;
    case 30:
      return 14;
    case 31:
      return 9;
    case 32:
      return 5;
    case 33:
      return 20;
    case 34:
      return 8;
    case 35:
      return 19;
  }
  // case 36:
  return 18;
}
function domain_str_min(domain) {
  ASSERT_STRDOM(domain);
  if (!domain) return NO_SUCH_VALUE;

  return domain_str_decodeValue(domain, STR_FIRST_RANGE_LO);
}

/**
 * Only use if callsite doesn't use last range again
 *
 * @param {$nordom} domain
 * @returns {number} can be NO_SUCH_VALUE
 */
function domain_max(domain) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') return domain_num_max(domain);
  return domain_str_max(domain);
}
function domain_num_max(domain) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_sol_max(domain);
  return domain_bit_max(domain);
}
function domain_sol_max(domain) {
  ASSERT_SOLDOM(domain);

  return domain ^ SOLVED_FLAG;
}
function domain_bit_max(domain) {
  ASSERT_BITDOM(domain);

  // Relatively expensive because there's no easy trick.

  var i = 30;

  // fast paths: these are by far the most used case in our situation
  // (the empty domain check is "free" here)
  switch (domain | 0) {
    case 0:
      return -1; // empty domain
    case 1:
      return 0; // should not be possible. implies a soldom
    case 2:
      return 1;
    case 3:
      return 1;
  }

  // there's no pretty way to do this
  do {
    if (domain & (1 << i)) break;
    i = (i - 1) | 0;
  } while ((i | 0) >= 0);

  return i | 0; // note: the 31 case is unused in our system and assumed impossible here
}
function domain_str_max(domain) {
  ASSERT_STRDOM(domain);
  if (!domain) return NO_SUCH_VALUE;

  // last encoded value in the string should be the hi of the last range. so max is last value
  return domain_str_decodeValue(domain, domain.length - STR_VALUE_SIZE);
}
function domain_arr_max(domain) {
  ASSERT_ARRDOM(domain);

  let len = domain.length;
  if (len === 0) return NO_SUCH_VALUE;
  return domain[len - 1];
}

/**
 * A domain is "solved" if it covers exactly one value. It is not solved if it is empty.
 *
 * @param {$nordom} domain
 * @returns {boolean}
 */
function domain_isSolved(domain) {
  ASSERT_NORDOM(domain, true, domain__debug);
  ASSERT(((domain & SOLVED_FLAG) !== 0) === (domain >= SOLVED_FLAG), 'if flag is set the num should be gte to flag');

  return typeof domain === 'number' && domain >= SOLVED_FLAG;
}
function domain_str_isSolved(domain) {
  ASSERT_STRDOM(domain);

  // TODO: could do this by comparing strings, no need to convert
  return domain.length === STR_RANGE_SIZE && domain_str_decodeValue(domain, STR_FIRST_RANGE_LO) === domain_str_decodeValue(domain, STR_FIRST_RANGE_HI);
}

/**
 * A domain is "rejected" if it covers no values. This means every given
 * value would break at least one constraint so none could be used.
 *
 * @param {$nordom} domain
 * @returns {boolean}
 */
function domain_isRejected(domain) {
  ASSERT_NORDOM(domain);

  if (typeof domain === 'number') return domain_num_isRejected(domain);
  return domain_str_isRejected(domain);
}
function domain_num_isRejected(domain) {
  ASSERT_NUMDOM(domain);

  return domain === EMPTY;
}
function domain_str_isRejected(domain) {
  ASSERT_STRDOM(domain);

  return domain === EMPTY_STR; // TODO: eliminate this check. normalize to EMPTY
}
function domain_arr_isRejected(domain) {
  ASSERT_ARRDOM(domain);

  return domain.length === 0;
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
  ASSERT_NORDOM(domain);
  ASSERT(typeof value === 'number' && value >= 0, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT'); // so cannot be negative

  if (typeof domain === 'number') return domain_num_removeGte(domain, value);
  return domain_strToSmallest(domain_str_removeGte(domain, value));
}
function domain_num_removeGte(domain, value) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_sol_removeGte(domain, value);
  return domain_bitToSmallest(domain_bit_removeGte(domain, value));
}
function domain_sol_removeGte(domain, value) {
  ASSERT_SOLDOM(domain);
  // (could we just do `return (domain >= (value|SOLVED_FLAG)) ? EMPTY : domain` ?)
  let solvedValue = domain ^ SOLVED_FLAG;
  if (solvedValue >= value) return EMPTY;
  return domain; // no change
}
  /**
   * Remove all values from domain that are greater
   * than or equal to given value
   *
   * @param {$numdom} domain
   * @param {number} value NOT a flag
   * @returns {$numdom}
*/
function domain_bit_removeGte(domain, value) {
  switch (value) {
    case 0:
      return 0;
    case 1:
      return domain & 0x00000001;
    case 2:
      return domain & 0x00000003;
    case 3:
      return domain & 0x00000007;
    case 4:
      return domain & 0x0000000f;
    case 5:
      return domain & 0x0000001f;
    case 6:
      return domain & 0x0000003f;
    case 7:
      return domain & 0x0000007f;
    case 8:
      return domain & 0x000000ff;
    case 9:
      return domain & 0x000001ff;
    case 10:
      return domain & 0x000003ff;
    case 11:
      return domain & 0x000007ff;
    case 12:
      return domain & 0x00000fff;
    case 13:
      return domain & 0x00001fff;
    case 14:
      return domain & 0x00003fff;
    case 15:
      return domain & 0x00007fff;
    case 16:
      return domain & 0x0000ffff;
    case 17:
      return domain & 0x0001ffff;
    case 18:
      return domain & 0x0003ffff;
    case 19:
      return domain & 0x0007ffff;
    case 20:
      return domain & 0x000fffff;
    case 21:
      return domain & 0x001fffff;
    case 22:
      return domain & 0x003fffff;
    case 23:
      return domain & 0x007fffff;
    case 24:
      return domain & 0x00ffffff;
    case 25:
      return domain & 0x01ffffff;
    case 26:
      return domain & 0x03ffffff;
    case 27:
      return domain & 0x07ffffff;
    case 28:
      return domain & 0x0fffffff;
    case 30:
      return domain; // assuming domain is "valid" we can just return it now.
  }

  return domain; // when value > 30
}
/**
 * Remove any value from domain that is bigger than or equal to given value.
 * Since domains are assumed to be in CSIS form, we can start from the back and
 * search for the first range that is smaller or contains given value. Prune
 * any range that follows it and trim the found range if it contains the value.
 * Returns whether the domain was changed somehow.
 *
 * @param {$strdom} strdom
 * @param {number} value
 * @returns {$strdom}
 */
function domain_str_removeGte(strdom, value) {
  ASSERT_STRDOM(strdom);

  for (let i = 0, len = strdom.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(strdom, i);
    let hi = domain_str_decodeValue(strdom, i + STR_VALUE_SIZE);

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
      return strdom.slice(0, i);
    }
    if (lo === value) {
      // 567 9   -> empty
      // 012 567 -> 012
      // 012 5   -> 012
      return strdom.slice(0, i);
    }
    if (value <= hi) {
      if (i === 0 && value === lo + 1) {
        // domain_createValue(lo);
        let slo = strdom.slice(0, STR_VALUE_SIZE);
        return slo + slo;
      }
      // 012 456 -> 012 4
      // 012 45  -> 012 4
      let newDomain = strdom.slice(0, i + STR_VALUE_SIZE) + domain_str_encodeValue(value - 1);
      ASSERT(newDomain.length > STR_VALUE_SIZE, 'cannot be a solved value');
      //if (value - 1 <= SMALL_MAX_NUM) return newDomain;
      return newDomain;
    }
  }
  return strdom; // 012 -> 012
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
  ASSERT_NORDOM(domain);
  ASSERT(typeof value === 'number' && value >= 0, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT', domain__debug(domain), value); // so cannot be negative

  if (typeof domain === 'number') return domain_num_removeLte(domain, value);
  return domain_toSmallest(domain_str_removeLte(domain, value));
}
function domain_num_removeLte(domain, value) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_sol_removeLte(domain, value);
  return domain_toSmallest(domain_bit_removeLte(domain, value));
}
function domain_sol_removeLte(domain, value) {
  // (could we just do `return (domain <= (value|SOLVED_FLAG)) ? EMPTY : domain` ?)
  let solvedValue = domain ^ SOLVED_FLAG;
  if (solvedValue <= value) return EMPTY;
  return domain; // no change
}
/**
 * Remove all values from domain that are lower
 * than or equal to given value
 *
 * @param {$numdom} domain
 * @param {number} value NOT a flag
 * @returns {$numdom}
 */
function domain_bit_removeLte(domain, value) {
  switch (value) {
    case 0:
      return domain & 0x7ffffffe;
    case 1:
      return domain & 0x7ffffffc;
    case 2:
      return domain & 0x7ffffff8;
    case 3:
      return domain & 0x7ffffff0;
    case 4:
      return domain & 0x7fffffe0;
    case 5:
      return domain & 0x7fffffc0;
    case 6:
      return domain & 0x7fffff80;
    case 7:
      return domain & 0x7fffff00;
    case 8:
      return domain & 0x7ffffe00;
    case 9:
      return domain & 0x7ffffc00;
    case 10:
      return domain & 0x7ffff800;
    case 11:
      return domain & 0x7ffff000;
    case 12:
      return domain & 0x7fffe000;
    case 13:
      return domain & 0x7fffc000;
    case 14:
      return domain & 0x7fff8000;
    case 15:
      return domain & 0x7fff0000;
    case 16:
      return domain & 0x7ffe0000;
    case 17:
      return domain & 0x7ffc0000;
    case 18:
      return domain & 0x7ff80000;
    case 19:
      return domain & 0x7ff00000;
    case 20:
      return domain & 0x7fe00000;
    case 21:
      return domain & 0x7fc00000;
    case 22:
      return domain & 0x7f800000;
    case 23:
      return domain & 0x7f000000;
    case 24:
      return domain & 0x7e000000;
    case 25:
      return domain & 0x7c000000;
    case 26:
      return domain & 0x78000000;
    case 27:
      return domain & 0x70000000;
    case 28:
      return domain & 0x60000000;
    case 29:
      return domain & 0x40000000;
    case 30:
      return 0; // assuming domain is "valid" this should remove all elements
  }

  return 0; // when value > 30
}
/**
 * Remove any value from domain that is lesser than or equal to given value.
 * Since domains are assumed to be in CSIS form, we can start from the front and
 * search for the first range that is smaller or contains given value. Prune
 * any range that preceeds it and trim the found range if it contains the value.
 * Returns whether the domain was changed somehow
 * Does not harm domain
 *
 * @param {$strdom} strdom
 * @param {number} value
 * @returns {$strdom} normalize at callsite...
 */
function domain_str_removeLte(strdom, value) {
  ASSERT_STRDOM(strdom);

  for (let i = 0, len = strdom.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(strdom, i);
    let hi = domain_str_decodeValue(strdom, i + STR_VALUE_SIZE);

    // case: v=5
    // 456 89 => 6 89
    // 45 89  => 89
    // 56 89  => 6 89
    // 5  89  => 5 89
    // 6788   => 67 9
    // 789    => NONE
    // 012    => empty

    if (lo > value) {
      if (!i) return strdom; // 678 -> 678

      // 234 678 -> 678
      return strdom.slice(i);
    }
    if (hi === value) {
      // 45 89  => 89, 5  89  => 5 89
      return strdom.slice(i + STR_RANGE_SIZE);
    }
    if (value <= hi) {
      // 456 89 => 6 89, 56 89 => 6 89

      return domain_str_encodeValue(value + 1) + strdom.slice(i + STR_VALUE_SIZE);
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
  ASSERT_NORDOM(domain);
  ASSERT(typeof value === 'number' && value >= 0, 'VALUE_SHOULD_BE_VALID_DOMAIN_ELEMENT'); // so cannot be negative

  if (typeof domain === 'number') return domain_num_removeValue(domain, value);
  return domain_toSmallest(domain_str_removeValue(domain, value));
}
/**
 * @param {$numdom} domain
 * @param {number} value
 * @returns {$domain}
 */
function domain_num_removeValue(domain, value) {
  if (domain >= SOLVED_FLAG) return domain_sol_removeValue(domain, value);
  return domain_bit_removeValue(domain, value);
}
function domain_sol_removeValue(domain, value) {
  if (value === (domain ^ SOLVED_FLAG)) return EMPTY;
  return domain;
}
/**
 * @param {$bitdom} domain
 * @param {number} value NOT a flag
 * @returns {$bitdom}
 */
function domain_bit_removeValue(domain, value) {
  if (value > 30) return domain_toSmallest(domain); // though probably already fine, we dont know what `domain` is here
  let flag = 1 << value;
  return domain_bitToSmallest((domain | flag) ^ flag);
}
/**
 * @param {$strdom} domain
 * @param {number} value
 * @returns {$domain} should be smallest
 */
function domain_str_removeValue(domain, value) {
  ASSERT_STRDOM(domain);

  let lastLo = -1;
  let lastHi = -1;
  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(domain, i);
    // domain is CSIS so once a range was found beyond value, no further ranges can possibly wrap value. return now.
    if (value < lo) break;

    let hi = domain_str_decodeValue(domain, i + STR_VALUE_SIZE);
    if (value <= hi) {
      return _domain_str_removeValue(domain, len, i, lo, hi, value, lastLo, lastHi);
    }
    lastLo = lo;
    lastHi = hi;
  }
  // "no change" because domain was not found.
  return domain;
}
function _domain_str_removeValue(domain, len, index, lo, hi, value, lastLo, lastHi) {
  ASSERT_STRDOM(domain);
  ASSERT(domain, 'SHOULD_NOT_BE_EMPTY_YET');

  // normalize to (solved) numdom if the result is solved:
  // - one range and it contains two values: solved numdom
  // - oen range and it contains one value: EMPTY
  // - two ranges and both have one value: solved numdom
  // - removed value is >MAX_NUMDOM_VALUE and new highest value <=MAX_NUMDOM_VALUE: numdom
  //   - must remove highest value of dom. either
  //     - from a range of >=2 values (check hi-1)
  //     - from range with one value (check lastHi)
  if (len === STR_RANGE_SIZE) {
    if (hi - lo === 1) return ((lo === value ? hi : lo) | SOLVED_FLAG) >>> 0;
    if (lo === hi) return EMPTY;
    ASSERT(hi - lo > 1);
  } else if (index && len === 2 * STR_RANGE_SIZE && lo === hi && lastLo === lastHi) {
    return (lastLo | SOLVED_FLAG) >>> 0;
  }
  if (index === len - STR_RANGE_SIZE && value === hi) {
    // to numdom checks
    if (lo === hi && lastHi <= SMALL_MAX_NUM) {
      ASSERT(len > STR_RANGE_SIZE, 'this return-EMPTY case is checked above');
      // numdom excluding the last range
      let newLen = len - STR_RANGE_SIZE;
      return domain_strToBit(domain.slice(0, newLen), newLen);
    } else if (hi - 1 <= SMALL_MAX_NUM) {
      ASSERT(len > STR_RANGE_SIZE || hi - lo > 2, 'one-range check done above, would return solved numdom');
      // numdom excluding last value of last range
      // (the encodeValue step is unfortunate but let's KISS)
      return domain_strToBit(domain.slice(0, -STR_VALUE_SIZE) + domain_str_encodeValue(hi - 1), len);
    }
  }

  // from this point onward we'll return a strdom

  let before = domain.slice(0, index);
  let after = domain.slice(index + STR_RANGE_SIZE);

  if (hi === value) {
    if (lo === value) {
      // lo=hi=value; drop this range completely
      return before + after;
    }
    return before + domain_str_encodeRange(lo, hi - 1) + after;
  } else if (lo === value) {
    return before + domain_str_encodeRange(lo + 1, hi) + after;
  } else {
    // we get new two ranges...
    return before + domain_str_encodeRange(lo, value - 1) + domain_str_encodeRange(value + 1, hi) + after;
  }
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
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);

  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';
  if (isNum1 && isNum2) return domain_numnum_sharesNoElements(domain1, domain2);
  if (isNum1) return domain_numstr_sharesNoElements(domain1, domain2);
  if (isNum2) return domain_numstr_sharesNoElements(domain2, domain1);
  return domain_strstr_sharesNoElements(domain1, domain2);
}
function domain_numnum_sharesNoElements(domain1, domain2) {
  if (domain1 >= SOLVED_FLAG) {
    if (domain2 >= SOLVED_FLAG) return domain_solsol_sharesNoElements(domain1, domain2);
    return domain_solbit_sharesNoElements(domain1, domain2);
  }
  if (domain2 >= SOLVED_FLAG) return domain_solbit_sharesNoElements(domain2, domain1);
  return domain_bitbit_sharesNoElements(domain1, domain2);
}
function domain_solsol_sharesNoElements(domain1, domain2) {
  return domain1 !== domain2;
}
function domain_solbit_sharesNoElements(soldom, bitsol) {
  let solvedValue = soldom ^ SOLVED_FLAG;
  if (solvedValue > SMALL_MAX_NUM) return true;
  return (bitsol & (1 << solvedValue)) === 0;
}
/**
 * Check if every element in one domain does not
 * occur in the other domain and vice versa
 *
 * @param {$numdom} domain1
 * @param {$numdom} domain2
 * @returns {boolean}
 */
function domain_bitbit_sharesNoElements(domain1, domain2) {
  // checks whether not a single bit in set in _both_ domains
  return (domain1 & domain2) === 0;
}
/**
 * Check if every element in one domain not
 * occur in the other domain and vice versa
 *
 * @param {$numdom} numdom
 * @param {$strdom} strdom
 * @returns {boolean}
 */
function domain_numstr_sharesNoElements(numdom, strdom) {
  ASSERT_NUMDOM(numdom);
  ASSERT_STRDOM(strdom);

  if (numdom >= SOLVED_FLAG) return domain_solstr_sharesNoElements(numdom, strdom);
  return domain_bitstr_sharesNoElements(numdom, strdom);
}
function domain_solstr_sharesNoElements(soldom, strdom) {
  let solvedValue = soldom ^ SOLVED_FLAG;
  for (let strIndex = 0, strlen = strdom.length; strIndex < strlen; strIndex += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(strdom, strIndex);
    let hi = domain_str_decodeValue(strdom, strIndex + STR_VALUE_SIZE);
    if (solvedValue < lo) return true; // solved value not found so element not shared
    if (solvedValue <= hi) return false; // solved value is in current range so element shared
  }
  // did not find a range that contained value so no element shared
  return true;
}
function domain_bitstr_sharesNoElements(bitdom, strdom) {
  let strIndex = 0;
  let strlen = strdom.length;
  for (let numIndex = 0; numIndex <= SMALL_MAX_NUM; ++numIndex) {
    if (bitdom & (1 << numIndex)) {
      // find numIndex (as value) in domain_str. return true when
      // found. return false if number above small_max_num is found
      while (strIndex < strlen) {
        let lo = domain_str_decodeValue(strdom, strIndex);
        let hi = domain_str_decodeValue(strdom, strIndex + STR_VALUE_SIZE);

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
  return true; // dead code?
}
/**
 * Check if every element in one domain not
 * occur in the other domain and vice versa
 *
 * @param {$strdom} domain1
 * @param {$strdom} domain2
 * @returns {boolean}
 */
function domain_strstr_sharesNoElements(domain1, domain2) {
  ASSERT_STRDOM(domain1);
  ASSERT_STRDOM(domain2);

  let len1 = domain1.length;
  let len2 = domain2.length;

  let index1 = 0;
  let index2 = 0;

  let lo1 = domain_str_decodeValue(domain1, STR_FIRST_RANGE_LO);
  let hi1 = domain_str_decodeValue(domain1, STR_FIRST_RANGE_HI);
  let lo2 = domain_str_decodeValue(domain2, STR_FIRST_RANGE_LO);
  let hi2 = domain_str_decodeValue(domain2, STR_FIRST_RANGE_HI);

  while (true) {
    if (hi1 < lo2) {
      index1 += STR_RANGE_SIZE;
      if (index1 >= len1) break;
      lo1 = domain_str_decodeValue(domain1, index1);
      hi1 = domain_str_decodeValue(domain1, index1 + STR_VALUE_SIZE);
    } else if (hi2 < lo1) {
      index2 += STR_RANGE_SIZE;
      if (index2 >= len2) break;
      lo2 = domain_str_decodeValue(domain2, index2);
      hi2 = domain_str_decodeValue(domain2, index2 + STR_VALUE_SIZE);
    } else {
      ASSERT((lo1 <= lo2 && lo2 <= hi1) || (lo2 <= lo1 && lo1 <= hi2), 'domain_strstr_sharesNoElements: both ranges must overlap at least for some element because neither ends before the other [' + lo1 + ',' + hi1 + ' - ' + lo2 + ',' + hi2 + ']');
      return false;
    }
  }
  // no overlaps found
  return true;
}

/**
 * @param {number} value
 * @returns {$domain} will be a soldom
 */
function domain_createValue(value) {
  ASSERT(value >= SUB, 'domain_createValue: value should be within valid range');
  ASSERT(value <= SUP, 'domain_createValue: value should be within valid range');

  return (value | SOLVED_FLAG) >>> 0;
}
/**
 * @param {number} lo
 * @param {number} hi
 * @returns {$domain}
 */
function domain_createRange(lo, hi) {
  ASSERT(lo >= SUB && hi <= SUP && lo <= hi, 'expecting sanitized inputs');
  if (lo === hi) return domain_createValue(lo);
  if (hi <= SMALL_MAX_NUM) return domain_num_createRange(lo, hi);
  return domain_str_encodeRange(lo, hi);
}
/**
 * @param {number} lo
 * @param {number} hi
 * @returns {$domain_num} never soldom
 */
function domain_num_createRange(lo, hi) {
  return (((1 << (1 + hi - lo)) - 1) << lo);
}

/**
 * Return a domain containing all numbers from zero to the highest
 * number in given domain. In binary this means we'll set all the
 * bits of lower value than the most-significant set bit.
 *
 * @param {$domain_num} domain_num Must be > ZERO
 * @returns {$domain} never solved since that requires ZERO to be a valid input, which it isnt
 */
function domain_numnum_createRangeZeroToMax(domain_num) {
  ASSERT_NUMDOM(domain_num);
  ASSERT(domain_num < SOLVED_FLAG, 'should not be solved num');
  ASSERT(domain_num !== ZERO, 'INVALID INPUT, ZERO would be a solved domain which is caught elsewhere');

  //if (domain_num === ZERO) return SOLVED_FLAG; // note: SOLVED_FLAG|0 === SOLVED_FLAG.

  domain_num = domain_num | (domain_num >> 1);
  domain_num = domain_num | (domain_num >> 2);
  domain_num = domain_num | (domain_num >> 4);
  domain_num = domain_num | (domain_num >> 8);
  domain_num = domain_num | (domain_num >> 16);
  return domain_num;
}

/**
 * @param {$domain} domain
 * @param {number} [force] Always return in array or string form?
 * @returns {$domain}
 */
function domain_clone(domain, force) {
  ASSERT_ANYDOM(domain);

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
function domain_numToArr(domain) {
  ASSERT_NUMDOM(domain);

  if (domain >= SOLVED_FLAG) return domain_solToArr(domain);
  return domain_bitToArr(domain);
}
function domain_solToArr(domain) {
  let solvedValue = domain ^ SOLVED_FLAG;
  return [solvedValue, solvedValue];
}
function domain_bitToArr(domain) {
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
function domain_strToArr(domain) {
  ASSERT_STRDOM(domain);

  if (domain === EMPTY) return [];

  let arr = [];
  for (let i = 0, len = domain.length; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(domain, i);
    let hi = domain_str_decodeValue(domain, i + STR_VALUE_SIZE);

    arr.push(lo, hi);
  }
  return arr;
}
/**
 * Get a domain representation in string form
 *
 * @param {$domain} domain
 * @returns {$strdom} (small domains will also be strings)
 */
function domain_toStr(domain) {
  if (typeof domain === 'number') return domain_numToStr(domain);
  if (typeof domain === 'string') return domain;
  ASSERT(domain instanceof Array, 'can only be array now');
  return domain_arrToStr(domain);
}
function domain_numToStr(domain) {
  if (domain >= SOLVED_FLAG) return domain_solToStr(domain);
  return domain_bitToStr(domain);
}
function domain_solToStr(domain) {
  let solvedValue = domain ^ SOLVED_FLAG;
  return domain_str_encodeRange(solvedValue, solvedValue);
}
function domain_bitToStr(domain) {
  ASSERT_NUMDOM(domain);

  if (domain === EMPTY) return EMPTY_STR;

  let str = EMPTY_STR;
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
      str = domain_str_encodeRange(0, 0);
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
      str += domain_str_encodeRange(lo, hi);
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
          str += domain_str_encodeRange(lo, hi);
          lo = i;
        }
        hi = i;
      }
    }
  }

  // since the domain wasn't empty (checked at start) there
  // must now be an unpushed lo/hi pair left to push...
  str += domain_str_encodeRange(lo, hi);

  return str;
}
function domain_arrToStr(arrdom) {
  ASSERT_ARRDOM(arrdom);

  let str = EMPTY_STR;
  for (let i = 0, len = arrdom.length; i < len; i += ARR_RANGE_SIZE) {
    let lo = arrdom[i];
    let hi = arrdom[i + 1];
    ASSERT(typeof lo === 'number');
    ASSERT(typeof hi === 'number');

    str += domain_str_encodeRange(lo, hi);
  }

  return str;
}
/**
 * Returns the smallest representation of given domain. The order is:
 * soldom < numdom < strdom
 * Won't return arrdoms.
 *
 * @param {$domain} domain
 * @returns {$domain}
 */
function domain_toSmallest(domain) {
  if (typeof domain === 'number') return domain_numToSmallest(domain);
  ASSERT(typeof domain === 'string', 'there is no arrtosmallest');
  return domain_strToSmallest(domain);
}
function domain_anyToSmallest(domain) {
  // for tests and config import
  if (domain instanceof Array) domain = domain_arrToStr(domain);
  return domain_toSmallest(domain);
}
function domain_numToSmallest(domain) {
  if (domain >= SOLVED_FLAG) return domain;
  return domain_bitToSmallest(domain);
}
function domain_bitToSmallest(domain) {
  let value = domain_getValue(domain);
  if (value === NO_SUCH_VALUE) return domain;
  return domain_createValue(value);
}
function domain_strToSmallest(domain) {
  let len = domain.length;
  let min = domain_str_decodeValue(domain, 0);
  let max = domain_str_decodeValue(domain, len - STR_VALUE_SIZE);
  if (len === STR_RANGE_SIZE) {
    if (min === max) return domain_createValue(min);
  }
  if (max <= SMALL_MAX_NUM) return domain_strToBit(domain, len);
  return domain;
}
/**
 * Convert string domain to number domain. Assumes domain
 * is eligible to be a small domain.
 *
 * @param {$strdom} strdom
 * @param {number} len Cache of domain.length (string length... not value count)
 * @returns {$strdom}
 */
function domain_strToBit(strdom, len) {
  ASSERT_STRDOM(strdom);
  ASSERT(strdom.length === len, 'len should be cache of domain.length');
  ASSERT(domain_max(strdom) <= SMALL_MAX_NUM, 'SHOULD_BE_SMALL_DOMAIN', strdom, domain_max(strdom));

  if (len === 0) return EMPTY;

  let lo = domain_str_decodeValue(strdom, 0);
  let hi = domain_str_decodeValue(strdom, 0 + STR_VALUE_SIZE);

  //if (len === STR_RANGE_SIZE && lo === hi) {
  //  return (lo | SOLVED_FLAG) >>> 0; // >>>0 forces unsigned.
  //}

  let out = domain_bit_addRange(EMPTY, lo, hi);
  for (let i = STR_RANGE_SIZE; i < len; i += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(strdom, i);
    let hi = domain_str_decodeValue(strdom, i + STR_VALUE_SIZE);
    out = domain_bit_addRange(out, lo, hi);
  }
  return out;
}
function domain_arrToSmallest(arrdom) {
  ASSERT_ARRDOM(arrdom);

  let len = arrdom.length;
  if (len === 0) return EMPTY;
  if (len === ARR_RANGE_SIZE && arrdom[0] === arrdom[1]) return domain_createValue(arrdom[0]);

  ASSERT(typeof arrdom[arrdom.length - 1] === 'number');
  let max = domain_arr_max(arrdom);
  if (max <= SMALL_MAX_NUM) return _domain_arrToBit(arrdom, len);

  return domain_arrToStr(arrdom);
}
function _domain_arrToBit(domain, len) {
  ASSERT_ARRDOM(domain);
  ASSERT(domain[domain.length - 1] <= SMALL_MAX_NUM, 'SHOULD_BE_SMALL_DOMAIN', domain);

  // TODO
  // if (domain.length === 2 && domain[0] === domain[1]) return (domain[0] | SOLVED_FLAG) >>> 0;

  let out = 0;
  for (let i = 0; i < len; i += ARR_RANGE_SIZE) {
    out = domain_bit_addRange(out, domain[i], domain[i + 1]);
  }
  return out;
}

/**
 * validate domains, filter and fix legacy domains, throw for bad inputs
 *
 * @param {$domain} domain
 * @returns {number[]}
 */
function domain_validateLegacyArray(domain) {
  ASSERT(domain instanceof Array, 'ONLY_ARRDOM');

  // support legacy domains and validate input here
  let msg = domain_confirmLegacyDomain(domain);
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
function domain_confirmLegacyDomain(domain) {
  ASSERT(domain instanceof Array, 'ONLY_ARRDOM');

  for (let i = 0; i < domain.length; i += ARR_RANGE_SIZE) {
    let lo = domain[i];
    let hi = domain[i + 1];
    let e = domain_confirmLegacyDomainElement(lo);
    if (e) {
      return e;
    }
    let f = domain_confirmLegacyDomainElement(hi);
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
function domain_confirmLegacyDomainElement(n) {
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
 * @returns {$domain_arr|undefined}
 */
function domain_tryToFixLegacyDomain(domain) {
  ASSERT(domain instanceof Array, 'ONLY_ARRDOM');

  let fixed = [];
  for (let i = 0; i < domain.length; i++) {
    let rangeArr = domain[i];
    if (!(rangeArr instanceof Array)) {
      return;
    }
    if (rangeArr.length !== ARR_RANGE_SIZE) {
      return;
    }
    let lo = rangeArr[ARR_FIRST_RANGE_LO];
    let hi = rangeArr[ARR_FIRST_RANGE_HI];
    if (lo > hi) {
      return;
    }
    fixed.push(lo, hi);
  }
  return fixed;
}

// BODY_STOP

export {
  ARR_FIRST_RANGE_HI,
  ARR_FIRST_RANGE_LO,
  ARR_RANGE_SIZE,
  FORCE_ARRAY,
  FORCE_STRING,
  NOT_FOUND,
  PREV_CHANGED,
  SMALL_MAX_FLAG,
  STR_FIRST_RANGE_HI,
  STR_FIRST_RANGE_LO,
  STR_RANGE_SIZE,
  STR_VALUE_SIZE,

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
  domain_arrToStr,
  domain_arrToSmallest,
  domain_clone,
  domain_str_closeGaps,
  domain_containsValue,
  domain_num_containsValue,
  domain_str_containsValue,
  domain_createRange,
  domain_numnum_createRangeZeroToMax,
  domain_num_createRange,
  domain_createValue,
  domain__debug,
  domain_divby,
  domain_isEqual,
  domain_fromListToArrdom,
  domain_getValue,
  domain_arr_getValue,
  domain_str_getValue,
  domain_getValueOfFirstContainedValueInList,
  domain_intersection,
  domain_strstr_intersection,
  domain_isRejected,
  domain_arr_isRejected,
  domain_isSolved,
  domain_str_isSolved,
  domain_isValue,
  domain_num_isValue,
  domain_str_isValue,
  domain_max,
  domain_middleElement,
  domain_min,
  domain_mul,
  domain_numToArr,
  domain_numToStr,
  domain_strToBit,
  domain_removeGte,
  domain_str_removeGte,
  domain_removeLte,
  domain_str_removeLte,
  domain_removeNextFromList,
  domain_removeValue,
  domain_str_removeValue,
  domain_sharesNoElements,
  domain_str_simplify,
  domain_size,
  domain_str_decodeValue,
  domain_str_encodeRange,
  domain_str_encodeValue,
  domain_toArr,
  domain_toSmallest,
  domain_anyToSmallest,
  domain_toList,
  domain_toStr,
  domain_validateLegacyArray,

  // __REMOVE_BELOW_FOR_DIST__
  // testing only:
  domain_str_rangeIndexOf,
  _domain_str_mergeOverlappingRanges,
  _domain_str_quickSortRanges,
  // __REMOVE_ABOVE_FOR_DIST__
};
