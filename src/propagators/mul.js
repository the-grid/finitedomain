import {
  domain_mul
} from '../domain';

import {
  fdvar_constrain
} from '../fdvar';

// BODY_START

function propagator_mulStep(fdvar1, fdvar2, fdvar_result) {
  let output = domain_mul(fdvar1.dom, fdvar2.dom);
  let changeStatus = fdvar_constrain(fdvar_result, output);
  return changeStatus;
}

// BODY_STOP

export default propagator_mulStep;
