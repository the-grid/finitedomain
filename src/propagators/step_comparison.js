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
  propagator_lt_step_would_reject,
} from './lt';

import {
  propagator_lte_step_would_reject,
} from './lte';

import {
  propagator_eq_step_would_reject,
} from './eq';

import {
  propagator_neq_step_would_reject,
} from './neq';

import {
  propagator_lt_step_bare,
} from './lt';

import {
  propagator_lte_step_bare,
} from './lte';

import {
  propagator_eq_step_bare,
} from './eq';

import {
  propagator_neq_step_bare,
} from './neq';

// BODY_START

/**
 * @param {Space} space
 * @param {string} opName
 * @param {Fdvar} varName1
 * @param {Fdvar} varName2
 * @returns {*}
 */
function propagator_stepComparison(space, opName, varName1, varName2) {
  let v1 = space.vars[varName1];
  let v2 = space.vars[varName2];

  switch (opName) {
    case 'lt':
      return propagator_lt_step_bare(v1, v2);

    case 'lte':
      return propagator_lte_step_bare(v1, v2);

    case 'gt':
      // TOFIX: should go to lte
      return propagator_stepComparison(space, 'lt', varName2, varName1);

    case 'gte':
      // TOFIX: should go to lt
      return propagator_stepComparison(space, 'lte', varName2, varName1);

    case 'eq':
      return propagator_eq_step_bare(v1, v2);

    case 'neq':
      return propagator_neq_step_bare(v1, v2);

    default:
      return THROW(`unsupported propagator: [${opName}]`);
  }
}

/**
 * Do a fast dry run of one of the comparison propagators. Only returns
 * true when the step would result in REJECTED. Returns true otherwise.
 *
 * @param {string} opName
 * @param {Fdvar} fdvar1
 * @param {Fdvar} fdvar2
 * @returns {*}
 */
function propagator_stepWouldReject(opName, fdvar1, fdvar2) {
  switch (opName) {
    case 'lt':
      return propagator_lt_step_would_reject(fdvar1, fdvar2);

    case 'lte':
      return propagator_lte_step_would_reject(fdvar1, fdvar2);

    case 'gt':
      // TOFIX: should go to lte
      return propagator_lt_step_would_reject(fdvar2, fdvar1); // swapped vars!

    case 'gte':
      return propagator_lte_step_would_reject(fdvar2, fdvar1); // swapped vars!

    case 'eq':
      return propagator_eq_step_would_reject(fdvar1, fdvar2);

    case 'neq':
      return propagator_neq_step_would_reject(fdvar1, fdvar2);

    default:
      THROW(`stepper_step_read_only: unsupported propagator: [${opName}]`);
  }
}

// BODY_STOP

export {
  propagator_stepComparison,
  propagator_stepWouldReject
};
