// This file only concerns itself with subtracting two domains
// The algorithm is conceptually simple but the support
// for both array and numbered domains makes it a little
// bloated. However, since it saves significant we do it
// anyways.

// Conceptually: range1-range2 = [lo1-hi2, hi1-lo2]
// [5, 10] - [20, 30]
// [5-30, 30-5] -> [-25, 25] --> [0, 25]


import {
  EMPTY,
  SUB,

  ASSERT,
  ASSERT_DOMAIN,
} from '../helpers';
import {
  ZERO,
  ONE,
  TWO,
  THREE,
  FOUR,
  NUM_TO_FLAG,

  PAIR_SIZE,
  SMALL_MAX_NUM,

  domain_addRangeNum,
  domain_closeGapsArr,
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

  let result = [];
  if (isNum2) _domain_minusArrNum(domain1, domain2, result); // cannot swap minus args!
  else _domain_minusArrArr(domain1, domain2, result);

  domain_simplifyInlineArr(result);

  return result;
}
function _domain_minusArrArr(domain1, domain2, result) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS', domain1);
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS', domain2);
  ASSERT_DOMAIN(domain1);
  ASSERT_DOMAIN(domain2);
  ASSERT(domain1 && domain2, 'A_EXPECTING_TWO_DOMAINS');

  // Simplify the domains by closing gaps since when we add
  // the domains, the gaps will close according to the
  // smallest interval width in the other domain.
  let domains = domain_closeGapsArr(domain1, domain2);
  domain1 = domains[0];
  domain2 = domains[1];

  for (let index = 0, step = PAIR_SIZE; index < domain1.length; index += step) {
    _domain_minusRangeArr(domain1[index], domain1[index + 1], domain2, result);
  }
}
function _domain_minusNumNumNum(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'THAT_IS_THE_POINT');
  ASSERT(typeof domain2 === 'number', 'THAT_IS_THE_POINT');
  ASSERT(domain1 !== EMPTY && domain2 !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');
  ASSERT(domain_max(domain1) - domain_min(domain2) <= SMALL_MAX_NUM, 'THE_POINTE');

  let domain = EMPTY;
  let lo = -1;
  let hi = -1;

  if (ZERO & domain1) {
    lo = 0;
    hi = 0;
  }
  if (ONE & domain1) {
    if (lo !== 0) { // lo is either 0 or nothing
      lo = 1;
    }
    hi = 1; // there cannot be a gap yet
  }
  if (TWO & domain1) {
    if (hi === 0) {
      domain = _domain_minusRangeNumNum(0, 0, domain2, domain);
      lo = 2;
    } else if (hi !== 1) {
      // if hi isnt 0 and hi isnt 1 then hi isnt set and so lo isnt set
      lo = 2;
    }
    hi = 2;
  }
  if (THREE & domain1) {
    if (hi < 0) { // this is the LSB that is set
      lo = 3;
    } else if (hi !== 2) { // there's a gap so push prev range now
      domain = _domain_minusRangeNumNum(lo, hi, domain2, domain);
      lo = 3;
    }
    hi = 3;
  }

  if (domain1 >= FOUR) { // is any other bit set?
    // loop it for the rest. "only" about 15% takes this path
    for (let i = 4; i <= SMALL_MAX_NUM; ++i) {
      if (NUM_TO_FLAG[i] & domain1) {
        if (hi < 0) { // this is the LSB that is set
          lo = i;
        } else if (hi !== i - 1) { // there's a gap so push prev range now
          domain = _domain_minusRangeNumNum(lo, hi, domain2, domain);
          lo = i;
        }
        hi = i;
      }
    }
  }
  return _domain_minusRangeNumNum(lo, hi, domain2, domain);
}
function _domain_minusNumArrNum(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'ONLY_WITH_NUMBERS');
  ASSERT(typeof domain2 !== 'number', 'NOT_WITH_NUMBERS');
  ASSERT(domain1 !== EMPTY && domain2 !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');
  ASSERT(domain_max(domain1) - domain_min(domain2) <= SMALL_MAX_NUM, 'THE_POINTE');

  let domain = EMPTY;
  let lo = -1;
  let hi = -1;

  if (ZERO & domain1) {
    lo = 0;
    hi = 0;
  }
  if (ONE & domain1) {
    if (lo !== 0) { // lo is either 0 or nothing
      lo = 1;
    }
    hi = 1; // there cannot be a gap yet
  }
  if (TWO & domain1) {
    if (hi === 0) {
      domain = _domain_minusRangeArrNum(0, 0, domain2, domain);
      lo = 2;
    } else if (hi !== 1) {
      // if hi isnt 0 and hi isnt 1 then hi isnt set and so lo isnt set
      lo = 2;
    }
    hi = 2;
  }
  if (THREE & domain1) {
    if (hi < 0) { // this is the LSB that is set
      lo = 3;
    } else if (hi !== 2) { // there's a gap so push prev range now
      domain = _domain_minusRangeArrNum(lo, hi, domain2, domain);
      lo = 3;
    }
    hi = 3;
  }

  if (domain1 >= FOUR) { // is any other bit set?
    // loop it for the rest. "only" about 15% takes this path
    for (let i = 4; i <= SMALL_MAX_NUM; ++i) {
      if (NUM_TO_FLAG[i] & domain1) {
        if (hi < 0) { // this is the LSB that is set
          lo = i;
        } else if (hi !== i - 1) { // there's a gap so push prev range now
          domain = _domain_minusRangeArrNum(lo, hi, domain2, domain);
          lo = i;
        }
        hi = i;
      }
    }
  }
  return _domain_minusRangeArrNum(lo, hi, domain2, domain);
}
function _domain_minusRangeNumNum(loi, hii, domain, result) {
  ASSERT(typeof domain === 'number', 'THAT_IS_THE_POINT');
  ASSERT(typeof result === 'number', 'OUTPUTTING_INTO_NUMBER');
  ASSERT(domain !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');

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
      result = _domain_minusRangeRangeNum(loi, hii, 0, 0, result);
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
      result = _domain_minusRangeRangeNum(loi, hii, lo, hi, result);
      lo = 3;
    }
    hi = 3;
  }
  if (domain >= FOUR) { // is any other bit set?
    // loop it for the rest. "only" about 15% takes this path
    for (let i = 4; i <= SMALL_MAX_NUM; ++i) {
      if (NUM_TO_FLAG[i] & domain) {
        if (hi < 0) { // this is the LSB that is set
          lo = i;
        } else if (hi !== i - 1) { // there's a gap so push prev range now
          result = _domain_minusRangeRangeNum(loi, hii, lo, hi, result);
          lo = i;
        }
        hi = i;
      }
    }
  }
  return _domain_minusRangeRangeNum(loi, hii, lo, hi, result);
}
function _domain_minusArrNum(domain1, domain2, result) {
  ASSERT(typeof domain1 !== 'number', 'NOT_USED_WITH_NUMBERS');
  ASSERT(typeof domain2 === 'number', 'ONLY_USED_WITH_NUMBERS');
  ASSERT_DOMAIN(domain1);

  for (let index = 0, step = PAIR_SIZE; index < domain1.length; index += step) {
    _domain_minusRangeNum(domain1[index], domain1[index + 1], domain2, result);
  }
}
function _domain_minusRangeNum(loi, hii, domain, result) {
  ASSERT(typeof domain === 'number', 'THAT_IS_THE_POINT');
  if (domain === EMPTY) return;

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
      _domain_minusRangeRange(loi, hii, 0, 0, result);
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
      _domain_minusRangeRange(loi, hii, lo, hi, result);
      lo = 3;
    }
    hi = 3;
  }
  if (domain >= FOUR) { // is any other bit set?
    // loop it for the rest. "only" about 15% takes this path
    for (let i = 4; i <= SMALL_MAX_NUM; ++i) {
      if (NUM_TO_FLAG[i] & domain) {
        if (hi < 0) { // this is the LSB that is set
          lo = i;
        } else if (hi !== i - 1) { // there's a gap so push prev range now
          _domain_minusRangeRange(loi, hii, lo, hi, result);
          lo = i;
        }
        hi = i;
      }
    }
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
