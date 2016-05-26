import {
  EMPTY,
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
  ASSERT_DOMAIN_EMPTY_CHECK,
} from '../helpers';

import {
  domain_forceEq,
  domain_forceEqNumbered,
  domain_fromFlags,
  domain_isEqual,
  domain_isRejected,
  domain_isSolved,
  domain_sharesNoElements,
} from '../domain';

// BODY_START

/**
 * This eq propagator looks a lot different from neq because in
 * eq we can prune early all values that are not covered by both.
 * Any value that is not covered by both can not be a valid solution
 * that holds this constraint. In neq that's different and we can
 * only start pruning once at least one var has a solution.
 * Basically eq is much more efficient compared to neq because we
 * can potentially skip a lot of values early.
 *
 * @param {Space} space
 * @param {string} varName1
 * @param {string} varName2
 * @returns {$fd_changeState}
 */
function propagator_eqStepBare(space, varName1, varName2) {
  ASSERT(space && space._class === 'space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varName1 === 'string', 'VAR_SHOULD_BE_STRING');
  ASSERT(typeof varName2 === 'string', 'VAR_SHOULD_BE_STRING');

  let domain1 = space.vardoms[varName1];
  let domain2 = space.vardoms[varName2];

  ASSERT(!domain_isRejected(domain1), 'SHOULD_NOT_BE_REJECTED');
  ASSERT(!domain_isRejected(domain2), 'SHOULD_NOT_BE_REJECTED');

  let result;
  if (typeof domain1 === 'number' && typeof domain2 === 'number') {
    result = domain_forceEqNumbered(domain1, domain2);
  } else {
    // TODO: for now, just convert them. but this can be optimized a lot.
    result = domain_forceEq(typeof domain1 === 'number' ? domain_fromFlags(domain1) : domain1, typeof domain2 === 'number' ? domain_fromFlags(domain2) : domain2);
  }

  if (result === EMPTY) {
    space.vardoms[varName1] = EMPTY;
    space.vardoms[varName2] = EMPTY;
    return REJECTED;
  }

  if (result !== domain1 || result !== domain2) {
    space.vardoms[varName1] = result;
    space.vardoms[varName2] = result;
    if (!domain_isEqual(domain1, result) || !domain_isEqual(domain2, result)) {
      return SOME_CHANGES;
    }
  }
  return NO_CHANGES;
}

/**
 * The eq step would reject if there all elements in one domain
 * do not occur in the other domain. Because then there's no
 * valid option to make sure A=B holds. So search for such value
 * or return false.
 * Read only check
 *
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @returns {boolean}
 */
function propagator_eqStepWouldReject(dom1, dom2) {
  ASSERT_DOMAIN_EMPTY_CHECK(dom1);
  ASSERT_DOMAIN_EMPTY_CHECK(dom2);
//    if domain_isRejected dom1 or domain_isRejected dom2
//      return true

  return domain_sharesNoElements(dom1, dom2);
}

/**
 * An eq propagator is solved when both its vars are
 * solved. Any other state may still lead to failure.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_eqSolved(domain1, domain2) {
  return domain_isSolved(domain1) && domain_isSolved(domain2);
}

// BODY_STOP

export {
  propagator_eqStepBare,
  propagator_eqStepWouldReject,
  propagator_eqSolved,
};
