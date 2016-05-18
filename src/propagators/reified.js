import {
  EMPTY,
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
  ASSERT_DOMAIN,
} from '../helpers';

import {
  propagator_stepComparison,
  propagator_stepWouldReject,
} from './step_comparison';
import {
  ZERO,
  ONE,

  domain_max,
  domain_min,
} from '../domain';

// BODY_START

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

  ASSERT_DOMAIN(boolVar.dom);

  let domain = boolVar.dom;
  let lo = domain_min(domain);
  let hi = domain_max(domain);

  // boolVar can only shrink so we only need to check its current state
  if (lo === 0 && propagator_stepWouldReject(invOpName, fdvar1, fdvar2)) {
    if (hi === 0) return REJECTED;

    ASSERT(typeof boolVar.dom === 'number', 'BOOL_VAR_SHOULD_ALWAYS_BE_NUMBER');
    boolVar.dom &= ONE;
    if (boolVar.dom === EMPTY) return REJECTED;
    return SOME_CHANGES;
  } else if (hi === 1 && propagator_stepWouldReject(opName, fdvar1, fdvar2)) {
    if (lo === 1) return REJECTED;

    ASSERT(typeof boolVar.dom === 'number', 'BOOL_VAR_SHOULD_ALWAYS_BE_NUMBER');
    boolVar.dom &= ZERO;
    if (boolVar.dom === EMPTY) return REJECTED;
    return SOME_CHANGES;
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

  return NO_CHANGES;
}

// BODY_STOP

export default propagator_reifiedStepBare;
