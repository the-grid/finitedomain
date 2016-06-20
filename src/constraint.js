// A constraint acts as a abstract model in Config from which
// propagators are generated once a space is created. Constraints
// tend to be more concise and reflect the original intend, whereas
// propagators are low level. One constraint can generate multiple
// propagators to do its work, like how sum(A,B,C) breaks down to
// plus(plus(A,B), C) which in turn breaks down to 2x three propagators
// for the plus.

import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
} from './helpers';
import domain_plus from './doms/domain_plus';
import domain_minus from './doms/domain_minus';
import {
  domain_getChangeState,
  domain_divby,
  domain_intersection,
  domain_isLt,
  domain_isLte,
  domain_isRejected,
  domain_isSolved,
  domain_mul,
  domain_sharesNoElements,
} from './domain';
import propagator_reifiedStepBare from './propagators/reified';
import propagator_callbackStepBare from './propagators/callback';
import propagator_markovStepBare from './propagators/markov';
import propagator_ringStepBare from './propagators/ring';
import propagator_minStep from './propagators/min';
import propagator_mulStep from './propagators/mul';
import propagator_divStep from './propagators/div';
import {
  propagator_ltStepBare,
} from './propagators/lt';

import {
  propagator_lteStepBare,
} from './propagators/lte';

import {
  propagator_eqStepBare,
} from './propagators/eq';

import {
  propagator_neqStepBare,
} from './propagators/neq';

// BODY_START

function constraint_create(name, varIndexes, param) {
  return {
    _class: '$constraint',
    name,
    varIndexes,
    param,
  };
}

function constraint_step(constraint, space) {
  switch (constraint.name) {
    case 'reifier':
      return constraint_reifier(constraint, space);

    case 'plus':
      return constraint_plusRing(constraint, space);

    case 'min':
      return constraint_minRing(constraint, space);

    case 'ring-mul':
      return constraint_mulRing(constraint, space);

    case 'ring-div':
      return constraint_divRing(constraint, space);

    case 'mul':
      return constraint_mulOnly(constraint, space);

    case 'div':
      return constraint_divOnly(constraint, space);

    case 'sum':
      return constraint_sum(constraint, space);

    case 'product':
      return constraint_product(constraint, space);

    case 'distinct':
      return constraint_distinct(constraint, space);

    case 'markov':
      return propagator_markovStepBare(space, constraint.varIndexes[0]);

    case 'callback':
      return propagator_callbackStepBare(space, constraint.varIndexes, constraint.param);

    case 'neq':
      return propagator_neqStepBare(space, constraint.varIndexes[0], constraint.varIndexes[1]);

    case 'eq':
      return propagator_eqStepBare(space, constraint.varIndexes[0], constraint.varIndexes[1]);

    case 'gte':
      return propagator_lteStepBare(space, constraint.varIndexes[1], constraint.varIndexes[0]); // swapped!

    case 'lte':
      return propagator_lteStepBare(space, constraint.varIndexes[0], constraint.varIndexes[1]);

    case 'gt':
      return propagator_ltStepBare(space, constraint.varIndexes[1], constraint.varIndexes[0]); // swapped!

    case 'lt':
      return propagator_ltStepBare(space, constraint.varIndexes[0], constraint.varIndexes[1]);

    default:
      THROW('UNEXPECTED_NAME');
  }
}

function constraint_reifier(constraint, space) {
  let op = constraint.param;
  let nop = constraint_getInverseComparisonOp(constraint.param);
  let varIndexes = constraint.varIndexes;
  let left = varIndexes[0];
  let right = varIndexes[1];
  let result = varIndexes[2];

  return propagator_reifiedStepBare(space, left, right, result, op, nop);
}

function constraint_getInverseComparisonOp(opname) {
  switch (opname) {
    case 'eq': return 'neq';
    case 'neq': return 'eq';
    case 'lt': return 'gte';
    case 'gt': return 'lte';
    case 'lte': return 'gt';
    case 'gte': return 'lt';
  }
  return THROW('UNKNOWN_REIFIED_OP');
}

function constraint_mulOnly(constraint, space) {
  let vardoms = space.vardoms;
  let vars = constraint.varIndexes;

  let left = vardoms[vars[0]];
  let right = vardoms[vars[1]];
  let result = vardoms[vars[2]];

  let result2 = domain_intersection(domain_mul(left, right), result);
  vardoms[vars[2]] = result2;
  return domain_getChangeState(result2, result);
}

