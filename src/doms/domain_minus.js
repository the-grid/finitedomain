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
  ASSERT_DOMAIN,
} from '../helpers';
import {
  PAIR_SIZE,
  SMALL_MAX_NUM,
  ZERO,

  domain_addRangeNum,
  domain_closeGapsArr,
  domain_createRange,
  domain_createRangeZeroToMax,
  domain_max,
  domain_min,
  domain_simplifyInlineArr,
} from '../domain';

let MAX = Math.max;

// BODY_START

/**
 * Does not harm input domains
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {$domain}
 */
function domain_minus(domain1, domain2) {
  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';

  if (isNum1) {
    // note: if domain1 is a small domain the result is always a small domain
    if (isNum2) return _domain_minusNumNumNum(domain1, domain2);
    return _domain_minusNumArrNum(domain1, domain2);
  }

  let result;
  if (isNum2) result = _domain_minusArrNum(domain1, domain2); // cannot swap minus args!
  else result = _domain_minusArrArr(domain1, domain2);

  domain_simplifyInlineArr(result);

  return result;
}
function _domain_minusArrArr(domain1, domain2) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS', domain1);
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS', domain2);
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT(domain1 && domain2, 'A_EXPECTING_TWO_DOMAINS');

  // optimize an easy path: if both domains contain zero the
  // result will always be [0, max(domain1)], because:
  // d1-d2 = [lo1-hi2, hi1-lo2] -> [0-hi2, hi1-0] -> [0, hi1]
  if (domain_min(domain1) === 0 && domain_min(domain2) === 0) {
    return domain_createRange(0, domain_max(domain1));
  }

  // Simplify the domains by closing gaps since when we add
  // the domains, the gaps will close according to the
  // smallest interval width in the other domain.
  let domains = domain_closeGapsArr(domain1, domain2);
  domain1 = domains[0];
  domain2 = domains[1];

  let result = [];
  for (let index = 0, step = PAIR_SIZE; index < domain1.length; index += step) {
    _domain_minusRangeArr(domain1[index], domain1[index + 1], domain2, result);
  }

  return result;
}
function _domain_minusNumNumNum(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'THAT_IS_THE_POINT');
  ASSERT(typeof domain2 === 'number', 'THAT_IS_THE_POINT');
  ASSERT(domain1 !== EMPTY && domain2 !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');
  ASSERT(domain_max(domain1) - domain_min(domain2) <= SMALL_MAX_NUM, 'THE_POINTE');

  if (domain1 & ZERO && domain2 & ZERO) return domain_createRangeZeroToMax(domain1);

  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain1 & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;

  let domain = EMPTY;
  while (flagValue <= domain1 && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain1) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        domain = _domain_minusRangeNumNum(lo, hi, domain2, domain);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return _domain_minusRangeNumNum(lo, hi, domain2, domain);
}
function _domain_minusNumArrNum(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'ONLY_WITH_NUMBERS');
  ASSERT(typeof domain2 !== 'number', 'NOT_WITH_NUMBERS');
  ASSERT(domain1 !== EMPTY && domain2 !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');
  ASSERT(domain_max(domain1) - domain_min(domain2) <= SMALL_MAX_NUM, 'THE_POINTE');

  // since any number above the small domain max ends up with negative, which is truncated, use the max of domain1
  if (domain1 & ZERO && domain_min(domain2) === 0) return domain_createRangeZeroToMax(domain1);

  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain1 & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;

  let domain = EMPTY;
  while (flagValue <= domain1 && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain1) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        domain = _domain_minusRangeArrNum(lo, hi, domain2, domain);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return _domain_minusRangeArrNum(lo, hi, domain2, domain);
}
function _domain_minusRangeNumNum(loi, hii, domain2, domain) {
  ASSERT(typeof domain2 === 'number', 'THAT_IS_THE_POINT');
  ASSERT(typeof domain === 'number', 'OUTPUTTING_INTO_NUMBER');
  ASSERT(domain2 !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');

  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain2 & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;

  while (flagValue <= domain2 && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain2) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        domain = _domain_minusRangeRangeNum(loi, hii, lo, hi, domain);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  return _domain_minusRangeRangeNum(loi, hii, lo, hi, domain);
}
function _domain_minusArrNum(domain1, domain2) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof domain2 === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain1);

  // optimize an easy path: if both domains contain zero the
  // result will always be [0, max(domain1)], because:
  // d1-d2 = [lo1-hi2, hi1-lo2] -> [0-hi2, hi1-0] -> [0, hi1]
  if (domain_min(domain1) === 0 && domain_min(domain2) === 0) {
    return domain_createRange(0, domain_max(domain1));
  }

  let result = [];
  for (let index = 0, step = PAIR_SIZE; index < domain1.length; index += step) {
    _domain_minusRangeNum(domain1[index], domain1[index + 1], domain2, result);
  }

  return result;
}
function _domain_minusRangeNum(loi, hii, domain, result) {
  ASSERT(typeof domain === 'number', 'THAT_IS_THE_POINT');
  if (domain === EMPTY) return;


  let flagIndex = 0;
  // find the first set bit. must find something because small domain and not empty
  while ((domain & (1 << flagIndex)) === 0) ++flagIndex;

  let lo = flagIndex;
  let hi = flagIndex;

  let flagValue = 1 << ++flagIndex;

  while (flagValue <= domain && flagIndex <= SMALL_MAX_NUM) {
    if ((flagValue & domain) > 0) {
      if (hi !== flagIndex - 1) { // there's a gap so push prev range now
        _domain_minusRangeRange(loi, hii, lo, hi, result);
        lo = flagIndex;
      }
      hi = flagIndex;
    }

    flagValue = 1 << ++flagIndex;
  }

  _domain_minusRangeRange(loi, hii, lo, hi, result);
}
function _domain_minusRangeArr(loi, hii, domain2, result) {
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS');
  for (let index2 = 0, step1 = PAIR_SIZE; index2 < domain2.length; index2 += step1) {
    _domain_minusRangeRange(loi, hii, domain2[index2], domain2[index2 + 1], result);
  }
}
function _domain_minusRangeArrNum(loi, hii, domain2, result) {
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS');
  for (let index2 = 0, step1 = PAIR_SIZE; index2 < domain2.length; index2 += step1) {
    result = _domain_minusRangeRangeNum(loi, hii, domain2[index2], domain2[index2 + 1], result);
  }
  return result;
}
function _domain_minusRangeRange(loi, hii, loj, hij, result) {
  let hi = hii - loj;
  if (hi >= SUB) { // silently ignore results that are OOB
    let lo = MAX(SUB, loi - hij);
    result.push(lo, hi);
  }
}
function _domain_minusRangeRangeNum(loi, hii, loj, hij, domain) {
  let hi = hii - loj;
  if (hi >= SUB) { // silently ignore results that are OOB
    let lo = MAX(SUB, loi - hij);
    ASSERT(lo <= SMALL_MAX_NUM, 'RESULT_SHOULD_NOT_EXCEED_SMALL_DOMAIN');
    ASSERT(hi <= SMALL_MAX_NUM, 'RESULT_SHOULD_NOT_EXCEED_SMALL_DOMAIN');
    return domain_addRangeNum(domain, lo, hi);
  }
  return domain;
}

// BODY_STOP

export default domain_minus;
