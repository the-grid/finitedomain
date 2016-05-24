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

// BODY_START

let PROP_NAME = 0;
let PROP_VAR_NAMES = 1;
let PROP_OP_NAME = 2;
let PROP_NOP_NAME = 3;
let PROP_CALLBACK = 2;
let PROP_OP_FUNC = 2;

/**
 * @param {?} propDatails
 * @param {Space} space
 */
function propagator_stepAny(propDatails, space) {
  ASSERT(!!space, 'requires a space');

  return _propagator_stepAny(space, propDatails[PROP_NAME], propDatails[PROP_VAR_NAMES], propDatails);
}

/**
 * @param {Space} space
 * @param {string} opName
 * @param {string[]} propVarNames
 * @param {?} propDetails
 * @returns {*}
 */
function _propagator_stepAny(space, opName, propVarNames, propDetails) {
  let [varName1, varName2] = propVarNames;

  ASSERT(varName2 || opName === 'markov' || opName === 'callback', 'varName2 should exist for most props', propDetails);

  switch (opName) {
    case 'lt':
      return propagator_stepComparison(space, opName, varName1, varName2);

    case 'lte':
      return propagator_stepComparison(space, opName, varName1, varName2);

    case 'eq':
      return propagator_stepComparison(space, opName, varName1, varName2);

    case 'neq':
      return propagator_stepComparison(space, opName, varName1, varName2);

    case 'callback':
      return _propagator_cb(space, propVarNames, propDetails);

    case 'reified':
      return _propagator_reified(space, varName1, varName2, propVarNames, propDetails);

    case 'ring':
      return _propagator_ring(space, varName1, varName2, propVarNames[2], propDetails[PROP_OP_FUNC]);

    case 'markov':
      return _propagator_markov(space, varName1);

    case 'min':
      return _propagator_min(space, varName1, varName2, propVarNames[2]);

    case 'mul':
      return _propagator_mul(space, varName1, varName2, propVarNames[2]);

    case 'div':
      return _propagator_div(space, varName1, varName2, propVarNames[2]);

    default:
      THROW(`unsupported propagator: [${propDetails}]`);
  }
}

function _propagator_cb(space, propVarNames, propDetails) {
  return propagator_callbackStepBare(space, propVarNames, propDetails[PROP_CALLBACK]);
}

function _propagator_reified(space, varName1, varName2, propVarNames, propDetails) {
  let varName3 = propVarNames[2];
  return propagator_reifiedStepBare(space, varName1, varName2, varName3, propDetails[PROP_OP_NAME], propDetails[PROP_NOP_NAME]);
}

function _propagator_min(space, varName1, varName2, varName3) {
  ASSERT(varName1 && varName2 && varName3, 'expecting three vars', varName1, varName2, varName3);
  let dom1 = space.vardoms[varName1];
  let dom2 = space.vardoms[varName2];
  let dom3 = space.vardoms[varName3];
  ASSERT(dom1 !== undefined && dom2 !== undefined && dom3 !== undefined, 'expecting three vars to exist', varName1, varName2, varName3, dom1, dom2, dom3);

  let domNext = propagator_minStep(dom1, dom2, dom3);
  space.vardoms[varName3] = domNext;

  return domain_getChangeState(domNext, dom3);
}

function _propagator_mul(space, varName1, varName2, varName3) {
  ASSERT(varName1 && varName2 && varName3, 'expecting three vars', varName1, varName2, varName3);
  let dom1 = space.vardoms[varName1];
  let dom2 = space.vardoms[varName2];
  let dom3 = space.vardoms[varName3];
  ASSERT(dom1 !== undefined && dom2 !== undefined && dom3 !== undefined, 'expecting three vars to exist', varName1, varName2, varName3, dom1, dom2, dom3);


  let domNext = propagator_mulStep(dom1, dom2, dom3);
  space.vardoms[varName3] = domNext;

  return domain_getChangeState(domNext, dom3);
}

function _propagator_div(space, varName1, varName2, varName3) {
  ASSERT(varName1 && varName2 && varName3, 'expecting three vars', varName1, varName2, varName3);
  let dom1 = space.vardoms[varName1];
  let dom2 = space.vardoms[varName2];
  let dom3 = space.vardoms[varName3];
  ASSERT(dom1 !== undefined && dom2 !== undefined && dom3 !== undefined, 'expecting three vars to exist', varName1, varName2, varName3, dom1, dom2, dom3);

  let domNext = propagator_divStep(dom1, dom2, dom3);
  space.vardoms[varName3] = domNext;

  return domain_getChangeState(domNext, dom3);
}

function _propagator_ring(space, varName1, varName2, varName3, opName) {
  ASSERT(varName1 && varName2 && varName3, 'expecting three vars', varName1, varName2, varName3);
  ASSERT(typeof opName === 'string', 'OP_SHOULD_BE_STRING');
  let dom1 = space.vardoms[varName1];
  let dom2 = space.vardoms[varName2];
  let dom3 = space.vardoms[varName3];
  ASSERT(dom1 !== undefined && dom2 !== undefined && dom3 !== undefined, 'expecting three vars to exist', varName1, varName2, varName3, dom1, dom2, dom3);

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

  let domNext = propagator_ringStepBare(dom1, dom2, dom3, opFunc, opName);
  space.vardoms[varName3] = domNext;

  return domain_getChangeState(domNext, dom3);
}

function _propagator_markov(space, varName1) {
  return propagator_markovStepBare(space, varName1);
}

// BODY_STOP

export default propagator_stepAny;
export {
  PROP_NAME,
  PROP_VAR_NAMES,
  PROP_OP_NAME,
  PROP_NOP_NAME,
  PROP_CALLBACK,
  PROP_OP_FUNC,
};
