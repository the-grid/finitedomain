import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateEmpty,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainSmallEmpty,
  specDomainSmallNums,
  specDomainSmallRange,
} from '../../fixtures/domain.fixt';

import {
  NO_CHANGES,
  REJECTED,
  SOME_CHANGES,
  SUB,
  SUP,
} from '../../../src/helpers';
import {
  domain_clone,
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
  propagator_eqStepBare,
} from '../../../src/propagators/eq';

describe('propagators/eq.spec', function() {
  // in general after call v1 and v2 should be equal

  it('should exist', function() {
    expect(propagator_eqStepBare).to.be.a('function');
  });

  it('should expect args', function() {
    let config = config_create();
    config_addVarDomain(config, 'A', specDomainSmallRange(11, 15));
    config_addVarDomain(config, 'B', specDomainSmallRange(5, 8));
    let space = space_createRoot(config);
    space_initFromConfig(space);

    expect(_ => propagator_eqStepBare(space, 'A', 'B')).not.to.throw();
    expect(_ => propagator_eqStepBare()).to.throw('SHOULD_GET_SPACE');
    expect(_ => propagator_eqStepBare(space)).to.throw('VAR_SHOULD_BE_STRING');
    expect(_ => propagator_eqStepBare(space, 'A')).to.throw('VAR_SHOULD_BE_STRING');
    expect(_ => propagator_eqStepBare(space, undefined, 'B')).to.throw('VAR_SHOULD_BE_STRING');
    expect(_ => propagator_eqStepBare(undefined, 'A', 'B')).to.throw('SHOULD_GET_SPACE');
  });

  it('should throw for empty domains', function() {
    let config = config_create();
    config_addVarDomain(config, 'A', specDomainSmallRange(9, 10));
    config_addVarDomain(config, 'B', specDomainSmallRange(11, 15));
    config_addVarDomain(config, 'C', specDomainCreateEmpty());
    config_addVarDomain(config, 'D', specDomainCreateEmpty());
    let space = space_createRoot(config);
    space_initFromConfig(space);

    expect(_ => propagator_eqStepBare(space, 'A', 'B')).not.to.throw();
    expect(_ => propagator_eqStepBare(space, 'A', 'D')).to.throw('SHOULD_NOT_BE_REJECTED');
    expect(_ => propagator_eqStepBare(space, 'C', 'B')).to.throw('SHOULD_NOT_BE_REJECTED');
    expect(_ => propagator_eqStepBare(space, 'C', 'D')).to.throw('SHOULD_NOT_BE_REJECTED');
  });

  it('with array should split a domain if it covers multiple ranges of other domain', function() {
    let config = config_create();
    config_addVarDomain(config, 'A', specDomainCreateRange(SUB, SUP));
    config_addVarDomain(config, 'B', specDomainCreateRanges([0, 10], [20, 300]));
    let space = space_createRoot(config);
    space_initFromConfig(space);

    expect(propagator_eqStepBare(space, 'A', 'B')).to.equal(SOME_CHANGES);
    expect(space.vars.A.dom).to.eql(specDomainCreateRanges([0, 10], [20, 300]));
    expect(space.vars.B.dom).to.eql(specDomainCreateRanges([0, 10], [20, 300]));
  });

  it('with number should split a domain if it covers multiple ranges of other domain', function() {
    let config = config_create();
    config_addVarDomain(config, 'A', specDomainSmallRange(SUB, 15));
    config_addVarDomain(config, 'B', specDomainSmallNums(0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15));
    let space = space_createRoot(config);
    space_initFromConfig(space);

    expect(propagator_eqStepBare(space, 'A', 'B')).to.equal(SOME_CHANGES);
    expect(space.vars.A.dom).to.eql(specDomainSmallNums(0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15));
    expect(space.vars.B.dom).to.eql(specDomainSmallNums(0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15));
  });

  describe('when v1 == v2', function() {
    function test(domain) {
      it(`should not change anything: ${domain}`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_clone(domain));
        config_addVarDomain(config, 'B', domain_clone(domain));
        let space = space_createRoot(config);
        space_initFromConfig(space);

        expect(propagator_eqStepBare(space, 'A', 'B')).to.equal(NO_CHANGES);
        expect(space.vars.A.dom).to.eql(domain);
        expect(space.vars.B.dom).to.eql(domain);
      });
    }

    describe('with array', function() {
      test(specDomainCreateRange(SUP, SUP));
      test(specDomainCreateRange(20, 50));
      test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]));
      test(specDomainCreateRanges([0, 10], [25, 25], [40, 50]));
    });

    describe('with numbers', function() {
      test(specDomainSmallNums(SUB, SUB));
      test(specDomainSmallNums(0, 0));
      test(specDomainSmallNums(1, 1));
      test(specDomainSmallNums(0, 1));
      test(specDomainSmallNums(0, 2));
      test(specDomainSmallNums(0, 2, 3));
    });
  });

  describe('when v1 != v2', function() {

    function test(left, right, result, changes) {
      it(`should not change anything (left-right): ${[left, right, result].join('|')}`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_clone(left));
        config_addVarDomain(config, 'B', domain_clone(right));
        let space = space_createRoot(config);
        space_initFromConfig(space);

        expect(propagator_eqStepBare(space, 'A', 'B')).to.equal(changes);
        expect(space.vars.A.dom).to.eql(result);
        expect(space.vars.B.dom).to.eql(result);
      });

      it(`should not change anything (right-left): ${[right, left, result].join('|')}`, function() {
        let config = config_create();
        config_addVarDomain(config, 'A', domain_clone(right));
        config_addVarDomain(config, 'B', domain_clone(left));
        let space = space_createRoot(config);
        space_initFromConfig(space);

        expect(propagator_eqStepBare(space, 'A', 'B')).to.equal(changes);
        expect(space.vars.A.dom).to.eql(result);
        expect(space.vars.B.dom).to.eql(result);
      });
    }

    test(specDomainSmallNums(0, 1), specDomainSmallNums(0, 0), specDomainSmallNums(0, 0), SOME_CHANGES);
    test(specDomainSmallNums(0, 1), specDomainSmallNums(1, 1), specDomainSmallNums(1, 1), SOME_CHANGES);
    test(specDomainSmallNums(SUB, 1), specDomainCreateRange(1, SUP), specDomainSmallNums(1, 1), SOME_CHANGES);
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainSmallNums(5, 5), specDomainSmallNums(5, 5), SOME_CHANGES);
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainCreateRanges([5, 15], [25, 35]), specDomainCreateRanges([5, 10], [25, 30]), SOME_CHANGES);
    test(specDomainCreateRanges([0, 10], [20, 30], [40, 50]), specDomainCreateRanges([SUB, SUP]), specDomainCreateRanges([0, 10], [20, 30], [40, 50]), SOME_CHANGES);
    test(specDomainSmallNums(0, 2), specDomainSmallNums(1, 3), specDomainSmallEmpty(), REJECTED);
    test(specDomainSmallNums(0, 2), specDomainSmallNums(1, 2, 4), specDomainSmallNums(2), SOME_CHANGES);
  });
});

