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
  domain_numarr,
  domain_removeGteNumbered,
  domain_removeGteInline,
  domain_removeLteNumbered,
  domain_removeLteInline,
} from '../domain';

// BODY_START

/**
 * @param {Space} space
 * @param {string} varName1
 * @param {string} varName2
 * @returns {$fd_changeState}
 */
function propagator_lteStepBare(space, varName1, varName2) {
  ASSERT(space && space._class === 'space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varName1 === 'string', 'VAR_SHOULD_BE_STRING');
  ASSERT(typeof varName2 === 'string', 'VAR_SHOULD_BE_STRING');

  let domain1 = space.vardoms[varName1];
  let domain2 = space.vardoms[varName2];

  ASSERT_DOMAIN_EMPTY_CHECK(domain1);
  ASSERT_DOMAIN_EMPTY_CHECK(domain2);

  let lo1 = domain_min(domain1);
  let hi1 = domain_max(domain1);
  let lo2 = domain_min(domain2);
  let hi2 = domain_max(domain2);

  // every number in v1 can only be smaller than or equal to the biggest
  // value in v2. bigger values will never satisfy lt so prune them.
  var leftChanged = NO_CHANGES;
  if (hi1 > hi2) {
    if (typeof domain1 === 'number') {
      let result = domain_removeGteNumbered(domain1, hi2 + 1);
      if (result !== domain1) {
        space.vardoms[varName1] = result;
        if (domain_isRejected(result)) { // TODO: there is no test throwing when you remove this check
          leftChanged = REJECTED;
        } else {
          leftChanged = SOME_CHANGES;
        }
      }
    } else {
      if (domain_removeGteInline(domain1, hi2 + 1)) {
        space.vardoms[varName1] = domain_numarr(domain1);
        if (domain_isRejected(domain1)) { // TODO: there is no test throwing when you remove this check
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
    if (typeof domain2 === 'number') {
      let result = domain_removeLteNumbered(domain2, lo1 - 1);

      if (result !== domain2) {
        space.vardoms[varName2] = result;
        if (domain_isRejected(result)) {
          leftChanged = REJECTED;
        } else {
          leftChanged = SOME_CHANGES;
        }
      }
    } else {
      if (domain_removeLteInline(domain2, lo1 - 1)) {
        space.vardoms[varName2] = domain_numarr(domain2);
        rightChanged = SOME_CHANGES;
        if (domain_isRejected(domain2)) { // TODO: there is no test covering this
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
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @returns {boolean}
 */
function propagator_lteStepWouldReject(dom1, dom2) {
  ASSERT_DOMAIN_EMPTY_CHECK(dom1);
  ASSERT_DOMAIN_EMPTY_CHECK(dom2);
//    if domain_isRejected dom1 or domain_isRejected dom2
//      return true

  return domain_min(dom1) > domain_max(dom2);
}

/**
 * lte is solved if dom1 contains no values that are
 * higher than any numbers in dom2. Since domains only
 * shrink we can assume that the lte constraint will not
 * be broken by searching further once this state is seen.
 *
 * @param {Space} space
 * @param {string} varName1
 * @param {string} varName2
 * @returns {*}
 */
function propagator_lteSolved(space, varName1, varName2) {
  return domain_max(space.vardoms[varName1]) <= domain_min(space.vardoms[varName2]);
}

// BODY_STOP

export {
  propagator_lteStepBare,
  propagator_lteStepWouldReject,
  propagator_lteSolved,
};
