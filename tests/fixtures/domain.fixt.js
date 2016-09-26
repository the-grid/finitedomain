import expect from '../fixtures/mocha_proxy.fixt';

const SUB = 0;
const SUP = 100000000;
const SMALL_MAX_FLAG = (1 << 30) - 1; // there are n flags. if they are all on, this is the number value
const SMALL_MAX_NUM = 30;
const SOLVED_FLAG = 1 << 31 >>> 0;

function fixt_arrdom_range(lo, hi, _b) {
  if (_b !== true && lo >= 0 && hi <= SMALL_MAX_NUM) throw new Error('NEED_TO_UPDATE_TO_SMALL_DOMAIN');

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
function fixt_arrdom_value(value, _b) {
  if (_b !== true && _b !== undefined) throw new Error('ILLEGAL_SECOND_ARG');
  if (_b !== true && value >= 0 && value <= SMALL_MAX_NUM) throw new Error('NEED_TO_UPDATE_TO_SMALL_DOMAIN');

  if (typeof value !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }
  return fixt_arrdom_range(value, value, _b);
}
function fixt_arrdom_list(list) {
  let arr = [];
  list.forEach(value => {
    if (value >= 0 && value <= SMALL_MAX_NUM) throw new Error('NEED_TO_UPDATE_TO_SMALL_DOMAIN');
    arr.push(value, value)
  });
  return arr;
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

const ZERO = 1 << 0;
const ONE = 1 << 1;
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
  TWENTYNINE, THIRTY
];

function fixt_numdom_nums(...values) {
  let d = 0;
  for (let i = 0; i < values.length; ++i) {
    if (typeof values[i] !== 'number') throw new Error('EXPECTING_NUMBERS_ONLY ['+values[i]+']');
    if (values[i] < 0 || values[i] > SMALL_MAX_NUM) throw new Error('EXPECTING_SMALL_DOMAIN_VALUES ['+values[i]+']');
    d |= NUM_TO_FLAG[values[i]];
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
    d |= NUM_TO_FLAG[lo];
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


function stripAnonVars(solution) {
  for (let name in solution) {
    if (String(parseFloat(name)) === name) { // only true of name is a number
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

export {
  fixt_arrdom_empty,
  fixt_arrdom_list,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_arrdom_value,
  fixt_arrdom_nums,
  fixt_assertStrings,
  fixt_numdom_empty,
  fixt_numdom_nums,
  fixt_numdom_range,
  fixt_numdom_ranges,
  fixt_numdom_solved,
  fixt_bytes,
  fixt_strdom_empty,
  fixt_strdom_value,
  fixt_strdom_range,
  fixt_strdom_ranges,
  fixt_strdom_nums,
  stripAnonVars,
  stripAnonVarsFromArrays,
};