function constraint_distinct(constraint, space) {
  let varIndexes = constraint.varIndexes;
  let changeStatus = NO_CHANGES;
  for (let i = 1; i < varIndexes.length; i++) {
    let varIndex = varIndexes[i];
    for (let j = 0; j < i; ++j) {
      let r = propagator_neqStepBare(space, varIndex, varIndexes[j]);
      if (r === REJECTED) return REJECTED;
      if (r === SOME_CHANGES) changeStatus = SOME_CHANGES;
    }
  }
  return changeStatus;
}

function constraint_product(constraint, space) {
  let vardoms = space.vardoms;
  let vars = constraint.varIndexes;
  let total = vardoms[vars[0]];
  for (let i = 1, n = vars.length; i < n; ++i) {
    total = domain_mul(total, vardoms[vars[i]]);
  }

  let result = vardoms[constraint.param];
  let result2 = domain_intersection(total, result);
  vardoms[constraint.param] = result2;
  return domain_getChangeState(result2, result);
}

function constraint_sum(constraint, space) {
  if (constraint.varIndexes.length === 1) {
    return propagator_eqStepBare(space, constraint.varIndexes[0], constraint.param); // should just eliminate this in a preparation step
  }
  if (constraint.varIndexes.length === 2) {
    return _constraint_plusRing(constraint.varIndexes[0], constraint.varIndexes[1], constraint.param, space);
  }

  let vardoms = space.vardoms;
  let vars = constraint.varIndexes;
  let total = vardoms[vars[0]];
  for (let i = 1, n = vars.length; i < n; ++i) {
    total = domain_plus(total, vardoms[vars[i]]);
  }

  let result = vardoms[constraint.param];
  let result2 = domain_intersection(total, result);
  vardoms[constraint.param] = result2;
  return domain_getChangeState(result2, result);
}

function constraint_plusRing(constraint, space) {
  let varIndexes = constraint.varIndexes;
  return _constraint_plusRing(varIndexes[0], varIndexes[1], varIndexes[2], space);
}

function _constraint_plusRing(leftVarIndex, rightVarIndex, resultVarIndex, space) {
  let vardoms = space.vardoms;
  let left = vardoms[leftVarIndex];
  let right = vardoms[rightVarIndex];
  let result = vardoms[resultVarIndex];

  let result2 = domain_intersection(domain_plus(left, right), result);
  vardoms[resultVarIndex] = result2;
  let r1 = domain_getChangeState(result2, result);
  if (r1 === REJECTED) return REJECTED;
  let right2 = domain_intersection(domain_minus(result, left), right);
  vardoms[rightVarIndex] = right2;
  let r2 = domain_getChangeState(right2, right);
  if (r2 === REJECTED) return REJECTED;
  let left2 = domain_intersection(domain_minus(result, right), left);
  vardoms[leftVarIndex] = left2;
  let r3 = domain_getChangeState(left2, left);
  if (r3 === REJECTED) return REJECTED;

  if (r1 === SOME_CHANGES || r2 === SOME_CHANGES || r3 === SOME_CHANGES) return SOME_CHANGES;
  return NO_CHANGES;
}

function constraint_minRing(constraint, space) {
  let vardoms = space.vardoms;
  let vars = constraint.varIndexes;

  let left = vardoms[vars[0]];
  let right = vardoms[vars[1]];
  let result = vardoms[vars[2]];

  let left2 = domain_intersection(domain_plus(result, right), left);
  let r1 = domain_getChangeState(left2, left);
  if (r1 === REJECTED) return REJECTED;
  let result2 = domain_intersection(domain_minus(left, right), result);
  let r2 = domain_getChangeState(result2, result);
  if (r2 === REJECTED) return REJECTED;
  let right2 = domain_intersection(domain_minus(left, result), right);
  let r3 = domain_getChangeState(right2, right);
  if (r3 === REJECTED) return REJECTED;

  vardoms[vars[0]] = left2;
  vardoms[vars[1]] = right2;
  vardoms[vars[2]] = result2;

  if (r1 === SOME_CHANGES || r2 === SOME_CHANGES || r3 === SOME_CHANGES) return SOME_CHANGES;
  return NO_CHANGES;
}

