import {
  domain_divby,
} from '../domain';

import {
  fdvar_constrain,
} from '../fdvar';

// BODY_START

/**
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @param {Fdvar} fdvarResult
 * @returns {number} REJECTED NO_CHANGES SOME_CHANGES
 */
function propagator_divStep(fdvar1, fdvar2, fdvarResult) {
  let output = domain_divby(fdvar1.dom, fdvar2.dom);
  let changeStatus = fdvar_constrain(fdvarResult, output);

  return changeStatus;
}

// BODY_STOP

export default propagator_divStep;
