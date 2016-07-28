// This file only concerns itself with subtracting two domains
// The algorithm is conceptually simple but the support
// for both array and numbered domains makes it a little
// bloated. However, since it saves significant we do it
// anyways.

// Conceptually: range1-range2 = [max(0, lo1-hi2), max(0, hi1-lo2)]
// [5, 10] - [20, 30]
// [5-30, 30-5] -> [-25, 25] --> [0, 25]

// optimization shortcut: if both domains contain a zero the result
// is [0, max(domain1)] because we drop negative numbers;
// [lo1 - hi2, hi1 - lo2] -> [0 - hi2, hi1 - 0] -> [0, hi1]

// a big table of all input/output for small domains can be found at
// https://gist.github.com/qfox/fce6912ef17503b1055aac28fa34e8d1 (view
// with text editor that doesn't wrap). Spoiler: it doesn't help :)

import {
  EMPTY,
  SUB,

  ASSERT,
} from '../helpers';
import {
  STR_VALUE_SIZE,
  STR_RANGE_SIZE,
  SMALL_MAX_NUM,
  ZERO,
  domain_closeGapsStr,
  domain_createRange,
  domain_strDecodeValue,
  domain_strEncodeRange,
  domain_max,
  domain_min,
  domain_numstr,
  domain_simplifyStr,
} from '../domain';
import {
  asmdomain_createRange,
  asmdomain_createRangeZeroToMax,
} from '../asmdomain';

let MAX = Math.max;

// BODY_START

