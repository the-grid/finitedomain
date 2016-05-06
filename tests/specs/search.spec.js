import setup from '../fixtures/helpers.spec';
import {
  spec_d_create_bool,
  spec_d_create_range,
  spec_d_create_value,
  spec_d_create_ranges,
  strip_anon_vars,
} from '../fixtures/domain.spec';
import finitedomain from '../../src/index';
import {
  expect,
  assert,
} from 'chai';

// TODO
describe("search.spec", function() {

  if (!finitedomain.__DEV_BUILD) {
    return;
  }

});
