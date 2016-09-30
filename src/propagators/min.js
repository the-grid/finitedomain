import {
  LOG_FLAG_PROPSTEPS,

  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
} from '../helpers';
import {
  domain__debug,
  domain_intersection,
} from '../domain';
import domain_any_minus from '../doms/domain_minus';

// BODY_START

/**
 * Min as in minus. Only updates the result domain.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 */
function propagator_minStep(space, config, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];

  // TODO: prune domain1 and domain2 like ring does, but here
  space.vardoms[varIndex3] = _propagator_minStep(domain1, domain2, domain3);

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_minStep; indexes:', varIndex1, varIndex2, varIndex3, 'doms:', domain__debug(domain1), domain__debug(domain2), 'was', domain__debug(domain3), 'now', domain__debug(space.vardoms[varIndex3])));
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function _propagator_minStep(domain1, domain2, domResult) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let domain = domain_any_minus(domain1, domain2);

  return domain_intersection(domResult, domain);
}

// BODY_STOP

export default propagator_minStep;
export {
  _propagator_minStep, // testing
};
