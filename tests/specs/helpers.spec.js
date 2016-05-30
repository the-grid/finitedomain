import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
} from '../fixtures/domain.fixt';

import {
  EMPTY,
  MAX_SMALL,
  ASSERT,
  _ASSERT_DOMAIN,
  //ASSERT_DOMAIN_EMPTY_CHECK,
  //ASSERT_DOMAIN_EMPTY_SET,
  _ASSERT_DOMAIN_EMPTY_SET,
  //ASSERT_DOMAIN_EMPTY_SET_OR_CHECK,
  //GET_NAME,
  //GET_NAMES,
  //THROW,
} from '../../src/helpers';
import {
  ZERO,
  ONE,
  TWO,
  THREE,
  FOUR,
  FIVE,
  SIX,
  SEVEN,
  EIGHT,
  NINE,
  TEN,
  ELEVEN,
  TWELVE,
  THIRTEEN,
  FOURTEEN,
  FIFTEEN,
} from '../../src/domain';

describe('src/helpers.spec', function() {

  describe('MAX_SMALL', function() {

    it('should equal the value of all flags enabled', function() {
      let start = EMPTY;

      start |= ZERO;
      start |= ONE;
      start |= TWO;
      start |= THREE;
      start |= FOUR;
      start |= FIVE;
      start |= SIX;
      start |= SEVEN;
      start |= EIGHT;
      start |= NINE;
      start |= TEN;
      start |= ELEVEN;
      start |= TWELVE;
      start |= THIRTEEN;
      start |= FOURTEEN;
      start |= FIFTEEN;

      expect(start).to.equal(MAX_SMALL);
    });
  });

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
      expect(_ASSERT_DOMAIN(specDomainCreateRange(0, 1, true))).to.equal(undefined);
    });
  });

  describe('_ASSERT_DOMAIN_EMPTY_SET', function() {

    it('should exist', function() {
      expect(_ASSERT_DOMAIN_EMPTY_SET).to.be.a('function');
    });

    it('should not throw with valid domain', function() {
      _ASSERT_DOMAIN_EMPTY_SET(specDomainCreateRange(0, 1, true));
    });
  });
});
