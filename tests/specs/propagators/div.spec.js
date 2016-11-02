import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_arrdom_ranges,
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

import propagator_divStep from '../../../src/propagators/div';

describe('propagators/div.spec', function() {
  // in general after call v3 = v1 / v2 should be equal

  describe('with LOG', function() {

    before(function() {
      ASSERT_SET_LOG(LOG_FLAG_PROPSTEPS);
    });

    it('should improve test coverage by enabling logging', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(SUB, SUP));
      config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 10], [20, 300]));
      config_addVarDomain(config, 'C', fixt_arrdom_range(SUB, SUP));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');
      let C = config.allVarNames.indexOf('C');

      propagator_divStep(space, config, A, B, C);

      expect(true).to.eql(true);
    });

    after(function() {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });

  describe('propagator_divStep', function() {

    it('should exist', function() {
      expect(propagator_divStep).to.be.a('function');
    });
  });

  // TODO...
});
