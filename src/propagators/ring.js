import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT_UNUSED_DOMAIN,
} from '../helpers';

import {
  domain_equal,
  domain_intersection,
  domain_isRejected,
  domain_numarr,
} from '../domain';

// BODY_START

function propagator_ringStepBare(fdvar1, fdvar2, fdvarResult, opFunc) {
  // Apply an operator func to fdvar1 and fdvar2
  // Updates fdvarResult to the intersection of the result and itself

  let fromOp = opFunc(fdvar1.dom, fdvar2.dom);
  let domain = domain_intersection(fromOp, fdvarResult.dom);
  if (domain_isRejected(domain)) return REJECTED;

  let fdvarDom = fdvarResult.dom;
  if (typeof domain === 'number' && typeof fdvarDom === 'number') {
    if (fdvarDom !== domain) {
      fdvarResult.dom = domain;
      return SOME_CHANGES;
    }
    return NO_CHANGES;
  }

  ASSERT_UNUSED_DOMAIN(domain);
  if (!domain_equal(fdvarDom, domain)) {
    fdvarResult.dom = domain_numarr(domain);
    return SOME_CHANGES;
  }
  return NO_CHANGES;
}

// BODY_STOP

export default propagator_ringStepBare;
