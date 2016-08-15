import {
  ASSERT,
  ASSERT_NUMSTRDOM,
} from '../helpers';
import {
  domain_any_intersection,
} from '../domain';
import domain_any_minus from '../doms/domain_minus';

// BODY_START

/**
 * Min as in minus. Only updates the result domain.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 */
function propagator_minStep(space, config, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];

  space.vardoms[varIndex3] = _propagator_minStep(domain1, domain2, domain3);
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domResult
 * @returns {$domain}
 */
function _propagator_minStep(domain1, domain2, domResult) {
  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let domain = domain_any_minus(domain1, domain2);

  return domain_any_intersection(domResult, domain);
}

// BODY_STOP

export default propagator_minStep;
export {
  _propagator_minStep, // testing
};
