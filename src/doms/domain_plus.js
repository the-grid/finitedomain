// This file only concerns itself with adding two domains
// The algorithm is conceptually simple but the support
// for both array and numbered domains makes it a little
// bloated. However, since it saves significant we do it
// anyways.

// Conceptually: range1+range2 = [lo1+lo2, hi1+hi2]
// [5, 10] + [20, 30]
// [5+20, 10+30] -> [25, 40]

import {
  EMPTY,
  EMPTY_STR,
  SMALL_MAX_NUM,
  SOLVED_FLAG,
  SUP,

  ASSERT,
  ASSERT_NUMDOM,
  ASSERT_NORDOM,
  ASSERT_STRDOM,
} from '../helpers';
import {
  EIGHT,
  NINE,

  STR_RANGE_SIZE,
  STR_VALUE_SIZE,

  domain_str_closeGaps,
  domain_num_createRange,
  domain_str_decodeValue,
  domain_str_encodeRange,
  domain_max,
  domain_str_simplify,
  domain_toSmallest,
} from '../domain';

let MIN = Math.min;

// BODY_START

/**
 * Does not harm input domains
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_any_plus(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);

  // note: this is not 0+x=x. this is nothing+something=nothing because the domains contain no value
  if (!domain1) return EMPTY;
  if (!domain2) return EMPTY;

  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';

  let result;
  if (isNum1 && isNum2) {
    // if the highest number in the result is below the max of a small
    // domain we can take a fast path for it. this case happens often.
    if (_domain_plusWillBeSmall(domain1, domain2)) {
      return _domain_plusNumNumNum(domain1, domain2);
    }
    result = _domain_plusNumNumStr(domain1, domain2);
  } else {
    if (isNum1) result = _domain_plusNumStrStr(domain1, domain2);
    else if (isNum2) result = _domain_plusNumStrStr(domain2, domain1); // swapped domains!
    else result = _domain_plusStrStrStr(domain1, domain2);
  }

  return domain_toSmallest(domain_str_simplify(result));
}
function _domain_plusStrStrStr(domain1, domain2) {
  ASSERT_STRDOM(domain1);
  ASSERT_STRDOM(domain2);

  // Simplify the domains by closing gaps since when we add
  // the domains, the gaps will close according to the
  // smallest interval width in the other domain.
  let domains = domain_str_closeGaps(domain1, domain2);
  domain1 = domains[0];
  domain2 = domains[1];

  let newDomain = EMPTY_STR;
  for (let index = 0, len = domain1.length; index < len; index += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(domain1, index);
    let hi = domain_str_decodeValue(domain1, index + STR_VALUE_SIZE);
    newDomain += _domain_plusRangeStrStr(lo, hi, domain2);
  }
  return newDomain;
}
function _domain_plusWillBeSmall(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'ONLY_WITH_NUMBERS');
  ASSERT(typeof domain2 === 'number', 'ONLY_WITH_NUMBERS');
  // if both domains are small enough they cannot add to a domain beyond the max
  if (domain1 < NINE && domain2 < EIGHT) return true; // this shortcut catches most cases
  return domain_max(domain1) + domain_max(domain2) <= SMALL_MAX_NUM; // if max changes, update above too!
}
function _domain_plusNumNumStr(domain1, domain2) {
  ASSERT_NUMDOM(domain1);
  ASSERT_NUMDOM(domain2);

  if (domain1 >= SOLVED_FLAG) {
    let solvedValue = domain1 ^ SOLVED_FLAG;
    return _domain_plusRangeNumStr(solvedValue, solvedValue, domain2);
  }

  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain1 & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;
  let newDomain = EMPTY_STR;
  while (flagValue <= domain1 && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain1) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        newDomain += _domain_plusRangeNumStr(lo, hi, domain2);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return newDomain + _domain_plusRangeNumStr(lo, hi, domain2);
}
function _domain_plusNumNumNum(domain1, domain2) {
  ASSERT_NUMDOM(domain1);
  ASSERT_NUMDOM(domain2);
  ASSERT(domain1 !== EMPTY && domain2 !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');
  ASSERT(domain_max(domain1) + domain_max(domain2) <= SMALL_MAX_NUM, 'THE_POINTE');

  if (domain1 >= SOLVED_FLAG) {
    let solvedValue = domain1 ^ SOLVED_FLAG;
    return _domain_plusRangeNumNum(solvedValue, solvedValue, domain2);
  }

  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain1 & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;

  let newDomain = EMPTY;
  while (flagValue <= domain1 && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain1) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        newDomain |= _domain_plusRangeNumNum(lo, hi, domain2);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return newDomain | _domain_plusRangeNumNum(lo, hi, domain2);
}
function _domain_plusRangeNumNum(loi, hii, domain_num) {
  ASSERT_NUMDOM(domain_num);
  ASSERT(domain_num !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');

  if (domain_num >= SOLVED_FLAG) {
    let solvedValue = domain_num ^ SOLVED_FLAG;
    return _domain_plusRangeRangeNum(loi, hii, solvedValue, solvedValue);
  }

  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain_num & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;

  let newDomain = EMPTY;
  while (flagValue <= domain_num && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain_num) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        newDomain |= _domain_plusRangeRangeNum(loi, hii, lo, hi);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return newDomain | _domain_plusRangeRangeNum(loi, hii, lo, hi);
}
function _domain_plusNumStrStr(domain_num, domain_str) {
  ASSERT_NUMDOM(domain_num);
  ASSERT_STRDOM(domain_str);

  if (domain_num >= SOLVED_FLAG) {
    let solvedValue = domain_num ^ SOLVED_FLAG;
    return _domain_plusRangeStrStr(solvedValue, solvedValue, domain_str);
  }

  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain_num & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;

  let newDomain = EMPTY_STR;
  while (flagValue <= domain_num && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain_num) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        newDomain += _domain_plusRangeStrStr(lo, hi, domain_str);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return newDomain + _domain_plusRangeStrStr(lo, hi, domain_str);
}
function _domain_plusRangeNumStr(loi, hii, domain_num) {
  ASSERT_NUMDOM(domain_num);

  if (domain_num >= SOLVED_FLAG) {
    let solvedValue = domain_num ^ SOLVED_FLAG;
    return _domain_plusRangeRangeStr(loi, hii, solvedValue, solvedValue);
  }

  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain_num & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;

  let newDomain = EMPTY_STR;
  while (flagValue <= domain_num && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain_num) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        newDomain += _domain_plusRangeRangeStr(loi, hii, lo, hi);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return newDomain + _domain_plusRangeRangeStr(loi, hii, lo, hi);
}
function _domain_plusRangeStrStr(loi, hii, domain_str) {
  ASSERT_STRDOM(domain_str);

  let newDomain = EMPTY_STR;
  for (let index = 0, len = domain_str.length; index < len; index += STR_RANGE_SIZE) {
    let lo = domain_str_decodeValue(domain_str, index);
    let hi = domain_str_decodeValue(domain_str, index + STR_VALUE_SIZE);
    newDomain += _domain_plusRangeRangeStr(loi, hii, lo, hi);
  }
  return newDomain;
}
function _domain_plusRangeRangeStr(loi, hii, loj, hij) {
  ASSERT(loi + loj >= 0, 'DOMAINS_SHOULD_NOT_HAVE_NEGATIVES');
  let lo = loi + loj;
  if (lo <= SUP) { // if lo exceeds SUP the resulting range is completely OOB and we ignore it.
    let hi = MIN(SUP, hii + hij);
    return domain_str_encodeRange(lo, hi);
  }
  return EMPTY_STR;
}
function _domain_plusRangeRangeNum(loi, hii, loj, hij) {
  ASSERT(loi + loj >= 0, 'DOMAINS_SHOULD_NOT_HAVE_NEGATIVES');
  ASSERT(loi + loj <= SMALL_MAX_NUM, 'RESULT_SHOULD_NOT_EXCEED_SMALL_DOMAIN');
  ASSERT(hii + hij <= SMALL_MAX_NUM, 'RESULT_SHOULD_NOT_EXCEED_SMALL_DOMAIN');

  let domain = domain_num_createRange(loi + loj, hii + hij);
  ASSERT(typeof domain === 'number' && domain < SOLVED_FLAG, 'expecting numdom, not soldom');
  return domain;
}

// BODY_STOP

export default domain_any_plus;
