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
 * @returns {$fd_changeState}
 */
function propagator_lteStepBare(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];

  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let lo1 = domain_min(domain1);
  let hi1 = domain_max(domain1);
  let lo2 = domain_min(domain2);
  let hi2 = domain_max(domain2);

  // every number in v1 can only be smaller than or equal to the biggest
  // value in v2. bigger values will never satisfy lt so prune them.
  if (hi1 > hi2) {
    space.vardoms[varIndex1] = domain_removeGte(domain1, hi2 + 1);
  }

  // likewise; numbers in v2 that are smaller than or equal to the
  // smallest value of v1 can never satisfy lt so prune them as well
  if (lo1 > lo2) {
    space.vardoms[varIndex2] = domain_removeLte(domain2, lo1 - 1);
  }

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_ltStepBare; indexes:', varIndex1, varIndex2, 'doms:', domain__debug(domain1), 'lt', domain__debug(domain2), '->', domain__debug(space.vardoms[varIndex1]), domain__debug(space.vardoms[varIndex2])));
}

function propagator_gteStepBare(space, config, varIndex1, varIndex2) {
  return propagator_lteStepBare(space, config, varIndex2, varIndex1);
}

/**
 * lte would reject if all elements in the left var are bigger than the
 * right var. And since everything is CSIS, we only have to check the
 * lo bound of left to the high bound of right for that answer.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_lteStepWouldReject(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');

  return domain_min(domain1) > domain_max(domain2);
}

/**
 * Reverse of propagator_lteStepWouldReject
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_gteStepWouldReject(domain1, domain2) {
  return propagator_lteStepWouldReject(domain2, domain1);
}

/**
 * lte is solved if dom1 contains no values that are
 * higher than any numbers in dom2. Since domains only
 * shrink we can assume that the lte constraint will not
 * be broken by searching further once this state is seen.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_lteSolved(domain1, domain2) {
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');

  return domain_max(domain1) <= domain_min(domain2);
}

// BODY_STOP

export {
  propagator_gteStepBare,
  propagator_gteStepWouldReject,
  propagator_lteStepBare,
  propagator_lteStepWouldReject,
  propagator_lteSolved,
};
