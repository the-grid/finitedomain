import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT_UNUSED_DOMAIN,
} from '../helpers';
import {
  domain_divby,
  domain_equal,
  domain_intersection,
  domain_isRejected,
  domain_numarr,
} from '../domain';

// BODY_START

/**
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @param {Fdvar} fdvarResult
 * @returns {number} REJECTED NO_CHANGES SOME_CHANGES
 */
function propagator_divStep(fdvar1, fdvar2, fdvarResult) {
  let domain = domain_divby(fdvar1.dom, fdvar2.dom);

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

export default propagator_divStep;
