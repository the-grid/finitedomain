/*

domains, internally, can be either an array or a number
if its a number then that's a bitwise flag for a range of [0,15]

spaces track var ranges through a single object; name: domain
domains should probably be tracked centrally

manually computed domains can lead to duplication but that's
deduping will still lead to saving on cloning

 */

import {
  EMPTY,
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,

  ASSERT,
  ASSERT_DOMAIN_EMPTY_CHECK,
} from '../helpers';

import {
  domain_forceEqInline,
  domain_forceEqNumbered,
  domain_fromFlags,
  domain_isRejected,
  domain_isSolved,
  domain_numarr,
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
 * @returns {$domain}
 */
function propagator_eqStepBare(space, varName1, varName2) {
  ASSERT(space && space._class === 'space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varName1 === 'string', 'VAR_SHOULD_BE_STRING');
  ASSERT(typeof varName2 === 'string', 'VAR_SHOULD_BE_STRING');

  let fdvar1 = space.oldvars[varName1];
  let fdvar2 = space.oldvars[varName2];

  let domain1 = fdvar1.dom;
  let domain2 = fdvar2.dom;

  ASSERT(!domain_isRejected(domain1), 'SHOULD_NOT_BE_REJECTED');
  ASSERT(!domain_isRejected(domain2), 'SHOULD_NOT_BE_REJECTED');

  if (typeof domain1 === 'number' && typeof domain2 === 'number') {
    let result = domain_forceEqNumbered(domain1, domain2);
    if (result === EMPTY) {
      fdvar1.dom = result;
      fdvar2.dom = result;
      return REJECTED;
    }
    if (result !== domain1 || result !== domain2) {
      fdvar1.dom = result;
      fdvar2.dom = result;
      return SOME_CHANGES;
    }
    return NO_CHANGES;
  }

  // TODO: for now, just convert them. but this can be optimized a lot.
  if (typeof domain1 === 'number') domain1 = domain_fromFlags(domain1);
  if (typeof domain2 === 'number') domain2 = domain_fromFlags(domain2);
  let changeState = domain_forceEqInline(domain1, domain2);

  if (changeState === SOME_CHANGES) {
    fdvar1.dom = domain_numarr(domain1);
    fdvar2.dom = domain_numarr(domain2);
  }

  // if this assert fails, update the following checks accordingly!
  ASSERT(changeState >= -1 && changeState <= 1, 'state should be -1 for reject, 0 for no change, 1 for both changed; but was ?', changeState);

  if (changeState === REJECTED) {
    return REJECTED;
  }

  return changeState;
}

/**
 * The eq step would reject if there all elements in one domain
 * do not occur in the other domain. Because then there's no
 * valid option to make sure A=B holds. So search for such value
 * or return false.
 * Read only check
 *
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_eqStepWouldReject(fdvar1, fdvar2) {
  let dom1 = fdvar1.dom;
  let dom2 = fdvar2.dom;

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
 * @param {Space} space
 * @param {string} varName1
 * @param {string} varName2
 * @returns {boolean}
 */
function propagator_eqSolved(space, varName1, varName2) {
  return domain_isSolved(space.oldvars[varName1].dom) && domain_isSolved(space.oldvars[varName2].dom);
}

// BODY_STOP

export {
  propagator_eqStepBare,
  propagator_eqStepWouldReject,
  propagator_eqSolved,
};
