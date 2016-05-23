import {
  domain_minus,
  domain_intersection,
  domain_numarr,
} from '../domain';

// BODY_START

/**
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function propagator_minStep(dom1, dom2, domResult) {
  let domain = domain_minus(dom1, dom2);

  domain = domain_numarr(domain);
  domain = domain_intersection(domResult, domain);
  return domain_numarr(domain);
}

// BODY_STOP

export default propagator_minStep;
