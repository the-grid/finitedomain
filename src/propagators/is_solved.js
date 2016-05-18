// this is somewhat of a hack because the propagators used in
// this file are also used by reified, but the step_all also
// wants to use the reified propagator itself, which would
// lead to a circular reference. So instead I've opted to split
// the two steppers into their own files so that this file
// can be included in reified.coffee while the other stepper
// is included in space.coffee, and requires this as well.

import {
  ASSERT,
  THROW,
} from '../helpers';

import {
  propagator_ltSolved,
} from './lt';

import {
  propagator_lteSolved,
} from './lte';

import {
  propagator_eqSolved,
} from './eq';

import {
  propagator_neqSolved,
} from './neq';

import {
  domain_isSolved,
  domain_max,
  domain_min,
} from '../domain';

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
      if (!domain_isSolved(v3.dom)) {
        return false;
      }
      if (domain_min(v3.dom) === 1) {
        return _propagator_comparisonIsSolved(propagator[2], v1, v2);
      }
      ASSERT(domain_max(v3.dom) === 0, 'if bool_var is solved and lower is not 1 then upper should be 0', v3);
      return _propagator_comparisonIsSolved(propagator[3], v1, v2);

    case 'ring':
      if (domain_isSolved(v1.dom) && domain_isSolved(v2.dom)) {
        ASSERT(!propagator[1][2] || domain_isSolved(vars[propagator[1][2]].dom), 'ring and reified should solve their bool_var immediately after operand vars become solved');
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
      return propagator_ltSolved(v1, v2);

    case 'lte':
      return propagator_lteSolved(v1, v2);

    case 'gt':
      return propagator_ltSolved(v2, v1);

    case 'gte':
      return propagator_lteSolved(v2, v1);

    case 'eq':
      return propagator_eqSolved(v1, v2);

    case 'neq':
      return propagator_neqSolved(v1, v2);
  }

  return THROW('unknown comparison op', op);
}

// BODY_STOP

export default propagator_isSolved;

