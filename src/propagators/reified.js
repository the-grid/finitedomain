import {
  EMPTY,

  ASSERT,
  ASSERT_NUMSTRDOM,
} from '../helpers';

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
 * @param {$config} config
 * @param {number} leftVarIndex
 * @param {number} rightVarIndex
 * @param {number} resultVarIndex
 * @param {Function} opFunc like propagator_ltStepBare
 * @param {Function} nopFunc opposite of opFunc like propagator_gtStepBare
 * @param {string} opName
 * @param {string} invOpName
 * @param {Function} opRejectChecker
 * @param {Function} nopRejectChecker
 */
function propagator_reifiedStepBare(space, config, leftVarIndex, rightVarIndex, resultVarIndex, opFunc, nopFunc, opName, invOpName, opRejectChecker, nopRejectChecker) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof leftVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof rightVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof resultVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof opName === 'string', 'OP_SHOULD_BE_NUMBER');
  ASSERT(typeof invOpName === 'string', 'NOP_SHOULD_BE_NUMBER');

  let vardoms = space.vardoms;
  let domResult = vardoms[resultVarIndex];
  ASSERT(domResult === ZERO || domResult === ONE || domResult === BOOL, 'RESULT_DOM_SHOULD_BE_BOOL_BOUND [was' + domResult + ']');

  if (domResult === ZERO) {
    nopFunc(space, config, leftVarIndex, rightVarIndex);
  } else if (domResult === ONE) {
    opFunc(space, config, leftVarIndex, rightVarIndex);
  } else {
    ASSERT(domResult === BOOL, 'failsafe assertion');

    let domain1 = vardoms[leftVarIndex];
    let domain2 = vardoms[rightVarIndex];

    ASSERT_NUMSTRDOM(domain1);
    ASSERT_NUMSTRDOM(domain2);
    ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');
    ASSERT(domResult === BOOL, 'result should be bool now because we already asserted it was either zero one or bool and it wasnt zero or one');

    // we'll need to confirm both in any case so do it first now
    let opRejects = opRejectChecker(domain1, domain2);
    let nopRejects = nopRejectChecker(domain1, domain2);

    // if op and nop both reject then we cant fulfill the constraints
    // otherwise the reifier must solve to the other op
    if (nopRejects) {
      if (opRejects) {
        vardoms[resultVarIndex] = EMPTY;
      } else {
        vardoms[resultVarIndex] = ONE;
        opFunc(space, config, leftVarIndex, rightVarIndex);
      }
    } else if (opRejects) {
      vardoms[resultVarIndex] = ZERO;
      nopFunc(space, config, leftVarIndex, rightVarIndex);
    }
  }
}

// BODY_STOP

export default propagator_reifiedStepBare;
