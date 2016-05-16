import {
  REJECTED,
  ZERO_CHANGES,

  ASSERT_DOMAIN_EMPTY_CHECK,
} from '../helpers';

import {
  domain_max,
  domain_min,
} from '../domain';

import {
  fdvar_isRejected,
  fdvar_lowerBound,
  fdvar_removeGteInline,
  fdvar_removeLteInline,
  fdvar_upperBound,
} from '../fdvar';

// BODY_START

/**
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_ltStepBare(fdvar1, fdvar2) {
  ASSERT_DOMAIN_EMPTY_CHECK(fdvar1.dom);
  ASSERT_DOMAIN_EMPTY_CHECK(fdvar2.dom);

  let lo1 = fdvar_lowerBound(fdvar1);
  let hi1 = fdvar_upperBound(fdvar1);
  let lo2 = fdvar_lowerBound(fdvar2);
  let hi2 = fdvar_upperBound(fdvar2);

  // every number in v1 can only be smaller than or equal to the biggest
  // value in v2. bigger values will never satisfy lt so prune them.
  if (hi1 >= hi2) {
    var leftChanged = fdvar_removeGteInline(fdvar1, hi2);
    if (fdvar_isRejected(fdvar1)) {
      leftChanged = REJECTED;
    }
  }

  // likewise; numbers in v2 that are smaller than or equal to the
  // smallest value of v1 can never satisfy lt so prune them as well
  if (lo1 >= lo2) {
    var rightChanged = fdvar_removeLteInline(fdvar2, lo1);
    if (fdvar_isRejected(fdvar2)) {
      rightChanged = REJECTED;
    }
  }

  return leftChanged || rightChanged || ZERO_CHANGES;
}

/**
 * lt would reject if all elements in the left var are bigger or equal to
 * the right var. And since everything is CSIS, we only have to check the
 * lo bound of left to the high bound of right for that answer.
 * Read-only check
 *
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_ltStepWouldReject(fdvar1, fdvar2) {
  let dom1 = fdvar1.dom;
  let dom2 = fdvar2.dom;

  ASSERT_DOMAIN_EMPTY_CHECK(dom1);
  ASSERT_DOMAIN_EMPTY_CHECK(dom2);
//    if domain_isRejected dom1 or domain_isRejected dom2
//      return true

  return domain_min(dom1) >= domain_max(dom2);
}

/**
 * lt is solved if fdvar1 contains no values that are equal
 * to or higher than any numbers in fdvar2. Since domains
 * only shrink we can assume that the lt constraint will not
 * be broken by searching further once this state is seen.
 *
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_ltSolved(fdvar1, fdvar2) {
  return fdvar_upperBound(fdvar1) < fdvar_lowerBound(fdvar2);
}

// BODY_STOP

export {
  propagator_ltStepBare,
  propagator_ltStepWouldReject,
  propagator_ltSolved,
};
