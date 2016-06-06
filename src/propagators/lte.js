import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
  ASSERT_DOMAIN_EMPTY_CHECK,
} from '../helpers';

import {
  domain_isRejected,
  domain_max,
  domain_min,
  domain_removeGte,
  domain_removeLte,
} from '../domain';

// BODY_START

/**
 * @param {$space} space
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @returns {$fd_changeState}
 */
function propagator_lteStepBare(space, varIndex1, varIndex2) {
  ASSERT(space && space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];

  ASSERT(!domain_isRejected(domain1), 'SHOULD_NOT_BE_REJECTED');
  ASSERT(!domain_isRejected(domain2), 'SHOULD_NOT_BE_REJECTED');

  let lo1 = domain_min(domain1);
  let hi1 = domain_max(domain1);
  let lo2 = domain_min(domain2);
  let hi2 = domain_max(domain2);

  // every number in v1 can only be smaller than or equal to the biggest
  // value in v2. bigger values will never satisfy lt so prune them.
  var leftChanged = NO_CHANGES;
  if (hi1 > hi2) {
    let newDomain = domain_removeGte(domain1, hi2 + 1);
    if (newDomain !== domain1) {
      space.vardoms[varIndex1] = newDomain;
      if (domain_isRejected(newDomain)) { // TODO: there is no test throwing when you remove this check
        leftChanged = REJECTED;
      } else {
        leftChanged = SOME_CHANGES;
      }
    }
  }

  // likewise; numbers in v2 that are smaller than or equal to the
  // smallest value of v1 can never satisfy lt so prune them as well
  var rightChanged = NO_CHANGES;
  if (lo1 > lo2) {
    let newDomain = domain_removeLte(domain2, lo1 - 1);
    if (newDomain !== domain2) {
      space.vardoms[varIndex2] = newDomain;
      if (domain_isRejected(domain2)) { // TODO: there is no test covering this
        leftChanged = REJECTED;
      } else {
        rightChanged = SOME_CHANGES;
      }
    }
  }

  return leftChanged || rightChanged || NO_CHANGES;
}

/**
 * lte would reject if all elements in the left var are bigger than the
 * right var. And since everything is CSIS, we only have to check the
 * lo bound of left to the high bound of right for that answer.
 * Read-only check
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_lteStepWouldReject(domain1, domain2) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain1);
  ASSERT_DOMAIN_EMPTY_CHECK(domain2);

  return domain_min(domain1) > domain_max(domain2);
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
  return domain_max(domain1) <= domain_min(domain2);
}

// BODY_STOP

export {
  propagator_lteStepBare,
  propagator_lteStepWouldReject,
  propagator_lteSolved,
};
