import setup from '../fixtures/helpers.spec';
import {
  specDomainCreateBool,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateValue,
  specDomainCreateZero,
} from '../fixtures/domain.spec';
import {
  expect,
  assert,
} from 'chai';

import {
  helpers,
} from '../../src/helpers';
import {
  ASSERT,
  ASSERT_DOMAIN,
  ASSERT_DOMAIN_EMPTY_CHECK,
  ASSERT_DOMAIN_EMPTY_SET,
  ASSERT_DOMAIN_EMPTY_SET_OR_CHECK,
  ASSERT_PROPAGATOR,
  ASSERT_PROPAGATORS,
  ASSERT_SPACE,
  ASSERT_UNUSED_DOMAIN,
  ASSERT_VARS,
  GET_NAME,
  GET_NAMES,
  THROW,
} from '../../src/helpers';

describe("helpers.spec", function() {

  it('should exist', function() {
    expect(helpers).to.be.an('object');
  });

  describe('ASSERT', function() {

    it('should exist', function() {
      expect(ASSERT).to.be.an('object');
    });

    it('should do nothing when you pass true', function() {
      expect(ASSERT(true)).to.equal(undefined);
    });

    it('should throw if you pass on false', function() {
      expect(() => ASSERT(false)).to.throw();
    });
  });
});
