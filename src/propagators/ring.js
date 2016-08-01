import {
  ASSERT,
  ASSERT_NUMSTRDOM,
} from '../helpers';

import {
  domain_any_intersection,
} from '../domain';

// BODY_START

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domainResult
 * @param {Function} opFunc
 * @param {string} opName For debugging only, the canonical name of opFunc
 * @returns {$domain}
 */
function propagator_ringStepBare(domain1, domain2, domainResult, opFunc, opName) {
  ASSERT(typeof opFunc === 'function', 'EXPECTING_FUNC_TO_BE:', opName);
  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let domain = opFunc(domain1, domain2);

  return domain_any_intersection(domainResult, domain);
}

// BODY_STOP

export default propagator_ringStepBare;
