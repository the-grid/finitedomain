import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainSmallRange,
} from '../../fixtures/domain.fixt';

import propagator_ringStepBare from '../../../src/propagators/ring';
import domain_minus from '../../../src/doms/domain_minus';

describe('propagators/ring.spec', function() {

  it('should prevent this regression', function() {
    let A = [1, 1];
    let B = [1, 1];
    let C = [0, 1];

    let S = propagator_ringStepBare(A, B, C, domain_minus, 'min');

    expect(S).to.eql(specDomainSmallRange(0, 0));
  });
});
