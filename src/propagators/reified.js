import {
  EMPTY,
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
  ASSERT_NUMSTRDOM,
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

/**
 * A boolean variable that represents whether a comparison
 * condition between two variables currently holds or not.
 *
 * @param {$space} space
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 * @param {string} opName
 * @param {string} invOpName
 * @returns {$fd_changeState}
 */
function propagator_reifiedStepBare(space, leftVarIndex, rightVarIndex, resultVarIndex, opName, invOpName) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof leftVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof rightVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof resultVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof opName === 'string', 'OP_SHOULD_BE_NUMBER');
  ASSERT(typeof invOpName === 'string', 'NOP_SHOULD_BE_NUMBER');

  let domResult = space.vardoms[resultVarIndex];
  ASSERT(domResult === ZERO || domResult === ONE || domResult === BOOL, 'RESULT_DOM_SHOULD_BE_BOOL_BOUND [was' + domResult + ']');

  if (domResult === ZERO) {
    return propagator_stepComparison(space, invOpName, leftVarIndex, rightVarIndex);
  }

  if (domResult === ONE) {
    return propagator_stepComparison(space, opName, leftVarIndex, rightVarIndex);
  }

  let domain1 = space.vardoms[leftVarIndex];
  let domain2 = space.vardoms[rightVarIndex];

  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  // domResult can only shrink so we only need to check its current state
  if ((domResult & ZERO) && propagator_stepWouldReject(invOpName, domain1, domain2)) {
    space.vardoms[resultVarIndex] = domResult &= ONE;
    return domResult === EMPTY ? REJECTED : SOME_CHANGES;
  }
  if ((domResult & ONE) && propagator_stepWouldReject(opName, domain1, domain2)) {
    space.vardoms[resultVarIndex] = domResult &= ZERO;
    return domResult === EMPTY ? REJECTED : SOME_CHANGES;
  }

  return NO_CHANGES;
}

// BODY_STOP

export default propagator_reifiedStepBare;
