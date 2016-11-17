import expect from '../fixtures/mocha_proxy.fixt';
import {
  domain__debug,
  domain_anyToSmallest,
  domain_toSmallest,
  domain_arrToSmallest,
  domain_toArr,
  domain_toStr,
} from '../../src/domain';

const SUB = 0;
const SUP = 100000000;
const SMALL_MAX_NUM = 30;
const SOLVED_FLAG = 1 << 31 >>> 0;

function fixt_arrdom_range(lo, hi) {
  if (arguments.length !== 2) throw new Error('fixme');
  if (typeof lo !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }
  if (typeof hi !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }

  return [lo, hi];
}
function fixt_arrdom_ranges(...ranges) {
  let arr = [];
  ranges.forEach(function(range) {
    if (!(range instanceof Array)) {
      throw new Error('Expecting each range to be an array');
    }
    if (range.length !== 2) {
      throw new Error('Expecting each range to be [lo,hi]');
    }
    if (typeof range[0] !== 'number') {
      throw new Error('Expecting ranges to be numbers');
    }
    if (typeof range[1] !== 'number') {
      throw new Error('Expecting ranges to be numbers');
    }
    return arr.push(range[0], range[1]);
  });

  if (arr[0] >= 0 && arr[arr.length-1] <= SMALL_MAX_NUM) throw new Error('NEED_TO_UPDATE_TO_SMALL_DOMAIN ['+arr+']');

  // hack. makes sure the DOMAIN_CHECK test doesnt trigger a fail for adding that property...
  return arr;
}
function fixt_arrdom_solved(value) {
  if (arguments.length !== 1) throw new Error('fixme');

  if (typeof value !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }
  return fixt_arrdom_range(value, value);
}
function fixt_arrdom_empty(no) {
  let A = [];
  if (!no) A.__skipEmptyCheck = true; // circumvents certain protections
  return A;
}
function fixt_arrdom_nums(...list) {
  if (!list.length) return [];
  list.sort((a, b) => a - b); // note: default sort is lexicographic!

  let domain = [];
  let hi;
  let lo;
  for (let index = 0; index < list.length; index++) {
    let value = list[index];
    ASSERT(typeof value === 'number', 'fd values are numbers');
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
  return domain;
}

function fixt_numdom_nums(...values) {
  let d = 0;
  for (let i = 0; i < values.length; ++i) {
    if (typeof values[i] !== 'number') throw new Error('EXPECTING_NUMBERS_ONLY ['+values[i]+']');
    if (values[i] < 0 || values[i] > SMALL_MAX_NUM) throw new Error('EXPECTING_SMALL_DOMAIN_VALUES ['+values[i]+']');
    d |= 1 << values[i];
  }
  return d;
}
function fixt_numdom_range(lo, hi, _b) {
  if (_b !== undefined) throw new Error('BAD_THIRD_ARG');
  if (typeof lo !== 'number') throw new Error('LO_MUST_BE_NUMBER');
  if (typeof hi !== 'number') throw new Error('HI_MUST_BE_NUMBER');
  if (lo < 0 || hi > SMALL_MAX_NUM) throw new Error('OOB_FOR_SMALL_DOMAIN ['+lo+','+hi+']');
  let d = 0;
  for (; lo <= hi; ++lo) {
    d |= 1 << lo;
  }
  return d;
}
function fixt_numdom_ranges(...ranges) {
  return ranges.reduce((domain, range) => domain | fixt_numdom_range(...range), 0);
}
function fixt_numdom_empty() {
  return 0; // magic value yo. no flags means zero
}
function fixt_numdom_solved(num) {
  if (arguments.length !== 1) throw new Error('INVALID_PARAM_FIX_TEST');
  if (num < SUB || num > SUP) throw new Error('SOLVED_NUM_MUST_BE_SUBSUP_BOUND');
  return (num | SOLVED_FLAG) >>> 0; // num|flag could lead to negative value without the >>>
}

function fixt_strdom_empty() {
  return '';
}
function fixt_strdom_value(value) {
  return String.fromCharCode((value >>> 16) & 0xffff, value & 0xffff, (value >>> 16) & 0xffff, value & 0xffff);
}
function fixt_strdom_range(lo, hi) {
  return String.fromCharCode((lo >>> 16) & 0xffff, lo & 0xffff, (hi >>> 16) & 0xffff, hi & 0xffff);
}
function fixt_strdom_ranges(...ranges) {
  return ranges.map(([lo,hi]) => fixt_strdom_range(lo, hi)).join('');
}
function fixt_strdom_nums(...nums) {
  if (!nums.length) return '';

  nums.sort((a, b) => a - b); // note: default sort is lexicographic!

  let s  = '';
  let lo;
  let hi;
  for (let i = 0; i < nums.length; ++i) {
    if (i === 0) {
      lo = hi = nums[i];
    } else if (nums[i] === hi + 1) {
      hi = nums[i];
    } else if (nums[i] > hi + 1) {
      s += fixt_strdom_range(lo, hi);
      lo = hi = nums[i];
    } else {
      throw new Error('NUMS_SHOULD_BE_UNIQUE [' + nums + ']');
    }
  }

  s += fixt_strdom_range(lo, hi);

  return s;
}
function fixt_bytes(str, desc) {
  expect(typeof str, desc).to.eql('string');
  return [].map.call(str, s => s.charCodeAt(0)).join(', ');
}

function fixt_dom_empty() {
  return 0;
}
function fixt_dom_range(lo, hi) {
  if (arguments.length !== 2) throw new Error('Bad arg count');
  if (typeof lo !== 'number') throw new Error('lo must be number');
  if (typeof hi !== 'number') throw new Error('hi must be number');
  if (!(lo <= hi)) throw new Error('should be lo <= hi');
  if (lo === hi) return fixt_numdom_solved(lo);
  if (hi <= SMALL_MAX_NUM) return fixt_numdom_range(lo, hi);
  return fixt_strdom_range(lo, hi);
}
function fixt_dom_ranges(...ranges) {
  if (ranges.length === 0) throw new Error('No ranges? Probably test bug');
  if (ranges.length === 1 && ranges[0][0] === ranges[0][1]) return fixt_numdom_solved(ranges[0][0]);
  if (ranges[ranges.length-1][1] <= SMALL_MAX_NUM) return fixt_numdom_ranges(...ranges);
  return fixt_strdom_ranges(...ranges);
}
function fixt_dom_nums(...nums) {
  if (nums[0] instanceof Array) throw new Error('you forgot to splat the argument');
  nums.sort((a, b) => a - b);
  if (nums.length === 0) throw new Error('No nums? Probably test bug');
  if (nums.length === 1) return fixt_numdom_solved(nums[0]);
  if (nums[nums.length - 1] <= SMALL_MAX_NUM) return fixt_numdom_nums(...nums);
  return fixt_strdom_nums(...nums);
}
function fixt_dom_solved(value) {
  if (typeof value !== 'number') throw new Error('Bad arg');
  if (arguments.length !== 1) throw new Error('Bad arg');
  return fixt_numdom_solved(value);
}

function stripAnonVars(solution) {
  for (let name in solution) {
    if ('__'+String(parseFloat(name.slice(2)))+'__' === name) { // only true of name is a number
      delete solution[name];
    }
  }
  return solution;
}

function stripAnonVarsFromArrays(solutions) {
  for (let i = 0; i < solutions.length; i++) {
    let solution = solutions[i];
    stripAnonVars(solution);
  }
  return solutions;
}

function ASSERT(b, d) {
  if (!b) throw new Error(d);
}

function fixt_assertStrings(a, b, desc) {
  expect(fixt_bytes(a, desc), desc).to.eql(fixt_bytes(b, desc));
}

/**
 * Assert two domains to be equal, regardless of their individual
 * representation (numdom, soldom, strdom, arrdom). This helps to
 * keep integration tests clean from unit tests that check for
 * normalization of function return values. For example the
 * propagators should just check the result value, not whether it
 * returns a soldom in certain edge cases but not others.
 *
 * @param {$domain} result
 * @param {$domain} expectation
 * @param {string} [desc]
 */
function fixt_domainEql(result, expectation, desc) {
  desc = `${desc || ''} comparing but ignoring representation; result: ${domain__debug(result)} expected: ${domain__debug(expectation)}`;
  expect(domain_anyToSmallest(result), desc).to.eql(domain_anyToSmallest(expectation));
}

/**
 * @param {$domain} domain
 * @param {string} [force] Always return in array or string form?
 * @returns {$domain}
 */
function fixt_dom_clone(domain, force) {
  if (force === 'array') return domain_toArr(domain, true);
  if (force === 'string') return domain_toStr(domain);
  return domain;
}

export {
  fixt_arrdom_empty,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_arrdom_solved,
  fixt_arrdom_nums,
  fixt_dom_clone,
  fixt_dom_empty,
  fixt_dom_nums,
  fixt_dom_range,
  fixt_dom_ranges,
  fixt_dom_solved,
  fixt_assertStrings,
  fixt_bytes,
  fixt_domainEql,
  fixt_numdom_empty,
  fixt_numdom_nums,
  fixt_numdom_range,
  fixt_numdom_ranges,
  fixt_numdom_solved,
  fixt_strdom_empty,
  fixt_strdom_value,
  fixt_strdom_range,
  fixt_strdom_ranges,
  fixt_strdom_nums,
  stripAnonVars,
  stripAnonVarsFromArrays,
};
