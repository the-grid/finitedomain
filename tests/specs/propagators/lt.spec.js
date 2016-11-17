import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_arrdom_solved,
  fixt_dom_empty,
  fixt_dom_range,
  fixt_dom_ranges,
  fixt_dom_solved,
  fixt_domainEql,
} from '../../fixtures/domain.fixt';

import {
  LOG_FLAG_PROPSTEPS,
  LOG_FLAG_NONE,
  SUB,
  SUP,

  ASSERT_SET_LOG,
} from '../../../src/helpers';
import {
  domain__debug,
} from '../../../src/domain';
import {
  propagator_gtStepWouldReject,
  propagator_ltStepBare,
  propagator_ltStepWouldReject,
} from '../../../src/propagators/lt';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';
import {
  config_create,
  config_addVarRange,
  config_addVarDomain,
} from '../../../src/config';

describe('propagators/lt.spec', function() {
  // in general after call, max(v1) should be < max(v2) and min(v2) should be > min(v1)
  // it makes sure v1 and v2 have no values that can't possibly result in fulfilling <

  it('should exist', function() {
    expect(propagator_ltStepBare).to.be.a('function');
  });

  it('should require two vars', function() {
    let space = space_createRoot();

    expect(() => propagator_ltStepBare(space, 'A')).to.throw('VAR_INDEX_SHOULD_BE_NUMBER');
    expect(() => propagator_ltStepBare(space, undefined, 'B')).to.throw('VAR_INDEX_SHOULD_BE_NUMBER');
  });

  describe('with array', function() {

    it('should throw for empty domain', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(90, 100));
      config_addVarDomain(config, 'B', fixt_arrdom_range(200, 300));
      config_addVarDomain(config, 'C', fixt_arrdom_solved(100));
      config_addVarDomain(config, 'D', fixt_arrdom_solved(100));
      let space = space_createRoot();
      space_initFromConfig(space, config);
      space.vardoms[config.allVarNames.indexOf('C')] = fixt_dom_empty();
      space.vardoms[config.allVarNames.indexOf('D')] = fixt_dom_empty();

      expect(_ => propagator_ltStepBare(space, config, config.allVarNames.indexOf('A'), config.allVarNames.indexOf('B'))).not.to.throw();
      expect(_ => propagator_ltStepBare(space, config, config.allVarNames.indexOf('A'), config.allVarNames.indexOf('D'))).to.throw('SHOULD_NOT_BE_REJECTED');
      expect(_ => propagator_ltStepBare(space, config, config.allVarNames.indexOf('C'), config.allVarNames.indexOf('B'))).to.throw('SHOULD_NOT_BE_REJECTED');
      expect(_ => propagator_ltStepBare(space, config, config.allVarNames.indexOf('C'), config.allVarNames.indexOf('D'))).to.throw('SHOULD_NOT_BE_REJECTED');
    });

    it('should remove any value from v1 that is gte to max(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(90, 100));
      config_addVarDomain(config, 'B', fixt_arrdom_range(95, 99));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_range(90, 98));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(95, 99));
    });

    it('should remove SUP if both ranges end there', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(90, SUP));
      config_addVarDomain(config, 'B', fixt_arrdom_range(95, SUP));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_range(90, SUP - 1));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(95, SUP));
    });

    it('should not affect domains when v1 < v2', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(90, 100));
      config_addVarDomain(config, 'B', fixt_arrdom_range(101, 101));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      fixt_domainEql(space.vardoms[A], fixt_dom_range(90, 100));
      fixt_domainEql(space.vardoms[B], fixt_dom_range(101, 101));
    });

    it('should not affect overlapping ranges when max(v1) < max(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(90, 150));
      config_addVarDomain(config, 'B', fixt_arrdom_range(100, 200));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_range(90, 150));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(100, 200));
    });

    it('should reject if min(v1) > max(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(190, 200));
      config_addVarDomain(config, 'B', fixt_arrdom_range(100, 150));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_empty());
      expect(space.vardoms[B]).to.eql(fixt_dom_empty());
    });

    it('should reduce v2 if v1 is solved and > min(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(200, 200));
      config_addVarDomain(config, 'B', fixt_arrdom_range(100, 300));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      fixt_domainEql(space.vardoms[A], fixt_dom_range(200, 200));
      fixt_domainEql(space.vardoms[B], fixt_dom_range(201, 300));
    });

    it('should not change if v1 is solved and == min(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(200, 200));
      config_addVarDomain(config, 'B', fixt_arrdom_range(200, 300));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      fixt_domainEql(space.vardoms[A], fixt_dom_range(200, 200));
      fixt_domainEql(space.vardoms[B], fixt_dom_range(201, 300));
    });

    it('should be able to drop last range in v1', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_ranges([10, 20], [30, 40], [50, 60], [70, 98], [120, 150]));
      config_addVarDomain(config, 'B', fixt_arrdom_range(0, 100));
      let space = space_createRoot();
      space_initFromConfig(space, config);
      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');
      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_ranges([10, 20], [30, 40], [50, 60], [70, 98]));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(11, 100));

      config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_ranges([10, 20], [30, 40], [50, 60], [70, 98], [100, 150]));
      config_addVarDomain(config, 'B', fixt_arrdom_range(0, 100));
      space = space_createRoot();
      space_initFromConfig(space, config);
      A = config.allVarNames.indexOf('A');
      B = config.allVarNames.indexOf('B');
      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_ranges([10, 20], [30, 40], [50, 60], [70, 98]));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(11, 100));

      config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_ranges([10, 20], [30, 40], [50, 60], [70, 98], [100, 100]));
      config_addVarDomain(config, 'B', fixt_arrdom_range(0, 100));
      space = space_createRoot();
      space_initFromConfig(space, config);
      A = config.allVarNames.indexOf('A');
      B = config.allVarNames.indexOf('B');
      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_ranges([10, 20], [30, 40], [50, 60], [70, 98]));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(11, 100));
    });

    it('should be able to drop first range in v1', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_ranges([10, 20], [30, 40], [50, 60]));
      config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 10], [20, 100]));
      let space = space_createRoot();
      space_initFromConfig(space, config);
      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');
      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_ranges([10, 20], [30, 40], [50, 60]));
      expect(space.vardoms[B]).to.eql(fixt_dom_ranges([20, 100]));

      //config = config_create();
      //config_addVarDomain(config, 'A', fixt_arrdom_ranges([10, 20], [30, 40], [50, 60]));
      //config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 5], [20, 100]));
      //space = space_createRoot();
      //space_initFromConfig(space, config);
      //propagator_ltStepBare(space, config, A, B);
      //expect(space.vardoms[A]).to.eql(fixt_dom_ranges([10, 20], [30, 40], [50, 60]));
      //expect(space.vardoms[B]).to.eql(fixt_dom_ranges([20, 100]));
      //
      //config = config_create();
      //config_addVarDomain(config, 'A', fixt_arrdom_ranges([10, 20], [30, 40], [50, 60]));
      //config_addVarDomain(config, 'B', fixt_arrdom_ranges([10, 10], [20, 100]));
      //space = space_createRoot();
      //space_initFromConfig(space, config);
      //propagator_ltStepBare(space, config, A, B);
      //expect(space.vardoms[A]).to.eql(fixt_dom_ranges([10, 20], [30, 40], [50, 60]));
      //expect(space.vardoms[B]).to.eql(fixt_dom_ranges([20, 100]));
    });

    describe('edge of space', function() {

      function test(domainA, domainB) {
        let desc = 'should not crash with edge cases: ' + domain__debug(domainA) + ', ' + domain__debug(domainB);

        it(desc, function() {
          let config = config_create();
          config_addVarDomain(config, 'A', domainA);
          config_addVarDomain(config, 'B', domainB);
          let space = space_createRoot();
          space_initFromConfig(space, config);

          let A = config.allVarNames.indexOf('A');
          let B = config.allVarNames.indexOf('B');

          propagator_ltStepBare(space, config, A, B);
          expect(space.vardoms[A]).to.eql(fixt_dom_empty());
          expect(space.vardoms[B]).to.eql(fixt_dom_empty());
        });
      }

      test(fixt_arrdom_solved(0), fixt_arrdom_solved(0));
      test(fixt_arrdom_solved(SUP), fixt_arrdom_solved(0));
      test(fixt_arrdom_solved(SUP), fixt_arrdom_solved(SUP));

      test(fixt_arrdom_range(0, SUP), fixt_arrdom_solved(0));
      test(fixt_arrdom_solved(SUP), fixt_arrdom_range(0, SUP));
    });
  });

  describe('with numbers', function() {

    it('should throw for empty domain', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 9, 10);
      config_addVarRange(config, 'B', 11, 15);
      config_addVarDomain(config, 'C', fixt_arrdom_solved(100));
      config_addVarDomain(config, 'D', fixt_arrdom_solved(100));
      let space = space_createRoot();
      space_initFromConfig(space, config);
      space.vardoms[config.allVarNames.indexOf('C')] = fixt_dom_empty();
      space.vardoms[config.allVarNames.indexOf('D')] = fixt_dom_empty();

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');
      let C = config.allVarNames.indexOf('C');
      let D = config.allVarNames.indexOf('D');

      expect(_ => propagator_ltStepBare(space, config, A, B)).not.to.throw();
      expect(_ => propagator_ltStepBare(space, config, A, D)).to.throw('SHOULD_NOT_BE_REJECTED');
      expect(_ => propagator_ltStepBare(space, config, C, B)).to.throw('SHOULD_NOT_BE_REJECTED');
      expect(_ => propagator_ltStepBare(space, config, C, D)).to.throw('SHOULD_NOT_BE_REJECTED');
    });

    it('should remove any value from v1 that is gte to max(v2)', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 0, 10);
      config_addVarRange(config, 'B', 5, 9);
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_range(0, 8));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(5, 9));
    });

    it('should remove SUP if both ranges end there', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 0, 15);
      config_addVarRange(config, 'B', 5, 15);
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_range(0, 14));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(5, 15));
    });

    it('should not affect domains when v1 < v2', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 0, 10);
      config_addVarRange(config, 'B', 11, 15);
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_range(0, 10));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(11, 15));
    });

    it('should not affect overlapping ranges when min(v2) <= max(v1) < max(v2)', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 0, 13);
      config_addVarRange(config, 'B', 10, 15);
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_range(0, 13));
      expect(space.vardoms[B]).to.eql(fixt_dom_range(10, 15));
    });

    it('should reject if min(v1) > max(v2)', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 11, 15);
      config_addVarRange(config, 'B', 5, 8);
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      expect(space.vardoms[A]).to.eql(fixt_dom_empty());
      expect(space.vardoms[B]).to.eql(fixt_dom_empty());
    });

    it('should reduce v2 if v1 is solved and > min(v2)', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 8, 8);
      config_addVarRange(config, 'B', 5, 10);
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      fixt_domainEql(space.vardoms[A], fixt_dom_range(8, 8));
      fixt_domainEql(space.vardoms[B], fixt_dom_range(9, 10));
    });

    it('should reduce if v1 is solved and == min(v2)', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 7, 7);
      config_addVarRange(config, 'B', 7, 13);
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);
      fixt_domainEql(space.vardoms[A], fixt_dom_range(7, 7));
      fixt_domainEql(space.vardoms[B], fixt_dom_range(8, 13));
    });
  });

  describe('with LOG for test coverage', function() {

    before(function() {
      ASSERT_SET_LOG(LOG_FLAG_PROPSTEPS);
    });

    it('propagator_ltStepBare', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(SUB, SUP));
      config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 10], [20, 300]));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_ltStepBare(space, config, A, B);

      expect(true).to.eql(true);
    });

    it('propagator_ltStepWouldReject', function() {
      propagator_ltStepWouldReject(fixt_dom_solved(0), fixt_dom_solved(1));

      expect(true).to.eql(true);
    });

    it('propagator_gtStepWouldReject', function() {
      propagator_gtStepWouldReject(fixt_dom_solved(0), fixt_dom_solved(1));

      expect(true).to.eql(true);
    });

    after(function() {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });
});

