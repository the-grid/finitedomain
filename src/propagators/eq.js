import {
  LOG_FLAG_PROPSTEPS,

  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
} from '../helpers';

import {
  domain__debug,
  domain_intersection,
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
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @returns {$fd_changeState}
 */
function propagator_eqStepBare(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SHOULD_GET_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  let vardoms = space.vardoms;
  let domain1 = vardoms[varIndex1];
  let domain2 = vardoms[varIndex2];

  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let result = domain_intersection(domain1, domain2);

  vardoms[varIndex1] = result;
  vardoms[varIndex2] = result;

  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_eqStepBare; indexes:', varIndex1, varIndex2, 'doms:', domain__debug(domain1), 'eq', domain__debug(domain2), '->', domain__debug(result)));
  ASSERT_NORDOM(space.vardoms[varIndex1], true, domain__debug);
  ASSERT_NORDOM(space.vardoms[varIndex2], true, domain__debug);
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
  ASSERT_NORDOM(domain1);
  ASSERT_NORDOM(domain2);
  ASSERT(domain1 && domain2, 'NON_EMPTY_DOMAIN_EXPECTED');

  let result = domain_sharesNoElements(domain1, domain2);
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('propagator_eqStepWouldReject;', domain__debug(domain1), '!==', domain__debug(domain2), '->', result));
  return result;
}

// BODY_STOP

export {
  propagator_eqStepBare,
  propagator_eqStepWouldReject,
};
