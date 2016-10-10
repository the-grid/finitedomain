import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_dom_empty,
  fixt_numdom_solved,
  fixt_strdom_nums,
  fixt_strdom_range,
} from '../../fixtures/domain.fixt';

import {
  LOG_FLAG_PROPSTEPS,
  LOG_FLAG_NONE,
  SUB,
  SUP,

  ASSERT_SET_LOG,
} from '../../../src/helpers';
import {
  config_addVarDomain,
  config_create,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';
import propagator_ringStepBare from '../../../src/propagators/ring';
import {
  _propagator_ringStepBare,
} from '../../../src/propagators/ring';
import domain_minus from '../../../src/doms/domain_minus';
import domain_plus from '../../../src/doms/domain_plus';

describe('propagators/ring.spec', function() {

  it('should prevent this regression', function() {
    let A = fixt_strdom_nums(1);
    let B = fixt_strdom_nums(1);
    let C = fixt_strdom_range(0, 1);

    let S = _propagator_ringStepBare(A, B, C, domain_minus, 'min');

    expect(S).to.eql(fixt_numdom_solved(0));
  });

  it('should add two numbers', function() {
    let A = fixt_strdom_nums(1);
    let B = fixt_strdom_nums(1);
    let C = fixt_strdom_range(0, 10);

    let S = _propagator_ringStepBare(A, B, C, domain_plus, 'plus');

    expect(S).to.eql(fixt_numdom_solved(2));
  });

  it('should reject if result is not in result domain', function() {
    let A = fixt_strdom_nums(1);
    let B = fixt_strdom_nums(1);
    let C = fixt_strdom_range(0, 1);

    let S = _propagator_ringStepBare(A, B, C, domain_plus, 'plus');

    expect(S).to.eql(fixt_dom_empty());
  });

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

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');
      let C = config.all_var_names.indexOf('C');

      propagator_ringStepBare(space, config, A, B, C, 'plus', domain_plus);

      expect(true).to.eql(true);
    });

    after(function() {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });
});
