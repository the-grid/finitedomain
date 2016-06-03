import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateEmpty,
  specDomainCreateValue,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainFromNums,
  specDomainSmallNums,
  specDomainSmallRange,
} from '../../fixtures/domain.fixt';

import distribute_getNextDomainForVar, {
  FIRST_CHOICE,
  SECOND_CHOICE,
  THIRD_CHOICE,
  NO_CHOICE,

  _distribute_getNextDomainForVar,
  //distribution_valueByList,
  //distribution_valueByMarkov,
  distribution_valueByMax,
  distribution_valueByMid,
  distribution_valueByMin,
  //distribution_valueByMinMaxCycle,
  distribution_valueBySplitMax,
  distribution_valueBySplitMin,
} from '../../../src/distribution/value';
import {
  config_create,
  config_addVarRange,
  config_addVarDomain,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';

describe('distribution/value.spec', function() {

  it('should exist', function() {
    expect(distribute_getNextDomainForVar).to.be.a('function'); // TODO: test this function properly
  });

  it('should throw for unknown name', function() {
    expect(_ => _distribute_getNextDomainForVar('error')).to.throw('unknown next var func');
  });

  describe('distribution_valueByThrow', function() {

    it('should throw', function() {
      expect(_ => _distribute_getNextDomainForVar('throw')).to.throw('not expecting to pick this distributor');
    });
  });

  describe('distribution naive', function() {

    it('should work', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 0, 0);
      let space = space_createRoot(config);
      space_initFromConfig(space);
      let A = config.all_var_names.indexOf('A');

      let dom = _distribute_getNextDomainForVar('naive', space, A);

      expect(dom).to.eql(specDomainSmallNums(0));
    });
  });

  describe('distribution_valueByMin', function() {

    it('should exist', function() {
      expect(distribution_valueByMin).to.be.a('function');
    });

    describe('with array', function() {

      it('should pick lo for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, FIRST_CHOICE)).to.eql(specDomainCreateValue(101));
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 102));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, SECOND_CHOICE)).to.eql(specDomainCreateValue(102));
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 102));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 102));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([110, 111], [113, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, FIRST_CHOICE)).to.eql(specDomainCreateValue(110));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([110, 111], [113, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);

        let A = config.all_var_names.indexOf('A');
        expect(distribution_valueByMin(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRanges([111, 111], [113, 120]));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([110, 110]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });

    describe('with numbers', function() {

      it('should pick lo for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(1, 2));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(1));
        expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(1, 2));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(2));
        expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(1, 2));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(10, 11, 13, 14, 15));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(10));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(10, 11, 13, 14, 15));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(11, 13, 14, 15));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(10));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });
  });

  describe('distribution_valueByMax', function() {

    it('should exist', function() {
      expect(distribution_valueByMax).to.be.a('function');
    });

    describe('with array', function() {

      it('should pick lo for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(102, 102));
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 102));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(101, 101));
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 102));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 102));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([110, 117], [119, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, FIRST_CHOICE)).to.eql(specDomainCreateValue(120));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([110, 117], [119, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRanges([110, 117], [119, 119]));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateValue(120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });

    describe('with numbers', function() {

      it('should pick lo for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(10));
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(6, 10));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, SECOND_CHOICE)).to.eql(specDomainSmallRange(6, 9));
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(6, 10));
      });

      it('should return NO_CHOICE for third choice', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(6, 10));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(2, 3, 4, 6, 7, 8, 10, 11));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(11));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(2, 3, 4, 6, 7, 8, 10, 11));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(2, 3, 4, 6, 7, 8, 10));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(0));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });
  });

  describe('distribution_valueByMid', function() {
    // note: counts elements in domain and takes the middle one, not by value
    // note: for uneven elements in a domains it takes the first value above middle

    it('should exist', function() {
      expect(distribution_valueByMid).to.be.a('function');
    });

    describe('with array', function() {

      describe('binary', function() {

        it('should pick hi for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(102, 102));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 102));
        });

        it('should pick hi for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(101, 101));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 102));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 102));
        });
      });

      describe('ternary', function() {

        it('should pick mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 103));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(102, 102));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 103));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 103));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRanges([101, 101], [103, 103]));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 103));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 103));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 103));
        });
      });

      describe('quad', function() {

        it('should pick low-mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 104));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(103, 103));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 104));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 104));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRanges([101, 102], [104, 104]));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 104));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 104));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(101, 104));
        });
      });

      describe('100-120', function() {

        it('should pick mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(100, 120));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(110, 110));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(100, 120));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(100, 120));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRanges([100, 109], [111, 120]));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(100, 120));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(100, 120));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(100, 120));
        });
      });

      describe('100-121', function() {

        it('should pick hi-mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(100, 121));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(111, 111));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(100, 121));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(100, 121));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRanges([100, 110], [112, 121]));
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(100, 121));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(100, 121));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainCreateRange(100, 121));
        });
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([110, 112], [118, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainCreateValue(118));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([110, 112], [118, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRanges([110, 112], [119, 120]));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateValue(120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMid(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMid(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });

    describe('with numbers', function() {

      describe('binary', function() {

        it('should pick hi for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(2));
          expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2));
        });

        it('should pick hi for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(1));
          expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2));
        });
      });

      describe('ternary', function() {

        it('should pick mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(2));
          expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2, 3));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(1, 3));
          expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2, 3));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2, 3));
        });
      });

      describe('quad', function() {

        it('should pick low-mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3, 4));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(3));
          expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2, 3, 4));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3, 4));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(1, 2, 4));
          expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2, 3, 4));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3, 4));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainSmallNums(1, 2, 3, 4));
        });
      });

      describe('0-10', function() {

        it('should pick mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 10);
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(5));
          expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 10));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 10);
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(0, 1, 2, 3, 4, 6, 7, 8, 9, 10));
          expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 10));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 10);
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 10));
        });
      });

      describe('100-121', function() {

        it('should pick hi-mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 11);
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(6));
          expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 11));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 11);
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11));
          expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 11));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 11);
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 11));
        });
      });

      it('should pick lo for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 1);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(1));
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 1));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 1);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(0));
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 1));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 1);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(0, 1));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(0, 1, 2, 8, 9, 10));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMid(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(8));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(0, 1, 2, 8, 9, 10));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMid(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(0, 1, 2, 9, 10));
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(5));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueByMid(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueByMid(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });
  });

  describe('distribution_valueBySplitMin', function() {

    it('should exist', function() {
      expect(distribution_valueBySplitMin).to.be.a('function');
    });

    it('should throw if choice is not a number', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(110, 120));
      let space = space_createRoot(config);
      space_initFromConfig(space);
      let A = config.all_var_names.indexOf('A');

      expect(_ => distribution_valueBySplitMin(space, A, undefined)).to.throw('CHOICE_SHOULD_BE_NUMBER');
    });

    describe('with array', function() {

      it('should pick lower half for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(110, 120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(110, 115));
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(110, 120));
      });

      it('should pick upper half for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(110, 120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(116, 120));
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(110, 120));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(110, 120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(110, 120));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([100, 101], [108, 112], [118, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRanges([100, 101], [108, 110]));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([100, 101], [108, 112], [118, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRanges([111, 112], [118, 120]));
      });

      describe('range splitting unit tests', function() {

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(101, 101));
          expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(102, 102));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 103));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(101, 102));
          expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(103, 103));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 104));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(101, 102));
          expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(103, 104));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(120, 120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });

    describe('with numbers', function() {

      it('should pick lower half for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(6, 7, 8));
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(6, 10));
      });

      it('should pick upper half for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(9, 10));
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(6, 10));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(6, 10));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(0, 1, 5, 6, 7, 8, 11, 12, 14));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(0, 1, 5, 6, 7));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(0, 1, 5, 6, 7, 8, 11, 12, 14));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(8, 11, 12, 14));
      });

      describe('range splitting unit tests', function() {

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(1));
          expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(2));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(1, 2));
          expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(3));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3, 4));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(1, 2));
          expect(distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(3, 4));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(5, 5));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });
  });

  describe('distribution_valueBySplitMax', function() {

    it('should exist', function() {
      expect(distribution_valueBySplitMax).to.be.a('function');
    });

    it('should throw if choice is not a number', function() {
      let config = config_create();
      config_addVarDomain(config, 'A', specDomainCreateRange(110, 120));
      let space = space_createRoot(config);
      space_initFromConfig(space);
      let A = config.all_var_names.indexOf('A');

      expect(_ => distribution_valueBySplitMax(space, A, undefined)).to.throw('CHOICE_SHOULD_BE_NUMBER');
    });

    describe('with array', function() {

      it('should pick lower half for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(110, 120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(116, 120));
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(110, 120));
      });

      it('should pick upper half for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(110, 120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(110, 115));
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(110, 120));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(110, 120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        expect(space.vardoms[A]).to.eql(specDomainCreateRange(110, 120));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([100, 101], [108, 112], [118, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRanges([111, 112], [118, 120]));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRanges([100, 101], [108, 112], [118, 120]));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRanges([100, 101], [108, 110]));
      });

      describe('range splitting unit tests', function() {

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 102));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(102, 102));
          expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(101, 101));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 103));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(103, 103));
          expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(101, 102));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainCreateRange(101, 104));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainCreateRange(103, 104));
          expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainCreateRange(101, 102));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateRange(120, 120));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });

    describe('with numbers', function() {

      it('should pick lower half for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(9, 10));
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(6, 10));
      });

      it('should pick upper half for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(6, 7, 8));
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(6, 10));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        expect(space.vardoms[A]).to.eql(specDomainSmallRange(6, 10));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(0, 1, 5, 6, 7, 8, 11, 12, 14));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(8, 11, 12, 14));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(0, 1, 5, 6, 7, 8, 11, 12, 14));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(0, 1, 5, 6, 7));
      });

      describe('range splitting unit tests', function() {

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(2));
          expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(1));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(3));
          expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(1, 2));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', specDomainFromNums(1, 2, 3, 4));
          let space = space_createRoot(config);
          space_initFromConfig(space);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.eql(specDomainSmallNums(3, 4));
          expect(distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.eql(specDomainSmallNums(1, 2));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(5, 5));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateEmpty());
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });
  });
});
