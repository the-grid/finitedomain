import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateBool,
  //specDomainCreateRange,
  //specDomainCreateRanges,
  //specDomainCreateValue,
  //specDomainCreateZero,
} from '../fixtures/domain.fixt';

import {
  ASSERT,
  _ASSERT_DOMAIN,
  //ASSERT_DOMAIN_EMPTY_CHECK,
  //ASSERT_DOMAIN_EMPTY_SET,
  _ASSERT_DOMAIN_EMPTY_SET,
  //ASSERT_DOMAIN_EMPTY_SET_OR_CHECK,
  //ASSERT_UNUSED_DOMAIN,
  _ASSERT_UNUSED_DOMAIN,
  //GET_NAME,
  //GET_NAMES,
  //THROW,
} from '../../src/helpers';

describe('helpers.spec', function() {

  describe('ASSERT', function() {

    it('should exist', function() {
      expect(ASSERT).to.be.a('function');
    });

    it('should do nothing when you pass true', function() {
      expect(ASSERT(true)).to.equal(undefined);
    });

    it('should throw if you pass on false', function() {
      expect(() => ASSERT(false)).to.throw();
    });
  });

  describe('_ASSERT_DOMAIN', function() {

    it('should exist', function() {
      expect(_ASSERT_DOMAIN).to.be.a('function');
    });

    it('should not throw with valid domain', function() {
      expect(_ASSERT_DOMAIN(specDomainCreateBool())).to.equal(undefined);
    });
  });

  describe('_ASSERT_UNUSED_DOMAIN', function() {
    it('should exist', function() {
      expect(_ASSERT_UNUSED_DOMAIN).to.be.a('function');
    });

    it('should not throw with valid domain', function() {
      _ASSERT_UNUSED_DOMAIN(specDomainCreateBool());
    });
  });

  describe('_ASSERT_UNUSED_DOMAIN', function() {
    it('should exist', function() {
      expect(_ASSERT_UNUSED_DOMAIN).to.be.a('function');
    });

    it('should not throw with valid domain', function() {
      _ASSERT_UNUSED_DOMAIN(specDomainCreateBool());
    });
  });

  describe('_ASSERT_DOMAIN_EMPTY_SET', function() {

    it('should exist', function() {
      expect(_ASSERT_DOMAIN_EMPTY_SET).to.be.a('function');
    });

    it('should not throw with valid domain', function() {
      _ASSERT_DOMAIN_EMPTY_SET(specDomainCreateBool());
    });
  });
});
