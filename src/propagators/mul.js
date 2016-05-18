import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT_UNUSED_DOMAIN,
} from '../helpers';
import {
  domain_mul,
  domain_equal,
  domain_intersection,
  domain_isRejected,
  domain_numarr,
} from '../domain';

// BODY_START

function propagator_mulStep(fdvar1, fdvar2, fdvarResult) {
  let domain = domain_mul(fdvar1.dom, fdvar2.dom);

  domain = domain_numarr(domain);
  domain = domain_intersection(fdvarResult.dom, domain);
  if (domain_isRejected(domain)) return REJECTED;
  domain = domain_numarr(domain);

  let fdvarDom = fdvarResult.dom;
  if (typeof domain === 'number' && typeof fdvarDom === 'number') {
    if (fdvarDom === domain) return NO_CHANGES;
    fdvarResult.dom = domain;
    return SOME_CHANGES;
  }

  ASSERT_UNUSED_DOMAIN(domain);
  if (domain_equal(fdvarDom, domain)) return NO_CHANGES;
  fdvarResult.dom = domain;
  return SOME_CHANGES;
}

// BODY_STOP

export default propagator_mulStep;
