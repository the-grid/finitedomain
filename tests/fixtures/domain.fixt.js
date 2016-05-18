const SUB = 0;
const SUP = 100000000;

function specDomainCreateRange(lo, hi, _b) {
  if (_b !== true && lo >= 0 && hi <= 15) throw new Error('NEED_TO_UPDATE_TO_SMALL_DOMAIN');

  if (typeof lo !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }
  if (typeof hi !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }

  return [lo, hi];
  return specDomainCreateRanges([lo, hi]);
}
function specDomainCreateRanges(...ranges) {
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

  if (arr[0] >= 0 && arr[arr.length-1] <= 15) throw new Error('NEED_TO_UPDATE_TO_SMALL_DOMAIN ['+arr+']');

  // hack. makes sure the DOMAIN_CHECK test doesnt trigger a fail for adding that property...
  return arr;
}
function specDomainCreateValue(value, _b) {
  if (_b !== true && _b !== undefined) throw new Error('ILLEGAL_SECOND_ARG');
  if (_b !== true && value >= 0 && value <= 15) throw new Error('NEED_TO_UPDATE_TO_SMALL_DOMAIN');

  if (typeof value !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }
  return specDomainCreateRange(value, value, _b);
}
function specDomainCreateList(list) {
  let arr = [];
  list.forEach(value => {
    if (value >= 0 && value <= 15) throw new Error('NEED_TO_UPDATE_TO_SMALL_DOMAIN');
    arr.push(value, value)
  });
  return arr;
}
function specDomainCreateEmpty(no) {
  let A = [];
  if (!no) A.__skipEmptyCheck = true; // circumvents certain protections
  return A;
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
const NUMBER = [ZERO, ONE, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, ELEVEN, TWELVE, THIRTEEN, FOURTEEN, FIFTEEN];
function specDomainSmallNums(...values) {
  let d = 0;
  for (let i = 0; i < values.length; ++i) {
    if (typeof values[i] !== 'number') throw new Error('EXPECTING_NUMBERS_ONLY ['+values[i]+']');
    if (values[i] < 0 || values[i] > 15) throw new Error('EXPECTING_SMALL_DOMAIN_VALUES ['+values[i]+']');
    d |= NUMBER[values[i]];
  }
  return d;
}
function specDomainSmallRange(lo, hi) {
  if (typeof lo !== 'number') throw new Error('LO_MUST_BE_NUMBER');
  if (typeof hi !== 'number') throw new Error('HI_MUST_BE_NUMBER');
  if (lo < 0 || hi > 15) throw new Error('OOB_FOR_SMALL_DOMAIN');
  let d = 0;
  for (; lo <= hi; ++lo) {
    d |= NUMBER[lo];
  }
  return d;
}
function specDomainSmallEmpty() {
  return 0; // magic value yo. no flags means zero
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

function specCreateFdvarRange(id, lo, hi) {
  ASSERT(typeof id === 'string', 'ID_SHOULD_BE_STRING['+id+']');
  ASSERT(typeof lo === 'number', 'LO_SHOULD_BE_NUMBER['+lo+']');
  ASSERT(typeof hi === 'number', 'HI_SHOULD_BE_NUMBER['+hi+']');
  ASSERT(lo >= SUB && hi <= SUP && lo <= hi, 'RANGE_SHOULD_BE_PROPERLY_BOUND_AND_ORDERED['+lo+','+hi+']');

  return {
    _class: 'fdvar',
    id,
    dom: hi <= 15 ? specDomainSmallRange(lo, hi) : specDomainCreateRange(lo ,hi),
  };
}

function ASSERT(b, d) {
  if (!b) throw new Error(d);
}

export {
  specCreateFdvarRange,
  specDomainCreateEmpty,
  specDomainCreateList,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateValue,
  specDomainSmallEmpty,
  specDomainSmallNums,
  specDomainSmallRange,
  stripAnonVars,
  stripAnonVarsFromArrays,
};
