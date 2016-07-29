import {
  EMPTY,
  NO_CHANGES,
  NO_SUCH_VALUE,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
} from '../helpers';
import {
  domain_any_getValue,
  domain_any_isRejected,
  domain_any_isSolved,
  domain_any_removeValue,
  domain_any_sharesNoElements,
} from '../domain';

// BODY_START

/**
 * @param {$space} space
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @returns {$fd_changeState}
 */
function propagator_neqStepBare(space, varIndex1, varIndex2) {
  ASSERT(space && space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];

  ASSERT(!domain_any_isRejected(domain1), 'SHOULD_NOT_BE_REJECTED');
  ASSERT(!domain_any_isRejected(domain2), 'SHOULD_NOT_BE_REJECTED');

  let result = NO_CHANGES;

  // remove solved value from the other domain. confirm neither rejects over it.
  let value = domain_any_getValue(domain1);
  if (value !== NO_SUCH_VALUE) {
    let newDomain = domain_any_removeValue(domain2, value);
    if (domain2 !== newDomain) result = SOME_CHANGES;
    if (domain_any_isRejected(newDomain)) {
      space.vardoms[varIndex1] = EMPTY;
      space.vardoms[varIndex2] = EMPTY;
      result = REJECTED;
    } else if (result === SOME_CHANGES) {
      space.vardoms[varIndex2] = newDomain;
    }
  } else {
    // domain1 is not solved, just remove domain2 from domain1 if domain2 is solved
    value = domain_any_getValue(domain2);
    if (value !== NO_SUCH_VALUE) {
      let newDomain = domain_any_removeValue(domain1, value);
      if (domain1 !== newDomain) result = SOME_CHANGES;
      if (domain_any_isRejected(newDomain)) {
        space.vardoms[varIndex1] = EMPTY;
        space.vardoms[varIndex2] = EMPTY;
        result = REJECTED;
      } else if (result === SOME_CHANGES) {
        space.vardoms[varIndex1] = newDomain;
      }
    }
  }

  ASSERT(result === REJECTED || result === NO_CHANGES || result === SOME_CHANGES, 'turning stuff into enum, must be sure about values');
  ASSERT((result === REJECTED) === (domain_any_isRejected(space.vardoms[varIndex1]) || domain_any_isRejected(space.vardoms[varIndex2])), 'if either domain is rejected, r should reflect this already');
  return result;
}

/**
 * neq will only reject if both domains are solved and equal.
 * This is a read-only check.
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_neqStepWouldReject(domain1, domain2) {
  if (!domain_any_isSolved(domain1) || !domain_any_isSolved(domain2)) {
    return false; // can not reject if either domain isnt solved
  }

  return domain_any_getValue(domain1) === domain_any_getValue(domain2);
}

/**
 * neq is solved if all values in both vars only occur in one var each
 *
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_neqSolved(domain1, domain2) {
  return domain_any_sharesNoElements(domain1, domain2);
}

// BODY_STOP

export {
  propagator_neqStepBare,
  propagator_neqStepWouldReject,
  propagator_neqSolved,
};
