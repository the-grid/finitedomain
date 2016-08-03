import {
  ASSERT,
  ASSERT_NUMSTRDOM,
} from '../helpers';

import {
  domain_any_max,
  domain_any_min,
  domain_any_removeGte,
  domain_any_removeLte,
} from '../domain';

// BODY_START

/**
 * @param {$space} space
 * @param {number} varIndex1
 * @param {number} varIndex2
 */
function propagator_ltStepBare(space, varIndex1, varIndex2) {
  ASSERT(space && space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];

  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let lo1 = domain_any_min(domain1);
  let hi1 = domain_any_max(domain1);
  let lo2 = domain_any_min(domain2);
  let hi2 = domain_any_max(domain2);

  // there six possible cases:
  // - 1: v1 already satisfies v2 completely (only case where the constraint is solved)
  // - 2: all v1 <= all v2, so at least some still overlap. we cant do anything yet.
  // - 3: some v1 are bigger than v2, some v2 are smaller than v1. both those sets can be removed
  // - 4: none v1 are smaller or equal to v2 (only case where the constraint is rejected)
  // - 5: some of v1 are bigger than all of v2, those can be removed
  // - 6: some of v2 are smaller than all of v1, those can be removed

  // TOFIX: make this bit work. it should work. why doesnt it work? it would prevent unnecessary operations quickly.
  //// every number in v1 can only be smaller than or equal to the biggest
  //// value in v2. bigger values will never satisfy lt so prune them.
  //if (hi2 < hi1) {
  //  // if you remove every number gte to the lowest number in
  //  // the domain, then and only then the result will be empty
  //  // TOFIX: the rejection case was not tested before so it probably isn't now.
  //
  //  space.vardoms[varIndex1] = EMPTY;
  //  space.vardoms[varIndex2] = EMPTY;
  //  return;
  //}

  // every number in v1 can only be smaller than or equal to the biggest
  // value in v2. bigger values will never satisfy lt so prune them.
  if (hi1 >= hi2) {
    space.vardoms[varIndex1] = domain_any_removeGte(domain1, hi2);
  }

  // likewise; numbers in v2 that are smaller than or equal to the
  // smallest value of v1 can never satisfy lt so prune them as well
  if (lo1 >= lo2) {
    space.vardoms[varIndex2] = domain_any_removeLte(domain2, lo1);
  }
}

function propagator_gtStepBare(space, varIndex1, varIndex2) {
  return propagator_ltStepBare(space, varIndex2, varIndex1);
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
  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');

  return domain_any_min(domain1) >= domain_any_max(domain2);
}

/**
 * Reverse of propagator_ltStepWouldReject
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_gtStepWouldReject(domain1, domain2) {
  return propagator_ltStepWouldReject(domain2, domain1);
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
  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');

  return domain_any_max(domain1) < domain_any_min(domain2);
}

// BODY_STOP

export {
  propagator_gtStepBare,
  propagator_gtStepWouldReject,
  propagator_ltStepBare,
  propagator_ltStepWouldReject,
  propagator_ltSolved,
};
