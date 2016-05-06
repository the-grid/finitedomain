import {
  SUB,
  SUP,
  NO_SUCH_VALUE,
  REJECTED,
  SOMETHING_CHANGED,
  ZERO_CHANGES,

  ASSERT,
  ASSERT_DOMAIN,
  ASSERT_DOMAIN_EMPTY_CHECK,
  ASSERT_DOMAIN_EMPTY_SET,
  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK,
} from './helpers';

// BODY_START

let INLINE = true;
let NOT_INLINE = false;
let PREV_CHANGED = true;

// CSIS form = Canonical Sorted Interval Sequeunce form.
// Basically means the ranges in the domain are ordered
// ascending and no ranges overlap. We call this "simplified"

let FIRST_RANGE = 0;
let FIRST_RANGE_LO = 0;
let FIRST_RANGE_HI = 1;
let LO_BOUND = 0;
let HI_BOUND = 1;
let PAIR_SIZE = 2;
let DOMAINS_NOT_CHANGED = 0;

let NOT_FOUND = -1;

// Cache static Math functions
let MIN = Math.min;
let MAX = Math.max;
let FLOOR = Math.floor;
let CEIL = Math.ceil;

/**
 * returns whether domain covers given value
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_containsValue(domain, value) {
  ASSERT_DOMAIN(domain);
  return (_domain_rangeIndexOf(domain, value)) !== NOT_FOUND;
}

/**
 * return the range index in given domain that covers given
 * value, or if the domain does not cover it at all
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {number}
 */
function _domain_rangeIndexOf(domain, value) {
  ASSERT_DOMAIN(domain);
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    if (value >= lo && value <= domain[index+1]) {
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
  ASSERT_DOMAIN(domain);
  if (domain.length !== PAIR_SIZE) {
    return false;
  }
  return domain[LO_BOUND] === value && domain[HI_BOUND] === value;
}

/**
 * @param {$domain} domain
 * @param {number} lo
 * @param {number} hi
 * @returns {boolean}
 */
function domain_isRange(domain, lo, hi) {
  ASSERT_DOMAIN(domain);
  if (domain.length !== PAIR_SIZE) {
    return false;
  }
  return domain[LO_BOUND] === lo && domain[HI_BOUND] === hi;
}

/**
 * @param {$domain} domain
 * @returns {number}
 */
function domain_getValue(domain) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  if (domain.length !== PAIR_SIZE) {
    return NOT_FOUND;
  }
  let [lo, hi] = domain;
  if (domain[LO_BOUND] === domain[HI_BOUND]) {
    return lo;
  }
  return NO_SUCH_VALUE;
}

/**
 * list of possible values to domain
 * returns a CSIS domain
 *
 * @param {number[]} list
 * @param {boolean} clone
 * @param {boolean} sort
 * @returns {number[]}
 */
function domain_fromList(list, clone = true, sort = true) {
  if (clone) {
    list = list.slice(0); // TBD: this was broken. do we need it?
  }
  if (sort) { // note: the list must be sorted for the algorithm below to work...
    list.sort((a, b) => a - b);
  }

  let domain = [];
  for (let index = 0; index < list.length; index++) {
    let value = list[index];
    ASSERT(value >= SUB, 'fd values range SUB~SUP');
    ASSERT(value <= SUP, 'fd values range SUB~SUP');
    if (index === 0) {
      var lo = value;
      var hi = value;
    } else {
      ASSERT(value >= hi, 'list should be ordered'); // imo it should not even contain dupe elements... but that may happen anyways
      if (value > hi+1) {
        domain.push(lo, hi);
        var lo = value;
      }
      var hi = value;
    }
  }
  domain.push(lo, hi);
  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK(domain);
  return domain;
}

/**
 * domain to list of possible values
 *
 * @param {$domain} domain
 * @returns {number[]}
 */
