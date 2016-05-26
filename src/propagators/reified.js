import {
  EMPTY,
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
} from '../helpers';

import {
  propagator_stepComparison,
  propagator_stepWouldReject,
} from './step_comparison';
import {
  ZERO,
  ONE,
  BOOL,
} from '../domain';

// BODY_START

// A boolean variable that represents whether a comparison
// condition between two variables currently holds or not.
function propagator_reifiedStepBare(space, leftVarName, rightVarName, resultName, opName, invOpName) {
  let domResult = space.vardoms[resultName];
  ASSERT(domResult === ZERO || domResult === ONE || domResult === BOOL, 'RESULT_DOM_SHOULD_BE_BOOL_BOUND [was' + domResult + ']');

  if (domResult === ZERO) {
    return propagator_stepComparison(space, invOpName, leftVarName, rightVarName);
  }

  if (domResult === ONE) {
    return propagator_stepComparison(space, opName, leftVarName, rightVarName);
  }

  let dom1 = space.vardoms[leftVarName];
  let dom2 = space.vardoms[rightVarName];
  ASSERT(dom1 !== undefined && dom2 !== undefined, 'should have two domains', leftVarName, rightVarName, resultName, opName, invOpName);

  // domResult can only shrink so we only need to check its current state
  if ((domResult & ZERO) && propagator_stepWouldReject(invOpName, dom1, dom2)) {
    space.vardoms[resultName] = domResult &= ONE;
    return domResult === EMPTY ? REJECTED : SOME_CHANGES;
  }
  if ((domResult & ONE) && propagator_stepWouldReject(opName, dom1, dom2)) {
    space.vardoms[resultName] = domResult &= ZERO;
    return domResult === EMPTY ? REJECTED : SOME_CHANGES;
  }

  return NO_CHANGES;
}

// BODY_STOP

export default propagator_reifiedStepBare;
