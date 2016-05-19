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
 * @returns {*}
 */
function propagator_ltStepBare(fdvar1, fdvar2) {
  ASSERT_DOMAIN_EMPTY_CHECK(fdvar1.dom);
  ASSERT_DOMAIN_EMPTY_CHECK(fdvar2.dom);

  let lo1 = domain_min(fdvar1.dom);
  let hi1 = domain_max(fdvar1.dom);
  let lo2 = domain_min(fdvar2.dom);
  let hi2 = domain_max(fdvar2.dom);

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
  //  fdvar1.dom = EMPTY;
  //  fdvar2.dom = EMPTY;
  //  return REJECTED;
  //}

  // every number in v1 can only be smaller than or equal to the biggest
  // value in v2. bigger values will never satisfy lt so prune them.
  var leftChanged = NO_CHANGES;
  if (hi1 >= hi2) {
    let domain = fdvar1.dom;
    if (typeof domain === 'number') {
      let result = domain_removeGteNumbered(domain, hi2);
      if (result !== domain) {
        fdvar1.dom = result;
        if (domain_isRejected(result)) { // TODO: there is no test throwing when you remove this check
          leftChanged = REJECTED;
        } else {
          leftChanged = SOME_CHANGES;
        }
      }
    } else {
      if (domain_removeGteInline(domain, hi2)) {
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
  if (lo1 >= lo2) {
    let domain = fdvar2.dom;
    if (typeof domain === 'number') {
      let result = domain_removeLteNumbered(domain, lo1);

      if (result !== domain) {
        fdvar2.dom = result;
        if (domain_isRejected(result)) {
          leftChanged = REJECTED;
        } else {
          leftChanged = SOME_CHANGES;
        }
      }
    } else {
      if (domain_removeLteInline(domain, lo1)) {
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
  return domain_max(fdvar1.dom) < domain_min(fdvar2.dom);
}

// BODY_STOP

export {
  propagator_ltStepBare,
  propagator_ltStepWouldReject,
  propagator_ltSolved,
};
