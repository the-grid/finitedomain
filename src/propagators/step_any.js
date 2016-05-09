import {
  ASSERT,
  ASSERT_PROPAGATOR,
  THROW,
} from '../helpers';

import {
  domain_divby,
  domain_minus,
  domain_plus,
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
  ASSERT_PROPAGATOR(propDatails);
  ASSERT(!!space, 'requires a space');

  return _propagator_stepAny(space, propDatails[PROP_NAME], propDatails[PROP_VAR_NAMES], propDatails);
}

/**
 * @param {Space} space
 * @param {string} opName
 * @param {string[]} propVarNames
 * @param {?} propDatails
 * @returns {*}
 */
function _propagator_stepAny(space, opName, propVarNames, propDatails) {
  let [vn1, vn2] = propVarNames;

  ASSERT(vn2 || opName === 'markov' || opName === 'callback', 'vn2 should exist for most props', propDatails);

  switch (opName) {
    case 'lt':
      return propagator_stepComparison(space, opName, vn1, vn2);

    case 'lte':
      return propagator_stepComparison(space, opName, vn1, vn2);

    case 'eq':
      return propagator_stepComparison(space, opName, vn1, vn2);

    case 'neq':
      return propagator_stepComparison(space, opName, vn1, vn2);

    case 'callback':
      return _propagator_cb(space, propVarNames, propDatails);

    case 'reified':
      return _propagator_reified(space, vn1, vn2, propVarNames, propDatails);

    case 'ring':
      return _propagator_ring(space, vn1, vn2, propVarNames, propDatails);

    case 'markov':
      return _propagator_markov(space, vn1);

    case 'min':
      return _propagator_min(space, vn1, vn2, propVarNames);

    case 'mul':
      return _propagator_mul(space, vn1, vn2, propVarNames, propDatails);

    case 'div':
      return _propagator_div(space, vn1, vn2, propVarNames, propDatails);

    default:
      THROW(`unsupported propagator: [${propDatails}]`);
  }
};

function _propagator_cb(space, propVarNames, propDetails) {
  return propagator_callbackStepBare(space, propVarNames, propDetails[PROP_CALLBACK]);
}

function _propagator_reified(space, vn1, vn2, propVarNames, propDetails) {
  let vn3 = propVarNames[2];
  return propagator_reifiedStepBare(space, vn1, vn2, vn3, propDetails[PROP_OP_NAME], propDetails[PROP_NOP_NAME]);
}

function _propagator_min(space, vn1, vn2, propVarNames) {
  let vn3 = propVarNames[2];
  let { vars } = space;
  ASSERT(vn1 && vn2 && vn3, 'expecting three vars', vn1, vn2, vn3);
  ASSERT(vars[vn1] && vars[vn2] && vars[vn3], 'expecting three vars to exist', vn1, vn2, vn3);
  return propagator_minStep(vars[vn1], vars[vn2], vars[vn3]);
}

function _propagator_mul(space, vn1, vn2, propVarNames) {
  let vn3 = propVarNames[2];
  let { vars } = space;
  ASSERT(vn1 && vn2 && vn3, 'expecting three vars', vn1, vn2, vn3);
  ASSERT(vars[vn1] && vars[vn2] && vars[vn3], 'expecting three vars to exist', vn1, vn2, vn3);
  return propagator_mulStep(vars[vn1], vars[vn2], vars[vn3]);
}

function _propagator_div(space, vn1, vn2, propVarNames) {
  let vn3 = propVarNames[2];
  let { vars } = space;
  ASSERT(vn1 && vn2 && vn3, 'expecting three vars', vn1, vn2, vn3);
  ASSERT(vars[vn1] && vars[vn2] && vars[vn3], 'expecting three vars to exist', vn1, vn2, vn3);
  return propagator_divStep(vars[vn1], vars[vn2], vars[vn3]);
}

function _propagator_ring(space, vn1, vn2, propVarNames, propDetails) {
  let { vars } = space;
  let vn3 = propVarNames[2];
  let op_name = propDetails[PROP_OP_FUNC];

  switch (op_name) {
    case 'plus':
      return propagator_ringStepBare(vars[vn1], vars[vn2], vars[vn3], domain_plus);
    case 'min':
      return propagator_ringStepBare(vars[vn1], vars[vn2], vars[vn3], domain_minus);
    case 'mul':
      return propagator_ringStepBare(vars[vn1], vars[vn2], vars[vn3], domain_mul);
    case 'div':
      return propagator_ringStepBare(vars[vn1], vars[vn2], vars[vn3], domain_divby);
    default:
      THROW('UNKNOWN ring opname', op_name);
  }
}

function _propagator_markov(space, vn1) {
  return propagator_markovStepBare(space, vn1);
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
