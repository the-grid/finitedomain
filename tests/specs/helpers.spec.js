import setup from '../fixtures/helpers.spec';
import {
  spec_d_create_bool,
  spec_d_create_range,
  spec_d_create_ranges,
  spec_d_create_value,
  spec_d_create_zero,
} from '../fixtures/domain.spec';
import finitedomain from '../../src/index';
import {
  expect,
  assert,
} from 'chai';

const {
  helpers,
} = finitedomain;

const {
  ASSERT,
} = helpers;

describe("helpers.spec", function() {

  if (!finitedomain.__DEV_BUILD) {
    return;
  }

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
