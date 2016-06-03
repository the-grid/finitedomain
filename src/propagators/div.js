import {
  domain_divby,
  domain_intersection,
} from '../domain';

// BODY_START

/**
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function propagator_divStep(dom1, dom2, domResult) {
  let domain = domain_divby(dom1, dom2);
  return domain_intersection(domResult, domain);
}

// BODY_STOP

export default propagator_divStep;
