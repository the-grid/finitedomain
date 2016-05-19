import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT_DOMAIN_EMPTY_CHECK,
} from '../helpers';

import {
  domain_isRejected,
  domain_max,
  domain_min,
  domain_numarr,
  domain_removeGteNumbered,
  domain_removeGteInline,
  domain_removeLteNumbered,
  domain_removeLteInline,
} from '../domain';

// BODY_START

/**
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {number}
 */
function propagator_lteStepBare(fdvar1, fdvar2) {
  ASSERT_DOMAIN_EMPTY_CHECK(fdvar1.dom);
  ASSERT_DOMAIN_EMPTY_CHECK(fdvar2.dom);

  let lo1 = domain_min(fdvar1.dom);
  let hi1 = domain_max(fdvar1.dom);
  let lo2 = domain_min(fdvar2.dom);
  let hi2 = domain_max(fdvar2.dom);

  // every number in v1 can only be smaller than or equal to the biggest
  // value in v2. bigger values will never satisfy lt so prune them.
  var leftChanged = NO_CHANGES;
  if (hi1 > hi2) {
    let domain = fdvar1.dom;
    if (typeof domain === 'number') {
      let result = domain_removeGteNumbered(domain, hi2 + 1);
      if (result !== domain) {
        fdvar1.dom = result;
        if (domain_isRejected(result)) { // TODO: there is no test throwing when you remove this check
          leftChanged = REJECTED;
        } else {
          leftChanged = SOME_CHANGES;
        }
      }
    } else {
      if (domain_removeGteInline(domain, hi2 + 1)) {
        fdvar1.dom = domain_numarr(fdvar1.dom);
        if (domain_isRejected(fdvar1.dom)) { // TODO: there is no test throwing when you remove this check
          leftChanged = REJECTED;
        } else {
          leftChanged = SOME_CHANGES;
        }
      } else {
        leftChanged = NO_CHANGES;
      }
    }
  }

  // likewise; numbers in v2 that are smaller than or equal to the
  // smallest value of v1 can never satisfy lt so prune them as well
  var rightChanged = NO_CHANGES;
  if (lo1 > lo2) {
    let domain = fdvar2.dom;
    if (typeof domain === 'number') {
      let result = domain_removeLteNumbered(domain, lo1 - 1);

      if (result !== domain) {
        fdvar2.dom = result;
        if (domain_isRejected(result)) {
          leftChanged = REJECTED;
        } else {
          leftChanged = SOME_CHANGES;
        }
      }
    } else {
      if (domain_removeLteInline(domain, lo1 - 1)) {
        fdvar2.dom = domain_numarr(domain);
        rightChanged = SOME_CHANGES;
        if (domain_isRejected(fdvar1.dom)) { // TODO: there is no test covering this
          leftChanged = REJECTED;
        }
      } else {
        rightChanged = NO_CHANGES;
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
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_lteStepWouldReject(fdvar1, fdvar2) {
  let dom1 = fdvar1.dom;
  let dom2 = fdvar2.dom;

  ASSERT_DOMAIN_EMPTY_CHECK(dom1);
  ASSERT_DOMAIN_EMPTY_CHECK(dom2);
//    if domain_isRejected dom1 or domain_isRejected dom2
//      return true

  return domain_min(dom1) > domain_max(dom2);
}

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
  return domain_max(fdvar1.dom) <= domain_min(fdvar2.dom);
}

// BODY_STOP

export {
  propagator_lteStepBare,
  propagator_lteStepWouldReject,
  propagator_lteSolved,
};
