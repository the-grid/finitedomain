import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainSmallRange,
} from '../fixtures/domain.fixt';

import {
  SUP,
} from '../../src/helpers';
import {
  fdvar_create,
} from '../../src/fdvar';

describe('fdvar.spec', function() {

  describe('fdvar_create', function() {

    it('should exist', function() {
      expect(fdvar_create).to.be.a('function');
    });

    it('should work with array domain', function() {
      let A = fdvar_create('A', specDomainCreateRange(30, SUP));

      expect(A.dom).to.eql(specDomainCreateRange(30, SUP));
    });

    it('should work with numbered domain', function() {
      let A = fdvar_create('A', specDomainSmallRange(0, 10));

      expect(A.dom).to.eql(specDomainSmallRange(0, 10));
    });
  });
});
