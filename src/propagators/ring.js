import {
  REJECTED,
} from '../helpers';

import {
  domain_intersection,
} from '../domain';

import {
  fdvar_setDomain,
} from '../fdvar';

// BODY_START

function propagator_ringStepBare(fdvar1, fdvar2, fdvarResult, opFunc) {
  // Apply an operator func to fdvar1 and fdvar2
  // Updates fdvarResult to the intersection of the result and itself

  let fromOp = opFunc(fdvar1.dom, fdvar2.dom);
  let domain = domain_intersection(fromOp, fdvarResult.dom);
  if (!domain.length) {
    return REJECTED;
  }

  return fdvar_setDomain(fdvarResult, domain);
}

// BODY_STOP

export default propagator_ringStepBare;
