import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateEmpty,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainSmallEmpty,
  specDomainSmallRange,
} from '../../fixtures/domain.fixt';

import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,
  SUP,
} from '../../../src/helpers';
import {
  config_addVarDomain,
  config_create,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';
import {
  propagator_lteStepBare,
} from '../../../src/propagators/lte';

describe('propagators/lte.spec', function() {
  // in general after call, max(v1) should be < max(v2) and min(v2) should be > min(v1)
  // it makes sure v1 and v2 have no values that can't possibly result in fulfilling <

  it('should exist', function() {
    expect(propagator_lteStepBare).to.be.a('function');
  });

  it('should require two vars', function() {
    let space = space_createRoot();

    expect(() => propagator_lteStepBare()).to.throw('SHOULD_GET_SPACE');
    expect(() => propagator_lteStepBare({})).to.throw('SHOULD_GET_SPACE');
    expect(() => propagator_lteStepBare(space, 'A')).to.throw('VAR_INDEX_SHOULD_BE_NUMBER');
    expect(() => propagator_lteStepBare(space, undefined, 'B')).to.throw('VAR_INDEX_SHOULD_BE_NUMBER');
  });

  describe('with array', function() {

    it('should throw for empty domain', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(90, 100));
      config_addVarDomain(config, 'B', specDomainCreateRange(200, 300));
      config_addVarDomain(config, 'C', specDomainCreateEmpty(true));
      config_addVarDomain(config, 'D', specDomainCreateEmpty(true));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');
      let C = config.all_var_names.indexOf('C');
      let D = config.all_var_names.indexOf('D');

      expect(_ => propagator_lteStepBare(space, A, B)).not.to.throw();
      expect(_ => propagator_lteStepBare(space, A, D)).to.throw('SHOULD_NOT_BE_REJECTED');
      expect(_ => propagator_lteStepBare(space, C, B)).to.throw('SHOULD_NOT_BE_REJECTED');
      expect(_ => propagator_lteStepBare(space, C, D)).to.throw('SHOULD_NOT_BE_REJECTED');
    });

    it('should remove any value from v1 that is gt to max(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(90, 100));
      config_addVarDomain(config, 'B', specDomainCreateRange(95, 99));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(SOME_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainCreateRange(90, 99));
      expect(space.vardoms[B]).to.eql(specDomainCreateRange(95, 99));
    });

    it('should keep SUP if both ranges end there', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(90, SUP));
      config_addVarDomain(config, 'B', specDomainCreateRange(95, SUP));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(NO_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainCreateRange(90, SUP));
      expect(space.vardoms[B]).to.eql(specDomainCreateRange(95, SUP));
    });

    it('should not affect domains when v1 < v2', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(90, 100));
      config_addVarDomain(config, 'B', specDomainCreateRange(101, 101));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(NO_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainCreateRange(90, 100));
      expect(space.vardoms[B]).to.eql(specDomainCreateRange(101, 101));
    });

    it('should not affect overlapping ranges when max(v1) < max(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(90, 150));
      config_addVarDomain(config, 'B', specDomainCreateRange(100, 200));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(NO_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainCreateRange(90, 150));
      expect(space.vardoms[B]).to.eql(specDomainCreateRange(100, 200));
    });

    it('should reject if min(v1) > max(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(190, 200));
      config_addVarDomain(config, 'B', specDomainCreateRange(100, 150));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(REJECTED);
      expect(space.vardoms[A]).to.eql(specDomainSmallEmpty());
      expect(space.vardoms[B]).to.eql(specDomainSmallEmpty());
    });

    it('should reduce v2 if v1 is solved and > min(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(200, 200));
      config_addVarDomain(config, 'B', specDomainCreateRange(100, 300));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(SOME_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainCreateRange(200, 200));
      expect(space.vardoms[B]).to.eql(specDomainCreateRange(200, 300));
    });

    it('should not change if v1 is solved and == min(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(200, 200));
      config_addVarDomain(config, 'B', specDomainCreateRange(200, 300));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(NO_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainCreateRange(200, 200));
      expect(space.vardoms[B]).to.eql(specDomainCreateRange(200, 300));
    });

    it('should be able to drop last range in v1', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [120, 150]));
      config_addVarDomain(config, 'B', specDomainCreateRange(0, 100));
      let space = space_createRoot(config);
      space_initFromConfig(space);
      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');
      propagator_lteStepBare(space, A, B);
      expect(space.vardoms[A]).to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98]));
      expect(space.vardoms[B]).to.eql(specDomainCreateRange(10, 100));

      config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 150]));
      config_addVarDomain(config, 'B', specDomainCreateRange(0, 100));
      space = space_createRoot(config);
      space_initFromConfig(space);
      A = config.all_var_names.indexOf('A');
      B = config.all_var_names.indexOf('B');
      propagator_lteStepBare(space, A, B);
      expect(space.vardoms[A]).to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 100]));
      expect(space.vardoms[B]).to.eql(specDomainCreateRange(10, 100));

      config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 100]));
      config_addVarDomain(config, 'B', specDomainCreateRange(0, 100));
      space = space_createRoot(config);
      space_initFromConfig(space);
      A = config.all_var_names.indexOf('A');
      B = config.all_var_names.indexOf('B');
      propagator_lteStepBare(space, A, B);
      expect(space.vardoms[A]).to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60], [70, 98], [100, 100]));
      expect(space.vardoms[B]).to.eql(specDomainCreateRange(10, 100));
    });

    it('should be able to drop first range in v1', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      config_addVarDomain(config, 'B', specDomainCreateRanges([0, 10], [20, 100]));
      let space = space_createRoot(config);
      space_initFromConfig(space);
      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');
      propagator_lteStepBare(space, A, B);
      expect(space.vardoms[A]).to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      expect(space.vardoms[B]).to.eql(specDomainCreateRanges([10, 10], [20, 100]));

      config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      config_addVarDomain(config, 'B', specDomainCreateRanges([0, 5], [20, 100]));
      space = space_createRoot(config);
      space_initFromConfig(space);
      A = config.all_var_names.indexOf('A');
      B = config.all_var_names.indexOf('B');
      propagator_lteStepBare(space, A, B);
      expect(space.vardoms[A]).to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      expect(space.vardoms[B]).to.eql(specDomainCreateRanges([20, 100]));

      config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      config_addVarDomain(config, 'B', specDomainCreateRanges([10, 10], [20, 100]));
      space = space_createRoot(config);
      A = config.all_var_names.indexOf('A');
      B = config.all_var_names.indexOf('B');
      space_initFromConfig(space);
      propagator_lteStepBare(space, A, B);
      expect(space.vardoms[A]).to.eql(specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
      expect(space.vardoms[B]).to.eql(specDomainCreateRanges([10, 10], [20, 100]));
    });
  });

  describe('with numbers', function() {

    it('should throw for empty domain', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainSmallRange(9, 10));
      config_addVarDomain(config, 'B', specDomainSmallRange(11, 15));
      config_addVarDomain(config, 'C', specDomainSmallEmpty());
      config_addVarDomain(config, 'D', specDomainSmallEmpty());
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');
      let C = config.all_var_names.indexOf('C');
      let D = config.all_var_names.indexOf('D');

      expect(_ => propagator_lteStepBare(space, A, B)).not.to.throw();
      expect(_ => propagator_lteStepBare(space, A, D)).to.throw('SHOULD_NOT_BE_REJECTED');
      expect(_ => propagator_lteStepBare(space, C, B)).to.throw('SHOULD_NOT_BE_REJECTED');
      expect(_ => propagator_lteStepBare(space, C, D)).to.throw('SHOULD_NOT_BE_REJECTED');
    });

    it('should remove any value from v1 that is gte to max(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainSmallRange(0, 10));
      config_addVarDomain(config, 'B', specDomainSmallRange(5, 9));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(SOME_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 9));
      expect(space.vardoms[B]).to.eql(specDomainSmallRange(5, 9));
    });

    it('should not remove SUP if both ranges end there', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainSmallRange(0, 15));
      config_addVarDomain(config, 'B', specDomainSmallRange(5, 15));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(NO_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 15));
      expect(space.vardoms[B]).to.eql(specDomainSmallRange(5, 15));
    });

    it('should not affect domains when v1 < v2', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainSmallRange(0, 10));
      config_addVarDomain(config, 'B', specDomainSmallRange(11, 15));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(NO_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 10));
      expect(space.vardoms[B]).to.eql(specDomainSmallRange(11, 15));
    });

    it('should not affect overlapping ranges when min(v2) <= max(v1) < max(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainSmallRange(0, 13));
      config_addVarDomain(config, 'B', specDomainSmallRange(10, 15));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(NO_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 13));
      expect(space.vardoms[B]).to.eql(specDomainSmallRange(10, 15));
    });

    it('should reject if min(v1) > max(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainSmallRange(11, 15));
      config_addVarDomain(config, 'B', specDomainSmallRange(5, 8));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(REJECTED);
      expect(space.vardoms[A]).to.eql(specDomainSmallEmpty());
      expect(space.vardoms[B]).to.eql(specDomainSmallEmpty());
    });

    it('should reduce v2 if v1 is solved and > min(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainSmallRange(8, 8));
      config_addVarDomain(config, 'B', specDomainSmallRange(5, 10));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(SOME_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainSmallRange(8, 8));
      expect(space.vardoms[B]).to.eql(specDomainSmallRange(8, 10));
    });

    it('should not change if v1 is solved and == min(v2)', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainSmallRange(7, 7));
      config_addVarDomain(config, 'B', specDomainSmallRange(7, 13));
      let space = space_createRoot(config);
      space_initFromConfig(space);

      let A = config.all_var_names.indexOf('A');
      let B = config.all_var_names.indexOf('B');

      expect(propagator_lteStepBare(space, A, B)).to.eql(NO_CHANGES);
      expect(space.vardoms[A]).to.eql(specDomainSmallRange(7, 7));
      expect(space.vardoms[B]).to.eql(specDomainSmallRange(7, 13));
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
