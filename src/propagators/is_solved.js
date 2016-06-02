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
  PROP_VAR_INDEXES,
  PROP_ARG1,
  PROP_ARG2,
} from '../propagator';

// BODY_START

function propagator_isSolved(space, propagator) {
  let varIndexes = propagator[PROP_VAR_INDEXES];
  let opName = propagator[PROP_PNAME];

  let domain1 = space.vardoms[varIndexes[0]];
  let domain2 = space.vardoms[varIndexes[1]];

  switch (opName) {
    case 'reified':
      // once a bool_var resolves its owner reified prop resolves when
      // the original op or inv op (depending on bool_var) resolves
      let varIndex3 = propagator[PROP_VAR_INDEXES][2];

      let domain3 = space.vardoms[varIndex3];
      ASSERT(typeof domain3 === 'number', 'RESULT_VAR_INDEX_SHOULD_BE_NUMBER_DOMAIN');
      ASSERT(domain3 & BOOL, 'BOOL_SHOULD_BE_ZERO_AND_OR_ONE');
      ASSERT(typeof propagator[PROP_ARG1] === 'string', 'OP_NAME_SHOULD_BE_STRING');
      ASSERT(typeof propagator[PROP_ARG2] === 'string', 'NOP_NAME_SHOULD_BE_STRING');

      if (domain3 === ONE) return _propagator_comparisonIsSolved(propagator[PROP_ARG1], domain1, domain2); // untested (ARG2 here wont fail a test)
      if (domain3 === ZERO) return _propagator_comparisonIsSolved(propagator[PROP_ARG2], domain1, domain2); // untested (ARG1 here wont fail a test)

      ASSERT(domain3 === BOOL, 'UNSOLVED_SHOULD_BE_BOOL');
      return false;

    case 'ring':
      if (domain_isSolved(domain1) && domain_isSolved(domain2)) {
        ASSERT(!varIndexes[2] || domain_isSolved(space.vardoms[varIndexes[2]]), 'ring and reified should solve their bool_var immediately after operand vars become solved');
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
      return _propagator_comparisonIsSolved(opName, domain1, domain2);
  }
}

function _propagator_comparisonIsSolved(op, domain1, domain2) {
  switch (op) {
    case 'lt':
      return propagator_ltSolved(domain1, domain2);

    case 'lte':
      return propagator_lteSolved(domain1, domain2);

    case 'gt':
      return propagator_ltSolved(domain1, domain2);

    case 'gte':
      return propagator_lteSolved(domain1, domain2);

    case 'eq':
      return propagator_eqSolved(domain1, domain2);

    case 'neq':
      return propagator_neqSolved(domain1, domain2);
  }

  return THROW('unknown comparison op', op);
}

// BODY_STOP

export default propagator_isSolved;