let domain_toList = function(domain) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  let list = [];
  for (let i = 0; i < domain.length; i += PAIR_SIZE) {
    for (let n = domain[i], m = domain[i + 1]; n < m; ++n) {
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
 * @returns {$domain|undefined} Undefined means the result is empty
 */
function domain_removeNextFromList(domain, list) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  for (let i = 0; i < list.length; i++) {
    let value = list[i];
    ASSERT(value >= SUB && value <= SUP, 'lists with oob values probably indicate a bug');
    let index = _domain_rangeIndexOf(domain, value);
    if (index >= 0) {
      return _domain_deepCloneWithoutValue(domain, value, index);
    }
  }
  // return undefined to indicate end of search
}

/**
 * Return a clone of given domain. If value is contained in domain, the clone
 * will not contain it. This is an optimization to basically prevent splicing.
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {$domain}
 */
function domain_deepCloneWithoutValue(domain, value) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  let index = _domain_rangeIndexOf(domain, value);
  if (index >= 0) {
    return _domain_deepCloneWithoutValue(domain, value, index);
  }
  // regular slice > *
  return domain.slice(0);
}

/**
 * Same as domain_deepCloneWithoutValue but requires the first
 * rangeIndex whose lo is bigger than or equal to value
 *
 * @param {$domain} domain
 * @param {number} value
 * @param {number} rangeIndex
 * @returns {$domain}
 */
function _domain_deepCloneWithoutValue(domain, value, rangeIndex) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  // we have the range offset that should contain the value. the clone wont
  // affect ranges before or after. but we want to prevent a splice or shifts, so:
  if (rangeIndex) {
    var result = domain.slice(0, rangeIndex);
  } else {
    var result = [];
  }

  for (let i = rangeIndex; i < domain.length; i += PAIR_SIZE) {
    let index = iterable[i];
    let lo = domain[index];
    let hi = domain[index+1];
    if (index !== rangeIndex) {
      result.push(lo, hi);
    } else { // so index is rangeIndex, so split
      if (lo !== value) {
        result.push(lo, value-1);
      }
      if (hi !== value) {
        result.push(value+1, hi);
      }
    }
  }
  ASSERT_DOMAIN(result);
  if (!result) {
    ASSERT_DOMAIN_EMPTY_SET(result);
  }
  return result;
}

/**
 * @param {$domain} domain
 * @param {number[]} list
 * @returns {number} Can return NO_SUCH_VALUE
 */
