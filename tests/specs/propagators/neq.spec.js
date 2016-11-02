import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_nums,
  fixt_numdom_empty,
  fixt_numdom_nums,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_numdom_range,
  fixt_numdom_solved,
  fixt_strdom_range,
  fixt_strdom_ranges,
  fixt_strdom_value,
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
  domain_toArr,
} from '../../../src/domain';
import {
  config_addVarDomain,
  config_create,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';
import {
  propagator_neqStepBare,
} from '../../../src/propagators/neq';

describe('propagators/neq.spec', function() {

  it('should exist', function() {
    expect(propagator_neqStepBare).to.be.a('function');
  });

  it('should expect args', function() {
    let config = config_create();
    config_addVarDomain(config, 'A', fixt_arrdom_nums(11, 15));
    config_addVarDomain(config, 'B', fixt_arrdom_nums(5, 8));
    let space = space_createRoot();
    space_initFromConfig(space, config);

    let A = config.allVarNames.indexOf('A');
    let B = config.allVarNames.indexOf('B');

    expect(_ => propagator_neqStepBare(space, config, A, B)).not.to.throw();
    expect(_ => propagator_neqStepBare()).to.throw('SHOULD_GET_SPACE');
    expect(_ => propagator_neqStepBare(space)).to.throw('VAR_INDEX_SHOULD_BE_NUMBER');
    expect(_ => propagator_neqStepBare(space, config, A)).to.throw('VAR_INDEX_SHOULD_BE_NUMBER');
    expect(_ => propagator_neqStepBare(space, undefined, B)).to.throw('VAR_INDEX_SHOULD_BE_NUMBER');
    expect(_ => propagator_neqStepBare(undefined, A, B)).to.throw('SHOULD_GET_SPACE');
  });

  it('should throw for empty domains', function() {
    let config = config_create();
    config_addVarDomain(config, 'A', fixt_arrdom_nums(9, 10));
    config_addVarDomain(config, 'B', fixt_arrdom_nums(11, 15));
    config_addVarDomain(config, 'C', fixt_arrdom_nums(100));
    config_addVarDomain(config, 'D', fixt_arrdom_nums(100));
    let space = space_createRoot();
    space_initFromConfig(space, config);
    space.vardoms[config.allVarNames.indexOf('C')] = fixt_numdom_empty();
    space.vardoms[config.allVarNames.indexOf('D')] = fixt_numdom_empty();

    let A = config.allVarNames.indexOf('A');
    let B = config.allVarNames.indexOf('B');
    let C = config.allVarNames.indexOf('C');
    let D = config.allVarNames.indexOf('D');

    expect(_ => propagator_neqStepBare(space, config, A, B)).not.to.throw();
    expect(_ => propagator_neqStepBare(space, config, A, D)).to.throw('SHOULD_NOT_BE_REJECTED');
    expect(_ => propagator_neqStepBare(space, config, C, B)).to.throw('SHOULD_NOT_BE_REJECTED');
    expect(_ => propagator_neqStepBare(space, config, C, D)).to.throw('SHOULD_NOT_BE_REJECTED');
  });

  describe('should not change anything as long as both domains are unsolved', function() {

    function test(domain1, domain2) {
      it(`should not change anything (left-right): ${[domain1, domain2].join('|')}`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_toArr(domain1));
        config_addVarDomain(config, 'B', domain_toArr(domain2));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        propagator_neqStepBare(space, config, A, B);

        fixt_domainEql(space.vardoms[A], domain1);
        fixt_domainEql(space.vardoms[B], domain2);
      });

      it(`should not change anything (right-left): ${[domain2, domain1].join('|')}`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_toArr(domain2));
        config_addVarDomain(config, 'B', domain_toArr(domain1));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        propagator_neqStepBare(space, config, A, B);

        fixt_domainEql(space.vardoms[A], domain2);
        fixt_domainEql(space.vardoms[B], domain1);
      });
    }

    describe('with array', function() {
      // these are the (non-solved) cases plucked from eq tests
      test(fixt_strdom_range(SUB, SUP), fixt_strdom_ranges([0, 10], [20, 140]));
      test(fixt_strdom_range(SUP - 1, SUP), fixt_strdom_range(SUP - 1, SUP));
      test(fixt_strdom_range(20, 50), fixt_strdom_range(20, 50));
      test(fixt_strdom_ranges([0, 10], [20, 30], [40, 50]), fixt_strdom_ranges([0, 10], [20, 30], [40, 50]));
      test(fixt_strdom_ranges([0, 10], [25, 25], [40, 50]), fixt_strdom_ranges([0, 10], [25, 25], [40, 50]));
      test(fixt_strdom_range(SUP - 2, SUP), fixt_strdom_range(SUP - 2, SUP));
      test(fixt_strdom_ranges([0, 10], [20, 30], [40, 50]), fixt_strdom_ranges([5, 15], [25, 35]));
      test(fixt_strdom_ranges([0, 10], [20, 30], [40, 50]), fixt_strdom_ranges([SUB, SUP]));
      test(fixt_strdom_range(SUP - 2, SUP), fixt_strdom_range(SUP - 3, SUP - 1));
      test(fixt_strdom_range(SUP - 2, SUP), fixt_strdom_range(SUP - 4, SUP - 1));
    });

    describe('with numbers', function() {
      test(fixt_numdom_range(0, 1), fixt_numdom_range(0, 1));
      test(fixt_numdom_range(2, 5), fixt_numdom_range(2, 5));
      test(fixt_numdom_range(0, 1), fixt_numdom_range(0, 2));
      test(fixt_numdom_range(0, 2), fixt_numdom_range(0, 3));
      test(fixt_numdom_range(0, 2), fixt_numdom_range(0, 4));
    });
  });

  describe('with one solved domain', function() {

    function test(solvedDomain, unsolvedDomainBefore, unsolvedDomainAfter) {
      it(`should not change anything (right-left): [${[domain_toArr(solvedDomain), domain_toArr(unsolvedDomainBefore)].join(']|[')}]`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_toArr(solvedDomain));
        config_addVarDomain(config, 'B', domain_toArr(unsolvedDomainBefore));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        propagator_neqStepBare(space, config, A, B);

        fixt_domainEql(space.vardoms[A], solvedDomain);
        fixt_domainEql(space.vardoms[B], unsolvedDomainAfter);
      });

      it(`should remove solved domain from unsolve domain (left-right): [${[unsolvedDomainBefore, solvedDomain].join(']|[')}]`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_toArr(unsolvedDomainBefore));
        config_addVarDomain(config, 'B', domain_toArr(solvedDomain));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let B = config.allVarNames.indexOf('B');
        let A = config.allVarNames.indexOf('A');

        propagator_neqStepBare(space, config, A, B);

        fixt_domainEql(space.vardoms[A], unsolvedDomainAfter);
        fixt_domainEql(space.vardoms[B], solvedDomain);
      });
    }

    describe('with array', function() {
      test(fixt_strdom_range(SUP, SUP), fixt_strdom_range(SUP - 1, SUP), fixt_numdom_solved(SUP - 1));
      test(fixt_strdom_range(SUP - 1, SUP - 1), fixt_strdom_range(SUP - 1, SUP), fixt_numdom_solved(SUP));
      test(fixt_strdom_range(SUP, SUP), fixt_strdom_range(SUP - 50, SUP), fixt_strdom_range(SUP - 50, SUP - 1));
      test(fixt_strdom_range(120, 120), fixt_strdom_ranges([120, SUP - 1]), fixt_strdom_range(121, SUP - 1));
      test(fixt_strdom_range(910, 910), fixt_strdom_ranges([910, 910], [912, 950]), fixt_strdom_ranges([912, 950]));
      test(fixt_strdom_range(910, 910), fixt_strdom_ranges([90, 98], [910, 910], [912, 920]), fixt_strdom_ranges([90, 98], [912, 920]));
      test(fixt_strdom_range(910, 910), fixt_strdom_ranges([90, 910], [912, 950]), fixt_strdom_ranges([90, 909], [912, 950]));
      test(fixt_strdom_range(91, 91), fixt_strdom_range(90, 93), fixt_strdom_ranges([90, 90], [92, 93]));
    });

    describe('with numbers', function() {
      test(fixt_numdom_nums(0), fixt_numdom_range(0, 1), fixt_numdom_solved(1));
      test(fixt_numdom_nums(1), fixt_numdom_range(0, 1), fixt_numdom_solved(0));
      test(fixt_numdom_nums(0), fixt_numdom_range(0, 15), fixt_numdom_range(1, 15));
      test(fixt_numdom_nums(2), fixt_numdom_range(2, 5), fixt_numdom_range(3, 5));
      test(fixt_numdom_nums(10), fixt_numdom_nums(10, 13, 14, 15), fixt_numdom_range(13, 15));
      test(fixt_numdom_nums(10), fixt_numdom_nums(0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15), fixt_numdom_nums(0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 15));
      test(fixt_numdom_nums(4), fixt_numdom_nums(0, 1, 2, 3, 4, 10, 12, 13, 14, 15), fixt_numdom_nums(0, 1, 2, 3, 10, 12, 13, 14, 15));
      test(fixt_numdom_nums(1), fixt_numdom_range(0, 3), fixt_numdom_nums(0, 2, 3));
    });
  });

  describe('two neq solved domains', function() {

    function test(domain1, domain2) {
      it(`should be "solved" (left-right): ${[domain__debug(domain1), domain__debug(domain2)].join('|')}`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_toArr(domain1));
        config_addVarDomain(config, 'B', domain_toArr(domain2));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        propagator_neqStepBare(space, config, A, B);

        fixt_domainEql(space.vardoms[A], domain1);
        fixt_domainEql(space.vardoms[B], domain2);
      });

      it(`should be "solved" (right-left): ${[domain__debug(domain1), domain__debug(domain2)].join('|')}`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_toArr(domain2));
        config_addVarDomain(config, 'B', domain_toArr(domain1));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        propagator_neqStepBare(space, config, A, B);

        fixt_domainEql(space.vardoms[A], domain2);
        fixt_domainEql(space.vardoms[B], domain1);
      });

      it(`should reject if same (left-left): ${[domain__debug(domain1), domain__debug(domain2)].join('|')}`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_toArr(domain1));
        config_addVarDomain(config, 'B', domain_toArr(domain1));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        propagator_neqStepBare(space, config, A, B);

        fixt_domainEql(space.vardoms[A], fixt_numdom_empty());
        fixt_domainEql(space.vardoms[B], fixt_numdom_empty());
      });

      it(`should reject if same (right-right): ${[domain__debug(domain1), domain__debug(domain2)].join('|')}`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_toArr(domain2));
        config_addVarDomain(config, 'B', domain_toArr(domain2));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let A = config.allVarNames.indexOf('A');
        let B = config.allVarNames.indexOf('B');

        propagator_neqStepBare(space, config, A, B);

        fixt_domainEql(space.vardoms[A], fixt_numdom_empty());
        fixt_domainEql(space.vardoms[B], fixt_numdom_empty());
      });
    }

    describe('with array', function() {
      test(fixt_strdom_value(SUP), fixt_strdom_value(SUP - 1));
      test(fixt_strdom_value(SUP - 1), fixt_strdom_value(SUP - 2));
      test(fixt_strdom_value(SUP - 1), fixt_strdom_value(SUP - 20));
      test(fixt_strdom_value(SUP), fixt_strdom_value(500));
      test(fixt_strdom_value(800), fixt_strdom_value(801));
    });

    describe('with numbers', function() {
      test(fixt_numdom_nums(0), fixt_numdom_nums(1));
      test(fixt_numdom_nums(1), fixt_numdom_nums(2));
      test(fixt_numdom_nums(1), fixt_numdom_nums(15));
      test(fixt_numdom_nums(0), fixt_numdom_nums(5));
      test(fixt_numdom_nums(8), fixt_numdom_nums(1));
    });

    describe('with solved numbers', function() {
      test(fixt_numdom_solved(0), fixt_numdom_solved(1));
      test(fixt_numdom_solved(1), fixt_numdom_solved(2));
      test(fixt_numdom_solved(1), fixt_numdom_solved(15));
      test(fixt_numdom_solved(0), fixt_numdom_solved(5));
      test(fixt_numdom_solved(8), fixt_numdom_solved(1));
    });
  });

  describe('with LOG', function() {

    before(function() {
      ASSERT_SET_LOG(LOG_FLAG_PROPSTEPS);
    });

    it('should improve test coverage by enabling logging', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', fixt_arrdom_range(SUB, SUP));
      config_addVarDomain(config, 'B', fixt_arrdom_ranges([0, 10], [20, 300]));
      let space = space_createRoot();
      space_initFromConfig(space, config);

      let A = config.allVarNames.indexOf('A');
      let B = config.allVarNames.indexOf('B');

      propagator_neqStepBare(space, config, A, B);

      expect(true).to.eql(true);
    });

    after(function() {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });
});

