import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainFromNums,
  specDomainSmallNums,
} from '../fixtures/domain.fixt';

import {
  SUB,
  SUP,
} from '../../src/helpers';
import {
  //config_addPropagator,
  config_addVarAnonConstant,
  config_addVarAnonNothing,
  config_addVarAnonRange,
  config_addVarConstant,
  config_addVarDomain,
  config_addVarNothing,
  config_addVarRange,
  config_clone,
  config_create,
  config_generateVars,
  //config_setDefaults,
  config_setOptions,
} from '../../src/config';
import {
  space_createRoot,
} from '../../src/space';

describe('src/config.spec', function() {

  describe('config_create', function() {

    it('should return an object', function() {
      expect(config_create()).to.be.an('object');
    });
  });

  describe('config_generateVars', function() {

    it('should exist', function() {
      expect(config_generateVars).to.be.a('function');
    });

    it('should require config and space', function() {
      let config = config_create();
      let space = space_createRoot(config);

      expect(_ => config_generateVars({}, space)).to.throw('EXPECTING_CONFIG');
      expect(_ => config_generateVars(config, {})).to.throw('SPACE_SHOULD_BE_SPACE');
    });

    it('should create a constant', function() {
      let config = config_create();
      let name = config_addVarAnonConstant(config, 10);
      let space = space_createRoot(config);

      config_generateVars(config, space);

      expect(space.vardoms[name]).to.eql(specDomainSmallNums(10));
    });

    it('should create a full width var', function() {
      let config = config_create();
      let name = config_addVarAnonNothing(config);
      let space = space_createRoot(config);

      config_generateVars(config, space);

      expect(space.vardoms[name]).to.eql(specDomainCreateRange(SUB, SUP));
    });

    it('should clone a domained var', function() {
      let config = config_create();
      let name = config_addVarAnonRange(config, 32, 55);
      let space = space_createRoot(config);

      config_generateVars(config, space);

      expect(space.vardoms[name]).to.eql(specDomainCreateRange(32, 55));
    });

    describe('targeted vars', function() {

      it('should allow "all"', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config_addVarRange(config, 'C', 0, 1);
        config.targetedVars = 'all';

        let space = space_createRoot(config);
        config_generateVars(config, space);

        expect(config.targetedIndexes).to.eql('all');
      });

      it('should clobber existing value with the string "all"', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config_addVarRange(config, 'C', 0, 1);
        config.targetedVars = 'all';
        config.targetedIndex = {};

        let space = space_createRoot(config);
        config_generateVars(config, space);

        expect(config.targetedIndexes).to.eql('all');
      });

      it('should update targetedIndexes with the current targetedVars', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config.targetedVars = ['A', 'B'];

        let space = space_createRoot(config);
        config_generateVars(config, space);

        expect(config.targetedIndexes).to.eql([0, 1]);
      });

      it('should not care about the order of the var names', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config.targetedVars = ['B', 'A'];

        let space = space_createRoot(config);
        config_generateVars(config, space);

        expect(config.targetedIndexes).to.eql([1, 0]);
      });

      it('should only use vars in config.targetedVars', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config_addVarRange(config, 'C', 0, 1);
        config.targetedVars = ['B'];

        let space = space_createRoot(config);
        config_generateVars(config, space);

        expect(config.targetedIndexes).to.eql([1]);
      });

      it('should throw if var names dont exist', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config_addVarRange(config, 'C', 0, 1);
        config.targetedVars = ['FAIL'];

        let space = space_createRoot(config);

        expect(_ => config_generateVars(config, space)).to.throw('TARGETED_VARS_SHOULD_EXIST_NOW');
      });

      it('should clobber existing value with a new array', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config_addVarRange(config, 'C', 0, 1);
        config.targetedVars = ['A', 'C'];
        let oldArray = [];
        config.targetedIndex = oldArray;

        let space = space_createRoot(config);
        config_generateVars(config, space);

        expect(config.targetedIndexes).to.eql([0, 2]);
        expect(config.targetedIndexes).not.to.equal(oldArray);
        expect(oldArray).to.eql([]);
      });
    });
  });

  describe('config_addVarAnonConstant', function() {

    it('should add the value', function() {
      let config = config_create();
      let name = config_addVarAnonConstant(config, 15);

      expect(config.all_var_names.indexOf(name)).to.be.at.least(0);
      expect(config.initial_vars[name]).to.eql(specDomainFromNums(15));
    });

    it('should populate the constant cache', function() {
      let config = config_create();
      let name = config_addVarAnonConstant(config, 15);

      expect(config.constant_cache[15]).to.equal(name);
    });

    it('should reuse the constant cache if available', function() {
      let config = config_create();
      let name1 = config_addVarAnonConstant(config, 1);
      let name2 = config_addVarAnonConstant(config, 2);
      let name3 = config_addVarAnonConstant(config, 1);

      expect(name1).to.not.equal(name2);
      expect(name1).to.equal(name3);
    });
  });

  describe('config_addVarAnonNothing', function() {

    it('should exist', function() {
      expect(config_addVarAnonNothing).to.be.a('function');
    });

    it('should create a new var with max range', function() {
      let config = config_create();

      config_addVarAnonNothing(config);

      expect(config.all_var_names.length).to.equal(1);
      expect(config.initial_vars[config.all_var_names[0]]).to.eql(specDomainCreateRange(SUB, SUP));
    });
  });

  describe('config_addVarAnonRange', function() {

    it('should exist', function() {
      expect(config_addVarAnonRange).to.be.a('function');
    });

    it('should throw if hi is missing', function() {
      let config = config_create();

      expect(_ => config_addVarAnonRange(config, 15)).to.throw('A_HI_MUST_BE_NUMBER');
    });

    it('should throw if lo is missing', function() {
      let config = config_create();

      expect(_ => config_addVarAnonRange(config, undefined, 15)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw if lo is an array', function() {
      let config = config_create();

      expect(_ => config_addVarAnonRange(config, [15, 30], 15)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let lo = 50;
        let hi = 100;

        config_addVarAnonRange(config, lo, hi);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_vars[config.all_var_names[0]]).to.eql(specDomainCreateRange(lo, hi));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let lo = 5;
        let hi = 10;

        config_addVarAnonRange(config, lo, hi);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_vars[config.all_var_names[0]]).to.eql(specDomainCreateRange(lo, hi, true));
      });
    });
  });

  describe('config_addVarConstant', function() {

    it('should exist', function() {
      expect(config_addVarConstant).to.be.a('function');
    });

    it('should throw for passing on undefined', function() {
      let config = config_create();

      expect(_ => config_addVarConstant(config, 'A', undefined)).to.throw('A_VALUE_SHOULD_BE_NUMBER');
    });

    it('should throw for passing on an array', function() {
      let config = config_create();

      expect(_ => config_addVarConstant(config, 'A', [10, 15])).to.throw('A_VALUE_SHOULD_BE_NUMBER');
    });

    it('should throw for passing on a string', function() {
      let config = config_create();

      expect(_ => config_addVarConstant(config, 'A', '23')).to.throw('A_VALUE_SHOULD_BE_NUMBER');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let value = 50;

        config_addVarConstant(config, 'A', value);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_vars[config.all_var_names[0]]).to.eql(specDomainCreateRange(value, value));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let value = 5;

        config_addVarConstant(config, 'A', value);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_vars[config.all_var_names[0]]).to.eql(specDomainCreateRange(value, value, true));
      });
    });
  });

  describe('config_addVarDomain', function() {

    it('should exist', function() {
      expect(config_addVarDomain).to.be.a('function');
    });

    it('should throw for passing on undefined', function() {
      let config = config_create();

      expect(_ => config_addVarDomain(config, 'A', undefined)).to.throw('DOMAIN_MUST_BE_ARRAY_HERE');
    });

    it('should throw for passing on a string', function() {
      let config = config_create();

      expect(_ => config_addVarDomain(config, 'A', '23')).to.throw('DOMAIN_MUST_BE_ARRAY_HERE');
    });

    it('should throw for an extra param to prevent hi/lo mistakes', function() {
      let config = config_create();

      expect(_ => config_addVarDomain(config, 'A', 12, 15)).to.throw('A_WRONG_API');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let value = specDomainCreateRange(50, 55);

        config_addVarDomain(config, 'A', value);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_vars[config.all_var_names[0]]).to.eql(value);
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let value = specDomainCreateRange(5, 12, true);

        config_addVarDomain(config, 'A', value);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_vars[config.all_var_names[0]]).to.equal(value);
      });
    });
  });

  describe('config_addVarNothing', function() {

    it('should exist', function() {
      expect(config_addVarNothing).to.be.a('function');
    });

    it('should throw for missing the name', function() {
      let config = config_create();

      expect(_ => config_addVarNothing(config)).to.throw('A_VAR_NAME_MUST_BE_STRING_OR_TRUE');
    });

    it('should create a new var with max range', function() {
      let config = config_create();

      config_addVarNothing(config, 'A');

      expect(config.all_var_names).to.eql(['A']);
      expect(config.initial_vars.A).to.eql(specDomainCreateRange(SUB, SUP));
    });
  });

  describe('config_addVarRange', function() {

    it('should exist', function() {
      expect(config_addVarRange).to.be.a('function');
    });

    it('should throw for passing on undefined', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', undefined)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for passing on a string', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', '23')).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for missing lo', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', undefined, 12)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for missing hi', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', 12, undefined)).to.throw('A_HI_MUST_BE_NUMBER');
    });

    it('should throw for bad lo', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', '10', 12)).to.throw('A_LO_MUST_BE_NUMBER');
    });

    it('should throw for bad hi', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', 12, '12')).to.throw('A_HI_MUST_BE_NUMBER');
    });

    it('should throw if hi is lower than lo', function() {
      let config = config_create();

      expect(_ => config_addVarRange(config, 'A', 12, 10)).to.throw('A_RANGES_SHOULD_ASCEND');
    });

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarRange(config, 'A', 50, 55);

        expect(config.all_var_names).to.eql(['A']);
        expect(config.initial_vars.A).to.eql(specDomainCreateRange(50, 55));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarRange(config, 'A', 5, 12);

        expect(config.all_var_names).to.eql(['A']);
        expect(config.initial_vars.A).to.eql(specDomainCreateRange(5, 12, true));
      });
    });
  });

  describe('config_setOptions', function() {

    it('should exist', function() {
      expect(config_setOptions).to.be.a('function');
    });

    it('should not require an object', function() {
      let config = config_create();
      config_setOptions(config);

      expect(true, 'no crash').to.equal(true);
    });

    it('should copy the filter', function() {
      let config = config_create();
      config_setOptions(config, {filter: 'A'});

      expect(config.var_filter_func).to.equal('A');
    });

    it('should copy the var', function() {
      let config = config_create();
      config_setOptions(config, {var: 'A'});

      expect(config.next_var_func).to.equal('A');
    });

    it('should init the var config of a single level without priority_list', function() {
      let config = config_create();
      let opt = {
        dist_name: 'max',
      };
      config_setOptions(config, {
        var: opt,
      });

      expect(config.next_var_func).to.eql({dist_name: 'max'});
      expect(opt.priority_hash).to.equal(undefined);
    });

    it('should init the var config of a single level and a priority_list', function() {
      let config = config_create();
      let opt = {
        dist_name: 'list',
        priority_list: ['B_list', 'A_list'],
      };
      config_setOptions(config, {
        var: opt,
      });

      expect(config.next_var_func, 'next var func').to.equal(opt);
      expect(opt.priority_hash, 'priority hash').to.eql({B_list: 2, A_list: 1});
    });

    it('should init the var config with a fallback level', function() {
      let config = config_create();
      let opt = {
        dist_name: 'list',
        priority_list: ['B_list', 'A_list'],
        fallback_config: {
          dist_name: 'markov',
          fallback_config: 'size',
        },
      };
      config_setOptions(config, {var: opt});

      expect(config.next_var_func).to.equal(opt);
      expect(opt.priority_hash).to.eql({B_list: 2, A_list: 1});
    });

    it('should put the priority hash on the var opts even if fallback', function() {
      let config = config_create();
      let opt = {
        dist_name: 'max',
        fallback_config: {
          dist_name: 'list',
          priority_list: ['B_list', 'A_list'],
        },
      };
      config_setOptions(config, {var: opt});

      expect(config.next_var_func).to.equal(opt);
      expect(opt.priority_hash).to.eql(undefined);
      expect(opt.fallback_config.priority_hash).to.eql({B_list: 2, A_list: 1});
    });

    it('should copy the targeted var names', function() {
      let config = config_create();
      config_setOptions(config, {targeted_var_names: 'A'});

      expect(config.targetedVars).to.equal('A');
    });

    it('should copy the var distribution config', function() {
      let config = config_create();
      config_setOptions(config, {var_dist_config: 'A'});

      expect(config.var_dist_options).to.equal('A');
    });

    it('should copy the timeout callback', function() {
      let config = config_create();
      config_setOptions(config, {timeout_callback: 'A'});

      expect(config.timeout_callback).to.equal('A');
    });
  });

  describe('config_clone', function() {

    it('should exist', function() {
      expect(config_clone).to.be.a('function');
    });

    it('should clone a config', function() {
      let config = config_create();
      let clone = config_clone(config);

      expect(clone).to.eql(config);
    });

    it('should clone a config with targetedVars as an array', function() {
      let config = config_create();
      let vars = ['a', 'b'];
      config.targetedVars = vars;
      let clone = config_clone(config);

      expect(clone.targetedVars).to.eql(vars);
    });

    it('should clone a config with targetedVars as a string', function() {
      let config = config_create();
      let vars = 'foobala';
      config.targetedVars = vars;
      let clone = config_clone(config);

      expect(clone.targetedVars).to.eql(vars);
    });

    it('should clone a config with targetedVars as an undefined', function() {
      let config = config_create();
      config.targetedVars = undefined;
      let clone = config_clone(config);

      expect(clone.targetedVars).to.eql(undefined);
    });

    it('should accept a new set of new vars', function() {
      let config = config_create();
      let newVars = {};
      let clone = config_clone(config, newVars);

      expect(clone.initial_vars).to.eql(newVars);
    });
  });
});