function constraint_mulRing(constraint, space) {
  let vardoms = space.vardoms;
  let vars = constraint.varIndexes;

  let left = vardoms[vars[0]];
  let right = vardoms[vars[1]];
  let result = vardoms[vars[2]];

  let result2 = domain_intersection(domain_mul(left, right), result);
  let r1 = domain_getChangeState(result2, result);
  if (r1 === REJECTED) return REJECTED;
  let right2 = domain_intersection(domain_divby(result, left), right);
  let r2 = domain_getChangeState(right2, right);
  if (r2 === REJECTED) return REJECTED;
  let left2 = domain_intersection(domain_divby(result, right), left);
  let r3 = domain_getChangeState(left2, left);
  if (r3 === REJECTED) return REJECTED;

  vardoms[vars[0]] = left2;
  vardoms[vars[1]] = right2;
  vardoms[vars[2]] = result2;

  if (r1 === SOME_CHANGES || r2 === SOME_CHANGES || r3 === SOME_CHANGES) return SOME_CHANGES;
  return NO_CHANGES;
}

function constraint_divRing(constraint, space) {
  let vardoms = space.vardoms;
  let vars = constraint.varIndexes;

  let left = vardoms[vars[0]];
  let right = vardoms[vars[1]];
  let result = vardoms[vars[2]];

  let left2 = domain_intersection(domain_mul(result, right), left);
  let r1 = domain_getChangeState(left2, left);
  if (r1 === REJECTED) return REJECTED;
  let result2 = domain_intersection(domain_divby(left, right), result);
  let r2 = domain_getChangeState(result2, result);
  if (r2 === REJECTED) return REJECTED;
  let right2 = domain_intersection(domain_divby(left, result), right);
  let r3 = domain_getChangeState(right2, right);
  if (r3 === REJECTED) return REJECTED;

  vardoms[vars[0]] = left2;
  vardoms[vars[1]] = right2;
  vardoms[vars[2]] = result2;

  if (r1 === SOME_CHANGES || r2 === SOME_CHANGES || r3 === SOME_CHANGES) return SOME_CHANGES;
  return NO_CHANGES;
}

function constraint_divOnly(constraint, space) {
  let vardoms = space.vardoms;
  let vars = constraint.varIndexes;

  let left = vardoms[vars[0]];
  let right = vardoms[vars[1]];
  let result = vardoms[vars[2]];

  let result2 = domain_intersection(domain_divby(left, right), result);
  let r2 = domain_getChangeState(result2, result);
  vardoms[vars[2]] = result2;
  return r2;
}

function constraint_isSolved(constraint, space) {
  let varIndexes = constraint.varIndexes;
  let vardoms = space.vardoms;

  switch (constraint.name) {
    case 'lt':
      return domain_isLt(vardoms[varIndexes[0]], vardoms[varIndexes[1]]);
    case 'lte':
      return domain_isLte(vardoms[varIndexes[0]], vardoms[varIndexes[1]]);
    case 'gt':
      return domain_isLte(vardoms[varIndexes[1]], vardoms[varIndexes[0]]);
    case 'gte':
      return domain_isLt(vardoms[varIndexes[1]], vardoms[varIndexes[0]]);
    case 'neq':
      return domain_sharesNoElements(vardoms[varIndexes[1]], vardoms[varIndexes[0]]);
    case 'reified':
      return vardoms[varIndexes[2]] === ZERO || vardoms[varIndexes[2]] === ONE;
  }


  // we could either check these vars individually
  // or we could do a scan for them in the
  // space.unsolvedVarIndexes array... TODO

  for (let i = 0, n = varIndexes.length; i < n; ++i) {
    ASSERT(!domain_isRejected(vardoms[varIndexes[i]]), 'REJECTS_SHOULD_ABORT_EARLIER');
    if (!domain_isSolved(vardoms[varIndexes[i]])) return false;
  }
  if ((constraint.name === 'sum' || constraint.name === 'product') && !domain_isSolved(vardoms[constraint.param])) return false;
  return true;
}

// BODY_STOP

export {
  constraint_create,
  constraint_step,
  constraint_isSolved,
};
