import {
  ASSERT,
  ASSERT_NUMSTRDOM,
  THROW,
} from '../helpers';

import {
  domain_any_divby,
  domain_any_getChangeState,
  domain_any_intersection,
  domain_any_mul,
} from '../domain';
import domain_any_plus from '../doms/domain_plus';
import domain_any_minus from '../doms/domain_minus';

// BODY_START

/**
 * @param {$space} space
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @param {number} varIndex3
 * @param {string} opName
 * @returns {$fd_changeState}
 */
function propagator_ringStepBare(space, varIndex1, varIndex2, varIndex3, opName) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  ASSERT(typeof opName === 'string', 'OP_SHOULD_BE_STRING');
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];

  let opFunc;
  switch (opName) {
    case 'plus':
      opFunc = domain_any_plus;
      break;
    case 'min':
      opFunc = domain_any_minus;
      break;
    case 'mul':
      opFunc = domain_any_mul;
      break;
    case 'div':
      opFunc = domain_any_divby;
      break;
    default:
      THROW('UNKNOWN ring opname', opName);
  }

  let domNext = _propagator_ringStepBare(domain1, domain2, domain3, opFunc, opName);
  space.vardoms[varIndex3] = domNext;

  return domain_any_getChangeState(domNext, domain3);
}

/**
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @param {$domain} domainResult
 * @param {Function} opFunc
 * @param {string} opName For debugging only, the canonical name of opFunc
 * @returns {$domain}
 */
function _propagator_ringStepBare(domain1, domain2, domainResult, opFunc, opName) {
  ASSERT(typeof opFunc === 'function', 'EXPECTING_FUNC_TO_BE:', opName);
  ASSERT_NUMSTRDOM(domain1);
  ASSERT_NUMSTRDOM(domain2);
  ASSERT(domain1 && domain2, 'SHOULD_NOT_BE_REJECTED');

  let domain = opFunc(domain1, domain2);

  return domain_any_intersection(domainResult, domain);
}

// BODY_STOP

export default propagator_ringStepBare;
export {
  _propagator_ringStepBare, // testing
};
