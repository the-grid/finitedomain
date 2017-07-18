import {
  LOG_FLAG_PROPSTEPS,

  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
} from '../helpers';

import {
  domain__debug,
  domain_hasNoZero,
  domain_isZero,
  domain_removeGtUnsafe,
  domain_removeValue,
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
  ASSERT(typeof opName === 'string', 'OP_SHOULD_BE_STRING');
  ASSERT(typeof invOpName === 'string', 'NOP_SHOULD_BE_STRING');

  let vardoms = space.vardoms;
  let domResult = vardoms[resultVarIndex];

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_reifiedStepBare; op:', opName, 'indexes:', leftVarIndex, rightVarIndex, resultVarIndex, 'doms before:', domain__debug(vardoms[leftVarIndex]), '?=' + opName, domain__debug(vardoms[rightVarIndex]), '->', domain__debug(vardoms[resultVarIndex])));

  // the result var is either ZERO (reified constraint must not hold) or NONZERO (reified constraint must hold)
  // the actual nonzero value, if any, is irrelevant

  if (domain_isZero(domResult)) {
    nopFunc(space, config, leftVarIndex, rightVarIndex);
  } else if (domain_hasNoZero(domResult)) {
    opFunc(space, config, leftVarIndex, rightVarIndex);
  } else {
    let domain1 = vardoms[leftVarIndex];
    let domain2 = vardoms[rightVarIndex];

    ASSERT_NORDOM(domain1);
    ASSERT_NORDOM(domain2);
    ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');
    ASSERT(!domain_isZero(domResult) && !domain_hasNoZero(domResult), 'result should be booly now');

    if (nopRejectChecker(domain1, domain2)) {
      ASSERT(!opRejectChecker(domain1, domain2), 'with non-empty domains op and nop cant BOTH reject');
      vardoms[resultVarIndex] = domain_removeValue(domResult, 0);
      opFunc(space, config, leftVarIndex, rightVarIndex);
    } else if (opRejectChecker(domain1, domain2)) {
      vardoms[resultVarIndex] = domain_removeGtUnsafe(domResult, 0);
      nopFunc(space, config, leftVarIndex, rightVarIndex);
    }
  }

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_reifiedStepBare; doms after:', domain__debug(vardoms[leftVarIndex]), '?=' + opName, domain__debug(vardoms[rightVarIndex]), '->', domain__debug(vardoms[resultVarIndex])));
  ASSERT_NORDOM(space.vardoms[leftVarIndex], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[rightVarIndex], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[resultVarIndex], true, domain__debug);
}

// BODY_STOP

export default propagator_reifiedStepBare;
