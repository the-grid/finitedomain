import {
  domain_minus,
} from '../domain';

import {
  fdvar_constrain,
} from '../fdvar';

// BODY_START

function propagator_minStep(fdvar1, fdvar2, fdvarResult) {
  let output = domain_minus(fdvar1.dom, fdvar2.dom);
  let changeStatus = fdvar_constrain(fdvarResult, output);
  return changeStatus;
}

// BODY_STOP

export {
  propagator_minStep,
};
