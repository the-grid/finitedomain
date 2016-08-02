import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_numdom_nums,
  fixt_numdom_range,
} from '../../fixtures/domain.fixt';

import {
  _propagator_minStep,
} from '../../../src/propagators/min';

describe('propagators/min.spec', function() {

  it('should prevent this regression', function() {
    let A = fixt_numdom_nums(1);
    let B = fixt_numdom_nums(1);
    let C = fixt_numdom_range(0, 1);

    let S = _propagator_minStep(A, B, C);

    expect(S).to.eql(fixt_numdom_nums(0));
  });
});
