import setup from '../../fixtures/helpers.spec';
import {
  spec_d_create_bool,
  spec_d_create_range,
  spec_d_create_value,
} from '../../fixtures/domain.spec';
import {
  Solver,
  finitedomain_helpers,
  finitedomain_domain,
} from '../../../src/index';
import {
  expect,
  assert,
} from 'chai';

const NO_SUCH_VALUE = finitedomain_helpers.NO_SUCH_VALUE;
const domain_get_value = finitedomain_domain.domain_get_value;

describe("propagators/callback.spec", function() {

  if (!finitedomain.__DEV_BUILD) {
    return;
  }

  describe('integration tests', function() {

    it('should be able to access the var names array', function() {
      // some criteria to search for. callback will reject all but one.
      let [R, G, B] = [2, 120, 201];

      function callback(space, var_names) {

        let { vars } = space;

        let rv = domain_get_value(vars[var_names[0]].dom);
        let gv = domain_get_value(vars[var_names[1]].dom);
        let bv = domain_get_value(vars[var_names[2]].dom);

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
