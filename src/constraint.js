// A constraint acts as a abstract model in Config from which
// propagators are generated once a space is created. Constraints
// tend to be more concise and reflect the original intend, whereas
// propagators are low level. One constraint can generate multiple
// propagators to do its work, like how sum(A,B,C) breaks down to
// plus(plus(A,B), C) which in turn breaks down to 2x three propagators
// for the plus.

// BODY_START

function constraint_create(name, varIndexes, param) {
  return {
    _class: '$constraint',
    name,
    varIndexes,
    param,
  };
}

// BODY_STOP

export {
  constraint_create,
};
