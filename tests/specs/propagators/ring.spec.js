import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_numdom_range,
  fixt_strdom_nums,
  fixt_strdom_range,
} from '../../fixtures/domain.fixt';

import {
  EMPTY,
} from '../../../src/helpers';
import propagator_ringStepBare from '../../../src/propagators/ring';
import domain_any_minus from '../../../src/doms/domain_minus';
import domain_any_plus from '../../../src/doms/domain_plus';

describe('propagators/ring.spec', function() {

  it('should prevent this regression', function() {
    let A = fixt_strdom_nums(1);
    let B = fixt_strdom_nums(1);
    let C = fixt_strdom_range(0, 1);

    let S = propagator_ringStepBare(A, B, C, domain_any_minus, 'min');

    expect(S).to.eql(fixt_numdom_range(0, 0));
  });

  it('should add two numbers', function() {
    let A = fixt_strdom_nums(1);
    let B = fixt_strdom_nums(1);
    let C = fixt_strdom_range(0, 10);

    let S = propagator_ringStepBare(A, B, C, domain_any_plus, 'plus');

    expect(S).to.eql(fixt_numdom_range(2, 2));
  });

  it('should reject if result is not in result domain', function() {
    let A = fixt_strdom_nums(1);
    let B = fixt_strdom_nums(1);
    let C = fixt_strdom_range(0, 1);

    let S = propagator_ringStepBare(A, B, C, domain_any_plus, 'plus');

    expect(S).to.eql(EMPTY);
  });
});
