import {
  LOG_FLAG_PROPSTEPS,

  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
} from '../helpers';

import {
  domain__debug,
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

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_divStep; indexes:', varIndex1, varIndex2, varIndex3, 'doms:', domain__debug(domain1), 'div', domain__debug(domain2), 'was', domain__debug(domain3), 'now', domain__debug(space.vardoms[varIndex3])));
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex3], true, domain__debug);
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function _propagator_divStep(domain1, domain2, domResult) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let domain = domain_divby(domain1, domain2);
  return domain_intersection(domResult, domain);
}

// BODY_STOP

export default propagator_divStep;