// TOFIX: migrate and dedupe these tests
//describe('fdvar_removeLteInline', function() {
//
//  it('should exist', function() {
//    expect(fdvar_removeLteInline).to.be.a('function');
//  });
//
//  describe('with array', function() {
//
//    it('should remove all elements lte to value', function() {
//      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40]));
//      let R = fdvar_removeLteInline(fdvar, 25);
//
//      expect(fdvar.dom).to.eql(specDomainCreateRange(30, 40));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should be able to split up a range', function() {
//      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20]));
//      let R = fdvar_removeLteInline(fdvar, 15);
//
//      expect(fdvar.dom).to.eql(specDomainCreateRanges([16, 20]));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should accept zero', function() {
//      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20]));
//      let R = fdvar_removeLteInline(fdvar, 0);
//
//      expect(fdvar.dom).to.eql(specDomainCreateRanges([10, 20]));
//      expect(R).to.equal(NO_CHANGES);
//    });
//
//    it('should accept empty array', function() {
//      let fdvar = fdvar_create('A', specDomainCreateEmpty());
//      let R = fdvar_removeLteInline(fdvar, 35);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(NO_CHANGES);
//    });
//
//    it('should remove SUP from SUP', function() {
//      let fdvar = fdvar_create('A', specDomainCreateRanges([SUP, SUP]));
//      let R = fdvar_removeLteInline(fdvar, SUP);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(SOME_CHANGES);
//    });
//  });
//
//  describe('with number', function() {
//
//    it('should remove all elements lte to value', function() {
//      let fdvar = fdvar_create('A', specDomainSmallRange(5, 12));
//      let R = fdvar_removeLteInline(fdvar, 9);
//
//      expect(fdvar.dom).to.eql(specDomainSmallNums(10, 11, 12));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should remove an element equal to value as well', function() {
//      let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let R = fdvar_removeLteInline(fdvar, 6);
//
//      expect(fdvar.dom).to.eql(specDomainSmallNums(7, 8));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should be able to split up a range', function() {
//      let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 4, 5, 6));
//      let R = fdvar_removeLteInline(fdvar, 4);
//
//      expect(fdvar.dom).to.eql(specDomainSmallNums(5, 6));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should accept zero', function() {
//      let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 4));
//      let R = fdvar_removeLteInline(fdvar, 0);
//
//      expect(fdvar.dom).to.eql(specDomainSmallNums(1, 2, 3, 4));
//      expect(R).to.equal(NO_CHANGES);
//    });
//
//    it('should accept empty array', function() {
//      let fdvar = fdvar_create('A', specDomainSmallEmpty());
//      let R = fdvar_removeLteInline(fdvar, 35);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(NO_CHANGES);
//    });
//
//    it('should remove 0 from 0', function() {
//      let fdvar = fdvar_create('A', specDomainSmallNums(0));
//      let R = fdvar_removeLteInline(fdvar, 0);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(SOME_CHANGES);
//    });
//  });
//});

