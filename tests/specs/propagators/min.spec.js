import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_dom_nums,
  fixt_dom_range,
  fixt_numdom_solved,
} from '../../fixtures/domain.fixt';

import {
  LOG_FLAG_PROPSTEPS,
  LOG_FLAG_NONE,
  SUB,
  SUP,

  ASSERT_SET_LOG,
} from '../../../src/helpers';
import {
  config_create,
  config_addVarDomain,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';
import propagator_minStep from '../../../src/propagators/min';
import {
  _propagator_minStep,
} from '../../../src/propagators/min';

describe('propagators/min.spec', function() {

  it('should prevent this regression', function() {
    let A = fixt_dom_nums(1);
    let B = fixt_dom_nums(1);
    let C = fixt_dom_range(0, 1);

    let S = _propagator_minStep(A, B, C);

    expect(S).to.eql(fixt_numdom_solved(0));
  });

  describe('with LOG', function() {

    before(function() {
      ASSERT_SET_LOG(LOG_FLAG_PROPSTEPS);
    });

    it('should improve test coverage by enabling logging', function() {
      let config = config_create();
      let A = config_addVarDomain(config, 'A', fixt_arrdom_range(SUB, SUP));
      let B = config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 10], [20, 300]));
      let C = config_addVarDomain(config, 'C', fixt_arrdom_range(SUB, SUP));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      propagator_minStep(space, config, A, B, C);

      expect(true).to.eql(true);
    });

    after(function() {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });
});
