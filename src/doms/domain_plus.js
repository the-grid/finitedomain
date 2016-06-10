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
  SUP,

  ASSERT,
  ASSERT_DOMAIN,
} from '../helpers';
import {
  ZERO,
  ONE,
  TWO,
  THREE,
  FOUR,
  EIGHT,
  NINE,
  NUM_TO_FLAG,

  PAIR_SIZE,
  SMALL_MAX_NUM,

  domain_addRangeNum,
  domain_closeGapsArr,
  domain_max,
  domain_simplifyInlineArr,
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
function domain_plus(domain1, domain2) {
  let isNum1 = typeof domain1 === 'number';
  let isNum2 = typeof domain2 === 'number';

  let result;
  if (isNum1 && isNum2) {
    result = _domain_plusNumNum(domain1, domain2);
    if (typeof result === 'number') return result;
  } else {
    result = [];
    if (isNum1) _domain_plusNumArr(domain1, domain2, result);
    else if (isNum2) _domain_plusNumArr(domain2, domain1, result); // swapped domains!
    else _domain_plusArrArr(domain1, domain2, result);
  }

  domain_simplifyInlineArr(result);

  return result;
}
function _domain_plusArrArr(domain1, domain2, result) {
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
    _domain_plusRangeArr(domain1[index], domain1[index + 1], domain2, result);
  }
}
function _domain_plusWillBeSmall(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'ONLY_WITH_NUMBERS');
  ASSERT(typeof domain2 === 'number', 'ONLY_WITH_NUMBERS');
  // if both domains are small enough they cannot add to a domain beyond the max
  if (domain1 < NINE && domain2 < EIGHT) return true; // this shortcut catches most cases
  return domain_max(domain1) + domain_max(domain2) <= SMALL_MAX_NUM; // if max changes, update above too!
}
function _domain_plusNumNum(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'ONLY_WITH_NUMBERS');
  ASSERT(typeof domain2 === 'number', 'ONLY_WITH_NUMBERS');
  if (domain1 === EMPTY) return EMPTY;
  if (domain2 === EMPTY) return EMPTY;

  // if the highest number in the result is below the max of a small
  // domain we can take a fast path for it. this case happens often.
  if (_domain_plusWillBeSmall(domain1, domain2)) {
    return _domain_plusNumNumNum(domain1, domain2);
  }

  let result = [];

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
      _domain_plusRangeNum(0, 0, domain2, result);
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
      _domain_plusRangeNum(lo, hi, domain2, result);
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
          _domain_plusRangeNum(lo, hi, domain2, result);
          lo = i;
        }
        hi = i;
      }
    }
  }
  _domain_plusRangeNum(lo, hi, domain2, result);

  return result;
}
function _domain_plusNumNumNum(domain1, domain2) {
  ASSERT(typeof domain1 === 'number', 'THAT_IS_THE_POINT');
  ASSERT(typeof domain2 === 'number', 'THAT_IS_THE_POINT');
  ASSERT(domain1 !== EMPTY && domain2 !== EMPTY, 'SHOULD_BE_CHECKED_ELSEWHERE');
  ASSERT(domain_max(domain1) + domain_max(domain2) <= SMALL_MAX_NUM, 'THE_POINTE');

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
      domain = _domain_plusRangeNumNum(0, 0, domain2, domain);
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
      domain = _domain_plusRangeNumNum(lo, hi, domain2, domain);
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
          domain = _domain_plusRangeNumNum(lo, hi, domain2, domain);
          lo = i;
        }
        hi = i;
      }
    }
  }
  return _domain_plusRangeNumNum(lo, hi, domain2, domain);
}
function _domain_plusRangeNumNum(loi, hii, domain, result) {
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
      result = _domain_plusRangeRangeNum(loi, hii, 0, 0, result);
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
      result = _domain_plusRangeRangeNum(loi, hii, lo, hi, result);
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
          result = _domain_plusRangeRangeNum(loi, hii, lo, hi, result);
          lo = i;
        }
        hi = i;
      }
    }
  }
  return _domain_plusRangeRangeNum(loi, hii, lo, hi, result);
}
function _domain_plusNumArr(domain1, domain2, result) {
  ASSERT(typeof domain1 === 'number', 'THAT_IS_THE_POINT');
  if (domain1 === EMPTY) return;

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
      _domain_plusRangeArr(0, 0, domain2, result);
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
      _domain_plusRangeArr(lo, hi, domain2, result);
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
          _domain_plusRangeArr(lo, hi, domain2, result);
          lo = i;
        }
        hi = i;
      }
    }
  }
  _domain_plusRangeArr(lo, hi, domain2, result);
}
function _domain_plusRangeNum(loi, hii, domain, result) {
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
      _domain_plusRangeRange(loi, hii, 0, 0, result);
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
      _domain_plusRangeRange(loi, hii, lo, hi, result);
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
          _domain_plusRangeRange(loi, hii, lo, hi, result);
          lo = i;
        }
        hi = i;
      }
    }
  }
  _domain_plusRangeRange(loi, hii, lo, hi, result);
}
function _domain_plusRangeArr(loi, hii, domain2, result) {
  ASSERT(typeof domain2 !== 'number', 'NOT_USED_WITH_NUMBERS');
  for (let index2 = 0, step1 = PAIR_SIZE; index2 < domain2.length; index2 += step1) {
    _domain_plusRangeRange(loi, hii, domain2[index2], domain2[index2 + 1], result);
  }
}
function _domain_plusRangeRange(loi, hii, loj, hij, result) {
  ASSERT(loi + loj >= 0, 'DOMAINS_SHOULD_NOT_HAVE_NEGATIVES');
  let lo = loi + loj;
  if (lo <= SUP) { // if lo exceeds SUP the resulting range is completely OOB and we ignore it.
    let hi = MIN(SUP, hii + hij);
    result.push(lo, hi);
  }
}
function _domain_plusRangeRangeNum(loi, hii, loj, hij, domain) {
  ASSERT(loi + loj >= 0, 'DOMAINS_SHOULD_NOT_HAVE_NEGATIVES');
  ASSERT(loi + loj <= SMALL_MAX_NUM, 'RESULT_SHOULD_NOT_EXCEED_SMALL_DOMAIN');
  ASSERT(hii + hij <= SMALL_MAX_NUM, 'RESULT_SHOULD_NOT_EXCEED_SMALL_DOMAIN');
  return domain_addRangeNum(domain, loi + loj, hii + hij);
}

// BODY_STOP

export default domain_plus;
