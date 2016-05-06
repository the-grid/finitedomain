const SUP = 100000;

function spec_d_create_range(lo, hi) {
  if (typeof lo !== 'number') {
    throw new Error('spec_d_create_value requires a number');
  }
  if (typeof hi !== 'number') {
    throw new Error('spec_d_create_value requires a number');
  }
  return spec_d_create_ranges([lo, hi]);
}
function spec_d_create_ranges(...ranges) {
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
function spec_d_create_value(value) {
  if (typeof value !== 'number') {
    throw new Error('spec_d_create_value requires a number');
  }
  return spec_d_create_ranges([value, value]);
}
function spec_d_create_list(list) {
  let arr = [];
  list.forEach(value => arr.push(value, value));
  return arr;
}
function spec_d_create_zero() {
  return spec_d_create_range(0, 0);
}
function spec_d_create_one() {
  return spec_d_create_range(1, 1);
}
function spec_d_create_full() {
  return spec_d_create_range(0, SUP);
}
function spec_d_create_bool() {
  return spec_d_create_range(0, 1);
}

function strip_anon_vars(solution) {
  for (let name in solution) {
    if (String(parseFloat(name)) === name) { // only true of name is a number
      delete solution[name];
    }
  }
  return solution;
}

function strip_anon_vars_a(solutions) {
  for (let i = 0; i < solutions.length; i++) {
    let solution = solutions[i];
    strip_anon_vars(solution);
  }
  return solutions;
}

export {
  spec_d_create_range,
  spec_d_create_ranges,
  spec_d_create_value,
  spec_d_create_list,
  spec_d_create_zero,
  spec_d_create_one,
  spec_d_create_full,
  spec_d_create_bool,
  strip_anon_vars,
  strip_anon_vars_a,
};