/**
 * Subtract one domain from the other
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_minus(domain1, domain2) {
  ASSERT(typeof domain1 === 'number' || typeof domain1 === 'string', 'NUMDOM_OR_STRDOM');
  ASSERT(typeof domain2 === 'number' || typeof domain2 === 'string', 'NUMDOM_OR_STRDOM');

  // note: this is not x-0=x. this is nothing-something=nothing because the domains contain no value
  if (!domain1) return EMPTY;
  if (!domain2) return EMPTY;

  // optimize an easy path: if both domains contain zero the
  // result will always be [0, max(domain1)], because:
  // d1-d2 = [lo1-hi2, hi1-lo2] -> [0-hi2, hi1-0] -> [0, hi1]
  if (domain_min(domain1) === 0 && domain_min(domain2) === 0) {
    return domain_createRange(0, domain_max(domain1));
  }

  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';

  if (isNum1) {
    // note: if domain1 is a small domain the result is always a small domain
    if (isNum2) return _domain_minusNumNumNum(domain1, domain2);
    return _domain_minusNumStrNum(domain1, domain2);
  }

  let result;
  if (isNum2) result = _domain_minusStrNumStr(domain1, domain2); // cannot swap minus args!
  else result = _domain_minusStrStrStr(domain1, domain2);

  return domain_numstr(domain_simplifyStr(result));
}
function _domain_minusStrStrStr(domain1, domain2) {
  ASSERT(typeof domain1 === 'string', 'USED_WITH_STRINGS', domain1);
  ASSERT(typeof domain2 === 'string', 'USED_WITH_STRINGS', domain2);

  // Simplify the domains by closing gaps since when we add
  // the domains, the gaps will close according to the
  // smallest interval width in the other domain.
  let domains = domain_closeGapsStr(domain1, domain2);
  domain1 = domains[0];
  domain2 = domains[1];

  let newDomain = '';
  for (let index = 0, len = domain1.length; index < len; index += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain1, index);
    let hi = domain_strDecodeValue(domain1, index + STR_VALUE_SIZE);
    newDomain += _domain_minusRangeStrStr(lo, hi, domain2);
  }

  return newDomain;
}
function _domain_minusNumNumNum(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'THAT_IS_THE_POINT');
  ASSERT(typeof domain2 === 'number', 'THAT_IS_THE_POINT');
  ASSERT(domain1 !== EMPTY && domain2 !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');
  ASSERT(domain_max(domain1) - domain_min(domain2) <= SMALL_MAX_NUM, 'THE_POINTE');

  if (domain1 & ZERO && domain2 & ZERO) return asmdomain_createRangeZeroToMax(domain1);

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
        newDomain |= _domain_minusRangeNumNum(lo, hi, domain2);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return newDomain | _domain_minusRangeNumNum(lo, hi, domain2);
}
function _domain_minusNumStrNum(domain_num, domain_str) {
  ASSERT(typeof domain_num === 'number', 'ONLY_WITH_NUMBERS');
  ASSERT(typeof domain_str !== 'number', 'NOT_WITH_NUMBERS');
  ASSERT(domain_num !== EMPTY && domain_str !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');
  ASSERT(domain_max(domain_num) - domain_min(domain_str) <= SMALL_MAX_NUM, 'THE_POINTE');

  // since any number above the small domain max ends up with negative, which is truncated, use the max of domain1
  if (domain_num & ZERO && domain_min(domain_str) === 0) return asmdomain_createRangeZeroToMax(domain_num);

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
        newDomain |= _domain_minusRangeStrNum(lo, hi, domain_str);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return newDomain | _domain_minusRangeStrNum(lo, hi, domain_str);
}
function _domain_minusRangeNumNum(loi, hii, domain_num) {
  ASSERT(typeof domain_num === 'number', 'THAT_IS_THE_POINT');
  ASSERT(domain_num !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');

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
        newDomain |= _domain_minusRangeRangeNum(loi, hii, lo, hi);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return newDomain | _domain_minusRangeRangeNum(loi, hii, lo, hi);
}
function _domain_minusStrNumStr(domain_str, domain_num) {
  ASSERT(typeof domain_str !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof domain_num === 'number', 'ONLY_USED_WITH_NUMBERS');

  // optimize an easy path: if both domains contain zero the
  // result will always be [0, max(domain1)], because:
  // d1-d2 = [lo1-hi2, hi1-lo2] -> [0-hi2, hi1-0] -> [0, hi1]
  if (domain_min(domain_str) === 0 && domain_min(domain_num) === 0) {
    return domain_createRange(0, domain_max(domain_str));
  }

  let newDomain = '';
  for (let index = 0, len = domain_str.length; index < len; index += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain_str, index);
    let hi = domain_strDecodeValue(domain_str, index + STR_VALUE_SIZE);
    newDomain += _domain_minusRangeNumStr(lo, hi, domain_num);
  }

  return newDomain;
}
function _domain_minusRangeNumStr(loi, hii, domain_num) {
  ASSERT(typeof domain_num === 'number', 'THAT_IS_THE_POINT');
  if (domain_num === EMPTY) return EMPTY;

  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain_num & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;
  let newDomain = '';
  while (flagValue <= domain_num && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain_num) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        newDomain += _domain_minusRangeRangeStr(loi, hii, lo, hi);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return newDomain + _domain_minusRangeRangeStr(loi, hii, lo, hi);
}
function _domain_minusRangeStrStr(loi, hii, domain_str) {
  ASSERT(typeof domain_str !== 'number', 'NOT_USED_WITH_NUMBERS');
  let newDomain = '';
  for (let index = 0, len = domain_str.length; index < len; index += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain_str, index);
    let hi = domain_strDecodeValue(domain_str, index + STR_VALUE_SIZE);
    newDomain += _domain_minusRangeRangeStr(loi, hii, lo, hi);
  }
  return newDomain;
}
function _domain_minusRangeStrNum(loi, hii, domain_str) {
  ASSERT(typeof domain_str !== 'number', 'NOT_USED_WITH_NUMBERS');
  let newDomain = EMPTY;
  for (let index = 0, len = domain_str.length; index < len; index += STR_RANGE_SIZE) {
    let lo = domain_strDecodeValue(domain_str, index);
    let hi = domain_strDecodeValue(domain_str, index + STR_VALUE_SIZE);
    newDomain |= _domain_minusRangeRangeNum(loi, hii, lo, hi);
  }
  return newDomain;
}
function _domain_minusRangeRangeStr(loi, hii, loj, hij) {
  let hi = hii - loj;
  if (hi >= SUB) { // silently ignore results that are OOB
    let lo = MAX(SUB, loi - hij);
    return domain_strEncodeRange(lo, hi);
  }
  return '';
}
function _domain_minusRangeRangeNum(loi, hii, loj, hij) {
  let hi = hii - loj;
  if (hi >= SUB) { // silently ignore results that are OOB
    let lo = MAX(SUB, loi - hij);
    ASSERT(lo <= SMALL_MAX_NUM, 'RESULT_SHOULD_NOT_EXCEED_SMALL_DOMAIN');
    ASSERT(hi <= SMALL_MAX_NUM, 'RESULT_SHOULD_NOT_EXCEED_SMALL_DOMAIN');
    return asmdomain_createRange(lo, hi);
  }
  return EMPTY;
}

// BODY_STOP

export default domain_minus;
