import {
  EMPTY,
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
  ASSERT_DOMAIN_EMPTY_CHECK,
} from '../helpers';

import {
  domain_any_intersection,
  domain_any_isEqual,
  domain_any_isRejected,
  domain_any_isSolved,
  domain_any_sharesNoElements,
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
 * @param {$space} space
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @returns {$fd_changeState}
 */
function propagator_eqStepBare(space, varIndex1, varIndex2) {
  ASSERT(space && space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];

  ASSERT(!domain_any_isRejected(domain1), 'SHOULD_NOT_BE_REJECTED');
  ASSERT(!domain_any_isRejected(domain2), 'SHOULD_NOT_BE_REJECTED');


  let result = domain_any_intersection(domain1, domain2);

  if (result === EMPTY) {
    space.vardoms[varIndex1] = EMPTY;
    space.vardoms[varIndex2] = EMPTY;
    return REJECTED;
  }

  if (result !== domain1 || result !== domain2) {
    space.vardoms[varIndex1] = result;
    space.vardoms[varIndex2] = result;
    if (!domain_any_isEqual(domain1, result) || !domain_any_isEqual(domain2, result)) {
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
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_eqStepWouldReject(domain1, domain2) {
  ASSERT_DOMAIN_EMPTY_CHECK(domain1);
  ASSERT_DOMAIN_EMPTY_CHECK(domain2);

  return domain_any_sharesNoElements(domain1, domain2);
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
  return domain_any_isSolved(domain1) && domain_any_isSolved(domain2);
}

// BODY_STOP

export {
  propagator_eqStepBare,
  propagator_eqStepWouldReject,
  propagator_eqSolved,
};
