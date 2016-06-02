import expect from '../../fixtures/mocha_proxy.fixt';
import {
  //specDomainCreateRange,
  //specDomainCreateRanges,
  //specDomainSmallNums,
  //specDomainSmallEmpty,
} from '../../fixtures/domain.fixt';

import propagator_divStep from '../../../src/propagators/div';

describe('propagators/div.spec', function() {
  // in general after call v1 and v2 should be equal

  it('should exist', function() {
    expect(propagator_divStep).to.be.a('function');
  });

  // TODO...
});