// TOFIX: migrate and dedupe these tests
//describe('fdvar_removeGteInline', function() {
//
//  it('should exist', function() {
//    expect(fdvar_removeGteInline).to.be.a('function');
//  });
//
//  describe('with array', function() {
//
//    it('should remove all elements gte to value', function() {
//      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40]));
//      let R = fdvar_removeGteInline(fdvar, 25);
//
//      expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should remove an element equal to value as well', function() {
//      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40]));
//      let R = fdvar_removeGteInline(fdvar, 30);
//
//      expect(fdvar.dom).to.eql(specDomainCreateRange(10, 20));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should be able to split up a range', function() {
//      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20]));
//      let R = fdvar_removeGteInline(fdvar, 15);
//
//      expect(fdvar.dom).to.eql(specDomainSmallRange(10, 14));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should accept zero', function() {
//      let fdvar = fdvar_create('A', specDomainCreateRanges([10, 20]));
//      let R = fdvar_removeGteInline(fdvar, 0);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should accept empty array', function() {
//      let fdvar = fdvar_create('A', specDomainCreateEmpty());
//      let R = fdvar_removeGteInline(fdvar, 35);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(NO_CHANGES);
//    });
//
//    it('should remove SUP from SUP', function() {
//      let fdvar = fdvar_create('A', specDomainCreateRanges([SUP, SUP]));
//      let R = fdvar_removeGteInline(fdvar, SUP);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(SOME_CHANGES);
//    });
//  });
//
//  describe('with number', function() {
//
//    it('should remove all elements gte to value', function() {
//      let fdvar = fdvar_create('A', specDomainSmallRange(5, 12));
//      let R = fdvar_removeGteInline(fdvar, 9);
//
//      expect(fdvar.dom).to.eql(specDomainSmallNums(5, 6, 7, 8));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should remove an element equal to value as well', function() {
//      let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let R = fdvar_removeGteInline(fdvar, 6);
//
//      expect(fdvar.dom).to.eql(specDomainSmallNums(1, 2, 3));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should be able to split up a range', function() {
//      let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 4, 5, 6));
//      let R = fdvar_removeGteInline(fdvar, 4);
//
//      expect(fdvar.dom).to.eql(specDomainSmallNums(1, 2, 3));
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should accept zero', function() {
//      let fdvar = fdvar_create('A', specDomainSmallNums(1, 2, 3, 4));
//      let R = fdvar_removeGteInline(fdvar, 0);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(SOME_CHANGES);
//    });
//
//    it('should accept empty array', function() {
//      let fdvar = fdvar_create('A', specDomainSmallEmpty());
//      let R = fdvar_removeGteInline(fdvar, 35);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(NO_CHANGES);
//    });
//
//    it('should remove 0 from 0', function() {
//      let fdvar = fdvar_create('A', specDomainSmallNums(0));
//      let R = fdvar_removeGteInline(fdvar, 0);
//
//      expect(fdvar.dom).to.eql(specDomainSmallEmpty());
//      expect(R).to.equal(SOME_CHANGES);
//    });
//  });
//});
