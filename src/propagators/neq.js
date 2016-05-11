import {
  domain_max,
  domain_min,
  domain_sharesNoElements,
} from '../domain';

import {
  fdvar_forceNeqInline,
} from '../fdvar';

// BODY_START

let PAIR_SIZE = 2;

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
  let len1 = dom1.length;
  let len2 = dom2.length;

  if (len1 === 0 || len2 === 0) {
    return true;
  }
  if (len1 !== PAIR_SIZE || len2 !== PAIR_SIZE) {
    return false;
  }

  // reject if domains are solved (lo=hi) and same as other domain

  let lo = domain_min(dom1);
  let hi = domain_max(dom1);
  return lo === hi && lo === domain_min(dom2) && lo === domain_max(dom2);
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
