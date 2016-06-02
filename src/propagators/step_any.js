import {
  ASSERT,
  THROW,
} from '../helpers';

import {
  domain_divby,
  domain_getChangeState,
  domain_plus,
  domain_minus,
  domain_mul,
} from '../domain';

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

import {
  PROP_PNAME,
  PROP_VAR_INDEXES,
  PROP_ARG1,
  PROP_ARG2,
} from '../propagator';

// BODY_START

let PROP_OP_NAME = PROP_ARG1;
let PROP_NOP_NAME = PROP_ARG2;
let PROP_CALLBACK = PROP_ARG1;
let PROP_OP_FUNC = PROP_ARG1;

/**
 * @param {$propagator} propagator
 * @param {$space} space
 */
function propagator_stepAny(propagator, space) {
  ASSERT(!!space, 'requires a space');

  return _propagator_stepAny(space, propagator[PROP_PNAME], propagator[PROP_VAR_INDEXES], propagator);
}

/**
 * @param {$space} space
 * @param {string} opName
 * @param {number[]} propVarIndexes
 * @param {$propagator} propagator
 * @returns {$fd_changeState}
 */
function _propagator_stepAny(space, opName, propVarIndexes, propagator) {
  let varIndex1 = propVarIndexes[0];
  let varIndex2 = propVarIndexes[1];

  ASSERT(varIndex2 >= 0 || opName === 'markov' || opName === 'callback', 'varIndex2 index should exist for most props', propagator);

  switch (opName) {
    case 'reified':
      return _propagator_reified(space, varIndex1, varIndex2, propVarIndexes, propagator);

    case 'lt':
      return propagator_stepComparison(space, opName, varIndex1, varIndex2);

    case 'lte':
      return propagator_stepComparison(space, opName, varIndex1, varIndex2);

    case 'eq':
      return propagator_stepComparison(space, opName, varIndex1, varIndex2);

    case 'neq':
      return propagator_stepComparison(space, opName, varIndex1, varIndex2);

    case 'callback':
      return _propagator_cb(space, propVarIndexes, propagator);

    case 'ring':
      return _propagator_ring(space, varIndex1, varIndex2, propVarIndexes[2], propagator[PROP_OP_FUNC]);

    case 'markov':
      return _propagator_markov(space, varIndex1);

    case 'min':
      return _propagator_min(space, varIndex1, varIndex2, propVarIndexes[2]);

    case 'mul':
      return _propagator_mul(space, varIndex1, varIndex2, propVarIndexes[2]);

    case 'div':
      return _propagator_div(space, varIndex1, varIndex2, propVarIndexes[2]);

    default:
      THROW(`unsupported propagator: [${propagator}]`);
  }
}

function _propagator_cb(space, propVarIndexes, propagator) {
  return propagator_callbackStepBare(space, propVarIndexes, propagator[PROP_CALLBACK]);
}

function _propagator_reified(space, varIndex1, varIndex2, propVarIndexes, propagator) {
  let varIndex3 = propVarIndexes[2];
  return propagator_reifiedStepBare(space, varIndex1, varIndex2, varIndex3, propagator[PROP_OP_NAME], propagator[PROP_NOP_NAME]);
}

function _propagator_min(space, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];
  ASSERT(domain1 !== undefined && domain2 !== undefined && domain3 !== undefined, 'expecting three vars to exist', varIndex1, varIndex2, varIndex3, domain1, domain2, domain3);

  let domNext = propagator_minStep(domain1, domain2, domain3);
  space.vardoms[varIndex3] = domNext;

  return domain_getChangeState(domNext, domain3);
}

function _propagator_mul(space, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];
  ASSERT(domain1 !== undefined && domain2 !== undefined && domain3 !== undefined, 'expecting three vars to exist', varIndex1, varIndex2, varIndex3, domain1, domain2, domain3);

  let domNext = propagator_mulStep(domain1, domain2, domain3);
  space.vardoms[varIndex3] = domNext;

  return domain_getChangeState(domNext, domain3);
}

function _propagator_div(space, varIndex1, varIndex2, varIndex3) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];
  ASSERT(domain1 !== undefined && domain2 !== undefined && domain3 !== undefined, 'expecting three vars to exist', varIndex1, varIndex2, varIndex3, domain1, domain2, domain3);

  let domNext = propagator_divStep(domain1, domain2, domain3);
  space.vardoms[varIndex3] = domNext;

  return domain_getChangeState(domNext, domain3);
}

function _propagator_ring(space, varIndex1, varIndex2, varIndex3, opName) {
  ASSERT(varIndex1 >= 0 && varIndex2 >= 0 && varIndex3 >= 0, 'expecting three vars', varIndex1, varIndex2, varIndex3);
  ASSERT(typeof opName === 'string', 'OP_SHOULD_BE_STRING');
  let domain1 = space.vardoms[varIndex1];
  let domain2 = space.vardoms[varIndex2];
  let domain3 = space.vardoms[varIndex3];
  ASSERT(domain1 !== undefined && domain2 !== undefined && domain3 !== undefined, 'expecting three vars to exist', varIndex1, varIndex2, varIndex3, domain1, domain2, domain3);

  let opFunc;
  switch (opName) {
    case 'plus':
      opFunc = domain_plus;
      break;
    case 'min':
      opFunc = domain_minus;
      break;
    case 'mul':
      opFunc = domain_mul;
      break;
    case 'div':
      opFunc = domain_divby;
      break;
    default:
      THROW('UNKNOWN ring opname', opName);
  }

  let domNext = propagator_ringStepBare(domain1, domain2, domain3, opFunc, opName);
  space.vardoms[varIndex3] = domNext;

  return domain_getChangeState(domNext, domain3);
}

function _propagator_markov(space, varIndex) {
  return propagator_markovStepBare(space, varIndex);
}

// BODY_STOP

export default propagator_stepAny;
export {
  PROP_OP_NAME,
  PROP_NOP_NAME,
  PROP_CALLBACK,
  PROP_OP_FUNC,
};
