import {
  ASSERT,
  ASSERT_NUMSTRDOM,
} from '../helpers';

import {
  domain_any_divby,
  domain_any_intersection,
} from '../domain';

// BODY_START

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function propagator_divStep(domain1, domain2, domResult) {
  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let domain = domain_any_divby(domain1, domain2);
  return domain_any_intersection(domResult, domain);
}

// BODY_STOP

export default propagator_divStep;
