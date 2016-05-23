import {
  EMPTY,
  NO_CHANGES,
  NO_SUCH_VALUE,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
} from '../helpers';
import {
  domain_getValue,
  domain_isRejected,
  domain_isSolved,
  domain_numarr,
  domain_removeValueInline,
  domain_removeValueNumbered,
  domain_sharesNoElements,
} from '../domain';

// BODY_START

/**
 * @param {Space} space
 * @param {string} varName1
 * @param {string} varName2
 * @returns {$fd_changeState}
 */
function propagator_neqStepBare(space, varName1, varName2) {
  ASSERT(space && space._class === 'space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varName1 === 'string', 'VAR_SHOULD_BE_STRING');
  ASSERT(typeof varName2 === 'string', 'VAR_SHOULD_BE_STRING');

  let domain1 = space.vardoms[varName1];
  let domain2 = space.vardoms[varName2];

  ASSERT(!domain_isRejected(domain1), 'SHOULD_NOT_BE_REJECTED');
  ASSERT(!domain_isRejected(domain2), 'SHOULD_NOT_BE_REJECTED');

  let result = NO_CHANGES;

  // remove solved value from the other domain. confirm neither rejects over it.
  let value = domain_getValue(domain1);
  if (value !== NO_SUCH_VALUE) {
    let newDomain;
    if (typeof domain2 === 'number') {
      newDomain = domain_removeValueNumbered(domain2, value);
      if (domain2 !== newDomain) result = SOME_CHANGES;
    } else {
      result = domain_removeValueInline(domain2, value);
      newDomain = domain_numarr(domain2);
    }
    if (newDomain === EMPTY) {
      space.vardoms[varName1] = EMPTY;
      space.vardoms[varName2] = EMPTY;
      result = REJECTED;
    } else if (result === SOME_CHANGES) {
      space.vardoms[varName2] = newDomain;
    }
  } else {
    // domain1 is not solved, just remove domain2 from domain1 if domain2 is solved
    value = domain_getValue(domain2);
    if (value !== NO_SUCH_VALUE) {
      let newDomain;
      if (typeof domain1 === 'number') {
        newDomain = domain_removeValueNumbered(domain1, value);
        if (domain1 !== newDomain) result = SOME_CHANGES;
      } else {
        result = domain_removeValueInline(domain1, value);
        newDomain = domain_numarr(domain1);
      }
      if (newDomain === EMPTY) {
        space.vardoms[varName1] = EMPTY;
        space.vardoms[varName2] = EMPTY;
        result = REJECTED;
      } else if (result === SOME_CHANGES) {
        space.vardoms[varName1] = newDomain;
      }
    }
  }

  ASSERT(result === REJECTED || result === NO_CHANGES || result === SOME_CHANGES, 'turning stuff into enum, must be sure about values');
  ASSERT((result === REJECTED) === (domain_isRejected(space.vardoms[varName1]) || domain_isRejected(space.vardoms[varName2])), 'if either domain is rejected, r should reflect this already');
  return result;
}

/**
 * neq will only reject if both domains are solved and equal.
 * This is a read-only check.
 *
 * @param {$domain} dom1
 * @param {$domain} dom2
 * @returns {boolean}
 */
function propagator_neqStepWouldReject(dom1, dom2) {
  if (!domain_isSolved(dom1) || !domain_isSolved(dom2)) {
    return false; // can not reject if either domain isnt solved
  }

  return domain_getValue(dom1) === domain_getValue(dom2);
}

/**
 * neq is solved if all values in both vars only occur in one var each
 *
 * @param {Space} space
 * @param {string} varName1
 * @param {string} varName2
 * @returns {boolean}
 */
function propagator_neqSolved(space, varName1, varName2) {
  return domain_sharesNoElements(space.vardoms[varName1], space.vardoms[varName2]);
}

// BODY_STOP

export {
  propagator_neqStepBare,
  propagator_neqStepWouldReject,
  propagator_neqSolved,
};
