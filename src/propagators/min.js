import {
  domain_intersection,
  domain_numarr,
} from '../domain';
import domain_minus from '../doms/domain_minus';

// BODY_START

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function propagator_minStep(domain1, domain2, domResult) {
  let domain = domain_minus(domain1, domain2);

  domain = domain_numarr(domain);
  domain = domain_intersection(domResult, domain);
  return domain_numarr(domain);
}

// BODY_STOP

export default propagator_minStep;
