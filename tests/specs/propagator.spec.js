import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_nums,
} from '../fixtures/domain.fixt';

import {
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
  //propagator_addRing,
  propagator_addRingPlusOrMul,
} from '../../src/propagator';
import {
  config_addVarDomain,
  config_create,
} from '../../src/config';

describe('src/propagator.spec', function() {
  // TOFIX: add tests for all these propagators. there never have been but most functions here are trivial to test.

  describe('propagator_addMarkov', function() {

    it('should exist', function() {
      expect(propagator_addMarkov).to.be.a('function');
    });

    it('should not crash', function() {
      let config = config_create();
      expect(propagator_addMarkov(config, 0)).to.equal(undefined);
    });
  });

  describe('propagator_addReified', function() {

    it('should exist', function() {
      expect(propagator_addReified).to.be.a('function');
    });

    it('should throw for unknown ops', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 100));
      config_addVarDomain(config, 'B', fixt_arrdom_nums(0, 100));
      config_addVarDomain(config, 'C', fixt_arrdom_nums(0, 1));
      expect(_ => propagator_addReified(config, 'fail', 0, 1, 2)).to.throw('UNKNOWN_REIFIED_OP');
      expect(_ => propagator_addReified(config, 15, 0, 1, 2)).to.throw('OP_SHOULD_BE_STRING');
    });

    // test reified with all variations of binary bound domains and also a [0,100] domain
    ['eq', 'neq', 'lt', 'gt', 'lte', 'gte'].forEach(op => {
      [[0, 0], [0, 1], [1, 1], [0, 100]].forEach(A => {
        [[0, 0], [0, 1], [1, 1], [0, 100]].forEach(B => {
          [[0, 0], [0, 1], [1, 1]].forEach(C => {

            it('should work with ' + op + ' with A=' + A + ' B=' + B + ' C=' + C, function() {
              let config = config_create();
              config_addVarDomain(config, 'A', A);
              config_addVarDomain(config, 'B', B);
              config_addVarDomain(config, 'C', C);
              propagator_addReified(config, op, config.allVarNames.indexOf('A'), config.allVarNames.indexOf('B'), config.allVarNames.indexOf('C'));
              expect(undefined).to.equal(undefined); // "do not crash"
            });

            it('should reject for non-bool result vars with ' + op + ' with A=' + A + ' B=' + B + ' C=[0,100]', function() {
              let config = config_create();
              config_addVarDomain(config, 'A', A);
              config_addVarDomain(config, 'B', B);
              config_addVarDomain(config, 'C', [0, 100]);
              expect(_ => propagator_addReified(config, op, config.allVarNames.indexOf('A'), config.allVarNames.indexOf('B'), config.allVarNames.indexOf('C'))).to.throw('should be bool bound');
            });
          });
        });
      });
    });
  });

  function testBinary(name, func) {

    describe('binary prop: ' + name, function() {

      it('should exist', function() {
        expect(func).to.be.a('function');
      });

      it('should return undefined', function() {
        let config = config_create();
        expect(func(config, 0, 1)).to.equal(undefined);
      });
    });
  }

  testBinary('propagator_addEq', propagator_addEq);
  testBinary('propagator_addNeq', propagator_addNeq);
  testBinary('propagator_addLt', propagator_addLt);
  testBinary('propagator_addLte', propagator_addLte);
  testBinary('propagator_addGt', propagator_addGt);
  testBinary('propagator_addGte', propagator_addGte);

  function testTernary(name, func) {

    describe('ternary prop: ' + name, function() {

      it('should exist', function() {
        expect(func).to.be.a('function');
      });

      it('should return undefined', function() {
        let config = config_create();
        expect(func(config, 0, 1, 2)).to.equal(undefined);
      });
    });
  }

  testTernary('propagator_addPlus', propagator_addPlus);
  testTernary('propagator_addMin', propagator_addMin);
  testTernary('propagator_addRingMul', propagator_addRingMul);
  testTernary('propagator_addDiv', propagator_addDiv);
  testTernary('propagator_addMul', propagator_addMul);

  function testUnbound(name, func, withResult) {

    describe('unbound prop: ' + name, function() {

      it('should exist', function() {
        expect(func).to.be.a('function');
      });

      it('should return undefined', function() {
        let config = config_create();
        expect(func(config, [0, 1, 2], withResult ? 3 : undefined)).to.equal(undefined);
      });
    });
  }

  testUnbound('propagator_addSum', propagator_addSum, true);
  testUnbound('propagator_addProduct', propagator_addProduct, true);
  testUnbound('propagator_addDistinct', propagator_addDistinct);

  describe('propagator_addRingPlusOrMul', function() {

    it('should exist', function() {
      expect(propagator_addRingPlusOrMul).to.be.a('function');
    });

    it('should return undefined', function() {
      let config = config_create();
      expect(propagator_addRingPlusOrMul(config, 'a', 'b', _ => 0, _ => 0, 0, 1, 2)).to.equal(undefined);
    });
  });
});
