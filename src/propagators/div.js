import {
  domain_divby,
} from '../domain';

import {
  fdvar_constrain
} from '../fdvar';

// BODY_START

function propagator_divStep(fdvar1, fdvar2, fdvarResult) {

  let output = domain_divby(fdvar1.dom, fdvar2.dom);
  let changeStatus = fdvar_constrain(fdvarResult, output);

  return changeStatus;
}

// BODY_STOP

export default {
  propagator_divStep,
};
