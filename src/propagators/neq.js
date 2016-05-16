import {
  domain_getValue,
  domain_isSolved,
  domain_sharesNoElements,
} from '../domain';

import {
  fdvar_forceNeqInline,
} from '../fdvar';

// BODY_START

/**
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_neqStepBare(fdvar1, fdvar2) {
  return fdvar_forceNeqInline(fdvar1, fdvar2);
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
