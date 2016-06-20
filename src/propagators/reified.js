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
domain_toArr,
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

  let dom1 = space.vardoms[leftVarIndex];
  let dom2 = space.vardoms[rightVarIndex];
  ASSERT(dom1 !== undefined && dom2 !== undefined, 'should have two domains', leftVarIndex, rightVarIndex, resultVarIndex, opName, invOpName);

  // domResult can only shrink so we only need to check its current state
  if ((domResult & ZERO) && propagator_stepWouldReject(invOpName, dom1, dom2)) {
    space.vardoms[resultVarIndex] = domResult &= ONE;
    return domResult === EMPTY ? REJECTED : SOME_CHANGES;
  }
  if ((domResult & ONE) && propagator_stepWouldReject(opName, dom1, dom2)) {
    space.vardoms[resultVarIndex] = domResult &= ZERO;
    return domResult === EMPTY ? REJECTED : SOME_CHANGES;
  }

  return NO_CHANGES;
}

// BODY_STOP

export default propagator_reifiedStepBare;
