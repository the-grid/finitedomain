import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_dom_empty,
  fixt_numdom_solved,
  fixt_strdom_nums,
  fixt_strdom_range,
} from '../../fixtures/domain.fixt';

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
});
