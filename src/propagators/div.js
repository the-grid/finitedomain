import {
  ASSERT,
  ASSERT_NUMSTRDOM,
} from '../helpers';

import {
  domain_divby,
  domain_intersection,
} from '../domain';

// BODY_START


/**
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 * @returns {$fd_changeState}
 */
function propagator_divStep(space, config, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];

  space.vardoms[varIndex3] = _propagator_divStep(domain1, domain2, domain3);
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function _propagator_divStep(domain1, domain2, domResult) {
  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let domain = domain_divby(domain1, domain2);
  return domain_intersection(domResult, domain);
}

// BODY_STOP

export default propagator_divStep;
