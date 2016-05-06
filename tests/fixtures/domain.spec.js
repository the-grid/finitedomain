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
    if (range instanceof Array) {
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
  stripAnonVars,
  stripAnonVarsFromArrays,
};
