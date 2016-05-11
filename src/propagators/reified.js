import {
  REJECTED,
  SOMETHING_CHANGED,
  ZERO_CHANGES,

  ASSERT,
  ASSERT_DOMAIN,
} from '../helpers';

import {
  propagator_stepComparison,
  propagator_stepWouldReject,
} from './step_comparison';

import {
  fdvar_setValueInline,
} from '../fdvar';

// BODY_START

let PAIR_SIZE = 2;

// A boolean variable that represents whether a comparison
// condition between two variables currently holds or not.

function propagator_reifiedStepBare(space, leftVarName, rightVarName, boolName, opName, invOpName) {
  let opReject;
  let invOpReject;
  let { vars } = space;
  let fdvar1 = vars[leftVarName];
  let fdvar2 = vars[rightVarName];
  ASSERT(fdvar1 && fdvar2, 'should have two vars', leftVarName, rightVarName, boolName, opName, invOpName);
  let boolVar = vars[boolName];

  ASSERT(boolVar.dom.length === PAIR_SIZE);
  ASSERT_DOMAIN(boolVar.dom);

  let [lo, hi] = boolVar.dom;

  // boolVar can only shrink so we only need to check its current state
  if (lo === 0 && propagator_stepWouldReject(invOpName, fdvar1, fdvar2)) {
    if (hi === 0) {
      return REJECTED;
    }
    fdvar_setValueInline(boolVar, 1);
    return SOMETHING_CHANGED;
  } else if (hi === 1 && propagator_stepWouldReject(opName, fdvar1, fdvar2)) {
    if (lo === 1) {
      return REJECTED;
    }
    fdvar_setValueInline(boolVar, 0);
    return SOMETHING_CHANGED;
  } else { // boolVar is solved, enforce relevant op
    if (lo === 1) {
      return propagator_stepComparison(space, opName, leftVarName, rightVarName);
    }
    if (hi === 0) {
      return propagator_stepComparison(space, invOpName, leftVarName, rightVarName);
    }
  }

  ASSERT(lo === 0 && hi === 1, 'boolVar remains undetermined, nothing happens right now');

  // artifacts; this way these lines are stripped for dist/perf. we want to cache the result for legibility
  ASSERT((opReject = propagator_stepWouldReject(opName, fdvar1, fdvar2)) || true);
  ASSERT((invOpReject = propagator_stepWouldReject(invOpName, fdvar1, fdvar2)) || true);
  // either the bool was undetermined and neither op rejected or the bool is solved and
  // still holds (we assume both ops cant reject at the same time). so no change.
  ASSERT(lo === 1 || hi === 0 || (!opReject && !invOpReject), 'if bool is [0,1] then neither op should reject');
  ASSERT(lo === 0 || (!opReject && invOpReject), 'if bool=1 then opName should not reject');
  ASSERT(hi === 1 || (opReject && !invOpReject), 'if bool=0 then invOpName should not reject');

  return ZERO_CHANGES;
}

// BODY_STOP

export default propagator_reifiedStepBare;
