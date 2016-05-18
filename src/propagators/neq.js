import {
  EMPTY,
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
  ASSERT_DOMAIN_EMPTY_CHECK,
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
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_neqStepBare(fdvar1, fdvar2) {
  let result = NO_CHANGES;
  let dom1 = fdvar1.dom;
  let dom2 = fdvar2.dom;

  ASSERT_DOMAIN_EMPTY_CHECK(dom1);
  ASSERT_DOMAIN_EMPTY_CHECK(dom2);

  if (domain_isSolved(dom1)) {
    let value = domain_getValue(dom1);
    if (typeof dom2 === 'number') {
      result = domain_removeValueNumbered(dom2, value);
      if (result === EMPTY) {
        fdvar2.dom = result;
        result = REJECTED;
      } else if (result !== dom2) {
        fdvar2.dom = result;
        result = SOME_CHANGES;
      } else {
        result = NO_CHANGES;
      }
    } else {
      result = domain_removeValueInline(dom2, value);
      if (result !== NO_CHANGES) {
        fdvar2.dom = domain_numarr(dom2);
      }
    }
  } else if (domain_isSolved(dom2)) {
    let value = domain_getValue(dom2);
    if (typeof dom1 === 'number') {
      result = domain_removeValueNumbered(dom1, value);
      if (result === EMPTY) {
        fdvar1.dom = result;
        result = REJECTED;
      } else if (result !== dom1) {
        fdvar1.dom = result;
        result = SOME_CHANGES;
      } else {
        result = NO_CHANGES;
      }
    } else {
      result = domain_removeValueInline(dom1, value);
      if (result !== NO_CHANGES) {
        fdvar1.dom = domain_numarr(dom1);
      }
    }
  }

  ASSERT(result === REJECTED || result === NO_CHANGES || result === SOME_CHANGES, 'turning stuff into enum, must be sure about values');
  ASSERT((result === REJECTED) === (domain_isRejected(fdvar1.dom) || domain_isRejected(fdvar2.dom)), 'if either domain is rejected, r should reflect this already');

  return result;
}

/**
 * neq will only reject if both domains are solved and equal.
 * This is a read-only check.
 *
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {boolean}
 */
function propagator_neqStepWouldReject(fdvar1, fdvar2) {
  let dom1 = fdvar1.dom;
  let dom2 = fdvar2.dom;

  if (!domain_isSolved(dom1) || !domain_isSolved(dom2)) {
    return false; // can not reject if either domain isnt solved
  }

  return domain_getValue(dom1) === domain_getValue(dom2);
}

/**
 * neq is solved if all values in both vars only occur in one var each
 *
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {boolean}
 */
function propagator_neqSolved(fdvar1, fdvar2) {
  return domain_sharesNoElements(fdvar1.dom, fdvar2.dom);
}

// BODY_STOP

export {
  propagator_neqStepBare,
  propagator_neqStepWouldReject,
  propagator_neqSolved,
};
