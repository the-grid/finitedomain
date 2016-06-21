import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainSmallRange,
} from '../../fixtures/domain.fixt';

import propagator_minStep from '../../../src/propagators/min';

describe('propagators/min.spec', function() {

  it('should prevent this regression', function() {
    let A = [1, 1];
    let B = [1, 1];
    let C = [0, 1];

    let S = propagator_minStep(A, B, C);

    expect(S).to.eql(specDomainSmallRange(0, 0));
  });
});
