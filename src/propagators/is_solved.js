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
  BOOL,
  ONE,
  ZERO,

  domain_isSolved,
} from '../domain';
import {
  PROP_PNAME,
  PROP_VNAMES,
  PROP_ARG1,
  PROP_ARG2,
} from '../propagator';

// BODY_START

function propagator_isSolved(space, propagator) {
  let varNames = propagator[PROP_VNAMES];
  let op_name = propagator[PROP_PNAME];

  switch (op_name) {
    case 'reified':
      // once a bool_var resolves its owner reified prop resolves when
      // the original op or inv op (depending on bool_var) resolves
      let varName3 = propagator[PROP_VNAMES][2];

      let domain3 = space.vars[varName3].dom;
      ASSERT(typeof domain3 === 'number', 'BOOL_VAR_SHOULD_BE_NUMBER_DOMAIN');
      ASSERT(domain3 & BOOL, 'BOOL_SHOULD_BE_ZERO_AND_OR_ONE');
      ASSERT(typeof propagator[PROP_ARG1] === 'string', 'OP_NAME_SHOULD_BE_STRING');
      ASSERT(typeof propagator[PROP_ARG2] === 'string', 'NOP_NAME_SHOULD_BE_STRING');

      if (domain3 === ONE) return _propagator_comparisonIsSolved(space, propagator[PROP_ARG1], varNames[0], varNames[1]); // untested (ARG2 here wont fail a test)
      if (domain3 === ZERO) return _propagator_comparisonIsSolved(space, propagator[PROP_ARG2], varNames[0], varNames[1]); // untested (ARG1 here wont fail a test)

      ASSERT(domain3 === BOOL, 'UNSOLVED_SHOULD_BE_BOOL');
      return false;

    case 'ring':
      if (domain_isSolved(space.vars[varNames[0]].dom) && domain_isSolved(space.vars[varNames[1]].dom)) {
        ASSERT(!varNames[2] || domain_isSolved(space.vars[varNames[2]].dom), 'ring and reified should solve their bool_var immediately after operand vars become solved');
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
      return _propagator_comparisonIsSolved(space, op_name, varNames[0], varNames[1]);
  }
}

function _propagator_comparisonIsSolved(space, op, varName1, varName2) {
  switch (op) {
    case 'lt':
      return propagator_ltSolved(space, varName1, varName2);

    case 'lte':
      return propagator_lteSolved(space, varName1, varName2);

    case 'gt':
      return propagator_ltSolved(space, varName2, varName1);

    case 'gte':
      return propagator_lteSolved(space, varName1, varName2);

    case 'eq':
      return propagator_eqSolved(space, varName1, varName2);

    case 'neq':
      return propagator_neqSolved(space, varName1, varName2);
  }

  return THROW('unknown comparison op', op);
}

// BODY_STOP

export default propagator_isSolved;

