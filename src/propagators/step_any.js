import {
  ASSERT,
  THROW,
} from '../helpers';

import {
  domain_any_divby,
  domain_any_getChangeState,
  domain_any_mul,
} from '../domain';
import domain_any_plus from '../doms/domain_plus';
import domain_any_minus from '../doms/domain_minus';

import propagator_callbackStepBare from './callback';
import propagator_markovStepBare from './markov';
import propagator_reifiedStepBare from './reified';
import propagator_ringStepBare from './ring';
import propagator_minStep from './min';
import propagator_mulStep from './mul';
import propagator_divStep from './div';

import {
  propagator_stepComparison,
} from './step_comparison';

// BODY_START

/**
 * @param {$propagator} propagator
 * @param {$space} space
 */
function propagator_stepAny(propagator, space) {
  ASSERT(propagator._class === '$propagator', 'EXPECTING_PROPAGATOR');
  ASSERT(!!space, 'requires a space');

  let varIndex1 = propagator.index1;
  let varIndex2 = propagator.index2;

  let opName = propagator.name;

  ASSERT(varIndex2 >= 0 || opName === 'markov' || opName === 'callback', 'SHOULD_HAVE_SECOND_VAR', JSON.stringify(propagator));

  switch (opName) {
    case 'reified':
      return _propagator_reified(space, varIndex1, varIndex2, propagator);

    case 'lt':
      return propagator_stepComparison(space, opName, varIndex1, varIndex2);

    case 'lte':
      return propagator_stepComparison(space, opName, varIndex1, varIndex2);

    case 'eq':
      return propagator_stepComparison(space, opName, varIndex1, varIndex2);

    case 'neq':
      return propagator_stepComparison(space, opName, varIndex1, varIndex2);

    case 'callback':
      return propagator_callbackStepBare(space, propagator.index1, propagator.arg1);

    case 'ring':
      return _propagator_ring(space, varIndex1, varIndex2, propagator.index3, propagator.arg1);

    case 'markov':
      return _propagator_markov(space, varIndex1);

    case 'min':
      return _propagator_min(space, varIndex1, varIndex2, propagator.index3);

    case 'mul':
      return _propagator_mul(space, varIndex1, varIndex2, propagator.index3);

    case 'div':
      return _propagator_div(space, varIndex1, varIndex2, propagator.index3);

    default:
      THROW(`unsupported propagator: [${propagator}]`);
  }
}

function _propagator_reified(space, varIndex1, varIndex2, propagator) {
  return propagator_reifiedStepBare(space, varIndex1, varIndex2, propagator.index3, propagator.arg1, propagator.arg2);
}

function _propagator_min(space, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];
  ASSERT(domain1 !== undefined && domain2 !== undefined && domain3 !== undefined, 'expecting three vars to exist', varIndex1, varIndex2, varIndex3, domain1, domain2, domain3);

  let domNext = propagator_minStep(domain1, domain2, domain3);
  space.vardoms[varIndex3] = domNext;

  return domain_any_getChangeState(domNext, domain3);
}

function _propagator_mul(space, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];
  ASSERT(domain1 !== undefined && domain2 !== undefined && domain3 !== undefined, 'expecting three vars to exist', varIndex1, varIndex2, varIndex3, domain1, domain2, domain3);

  let domNext = propagator_mulStep(domain1, domain2, domain3);
  space.vardoms[varIndex3] = domNext;

  return domain_any_getChangeState(domNext, domain3);
}

function _propagator_div(space, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];
  ASSERT(domain1 !== undefined && domain2 !== undefined && domain3 !== undefined, 'expecting three vars to exist', varIndex1, varIndex2, varIndex3, domain1, domain2, domain3);

  let domNext = propagator_divStep(domain1, domain2, domain3);
  space.vardoms[varIndex3] = domNext;

  return domain_any_getChangeState(domNext, domain3);
}

function _propagator_ring(space, varIndex1, varIndex2, varIndex3, opName) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  ASSERT(typeof opName === 'string', 'OP_SHOULD_BE_STRING');
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];
  ASSERT(domain1 !== undefined && domain2 !== undefined && domain3 !== undefined, 'expecting three vars to exist', 'var indexes:', varIndex1, varIndex2, varIndex3, 'domains:', domain1, domain2, domain3);

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

  let domNext = propagator_ringStepBare(domain1, domain2, domain3, opFunc, opName);
  space.vardoms[varIndex3] = domNext;

  return domain_any_getChangeState(domNext, domain3);
}

function _propagator_markov(space, varIndex) {
  return propagator_markovStepBare(space, varIndex);
}

// BODY_STOP

export default propagator_stepAny;
