import {
  domain_mul,
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
function propagator_mulStep(dom1, dom2, domResult) {
  let domain = domain_mul(dom1, dom2);

  domain = domain_numarr(domain);
  domain = domain_intersection(domResult, domain);
  return domain_numarr(domain);
}

// BODY_STOP

export default propagator_mulStep;
