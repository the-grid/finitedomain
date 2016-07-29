import {
  domain_any_mul,
  domain_any_intersection,
} from '../domain';

// BODY_START

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function propagator_mulStep(domain1, domain2, domResult) {
  let domain = domain_any_mul(domain1, domain2);

  return domain_any_intersection(domResult, domain);
}

// BODY_STOP

export default propagator_mulStep;
