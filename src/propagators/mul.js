import {
  ASSERT,
  ASSERT_NUMSTRDOM,
} from '../helpers';
import {
  domain_any_mul,
  domain_any_getChangeState,
  domain_any_intersection,
} from '../domain';

// BODY_START

/**
 * @param {$space} space
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 * @returns {$fd_changeState}
 */
function propagator_mulStep(space, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];

  let domNext = _propagator_mulStep(domain1, domain2, domain3);
  space.vardoms[varIndex3] = domNext;

  return domain_any_getChangeState(domNext, domain3);
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function _propagator_mulStep(domain1, domain2, domResult) {
  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let domain = domain_any_mul(domain1, domain2);

  return domain_any_intersection(domResult, domain);
}

// BODY_STOP

export default propagator_mulStep;
