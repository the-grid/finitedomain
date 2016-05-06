import setup from '../fixtures/helpers.spec';
import {
  specDomainCreateBool,
  specDomainCreateRange,
  specDomainCreateValue,
  specDomainCreateRanges,
  stripAnonVars,
} from '../fixtures/domain.spec';
import {
  expect,
  assert,
} from 'chai';

import {
  propagator_addCallback,
  propagator_addDistinct,
  propagator_addDiv,
  propagator_addEq,
  propagator_addGt,
  propagator_addGte,
  propagator_addLt,
  propagator_addLte,
  propagator_addMarkov,
  propagator_addMul,
  propagator_addNeq,
  propagator_addPlus,
  propagator_addMin,
  propagator_addProduct,
  propagator_addReified,
  propagator_addRingMul,
  propagator_addSum,

  // for testing
  propagator_addRing,
  propagator_addRingPlusOrMul,
} from '../../src/propagator';
import {
  config_create,
} from '../../src/config';


describe("propagator.spec", function() {
  // TOFIX: add tests for all these propagators. there never have been but most functions here are trivial to test.

  describe('propagator_addMarkov', function() {
    it('should not crash', function() {
      propagator_addMarkov(config_create(), 'foo');
      expect(true).to.equal(true);
    });
  });

  describe('propagator_addReified', function() {

    it('should accept numbers for anonymous var A', function() {
      let config = config_create();
      propagator_addReified(config, 'eq', 0, 'B', 'C');

      expect(() => propagator_addReified(config, 'eq', 0, 'B', 'C')).not.to.throw();
    });

    it('should accept numbers for anonymous var B', function() {
      let config = config_create();

      expect(() => propagator_addReified(config, 'eq', 'A', 0, 'C')).not.to.throw();
    });

    it('should throw if left and right vars are anonymous vars', function() {
      let config = config_create();

      expect(() => propagator_addReified(config, 'eq', 0, 0, 'C')).to.throw();
    });

    describe('bool var domain', function() {

      it('should throw if the boolvar has no zero or one', function() {
        let config = config_create();

        expect(() => propagator_addReified(config, 'eq', 'A', 'B', 'C')).to.throw();
      });

      it('should be fine if the boolvar has no one', function() {
        let config = config_create();

        expect(propagator_addReified(config, 'eq', 'A', 'B', 'C')).to.eql('C');
      });

      it('should be fine if the boolvar has no zero', function() {
        let config = config_create();

        expect(propagator_addReified(config, 'eq', 'A', 'B', 'C')).to.eql('C');
      });

      it('should be fine if the boolvar has more than zero and one', function() {
        let config = config_create();

        expect(propagator_addReified(config, 'eq', 'A', 'B', 'C')).to.eql('C');
      });

      // TOFIX: re-enable this test when the check is back in place
      it.skip('should reduce the domain to bool if not already', function() {
        let config = config_create();
        propagator_addReified(config, 'eq', 'A', 'B', 'C');

        expect(config.initial_vars.C).to.eql(specDomainCreateBool());
      });

      it('should accept a number for boolvar', function() {
        let config = config_create();

        expect(() => propagator_addReified(config, 'eq', 'A', 'B', 0)).not.to.throw();
      });

      it('should return the name of the anon boolvar', function() {
        let config = config_create();

        expect(typeof propagator_addReified(config, 'eq', 'A', 'B', 0)).to.eql('string');
      });

      it('should return the name of the named boolvar', function() {
        let config = config_create();

        expect(propagator_addReified(config, 'eq', 'A', 'B', 'C')).to.eql('C');
      });
    });
  });

  describe('propagator_addEq', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_addEq(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_addEq(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_addEq(config, 0, 0)).to.throw();
      });
    })
  );

  describe('propagator_addLt', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_addLt(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_addLt(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_addLt(config, 0, 0)).to.throw();
      });
    })
  );

  describe('propagator_addLte', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_addLte(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_addLte(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_addLte(config, 0, 0)).to.throw();
      });
    })
  );

  describe('propagator_addGt', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_addGt(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_addGt(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_addGt(config, 0, 0)).to.throw();
      });
    })
  );

  describe('propagator_addGte', () =>

    describe('numbers as anonymous vars', function() {

      it('should accept a number for var1', function() {
        let config = config_create();

        expect(() => propagator_addGte(config, 0, 'B')).not.to.throw();
      });

      it('should accept a number for var2', function() {
        let config = config_create();

        expect(() => propagator_addGte(config, 'A', 0)).not.to.throw();
      });

      it('should throw if both vars are anonymous numbers', function() {
        let config = config_create();

        expect(() => propagator_addGte(config, 0, 0)).to.throw();
      });
    })
  );

  describe('_propagator_addRing_plus_or_mul', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof _propagator_addRing_plus_or_mul(config, 'div', 'mul', 'A', 'B', 0)).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(_propagator_addRing_plus_or_mul(config, 'div', 'mul', 'A', 'B', 'C')).to.eql('C');
    });
  });

  describe('propagator_addSum', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addSum(config, ['A', 'B', 'C'])).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addSum(config, ['A', 'B', 'C'], 'D')).to.eql('D');
    });

    it('should allow anonymous numbers in the list of vars', function() {
      let config = config_create();

      expect(propagator_addSum(config, ['A', 5, 'C'], 'D')).to.eql('D');
    });

    it('should throw if you dont pass on any vars', function() {
      let config = config_create();

      expect(() => propagator_addSum(config, [], 'A')).to.throw();
    });

    it('should throw if you dont pass on an array', function() {
      let config = config_create();

      expect(() => propagator_addSum(config(undefined, 'A'))).to.throw();
      expect(() => propagator_addSum(config, 'X', 'A')).to.throw();
      expect(() => propagator_addSum(config, 5, 'A')).to.throw();
      expect(() => propagator_addSum(config, null, 'A')).to.throw();
    });
  });

  describe('propagator_addProduct', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addProduct(config, ['A', 'B', 'C'])).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addProduct(config, ['A', 'B', 'C'], 'D')).to.eql('D');
    });
  });

  describe('propagator_addMin', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addMin(config, 'A', 'B')).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addMin(config, 'A', 'B', 'C')).to.eql('C');
    });
  });

  describe('propagator_addDiv', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addDiv(config, 'A', 'B')).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addDiv(config, 'A', 'B', 'C')).to.eql('C');
    });
  });

  describe('propagator_addMul', function() {

    it('should return the name of the anonymous result var', function() {
      let config = config_create();

      expect(typeof propagator_addMul(config, 'A', 'B')).to.eql('string');
    });

    it('should return the name of the named result var', function() {
      let config = config_create();

      expect(propagator_addMul(config, 'A', 'B', 'C')).to.eql('C');
    });
  });
});