// TOFIX: migrate these tests to this file. dedupe them too.
//describe.skip('fdvar_forceEqInline', function() {
//
//  it('should exist', function() {
//    expect(fdvar_forceEqInline).to.be.a('function');
//  });
//
//  describe('with array', function() {
//
//    it('should get start end', function() {
//      let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40]));
//      let B = fdvar_create('B', specDomainCreateRanges([20, 30]));
//      let C = specDomainCreateRanges([20, 20], [30, 30]);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should return SOME_CHANGES if domains are not equal and update them inline', function() {
//      let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//      let B = fdvar_create('B', specDomainCreateRanges([15, 35], [40, 50]));
//      let C = specDomainCreateRanges([15, 20], [30, 35], [40, 40], [50, 50]);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should return NO_CHANGES if domains are equal', function() {
//      let A = fdvar_create('A', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//      let B = fdvar_create('B', specDomainCreateRanges([10, 20], [30, 40], [50, 60]));
//      let C = specDomainCreateRanges([10, 20], [30, 40], [50, 60]);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(NO_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//  });
//
//  describe('with numbers', function() {
//
//    it('should return SOME_CHANGES if domains are not equal and update them inline', function() {
//      let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let B = fdvar_create('B', specDomainSmallNums(2, 3, 4, 5, 6, 7));
//      let C = specDomainSmallNums(2, 3, 6, 7);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should return NO_CHANGES if domains are equal', function() {
//      let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let B = fdvar_create('B', specDomainSmallNums(1, 2, 3, 6, 7, 8));
//      let C = specDomainSmallNums(1, 2, 3, 6, 7, 8);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(NO_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//  });
//
//  describe('with array and numbers', function() {
//
//    it('should work with an array and a number', function() {
//      let A = fdvar_create('A', specDomainCreateRange(10, 100));
//      let B = fdvar_create('B', specDomainSmallRange(5, 15));
//      let C = specDomainSmallRange(10, 15);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//
//    it('should work with a number and an array', function() {
//      let A = fdvar_create('A', specDomainSmallNums(1, 2, 3, 10, 11, 13));
//      let B = fdvar_create('B', specDomainCreateRange(8, 100));
//      let C = specDomainSmallNums(10, 11, 13);
//      let R = fdvar_forceEqInline(A, B);
//
//      expect(R).to.eql(SOME_CHANGES);
//      expect(A).to.eql(fdvar_create('A', C));
//      expect(B).to.eql(fdvar_create('B', C));
//    });
//  });
//});
