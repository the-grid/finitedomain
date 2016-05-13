const SUP = 100000;

function specDomainCreateRange(lo, hi) {
  if (typeof lo !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }
  if (typeof hi !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }
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

  // hack. makes sure the DOMAIN_CHECK test doesnt trigger a fail for adding that property...
  return arr;
}
function specDomainCreateValue(value) {
  if (typeof value !== 'number') {
    throw new Error('specDomainCreateValue requires a number');
  }
  return specDomainCreateRanges([value, value]);
}
function specDomainCreateList(list) {
  let arr = [];
  list.forEach(value => arr.push(value, value));
  return arr;
}
function specDomainCreateZero() {
  return specDomainCreateRange(0, 0);
}
function specDomainCreateOne() {
  return specDomainCreateRange(1, 1);
}
function specDomainCreateFull() {
  return specDomainCreateRange(0, SUP);
}
function specDomainCreateBool() {
  return specDomainCreateRange(0, 1);
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
    d |= NUMBER[values[i]];
  }
  return d;
}
function specDomainSmallRange(lo, hi) {
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

export {
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateValue,
  specDomainCreateList,
  specDomainCreateZero,
  specDomainCreateOne,
  specDomainCreateFull,
  specDomainCreateBool,
  specDomainSmallEmpty,
  specDomainSmallNums,
  specDomainSmallRange,
  stripAnonVars,
  stripAnonVarsFromArrays,
};
