import {
  LOG_FLAG_PROPSTEPS,

  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
} from '../helpers';

import {
  domain__debug,
  domain_max,
  domain_min,
  domain_removeGte,
  domain_removeLte,
} from '../domain';

// BODY_START

/**
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 */
function propagator_ltStepBare(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];

  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let lo1 = domain_min(domain1);
  let hi2 = domain_max(domain2);

  space.vardoms[varIndex1] = domain_removeGte(domain1, hi2);
  space.vardoms[varIndex2] = domain_removeLte(domain2, lo1);

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_ltStepBare; indexes:', varIndex1, varIndex2, 'doms:', domain__debug(domain1), 'lt', domain__debug(domain2), '->', domain__debug(space.vardoms[varIndex1]), domain__debug(space.vardoms[varIndex2])));
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
}

function propagator_gtStepBare(space, config, varIndex1, varIndex2) {
  return propagator_ltStepBare(space, config, varIndex2, varIndex1);
}

/**
 * lt would reject if all elements in the left var are bigger or equal to
 * the right var. And since everything is CSIS, we only have to check the
 * lo bound of left to the high bound of right for that answer.
 * Read-only check
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_ltStepWouldReject(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');

  let result = domain_min(domain1) >= domain_max(domain2);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_ltStepWouldReject;', 'min(' + domain__debug(domain1) + ') = ' + domain_min(domain1), '>=', 'max(' + domain__debug(domain2) + ')=' + domain_max(domain2), '->', result));
  return result;
}

/**
 * Reverse of propagator_ltStepWouldReject
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_gtStepWouldReject(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');
  let result = propagator_ltStepWouldReject(domain2, domain1);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_gtStepWouldReject;', domain__debug(domain1), '<=', domain__debug(domain2), '->', result));
  return result;
}

/**
 * lt is solved if dom1 contains no values that are equal
 * to or higher than any numbers in dom2. Since domains
 * only shrink we can assume that the lt constraint will not
 * be broken by searching further once this state is seen.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_ltSolved(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');

  return domain_max(domain1) < domain_min(domain2);
}

// BODY_STOP

export {
  propagator_gtStepBare,
  propagator_gtStepWouldReject,
  propagator_ltStepBare,
  propagator_ltStepWouldReject,
  propagator_ltSolved,
};
