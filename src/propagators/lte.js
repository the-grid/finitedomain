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
  fdvar_is_rejected,
  fdvar_lower_bound,
  fdvar_remove_gte_inline,
  fdvar_remove_lte_inline,
  fdvar_upper_bound,
} from '../fdvar';

// BODY_START

/**
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_lteStepBare(fdvar1, fdvar2) {
  let lo1 = fdvar_lower_bound(fdvar1);
  let hi1 = fdvar_upper_bound(fdvar1);
  let lo2 = fdvar_lower_bound(fdvar2);
  let hi2 = fdvar_upper_bound(fdvar2);

  ASSERT_DOMAIN_EMPTY_CHECK(fdvar1.dom);
  ASSERT_DOMAIN_EMPTY_CHECK(fdvar2.dom);

  // every number in v1 can only be smaller than or equal to the biggest
  // value in v2. bigger values will never satisfy lt so prune them.
  if (hi1 > hi2) {
    var leftChanged = fdvar_remove_gte_inline(fdvar1, hi2+1);
    if (fdvar_is_rejected(fdvar1)) {
      leftChanged = REJECTED;
    }
  }

  // likewise; numbers in v2 that are smaller than or equal to the
  // smallest value of v1 can never satisfy lt so prune them as well
  if (lo1 > lo2) {
    var rightChanged = fdvar_remove_lte_inline(fdvar2, lo1-1);
    if (fdvar_is_rejected(fdvar2)) {
      rightChanged = REJECTED;
    }
  }

  return leftChanged || rightChanged || ZERO_CHANGES;
}

/**
 * lte would reject if all elements in the left var are bigger than the
 * right var. And since everything is CSIS, we only have to check the
 * lo bound of left to the high bound of right for that answer.
 * Read-only check
 *
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
let propagator_lteStepWouldReject = function(fdvar1, fdvar2) {
  let dom1 = fdvar1.dom;
  let dom2 = fdvar2.dom;

  ASSERT_DOMAIN_EMPTY_CHECK(dom1);
  ASSERT_DOMAIN_EMPTY_CHECK(dom2);
//    if domain_is_rejected dom1 or domain_is_rejected dom2
//      return true

  return domain_min(dom1) > domain_max(dom2);
};

/**
 * lte is solved if fdvar1 contains no values that are
 * higher than any numbers in fdvar2. Since domains only
 * shrink we can assume that the lte constraint will not
 * be broken by searching further once this state is seen.
 *
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_lteSolved(fdvar1, fdvar2) {
  return fdvar_upper_bound(fdvar1) <= fdvar_lower_bound(fdvar2);
}

// BODY_STOP

export {
  propagator_lteStepBare,
  propagator_lteStepWouldReject,
  propagator_lteSolved,
};