function domain_getValueOfFirstContainedValueInList(domain, list) {
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
 * @param {number} value
 * @returns {$domain}
 */
function domain_createWithoutValue(value) {
  return domain_createWithoutBounds(value, value);
}

/**
 * @param {number} lo
 * @param {number} hi
 * @returns {$domain}
 */
function domain_createWithoutBounds(lo, hi) {
  let domain = [];
  if (lo > SUB) {
    domain.push(SUB, lo-1);
  }
  if (hi < SUP) {
    domain.push(hi+1, SUP);
  }
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  return domain;
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
  ASSERT_DOMAIN(domain); // should we reject for empty domains?
  if (!domain.length) {
    return domain_createAll();
  }

  let end = SUB;
  let result = [];
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    ASSERT(!end || end < lo, 'domain is supposed to be csis, so ranges dont overlap nor touch');
    if (lo > SUB) { // prevent [SUB,SUB] if first range starts at SUB; that'd be bad
      result.push(end, lo - 1);
    }
    end = domain[index+1] + 1;
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
 * If replaceInline is NOT_INLINE the input domain is deeply cloned first, regardless
 *
 * @param {$pairs} domain TODO: document a $pairs as number[] and describe their special case (=> not normalized)
 * @param {boolean} replaceInline
 * @returns {$domain}
 */
function domain_simplify(domain, replaceInline=NOT_INLINE) {
  // ASSERT_DOMAIN domain # the whole point of this func is to simplify so this assert wont hold

  // deep clone if not inline because ranges are adjusted inline when merging
  // we could interweave this step with domain_mergeOverlappingInline, not sure if it changes much
  if (replaceInline === NOT_INLINE) {
    domain = domain.slice(0);
  }

  if (domain.length === 0) {
    return domain;
  }

  // TODO: perf check; before there was a large memory overhead but i think that's taken care of now. the extra check-loop may not be worth it
  if (!_domain_isSimplified(domain)) {
    domain_simplifyInline(domain);
  }

  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK(domain);
  return domain;
}

/**
 * Given a set of ranges (domain) turns them into CSIS form
 * This function sorts and loops unconditionally
 *
 * @param {$pairs} domain
 * @returns {$domain}
 */
function domain_simplifyInline(domain) {
  // order ranges by lower bound, ascending (inline regardless)
  _domain_sortByRange(domain);

  return _domain_mergeOverlappingInline(domain);
}

/**
 * @param {$domain} domain
 */
function _domain_sortByRange(domain) {
  let len = domain.length;
  ASSERT(len > 0, 'input domain should not be empty', domain);
  if (len >= 4) {
    _domain_quickSortInline(domain, 0, domain.length-PAIR_SIZE);
  }
}

/**
 * @param {$domain} domain
 * @param {number} first
 * @param {number} last
 */
function _domain_quickSortInline(domain, first, last) {
  if (first < last) {
    let pivot = _domain_partition(domain, first, last);
    _domain_quickSortInline(domain, first, pivot-PAIR_SIZE);
    _domain_quickSortInline(domain, pivot+PAIR_SIZE, last);
  }
}

/**
 * @param {$domain} domain
 * @param {number} first
 * @param {number} last
 * @returns {number}
 */
function _domain_partition(domain, first, last) {
  let pivot_index = last;
  let pivot = domain[pivot_index]; // TODO: i think we'd be better off with a different pivot? middle probably performs better
  let pivot_r = domain[pivot_index+1];

  let index = first;
  for (let i = first; i < last; i += PAIR_SIZE) {
    let L = domain[i];
    if (L < pivot || (L === pivot && domain[i+1] < pivot_r)) {
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
let _domain_swapRangeInline = function(domain, A, B) {
  if (A !== B) {
    let x = domain[A];
    let y = domain[A+1];
    domain[A] = domain[B];
    domain[A+1] = domain[B+1];
    domain[B] = x;
    domain[B+1] = y;
  }
}

/**
 * Check if given domain is in simplified, CSIS form
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function _domain_isSimplified(domain) {
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
    let hi = domain[index+1];
    ASSERT(lo >= SUB);
    ASSERT(hi >= SUB);
    ASSERT(lo <= hi, 'ranges should be ascending', domain);
    // we need to simplify if the lo of the next range goes before or touches the hi of the previous range
    // TODO: i think it used or intended to optimize this by continueing to process this from the current domain, rather than the start.
    //       this function could return the offset to continue at... or -1 to signal "true"
    if (lo <= phi+1) {
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
function _domain_mergeOverlappingInline(domain) {
  // assumes domain is sorted
  // assumes all ranges are "sound" (lo<=hi)
  let prev_hi = SUB;
  let write_index = 0;
  for (let read_index = 0, step = PAIR_SIZE; read_index < domain.length; read_index += step) {
    let lo = domain[read_index];
    let hi = domain[read_index+1];
    ASSERT(lo <= hi, 'ranges should be ascending');

    // in an ordered domain two consecutive ranges touch or overlap if the left-hi+1 is higher or equal to the right-lo
    if (prev_hi+1 >= lo && read_index !== 0) {
      // touching or overlapping.
      // note: prev and curr may completely enclose one another
      // Update the prev hi so prev covers both ranges, in any case
      if (hi > prev_hi) {
        domain[prev_hi_index] = hi;
        prev_hi = hi;
      }
    } else {
      domain[write_index] = lo;
      domain[write_index+1] = hi;
      prev_hi_index = write_index + 1;
      write_index += PAIR_SIZE;
      prev_hi = hi;
    }
  }
  domain.length = write_index; // if `domain` was a larger at the start this ensures extra elements are dropped from it
  for (let i = 0; i < domain.length; i++) {
    let test = domain[i];
    ASSERT(test >= SUB, 'merge should not result in sparse array');
    ASSERT(test <= SUP, 'should be within bounds');
  }
  return domain;
}

/**
 * CSIS form = Canonical Sorted Interval Sequeunce form.
 *
 * Intersection of two domains given in CSIS form.
 * r is optional and if given it should be an array and
 * the domain pieces will be inserted into it, in which case
 * the result domain will be returned unsimplified.
 *
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @returns {$domain}
 */
function domain_intersection(dom1, dom2) {
  ASSERT_DOMAIN(dom1);
  ASSERT_DOMAIN(dom2);
  let result = [];
  _domain_intersection(dom1, dom2, result);
  domain_simplify(result); // TODO: make inline
  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK(result);
  return result;
}

/**
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @param {$domain} result
 */
function _domain_intersection(dom1, dom2, result) {
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
    let i = ((len1/PAIR_SIZE) >> 1) *PAIR_SIZE;
    let j = ((len2/PAIR_SIZE) >> 1) *PAIR_SIZE;
    ASSERT(i%PAIR_SIZE === 0, `i should be even ${i}`);
    ASSERT(j%PAIR_SIZE === 0, `j should be even ${j}`);
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
 * @param {number} lo1
 * @param {number} hi1
 * @param {number} lo2
 * @param {number} hi2
 * @param result
 */
function _domain_intersectRangeBound(lo1, hi1, lo2, hi2, result) {
  let min = MAX(lo1, lo2);
  let max = MIN(hi1, hi2);
  if (max >= min) {
    result.push(min, max);
  }
}

/**
 * @param {$domain} domain
 * @param {number} lo
 * @param {number} hi
 * @param {$domain} result
 */
function domain_intersectBoundsInto(domain, lo, hi, result) {
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo2 = domain[index];
    let hi2 = domain[index+1];
    if (lo2 <= hi && hi2 >= lo) {
      result.push(MAX(lo, lo2), MIN(hi, hi2));
    }
  }
}

/**
 * deep comparison of two domains
 *
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @returns {boolean}
 */
function domain_equal(dom1, dom2) {
  ASSERT_DOMAIN(dom1);
  ASSERT_DOMAIN(dom2);
  let len = dom1.length;

  if (len !== dom2.length) {
    return false;
  }

  if (dom1 === dom2) { // does this ever happen?
    return true;
  }

  return _domain_equal(dom1, dom2, len);
}

/**
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @param {number} len
 * @returns {boolean}
 */
function _domain_equal(dom1, dom2, len) {
  for (let i = 0; i < len; ++i) {
    if (dom1[i] !== dom2[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Closes all the gaps between the intervals according to
 * the given gap value. All gaps less than this gap are closed.
 *
 * @param {$domain} domain
 * @param {number} gap
 * @returns {$domain}
 */
function domain_closeGapsFresh(domain, gap) {
  ASSERT_DOMAIN(domain);
  let result = [];
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    let hi = domain[index+1];
    if (index === 0) {
      result.push(lo, hi);
      var plo = lo;
    } else {
      if (hi - plo < gap) {
        result[result.length-1] = hi;
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
  let min_width = SUP;
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    let hi = domain[index+1];
    let width = 1 + hi - lo;
    if (width < min_width) {
      min_width = width;
    }
  }
  return min_width;
}

/**
 * @param {$domain} domain
 * @returns {number}
 */
function _domain_largestIntervalWidth(domain) {
  let max_width = SUP;
  for (let index = 0; index < domain.length; index += PAIR_SIZE) {
    let lo = domain[index];
    let hi = domain[index+1];
    let width = 1 + hi - lo;
    if (width > max_width) {
      max_width = width;
    }
  }
  return max_width;
}

/**
 * The idea behind this function - which is primarily
 * intended for domain_plus and domain_minus and porbably applies
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
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @returns {$domain}
 */
function _domain_closeGaps2(dom1, dom2) {
  ASSERT_DOMAIN(dom1);
  ASSERT_DOMAIN(dom2);
  while (true) {
    let change = ZERO_CHANGES;

    let domain = domain_closeGapsFresh(dom1, _domain_smallestIntervalWidth(dom2));
    change += dom1.length - domain.length;
    dom1 = domain;

    domain = domain_closeGapsFresh(dom2, _domain_smallestIntervalWidth(dom1));
    change += dom2.length - domain.length;
    dom2 = domain;

    if (change === ZERO_CHANGES) {
      break;
    }
  }

  return [
    dom1,
    dom2
  ];
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_plus(domain1, domain2) {
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT((domain1 != null) && (domain2 != null));

  // Simplify the domains by closing gaps since when we add
  // the domains, the gaps will close according to the
  // smallest interval width in the other domain.
  [domain1, domain2] = _domain_closeGaps2(domain1, domain2);

  let result = [];
  for (let index = 0, step = PAIR_SIZE; index < domain1.length; index += step) {
    let loi = domain1[index];
    let hii = domain1[index+1];

    for (let index2 = 0, step1 = PAIR_SIZE; index2 < domain2.length; index2 += step1) {
      let loj = domain2[index2];
      let hij = domain2[index2 + 1];

      result.push(MIN(SUP, loi + loj), MIN(SUP, hii + hij));
    }
  }

  return domain_simplify(result, INLINE);
}

/**
 * Note that this one isn't domain consistent.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_mul(domain1, domain2) {
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT((domain1 != null) && (domain2 != null));

  let len = domain.length;
  let result = [];
  for (let i = 0; i < len; i += PAIR_SIZE) {
    let loi = domain1[i];
    let hii = domain1[i+1];

    for (let j = 0; j < len; j += PAIR_SIZE) {
      let loj = domain2[j];
      let hij = domain2[j + 1];

      result.push(MIN(SUP, loi * loj), MIN(SUP, hii * hij));
    }
  }

  return domain_simplify(result, INLINE);
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_minus(domain1, domain2) {
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT((domain1 != null) && (domain2 != null));

  // Simplify the domains by closing gaps since when we add
  // the domains, the gaps will close according to the
  // smallest interval width in the other domain.
  [domain1, domain2] = _domain_closeGaps2(domain1, domain2);

  let result = [];
  for (let i = 0; i < len; i += PAIR_SIZE) {
    let loi = domain1[i];
    let hii = domain1[i+1];

    for (let j = 0; j < len; j += PAIR_SIZE) {
      let loj = domain2[j];
      let hij = domain2[j + 1];

      let lo = loi - hij;
      let hi = hii - loj;
      if (hi >= SUB) {
        result.push(MAX(SUB, lo), hi);
      }
    }
  }

  return domain_simplify(result, INLINE);
}

/**
 * Divide one range by another
 * Result has any integer values that are equal or between
 * the real results. This means fractions are floored/ceiled.
 * This is an expensive operation.
 * Zero is a special case.
 *
 * @param domain1
 * @param domain2
 * @param {boolean} [floorFractions=true] Include the floored lo of the resulting ranges?
 *         For example, <5,5>/<2,2> is <2.5,2.5>. If this flag is true, it will include
 *         <2,2>, otherwise it will not include anything for that division.
 * @returns {$domain}
 */
function domain_divby(domain1, domain2, floorFractions=true) {
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT((domain1 != null) && (domain2 != null), 'domain 1 and 2?', domain1, domain2);

  let result = [];

  for (let i = 0; i < len; i += PAIR_SIZE) {
    let loi = domain1[i];
    let hii = domain1[i + 1];

    for (let j = 0; j < len; j += PAIR_SIZE) {
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

  return domain_simplify(result, INLINE);
}

/**
 * Return the number of elements this domain covers
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_size(domain) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  let count = 0;
  for (let i = 0; i < len; i += PAIR_SIZE) {
    let lo = domain[i];
    count += 1 + domain[i+1] - lo; // TODO: add test to confirm this still works fine if SUB is negative
  }
  return count;
}

/**
 * Get the middle element of all elements in domain. Not hi-lo/2.
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_middleElement(domain) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  let size = domain_size(domain);
  let target_value = FLOOR(size / 2);

  for (let i = 0; i < len; i += PAIR_SIZE) {
    var lo = domain[i];
    let hi = domain[i+1];

    let count =  1 + hi - lo;
    if (target_value < count) {
      break;
    }

    target_value -= count;
  }

  // `target_value` should be the `nth` element in the current range (`lo-hi`)
  // so we can use `lo` and add the remainder of `target_value` to get the mid value
  return lo + target_value;
}

/**
 * Only use if callsite doesn't use first range again
 *
 * @param {$domain} domain
 * @returns {number}
 */
function domain_min(domain) {
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
  ASSERT_DOMAIN_EMPTY_CHECK(domain);
  return domain[domain.length - 1];
}

/**
 * @param {$domain} domain
 * @param {number} lo
 * @param {number} hi
 */
function domain_setToRangeInline(domain, lo, hi) {
  ASSERT_DOMAIN(domain, 'should be sound domain');
  ASSERT(lo <= hi, 'lo/hi should be ordered!', [lo, hi]);
  domain[LO_BOUND] = lo;
  domain[HI_BOUND] = hi;
  domain.length = PAIR_SIZE;
}

/**
 * A domain is "solved" if it covers exactly one value. It is not solved if it is empty.
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isSolved(domain) {
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
  ASSERT_DOMAIN(domain);
  let len = domain.length;
  if (len === 0) {
    return true;
  }
  return len === PAIR_SIZE && domain_firstRangeIsDetermined(domain);
}

/**
 * A domain is "rejected" if it covers no values. This means every given
 * value would break at least one constraint so none could be used.
 *
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_isRejected(domain) {
  return domain.length === 0;
}

/**
 * @param {$domain} domain
 * @returns {boolean}
 */
function domain_firstRangeIsDetermined(domain) {
  ASSERT_DOMAIN(domain);
  return domain[LO_BOUND] === domain[HI_BOUND];
}

/**
 * Remove any value from domain that is bigger than or equal to given value.
 * Since domains are assumed to be in CSIS form, we can start from the back and
 * search for the first range that is smaller or contains given value. Prune
 * any range that follows it and trim the found range if it contains the value.
 * Returns whether the domain was changed somehow
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_removeGteInline(domain, value) {
  ASSERT_DOMAIN(domain, 'needs to be csis for this trick to work');

  let len = domain.length;
  let i = len - PAIR_SIZE;
  while (i >= 0 && domain[i] >= value) {
    i -= PAIR_SIZE;
  }

  if (i < 0) {
    domain.length = 0;
    return len !== 0;
  }

  domain.length = i+PAIR_SIZE;
  if (domain[i+1] >= value) {
    domain[i+1] = value-1; // we already know domain[i] < value so value-1 >= SUB
    return true;
  }

  return len !== i+PAIR_SIZE;
}

/**
 * Remove any value from domain that is lesser than or equal to given value.
 * Since domains are assumed to be in CSIS form, we can start from the front and
 * search for the first range that is smaller or contains given value. Prune
 * any range that preceeds it and trim the found range if it contains the value.
 * Returns whether the domain was changed somehow
 *
 * @param {$domain} domain
 * @param {number} value
 * @returns {boolean}
 */
function domain_removeLteInline(domain, value) {
  ASSERT_DOMAIN(domain, 'needs to be csis for this trick to work');

  let len = domain.length;
  let i = 0;
  while (i < len && domain[i+1] <= value) {
    i += PAIR_SIZE;
  }

  if (i >= len) {
    domain.length = 0;
    return len !== 0;
  }

  // move all elements to the front
  let n = 0;
  for (let index = i; index < len; ++index) {
    domain[n++] = domain[index];
  }
  // trim excess space. we just moved them
  domain.length = n;

  // note: first range should be lt or lte to value now since we moved everything
  if (domain[FIRST_RANGE_LO] <= value) {
    domain[FIRST_RANGE_LO] = value+1;
    return true;
  }

  return len !== n;
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {number} len
 * @returns {number} Can be len, which will mean "not found"
 */
function domain_findDiffIndex(domain1, domain2, len) {
  // first check whether the two are different at all
  let index = 0;
  while (index < len) {
    let lo1 = domain1[index];
    let hi1 = domain1[index+1];
    let lo2 = domain2[index];
    let hi2 = domain2[index+1];
    if (lo1 !== lo2 || hi1 !== hi2) {
      return index;
    }
    index += PAIR_SIZE;
  }
  return len; // "not found"
}

/**
 * @param {number} index
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {number} len1
 * @param {number} len2
 * @returns {number}
 */
function domain_applyEqInlineFrom(index, domain1, domain2, len1, len2) {
  let p1 = index;
  let p2 = index;

  let lo1 = domain1[p1];
  let hi1 = domain1[p1+1];
  let lo2 = domain2[p2];
  let hi2 = domain2[p2+1];

  while (p1 < len1 && p2 < len2) {
    if (hi1 < lo2) { // R1 < R2 completely; drop R1
      p1 += PAIR_SIZE;
      lo1 = domain1[p1];
      hi1 = domain1[p1+1];

    } else if (hi2 < lo1) { // R2 < R1 completely; drop R1
      p2 += PAIR_SIZE;
      lo2 = domain2[p2];
      hi2 = domain2[p2+1];

      // hi1 >= lo2 and hi2 >= lo1
    } else if (lo1 < lo2) { // R1 < R2 partial; update R1 lo to R2 lo
      lo1 = lo2;
    } else if (lo2 < lo1) { // R2 < R1 partial; update R2 lo to R1 lo
      lo2 = lo1;

    } else {
      // add a range with MIN hi1, hi2
      // then move lo to that hi and drop a range on at least one side
      ASSERT(lo1 === lo2, 'the lows should be equal');
      let hi = MIN(hi1, hi2);
      domain1[index] = domain2[index] = lo1;
      domain1[index+1] = domain2[index+1] = hi;
      index += PAIR_SIZE;

      // if the current range on either side was fully copied, move its pointer
      // otherwise update its lo to the last hi+1 and continue

      if (hi === hi1) {
        p1 += PAIR_SIZE;
        lo1 = domain1[p1];
        hi1 = domain1[p1+1];
      } else {
        lo1 = hi+1;
      }

      if (hi === hi2) {
        p2 += PAIR_SIZE;
        lo2 = domain2[p2];
        hi2 = domain2[p2+1];
      } else {
        lo2 = hi+1;
      }
    }
  }

  // note: a domain may shrink OR grow.
  // and a domain that stays the same len may still have changed.
  if (len1 !== index) {
    domain1.length = index;
  }
  if (len2 !== index) {
    domain2.length = index;
  }

  if (index === 0) {
    return REJECTED;
  }

  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);

  return SOMETHING_CHANGED;
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {number}
 */
function domain_forceEqInline(domain1, domain2) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain1);
  ASSERT_DOMAIN_EMPTY_CHECK(domain2);

  let len1 = domain1.length;
  let len2 = domain2.length;
  let len = MIN(len1, len2);

  if (len === 0) {
    domain1.length = 0;
    domain2.length = 0;
    return REJECTED;
  }

  let index = domain_findDiffIndex(domain1, domain2, len);
  ASSERT(index >= 0 && index <= len, 'target index should be within the range of the array len+1');
  ASSERT(index % 2 === 0, 'target index should be even because it should find a range offset');

  if (index !== len) {
    return domain_applyEqInlineFrom(index, domain1, domain2, len1, len2);
  }

  return DOMAINS_NOT_CHANGED;
}

/**
 * Remove one range at given index, inline.
 * Moves all ranges behind it back by one position (index-2)
 *
 * @param {$domain} domain
 * @param {number} index
 */
function domain_spliceOutRangeAt(domain, index) {
  for (let i = index; i < domain.length; i += PAIR_SIZE) {
    domain[i] = domain[i+PAIR_SIZE];
    domain[i+1] = domain[i+PAIR_SIZE+1];
  }
  domain.length = i-PAIR_SIZE;
}

/**
 * @param {$domain} domain
 * @param {number} index
 */
function domain_spliceInRangeAt(domain, index) {
  _domain_spliceInRangeAt(domain, index, domain[index], domain[index+1]);
}

/**
 * Insert given range at given index, moving all other ranges up by one (index+2)
 *
 * @param {$domain} domain
 * @param {number} index
 * @param {number} pLo
 * @param {number} pHi
 */
function _domain_spliceInRangeAt(domain, index, pLo, pHi) {
  // from here on out we must first stash the cur range, then pop the prev range
  for (let i = index; i < domain.length; i += PAIR_SIZE) {
    let lo = domain[i];
    let hi = domain[i+1];
    domain[i] = pLo;
    domain[i+1] = pHi;
    pLo = lo;
    pHi = hi;
  }
  // and one more time now at the end
  domain[i] = pLo;
  domain[i+1] = pHi;
  domain.length = i+PAIR_SIZE;
}

/**
 * @param {$domain} domain
 * @param {number} value
 * @param {number} index
 */
function domain_removeValueAt(domain, value, index) {
  return _domain_removeValueAt(domain, value, index, domain[index], domain[index+1]);
}

/**
 * assumes value was found in range at index
 * note: make sure to reject at callsite if this results in an empty domain!
 *
 * @param {$domain} domain
 * @param {number} value
 * @param {number} index
 * @param {number} lo
 * @param {number} hi
 */
function _domain_removeValueAt(domain, value, index, lo, hi) {
  // four options:
  // range is exactly value; remove it, stream rest, update len, return
  // range starts or ends with value; update it, return
  // value is inside range; split it, inject carefully, stream, return

  if (lo === value) {
    if (hi === value) {
      domain_spliceOutRangeAt(domain, index);
      return;
    }
    domain[index] = value+1; // update lo
    return;
  }
  if (hi === value) {
    domain[index+1] = value-1; // update hi
    return;
  }

  // must be last case now: value is inside range
  // split range. update current range with new hi
  domain[index+1] = value - 1;

  // create a new range of value+1 to old hi, then splice it in
  let p_lo = value+1;
  let p_hi = hi;
  ASSERT(p_lo <= p_hi, 'value shouldve been below hi');

  _domain_spliceInRangeAt(domain, index + PAIR_SIZE, p_lo, p_hi);
}

/**
 * @param {$domain} domain
 * @param {number} value
 * @returns {number}
 */
function domain_removeValueInline(domain, value) {
  ASSERT(typeof value === 'number', 'value should be a num', value);
  for (let index = 0, step = PAIR_SIZE; index < domain.length; index += step) {
    let lo = domain[index];
    let hi = domain[index+1];
    if (value >= lo && value <= hi) {
      _domain_removeValueAt(domain, value, index, lo, hi);
      ASSERT_DOMAIN(domain);
      if (domain_isRejected(domain)) {
        ASSERT_DOMAIN_EMPTY_SET(domain);
        return REJECTED;
      }
      return SOMETHING_CHANGED;
    }
  }
  return ZERO_CHANGES;
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
  for (let i = 0; i < domain1.length; i += PAIR_SIZE) {
    let lo = domain1[i];
    let hi = domain1[i+1];
    for (let j = 0; j < domain2.length; j += PAIR_SIZE) {
      // if range A is not before or after range B there is overlap
      if (hi >= domain2[j] && lo <= domain2[j+1]) {
        // if there is overlap both domains share at least one element
        return false;
      }
    }
  }
  // no range in domain1 proved to overlap with a range in domain2
  return true;
}

/**
 * @returns {$domain} 0,0
 */
function domain_createZero() {
  return [0, 0];
}

/**
 * @returns {$domain} 1,1
 */
function domain_createOne() {
  return [1, 1];
}

/**
 * @returns {$domain} 0,1
 */
function domain_createBool() {
  return [0, 1];
}

/**
 * @returns {$domain} sub,sup
 */
function domain_createAll() {
  return [SUB, SUP];
}

/**
 * This is basically 0,0 but safer for the future
 * if we decide to change SUB to a negative number.
 *
 * @returns {$domain} sub,sub
 */
function domain_createSub() {
  return [SUB, SUB];
}

/**
 * Safer than some large number in case SUP ever changes.
 *
 * @returns {$domain} sup,sup
 */
function domain_createSup() {
  return [SUP, SUP];
}

/**
 * @param {number} value
 * @returns {$domain}
 */
function domain_createValue(value) {
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
  return [lo, hi];
}

// BODY_STOP

export {
  INLINE,
  NOT_INLINE,
  PREV_CHANGED,
  SOMETHING_CHANGED,

  domain_sharesNoElements,
  domain_complement,
  domain_containsValue,
  domain_createAll,
  domain_createBool,
  domain_createOne,
  domain_createSub,
  domain_createRange,
  domain_createSup,
  domain_createValue,
  domain_createWithoutValue,
  domain_createWithoutBounds,
  domain_createZero,
  domain_deepCloneWithoutValue,
  domain_divby,
  domain_equal,
  domain_forceEqInline,
  domain_fromList,
  domain_getValue,
  domain_getValueOfFirstContainedValueInList,
  domain_intersectBoundsInto,
  domain_intersection,
  domain_isDetermined,
  domain_isRange,
  domain_isRejected,
  domain_isSolved,
  domain_isValue,
  domain_max,
  domain_middleElement,
  domain_min,
  domain_minus,
  domain_plus,
  domain_removeGteInline,
  domain_removeLteInline,
  domain_removeNextFromList,
  domain_removeValueInline,
  domain_setToRangeInline,
  domain_simplify,
  domain_size,
  domain_mul,
  domain_toList,

  // __REMOVE_BELOW_FOR_DIST__
  // testing only:
  _domain_rangeIndexOf,
  _domain_isSimplified,
  _domain_mergeOverlappingInline,
  _domain_sortByRange,
  // __REMOVE_ABOVE_FOR_DIST__
};
