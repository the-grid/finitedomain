import setup from '../../fixtures/helpers.spec';
import {
  specDomainCreateBool,
  specDomainCreateRange,
  specDomainCreateValue,
} from '../../fixtures/domain.spec';
import {
  expect,
  assert,
} from 'chai';

import Solver from '../../../src/solver';
import {
  NO_SUCH_VALUE,
} from '../../../src/helpers';
import {
  domain_getValue,
} from '../../../src/domain';

describe("propagators/callback.spec", function() {

  describe('integration tests', function() {

    it('should be able to access the var names array', function() {
      // some criteria to search for. callback will reject all but one.
      let [R, G, B] = [2, 120, 201];

      function callback(space, var_names) {

        let { vars } = space;

        let rv = domain_getValue(vars[var_names[0]].dom);
        let gv = domain_getValue(vars[var_names[1]].dom);
        let bv = domain_getValue(vars[var_names[2]].dom);

        if (rv === NO_SUCH_VALUE || gv === NO_SUCH_VALUE || bv === NO_SUCH_VALUE) {
          return true; // at least one domain isnt a single value; keep searching
        }

        // exact match now
        return rv === R && gv === G && bv === B;
      }

      let solver = new Solver();
      solver.addVar('R', [0, 3]);
      solver.addVar('G', [119, 121]);
      solver.addVar('B', [200, 203]);
      solver.addVar('T', [R + G + B, R + G + B]);
      solver.sum(['R', 'G', 'B'], 'T');
      solver.callback(['R', 'G', 'B'], callback);

      solver.solve({
        distribute: 'naive',
        vars: ['R', 'G', 'B'],
        max: 10 // should only find 1
      });

      // note: there are a few solutions for the sum(), but only one passes the callback
      expect(solver.solutions.length, 'solutions').to.equal(1);
    });
  });
});
