import expect from '../fixtures/mocha_proxy.fixt';

import {
  ASSERT,
} from '../../src/helpers';

describe('src/helpers.spec', function() {

  describe('ASSERT', function() {

    it('should exist', function() {
      expect(ASSERT).to.be.a('function');
    });

    it('should do nothing when you pass true', function() {
      expect(ASSERT(true)).to.equal(undefined);
    });

    it('should throw if you pass on false', function() {
      expect(() => ASSERT(false)).to.throw('Assertion fail: ');
    });
  });
});
