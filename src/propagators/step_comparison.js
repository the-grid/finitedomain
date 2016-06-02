// this is somewhat of a hack because the propagators used in
// this file are also used by reified, but the step_all also
// wants to use the reified propagator itself, which would
// lead to a circular reference. So instead I've opted to split
// the two steppers into their own files so that this file
// can be included in reified.coffee while the other stepper
// is included in space.coffee, and requires this as well.

import {
  THROW,
} from '../helpers';

import {
  propagator_ltStepWouldReject,
} from './lt';

import {
  propagator_lteStepWouldReject,
} from './lte';

import {
  propagator_eqStepWouldReject,
} from './eq';

import {
  propagator_neqStepWouldReject,
} from './neq';

import {
  propagator_ltStepBare,
} from './lt';

import {
  propagator_lteStepBare,
} from './lte';

import {
  propagator_eqStepBare,
} from './eq';

import {
  propagator_neqStepBare,
} from './neq';

// BODY_START

/**
 * @param {$space} space
 * @param {string} opName
 * @param {number} varIndex1
 * @param {number} varIndex2
 * @returns {$fd_changeState}
 */
function propagator_stepComparison(space, opName, varIndex1, varIndex2) {
  switch (opName) {
    case 'eq':
      return propagator_eqStepBare(space, varIndex1, varIndex2);

    case 'lt':
      return propagator_ltStepBare(space, varIndex1, varIndex2);

    case 'lte':
      return propagator_lteStepBare(space, varIndex1, varIndex2);

    case 'gt':
      return propagator_stepComparison(space, 'lt', varIndex2, varIndex1);

    case 'gte':
      return propagator_stepComparison(space, 'lte', varIndex2, varIndex1);

    case 'neq':
      return propagator_neqStepBare(space, varIndex1, varIndex2);

    default:
      return THROW(`unsupported propagator: [${opName}]`);
  }
}

/**
 * Do a fast dry run of one of the comparison propagators. Only returns
 * true when the step would result in REJECTED. Returns true otherwise.
 *
 * @param {string} opName
 * @param {$domain} domain1
 * @param {$domain} domain2
 * @returns {boolean}
 */
function propagator_stepWouldReject(opName, domain1, domain2) {
  switch (opName) {
    case 'lt':
      return propagator_ltStepWouldReject(domain1, domain2);

    case 'lte':
      return propagator_lteStepWouldReject(domain1, domain2);

    case 'gt': // A > B   <=>   B < A
      return propagator_ltStepWouldReject(domain2, domain1); // swapped vars!

    case 'gte': // A >= B   <=>   B <= A
      return propagator_lteStepWouldReject(domain2, domain1); // swapped vars!

    case 'eq':
      return propagator_eqStepWouldReject(domain1, domain2);

    case 'neq':
      return propagator_neqStepWouldReject(domain1, domain2);
  }

  THROW(`stepper_step_read_only: unsupported propagator: [${opName}]`);
}

// BODY_STOP

export {
  propagator_stepComparison,
  propagator_stepWouldReject,
};