// TOFIX: migrate and dedupe these tests:
//  describe('fdvar_forceNeqInline', function() {
//    // these tests are pretty much tbd
//
//    it('should exist', function() {
//      expect(fdvar_forceNeqInline).to.be.a('function');
//    });
//
//    describe('with array', function() {
//
//      it('should return NO_CHANGES if neither domain is solved', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//        let B = fdvar_create('B', specDomainCreateRanges([15, 35], [40, 50]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([15, 35], [40, 50])));
//      });
//
//      it('should return SOME_CHANGES if left domain is solved', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([20, 20]));
//        let B = fdvar_create('B', specDomainCreateRanges([15, 35], [40, 50]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(SOME_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([20, 20])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([15, 19], [21, 35], [40, 50])));
//      });
//
//      it('should return SOME_CHANGES if right domain is solved', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([15, 35], [40, 50]));
//        let B = fdvar_create('B', specDomainCreateRanges([20, 20]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(SOME_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([15, 19], [21, 35], [40, 50])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([20, 20])));
//      });
//
//      it('should return NO_CHANGES if domains are equal but not solved (small)', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([SUP - 1, SUP]));
//        let B = fdvar_create('B', specDomainCreateRanges([SUP - 1, SUP]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([SUP - 1, SUP])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([SUP - 1, SUP])));
//      });
//
//      it('should return NO_CHANGES if domains are equal but not solved (large)', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//        let B = fdvar_create('B', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([10, 20], [30, 40], [50, 60])));
//      });
//
//      // TOFIX: this exposes a serious problem with assumptions on solved vars
//      it('should return REJECTED if domains resolved to same value', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([SUP, SUP]));
//        let B = fdvar_create('B', specDomainCreateRanges([SUP, SUP]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(REJECTED);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([SUP, SUP])));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallEmpty()));
//      });
//
//      it('should return NO_CHANGES both domains solve to different value', function() {
//        let A = fdvar_create('A', specDomainCreateRanges([30, 30]));
//        let B = fdvar_create('B', specDomainCreateRanges([40, 40]));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRanges([30, 30])));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRanges([40, 40])));
//      });
//    });
//
//    describe('with numbers', function() {
//
//      it('should return SOME_CHANGES if right side was solved and the left wasnt', function() {
//        let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let B = fdvar_create('B', specDomainSmallNums(2));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(SOME_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(1, 3, 6, 7, 8)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(2)));
//      });
//
//      it('should return SOME_CHANGES if left side was solved and the right had it', function() {
//        let A = fdvar_create('A', specDomainSmallNums(2));
//        let B = fdvar_create('B', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(SOME_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(2)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(1, 3, 6, 7, 8)));
//      });
//
//      it('should return NO_CHANGES if right side was solved and the left already did not have it', function() {
//        let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let B = fdvar_create('B', specDomainSmallNums(4));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(4)));
//      });
//
//      it('should return NO_CHANGES if left side was solved and the right already did not have it', function() {
//        let A = fdvar_create('A', specDomainSmallNums(4));
//        let B = fdvar_create('B', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(4)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(1, 2, 3, 6, 7, 8)));
//      });
//
//      it('should return NO_CHANGES if neither domain is solved', function() {
//        let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//        let B = fdvar_create('B', specDomainSmallNums(2, 3, 4, 5, 6, 7));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(2, 3, 4, 5, 6, 7)));
//      });
//
//      it('should return NO_CHANGES if both domains are solved to different value', function() {
//        let A = fdvar_create('A', specDomainSmallNums(0));
//        let B = fdvar_create('B', specDomainSmallNums(1));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(0)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallNums(1)));
//      });
//    });
//
//    describe('with array and numbers', function() {
//
//      it('should work with an array and a number', function() {
//        let A = fdvar_create('A', specDomainCreateRange(10, 100));
//        let B = fdvar_create('B', specDomainSmallRange(5, 15));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainCreateRange(10, 100)));
//        expect(B).to.eql(fdvar_create('B', specDomainSmallRange(5, 15)));
//      });
//
//      it('should work with a numbert and an array', function() {
//        let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 10, 11, 13));
//        let B = fdvar_create('B', specDomainCreateRange(8, 100));
//        let R = fdvar_forceNeqInline(A, B);
//
//        expect(R).to.eql(NO_CHANGES);
//        expect(A).to.eql(fdvar_create('A', specDomainSmallNums(1, 2, 3, 10, 11, 13)));
//        expect(B).to.eql(fdvar_create('B', specDomainCreateRange(8, 100)));
//      });
//    });
//  });

