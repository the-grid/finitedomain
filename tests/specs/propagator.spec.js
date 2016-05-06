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

const {
  propagator_add_callback,
  propagator_add_distinct,
  propagator_add_div,
  propagator_add_eq,
  propagator_add_gt,
  propagator_add_gte,
  propagator_add_lt,
  propagator_add_lte,
  propagator_add_markov,
  propagator_add_min,
  propagator_add_mul,
  propagator_add_neq,
  propagator_add_plus,
  propagator_add_product,
  propagator_add_reified,
  propagator_add_scale,
  propagator_add_ring_mul,
  propagator_add_sum,
  _propagator_add_ring_plus_or_mul,
} = finitedomain.propagator;

const {
  config_create
} = finitedomain.config;


describe("propagator.spec", function() {

  if (!finitedomain.__DEV_BUILD) {
    return;
  }

  // TOFIX: add tests for all these propagators. there never have been but most functions here are trivial to test.

  describe('propagator_add_markov', function() {
    it('should not crash', function() {
      propagator_add_markov(config_create(), 'foo');
      expect(true).to.equal(true);
    });
  });

  describe('propagator_add_reified', function() {

    it('should accept numbers for anonymous var A', function() {
      let config = config_create();
      propagator_add_reified(config, 'eq', 0, 'B', 'C');

      expect(() => propagator_add_reified(config, 'eq', 0, 'B', 'C')).not.to.throw();
    });

    it('should accept numbers for anonymous var B', function() {
      let config = config_create();

      expect(() => propagator_add_reified(config, 'eq', 'A', 0, 'C')).not.to.throw();
    });

    it('should throw if left and right vars are anonymous vars', function() {
      let config = config_create();

      expect(() => propagator_add_reified(config, 'eq', 0, 0, 'C')).to.throw();
    });

    describe('bool var domain', function() {

      it('should throw if the boolvar has no zero or one', function() {
        let config = config_create();

        expect(() => propagator_add_reified(config, 'eq', 'A', 'B', 'C')).to.throw();
      });

      it('should be fine if the boolvar has no one', function() {
        let config = config_create();

        expect(propagator_add_reified(config, 'eq', 'A', 'B', 'C')).to.eql('C');
      });

      it('should be fine if the boolvar has no zero', function() {
        let config = config_create();

        expect(propagator_add_reified(config, 'eq', 'A', 'B', 'C')).to.eql('C');
      });

      it('should be fine if the boolvar has more than zero and one', function() {
        let config = config_create();

        expect(propagator_add_reified(config, 'eq', 'A', 'B', 'C')).to.eql('C');
      });

      // TOFIX: re-enable this test when the check is back in place
      it.skip('should reduce the domain to bool if not already', function() {
        let config = config_create();
        propagator_add_reified(config, 'eq', 'A', 'B', 'C');

        expect(config.initial_vars.C).to.eql(spec_d_create_bool());
      });

      it('should accept a number for boolvar', function() {
        let config = config_create();

        expect(() => propagator_add_reified(config, 'eq', 'A', 'B', 0)).not.to.throw();
      });

      it('should return the name of the anon boolvar', function() {
        let config = config_create();

        expect(typeof propagator_add_reified(config, 'eq', 'A', 'B', 0)).to.eql('string');
      });

      it('should return the name of the named boolvar', function() {
        let config = config_create();

        expect(propagator_add_reified(config, 'eq', 'A', 'B', 'C')).to.eql('C');
      });
    });
  });

  describe('propagator_add_eq', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_add_eq(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_add_eq(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_add_eq(config, 0, 0)).to.throw();
      });
    })
  );

  describe('propagator_add_lt', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_add_lt(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_add_lt(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_add_lt(config, 0, 0)).to.throw();
      });
    })
  );

  describe('propagator_add_lte', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_add_lte(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_add_lte(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_add_lte(config, 0, 0)).to.throw();
      });
    })
  );

  describe('propagator_add_gt', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_add_gt(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_add_gt(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_add_gt(config, 0, 0)).to.throw();
      });
    })
  );

  describe('propagator_add_gte', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_add_gte(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_add_gte(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_add_gte(config, 0, 0)).to.throw();
      });
    })
  );

  describe('_propagator_add_ring_plus_or_mul', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof _propagator_add_ring_plus_or_mul(config, 'div', 'mul', 'A', 'B', 0)).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(_propagator_add_ring_plus_or_mul(config, 'div', 'mul', 'A', 'B', 'C')).to.eql('C');
    });
  });

  describe('propagator_add_sum', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_add_sum(config, ['A', 'B', 'C'])).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_add_sum(config, ['A', 'B', 'C'], 'D')).to.eql('D');
    });

    it('should allow anonymous numbers in the list of vars', function() {
      let config = config_create();

      expect(propagator_add_sum(config, ['A', 5, 'C'], 'D')).to.eql('D');
    });

    it('should throw if you dont pass on any vars', function() {
      let config = config_create();

      expect(() => propagator_add_sum(config, [], 'A')).to.throw();
    });

    it('should throw if you dont pass on an array', function() {
      let config = config_create();

      expect(() => propagator_add_sum(config(undefined, 'A'))).to.throw();
      expect(() => propagator_add_sum(config, 'X', 'A')).to.throw();
      expect(() => propagator_add_sum(config, 5, 'A')).to.throw();
      expect(() => propagator_add_sum(config, null, 'A')).to.throw();
    });
  });

  describe('propagator_add_product', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_add_product(config, ['A', 'B', 'C'])).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_add_product(config, ['A', 'B', 'C'], 'D')).to.eql('D');
    });
  });

  describe('propagator_add_min', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_add_min(config, 'A', 'B')).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_add_min(config, 'A', 'B', 'C')).to.eql('C');
    });
  });

  describe('propagator_add_div', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_add_div(config, 'A', 'B')).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_add_div(config, 'A', 'B', 'C')).to.eql('C');
    });
  });

  describe('propagator_add_mul', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_add_mul(config, 'A', 'B')).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_add_mul(config, 'A', 'B', 'C')).to.eql('C');
    });
  });
});
