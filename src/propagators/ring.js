import {
  ASSERT,
} from '../helpers';

import {
  domain_intersection,
  domain_numarr,
} from '../domain';

// BODY_START

/**
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @param {$domain} domResult
 * @param {Function} opFunc
 * @param {string} opName For debugging only, the canonical name of opFunc
 * @returns {$domain}
 */
function propagator_ringStepBare(dom1, dom2, domResult, opFunc, opName) {
  ASSERT(typeof opFunc === 'function', 'EXPECTING_FUNC_TO_BE:', opName);
  let domain = opFunc(dom1, dom2);

  domain = domain_numarr(domain);
  domain = domain_intersection(domResult, domain);
  return domain_numarr(domain);
}

// BODY_STOP

export default propagator_ringStepBare;
