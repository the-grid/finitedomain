// this is somewhat of a hack because the propagators used in
// this file are also used by reified, but the step_all also
// wants to use the reified propagator itself, which would
// lead to a circular reference. So instead I've opted to split
// the two steppers into their own files so that this file
// can be included in reified.coffee while the other stepper
// is included in space.coffee, and requires this as well.

import {
  ASSERT,
} from '../helpers';

import {
  propagator_lt_solved,
} from './lt';

import {
  propagator_lte_solved,
} from './lte';

import {
  propagator_eq_solved,
} from './eq';

import {
  propagator_neq_solved,
} from './neq';

import {
  fdvar_is_solved,
  fdvar_lower_bound,
  fdvar_upper_bound,
} from '../fdvar';

// BODY_START

function propagator_isSolved(vars, propagator) {
  let op_name = propagator[0];
  let v1 = vars[propagator[1][0]];
  let v2 = vars[propagator[1][1]];

  switch (op_name) {
    case 'reified':
      // once a bool_var resolves its owner reified prop resolves when
      // the original op or inv op (depending on bool_var) resolves
      let varName3 = propagator[1][2];
      let v3 = vars[varName3];
      if (!fdvar_is_solved(v3)) {
        return false;
      }
      if (fdvar_lower_bound(v3) === 1) {
        return _propagator_comparisonIsSolved(propagator[2], v1, v2);
      }
      ASSERT(fdvar_upper_bound(v3) === 0, 'if bool_var is solved and lower is not 1 then upper should be 0', v3);
      return _propagator_comparisonIsSolved(propagator[3], v1, v2);

    case 'ring':
      if (fdvar_is_solved(v1) && fdvar_is_solved(v2)) {
        ASSERT(!propagator[1][2] || fdvar_is_solved(vars[propagator[1][2]]), 'ring and reified should solve their bool_var immediately after operand vars become solved');
        return true;
      }
      return false;

    case 'callback':
      // callback is more like a spy; never ditch it. I think.
      // (maybe we do want to ditch it if its argument vars are solved?)
      return false;

    case 'markov':
      // markov doesnt reduce the domain, only validates (in the propagator, not here)
      return false;

    // TOFIX: we may be able to come up with a fast algorithm to validate div and mul
    case 'min':
      return false;
    case 'div':
      return false;
    case 'mul':
      return false;

    default:
      return _propagator_comparisonIsSolved(op_name, v1, v2);
  }
}

function _propagator_comparisonIsSolved(op, v1, v2) {
  switch (op) {
    case 'lt':
      return propagator_lt_solved(v1, v2);

    case 'lte':
      return propagator_lte_solved(v1, v2);

    case 'gt':
      return propagator_lt_solved(v2, v1);

    case 'gte':
      return propagator_lte_solved(v2, v1);

    case 'eq':
      return propagator_eq_solved(v1, v2);

    case 'neq':
      return propagator_neq_solved(v1, v2);

    default:
      return THROW('unknown comparison op', op);
  }
}

// BODY_STOP

export {
  propagator_isSolved,
};

