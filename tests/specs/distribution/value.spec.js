import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_nums,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_arrdom_value,
  fixt_dom_nums,
  fixt_domainEql,
  fixt_numdom_empty,
  fixt_numdom_nums,
  fixt_numdom_range,
  fixt_numdom_solved,
  fixt_strdom_range,
  fixt_strdom_ranges,
  fixt_strdom_value,
} from '../../fixtures/domain.fixt';

import distribute_getNextDomainForVar, {
  FIRST_CHOICE,
  SECOND_CHOICE,
  THIRD_CHOICE,
  NO_CHOICE,

  _distribute_getNextDomainForVar,
  //distribution_valueByList,
  distribution_valueByMarkov,
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
  space_getDomainArr,
  space_initFromConfig,
} from '../../../src/space';
import Solver from '../../../src/solver';


describe('distribution/value.spec', function() {

  it('should exist', function() {
    expect(distribute_getNextDomainForVar).to.be.a('function'); // TODO: test this function properly
  });

  it('should throw for unknown name', function() {
    let config = config_create();
    let space = space_createRoot();
    expect(_ => _distribute_getNextDomainForVar('error', space, config)).to.throw('unknown next var func');
  });

  describe('distribution_valueByThrow', function() {

    it('should throw', function() {
      let config = config_create();
      let space = space_createRoot();
      expect(_ => _distribute_getNextDomainForVar('throw', space, config)).to.throw('not expecting to pick this distributor');
    });
  });

  describe('distribution naive', function() {

    it('should work', function() {
      let config = config_create();
      config_addVarRange(config, 'A', 0, 0);
      let space = space_createRoot();
      space_initFromConfig(space, config);
      let A = config.all_var_names.indexOf('A');

      let dom = _distribute_getNextDomainForVar('naive', space, config, A);

      fixt_domainEql(dom, fixt_numdom_nums(0));
    });
  });

  describe('distribution_valueByMin', function() {

    it('should exist', function() {
      expect(distribution_valueByMin).to.be.a('function');
    });

    describe('with array', function() {

      it('should pick lo for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMin(space, A, FIRST_CHOICE), fixt_strdom_value(101));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMin(space, A, SECOND_CHOICE), fixt_numdom_solved(102));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 111], [113, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMin(space, A, FIRST_CHOICE), fixt_strdom_value(110));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 111], [113, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);

        let A = config.all_var_names.indexOf('A');
        fixt_domainEql(distribution_valueByMin(space, A, SECOND_CHOICE), fixt_strdom_ranges([111, 111], [113, 120]));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 110);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });

    describe('with numbers', function() {

      it('should pick lo for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMin(space, A, FIRST_CHOICE), fixt_numdom_nums(1));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMin(space, A, SECOND_CHOICE), fixt_numdom_solved(2));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 1, 2);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(10, 11, 13, 14, 15));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMin(space, A, FIRST_CHOICE), fixt_numdom_nums(10));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(10, 11, 13, 14, 15));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMin(space, A, SECOND_CHOICE), fixt_numdom_nums(11, 13, 14, 15));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(10));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });
  });

  describe('distribution_valueByMarkov', function() {

    it('should return NO_CHOICE if it receives no values', function() {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        distributeOptions: {
          valtype: 'markov',
          matrix: [{
            vector: [],
          }],
          legend: [],
        },
      });
      solver._prepare({});

      let space = solver.state.space;
      let config = solver.config;
      let varIndex = 0;
      let choiceIndex = FIRST_CHOICE;

      expect(space._class).to.eql('$space');
      expect(config._class).to.eql('$config');

      let value = distribution_valueByMarkov(space, config, varIndex, choiceIndex);

      expect(value).to.eql(NO_CHOICE);
    });

    it('should throw if given domain is solved', function() {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        domain: fixt_arrdom_range(100, 100),
        distributeOptions: {
          valtype: 'markov',
          matrix: [{
            vector: [100],
          }],
          legend: [1],
        },
      });
      solver._prepare({});

      let space = solver.state.space;
      let config = solver.config;
      let varIndex = 0;
      let choiceIndex = SECOND_CHOICE; // !

      expect(space._class).to.eql('$space');
      expect(config._class).to.eql('$config');
      fixt_domainEql(space.vardoms[varIndex], fixt_dom_nums(100));

      space._markov_last_value = 100;
      expect(_ => distribution_valueByMarkov(space, config, varIndex, choiceIndex)).to.throw('DOMAIN_SHOULD_BE_UNDETERM');
    });
  });

  describe('distribution_valueByMax', function() {

    it('should exist', function() {
      expect(distribution_valueByMax).to.be.a('function');
    });

    describe('with array', function() {

      it('should pick lo for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, FIRST_CHOICE), fixt_strdom_range(102, 102));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, SECOND_CHOICE), fixt_numdom_solved(101));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 101, 102);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 117], [119, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, FIRST_CHOICE), fixt_strdom_value(120));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 117], [119, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, SECOND_CHOICE), fixt_strdom_ranges([110, 117], [119, 119]));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_value(120));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

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
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, FIRST_CHOICE), fixt_numdom_nums(10));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10, true));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, SECOND_CHOICE), fixt_numdom_range(6, 9));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10, true));
      });

      it('should return NO_CHOICE for third choice', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10, true));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(2, 3, 4, 6, 7, 8, 10, 11));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, FIRST_CHOICE), fixt_numdom_nums(11));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(2, 3, 4, 6, 7, 8, 10, 11));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMax(space, A, SECOND_CHOICE), fixt_numdom_nums(2, 3, 4, 6, 7, 8, 10));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

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
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_strdom_range(102, 102));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
        });

        it('should pick hi for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_numdom_solved(101));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 102));
        });
      });

      describe('ternary', function() {

        it('should pick mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_strdom_range(102, 102));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 103));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_strdom_ranges([101, 101], [103, 103]));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 103));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 103));
        });
      });

      describe('quad', function() {

        it('should pick low-mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_strdom_range(103, 103));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 104));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_strdom_ranges([101, 102], [104, 104]));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 104));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(101, 104));
        });
      });

      describe('100-120', function() {

        it('should pick mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 120);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_strdom_range(110, 110));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 120));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 120);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_strdom_ranges([100, 109], [111, 120]));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 120));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 120);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 120));
        });
      });

      describe('100-121', function() {

        it('should pick hi-mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 121);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_strdom_range(111, 111));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 121));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 121);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_strdom_ranges([100, 110], [112, 121]));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 121));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 100, 121);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(100, 121));
        });
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 112], [118, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_strdom_value(118));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([110, 112], [118, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_strdom_ranges([110, 112], [119, 120]));
      });

      it('should reject a "solved" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_value(120));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        // note: only rejects with ASSERTs
        expect(() => distribution_valueByMid(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

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
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_numdom_nums(2));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
        });

        it('should pick hi for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_numdom_solved(1));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2));
        });
      });

      describe('ternary', function() {

        it('should pick mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_numdom_nums(2));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_numdom_nums(1, 3));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3));
        });
      });

      describe('quad', function() {

        it('should pick low-mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_numdom_nums(3));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3, 4));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_numdom_nums(1, 2, 4));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3, 4));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_nums(1, 2, 3, 4));
        });
      });

      describe('0-10', function() {

        it('should pick mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 10);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_numdom_nums(5));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 10, true));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 10);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_numdom_nums(0, 1, 2, 3, 4, 6, 7, 8, 9, 10));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 10, true));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 10);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 10, true));
        });
      });

      describe('100-121', function() {

        it('should pick hi-mid for FIRST_CHOICE ', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 11);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_numdom_nums(6));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 11, true));
        });

        it('should remove mid for SECOND_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 11);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_numdom_nums(0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11));
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 11, true));
        });

        it('should return NO_CHOICE for THIRD_CHOICE', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 0, 11);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
          fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 11, true));
        });
      });

      it('should pick lo for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 1);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_numdom_nums(1));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 1, true));
      });

      it('should pick hi for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 1);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_numdom_solved(0));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 1, true));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 1);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueByMid(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(0, 1, true));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 2, 8, 9, 10));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMid(space, A, FIRST_CHOICE), fixt_numdom_nums(8));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 2, 8, 9, 10));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueByMid(space, A, SECOND_CHOICE), fixt_numdom_nums(0, 1, 2, 9, 10));
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(5));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueByMid(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueByMid(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

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
      config_addVarRange(config, 'A', 110, 120);
      let space = space_createRoot();
      space_initFromConfig(space, config);
      let A = config.all_var_names.indexOf('A');

      expect(_ => distribution_valueBySplitMin(space, A, undefined)).to.throw('CHOICE_SHOULD_BE_NUMBER');
    });

    describe('with array', function() {

      it('should pick lower half for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_strdom_range(110, 115));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      it('should pick upper half for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_strdom_range(116, 120));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([100, 101], [108, 112], [118, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_strdom_ranges([100, 101], [108, 110]));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([100, 101], [108, 112], [118, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_strdom_ranges([111, 112], [118, 120]));
      });

      describe('range splitting unit tests', function() {

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_numdom_solved(101));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_numdom_solved(102));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_strdom_range(101, 102));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_numdom_solved(103));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_strdom_range(101, 102));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_strdom_range(103, 104));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarRange(config, 'A', 120, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

        expect(() => distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });

    describe('with numbers', function() {

      it('should pick lower half for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_numdom_nums(6, 7, 8));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10, true));
      });

      it('should pick upper half for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_numdom_nums(9, 10));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10, true));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10, true));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 5, 6, 7, 8, 11, 12, 14));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_numdom_nums(0, 1, 5, 6, 7));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 5, 6, 7, 8, 11, 12, 14));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_numdom_nums(8, 11, 12, 14));
      });

      describe('range splitting unit tests', function() {

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_numdom_solved(1));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_numdom_solved(2));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_numdom_nums(1, 2));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_numdom_solved(3));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMin(space, A, FIRST_CHOICE), fixt_numdom_nums(1, 2));
          fixt_domainEql(distribution_valueBySplitMin(space, A, SECOND_CHOICE), fixt_numdom_nums(3, 4));
          expect(distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(5, 5));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMin(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMin(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

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
      config_addVarRange(config, 'A', 110, 120);
      let space = space_createRoot();
      space_initFromConfig(space, config);
      let A = config.all_var_names.indexOf('A');

      expect(_ => distribution_valueBySplitMax(space, A, undefined)).to.throw('CHOICE_SHOULD_BE_NUMBER');
    });

    describe('with array', function() {

      it('should pick lower half for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_strdom_range(116, 120));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      it('should pick upper half for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_strdom_range(110, 115));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 110, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(110, 120));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([100, 101], [108, 112], [118, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_strdom_ranges([111, 112], [118, 120]));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_ranges([100, 101], [108, 112], [118, 120]));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_strdom_ranges([100, 101], [108, 110]));
      });

      describe('range splitting unit tests', function() {

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 102);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_numdom_solved(102));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_numdom_solved(101));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 103);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_numdom_solved(103));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_strdom_range(101, 102));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 101, 104);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_strdom_range(103, 104));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_strdom_range(101, 102));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarRange(config, 'A', 120, 120);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

        expect(() => distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });

    describe('with numbers', function() {

      it('should pick lower half for FIRST_CHOICE ', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_numdom_nums(9, 10));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10, true));
      });

      it('should pick upper half for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_numdom_nums(6, 7, 8));
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10, true));
      });

      it('should return NO_CHOICE for THIRD_CHOICE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 6, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        fixt_domainEql(space_getDomainArr(space, A), fixt_arrdom_range(6, 10, true));
      });

      it('should intersect and not use lower range blindly for FIRST_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 5, 6, 7, 8, 11, 12, 14));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_numdom_nums(8, 11, 12, 14));
      });

      it('should intersect and not use lower range blindly for SECOND_CHOICE', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(0, 1, 5, 6, 7, 8, 11, 12, 14));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_numdom_nums(0, 1, 5, 6, 7));
      });

      describe('range splitting unit tests', function() {

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarRange(config, 'A', 1, 2);
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_numdom_solved(2));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_numdom_solved(1));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_numdom_solved(3));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_numdom_nums(1, 2));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });

        it('should work with two values in one range', function() {
          let config = config_create();
          config_addVarDomain(config, 'A', fixt_arrdom_nums(1, 2, 3, 4));
          let space = space_createRoot();
          space_initFromConfig(space, config);
          let A = config.all_var_names.indexOf('A');

          fixt_domainEql(distribution_valueBySplitMax(space, A, FIRST_CHOICE), fixt_numdom_nums(3, 4));
          fixt_domainEql(distribution_valueBySplitMax(space, A, SECOND_CHOICE), fixt_numdom_nums(1, 2));
          expect(distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.eql(NO_CHOICE);
        });
      });

      it('should reject a "solved" var', function() {
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(5, 5));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');

        expect(() => distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });

      it('should reject a "rejected" var', function() {
        // note: only rejects with ASSERTs
        // note: only rejects with ASSERTs
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(100));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        space.vardoms[A] = fixt_numdom_empty();

        expect(() => distribution_valueBySplitMax(space, A, FIRST_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, SECOND_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
        expect(() => distribution_valueBySplitMax(space, A, THIRD_CHOICE)).to.throw('DOMAIN_SHOULD_BE_UNDETERMINED');
      });
    });
  });
});
