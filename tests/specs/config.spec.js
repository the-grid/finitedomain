import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_domainEql,
  fixt_dom_nums,
  fixt_dom_range,
} from '../fixtures/domain.fixt';

import {
  SUB,
  SUP,
} from '../../src/helpers';
import {
  config_addConstraint,
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
  config_createVarStratConfig,
  config_generateVars,
  //config_setDefaults,
  config_setOptions,
  config_setOption,
} from '../../src/config';
import {
  space_createRoot,
} from '../../src/space';

describe('src/config.spec', function() {

  describe('config_addConstraint', function() {

    it('should exist', function() {
      expect(config_addConstraint).to.be.a('function');
    });

    it('should throw for unknown names', function() {
      let config = config_create();
      expect(_ => config_addConstraint(config, 'crap', [])).to.throw('UNKNOWN_PROPAGATOR');
    });

    describe('config_solvedAtCompileTime', function() {

      it('should properly solve edge cases A<B', function() {
        let config = config_create();
        let A = config_addVarRange(config, 'A', 0, 10);
        let B = config_addVarRange(config, 'B', 0, 10);

        config_addConstraint(config, 'lt', ['A', 'B']);

        fixt_domainEql(config.initial_domains[A], fixt_dom_range(0, 9));
        fixt_domainEql(config.initial_domains[B], fixt_dom_range(1, 10));
      });

      it('should properly solve edge cases A<=B', function() {
        let config = config_create();
        let A = config_addVarRange(config, 'A', 0, 10);
        let B = config_addVarRange(config, 'B', 0, 10);

        config_addConstraint(config, 'lte', ['A', 'B']);

        fixt_domainEql(config.initial_domains[A], fixt_dom_range(0, 10));
        fixt_domainEql(config.initial_domains[B], fixt_dom_range(0, 10));
      });

      it('should properly solve edge cases A>B', function() {
        let config = config_create();
        let A = config_addVarRange(config, 'A', 0, 10);
        let B = config_addVarRange(config, 'B', 0, 10);

        config_addConstraint(config, 'gt', ['A', 'B']);

        fixt_domainEql(config.initial_domains[A], fixt_dom_range(1, 10));
        fixt_domainEql(config.initial_domains[B], fixt_dom_range(0, 9));
      });

      it('should properly solve edge cases A>=B', function() {
        let config = config_create();
        let A = config_addVarRange(config, 'A', 0, 10);
        let B = config_addVarRange(config, 'B', 0, 10);

        config_addConstraint(config, 'gte', ['A', 'B']);

        fixt_domainEql(config.initial_domains[A], fixt_dom_range(0, 10));
        fixt_domainEql(config.initial_domains[B], fixt_dom_range(0, 10));
      });
    });
  });

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
      let space = space_createRoot();

      expect(_ => config_generateVars({}, space)).to.throw('EXPECTING_CONFIG');
      expect(_ => config_generateVars(config, {})).to.throw('SPACE_SHOULD_BE_SPACE');
    });

    it('should create a constant', function() {
      let config = config_create();
      let name = config_addVarAnonConstant(config, 10);
      let space = space_createRoot();

      config_generateVars(config, space);

      fixt_domainEql(space.vardoms[name], fixt_dom_nums(10));
    });

    it('should create a full width var', function() {
      let config = config_create();
      let name = config_addVarAnonNothing(config);
      let space = space_createRoot();

      config_generateVars(config, space);

      expect(space.vardoms[name]).to.eql(fixt_dom_range(SUB, SUP));
    });

    it('should clone a domained var', function() {
      let config = config_create();
      let name = config_addVarAnonRange(config, 32, 55);
      let space = space_createRoot();

      config_generateVars(config, space);

      expect(space.vardoms[name]).to.eql(fixt_dom_range(32, 55));
    });
  });

  describe('config_addVarAnonConstant', function() {

    it('should add the value', function() {
      let config = config_create();
      let varIndex = config_addVarAnonConstant(config, 15);

      expect(config.all_var_names[varIndex]).to.be.above(-1);
      expect(config.initial_domains[varIndex]).to.eql(fixt_dom_nums(15));
    });

    it('should populate the constant cache', function() {
      let config = config_create();
      let varIndex = config_addVarAnonConstant(config, 15);

      expect(config.constant_cache[15]).to.equal(varIndex);
    });

    it('should reuse the constant cache if available', function() {
      let config = config_create();
      let index1 = config_addVarAnonConstant(config, 1);
      let index2 = config_addVarAnonConstant(config, 2);
      let index3 = config_addVarAnonConstant(config, 1);

      expect(index1).to.not.equal(index2);
      expect(index1).to.equal(index3);
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
      expect(config.initial_domains[0]).to.eql(fixt_dom_range(SUB, SUP));
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
        expect(config.initial_domains[0]).to.eql(fixt_dom_range(lo, hi));
      });

      it('should make a constant if lo=hi', function() {
        let config = config_create();

        let lo = 58778;
        let hi = 58778;

        let varIndex = config_addVarAnonRange(config, lo, hi);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_domains[0]).to.eql(fixt_dom_range(lo, hi));
        expect(config.constant_cache[lo]).to.eql(varIndex);
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let lo = 5;
        let hi = 10;

        config_addVarAnonRange(config, lo, hi);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_domains[0]).to.eql(fixt_dom_range(lo, hi));
      });

      it('should make a constant if lo=hi', function() {
        let config = config_create();

        let lo = 28;
        let hi = 28;

        let varIndex = config_addVarAnonRange(config, lo, hi);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_domains[0]).to.eql(fixt_dom_range(lo, hi));
        expect(config.constant_cache[lo]).to.eql(varIndex);
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
        expect(config.initial_domains[0]).to.eql(fixt_dom_range(value, value));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        let value = 5;

        config_addVarConstant(config, 'A', value);

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_domains[0]).to.eql(fixt_dom_range(value, value));
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

    describe('with array', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarDomain(config, 'A', fixt_arrdom_range(50, 55));

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_domains[0]).to.eql(fixt_dom_range(50, 55));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarDomain(config, 'A', fixt_arrdom_range(5, 12, true));

        expect(config.all_var_names.length).to.equal(1);
        expect(config.initial_domains[0]).to.equal(fixt_dom_range(5, 12));
      });
    });
  });

  describe('config_addVarNothing', function() {

    it('should exist', function() {
      expect(config_addVarNothing).to.be.a('function');
    });

    it('should throw for missing the name', function() {
      let config = config_create();

      expect(_ => config_addVarNothing(config)).to.throw('VAR_NAMES_SHOULD_BE_STRINGS');
    });

    it('should create a new var with max range', function() {
      let config = config_create();

      config_addVarNothing(config, 'A');

      expect(config.all_var_names).to.eql(['A']);
      expect(config.initial_domains[0]).to.eql(fixt_dom_range(SUB, SUP));
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
        expect(config.initial_domains[0]).to.eql(fixt_dom_range(50, 55));
      });
    });

    describe('with numbers', function() {

      it('should create a new var with given range', function() {
        let config = config_create();

        config_addVarRange(config, 'A', 5, 12);

        expect(config.all_var_names).to.eql(['A']);
        expect(config.initial_domains[0]).to.eql(fixt_dom_range(5, 12));
      });
    });
  });

  describe('config_setOption', function() {

    it('should exist', function() {
      expect(config_setOption).to.be.a('function');
    });

    it('should set general var strategy', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {type: 'A'});

      expect(config.varStratConfig.type).to.equal('A');
    });

    it('should init the var config of a single level without priorityList', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {type: 'max'});

      expect(config.varStratConfig.type).to.eql('max');
      expect(config.varStratConfig._priorityByIndex).to.equal(undefined);
    });

    it('should init the var config of a single level and a priorityList', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {
        type: 'list',
        priorityList: ['B_list', 'A_list'],
      });

      expect(config.varStratConfig.priorityByName).to.eql(['B_list', 'A_list']);
    });

    it('should init the var config with two fallback levels', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {
        type: 'list',
        priorityList: ['B_list', 'A_list'],
        fallback: {
          type: 'markov',
          fallback: {
            type: 'size',
          },
        },
      });

      expect(config.varStratConfig).to.eql(config_createVarStratConfig({
        type: 'list',
        priorityList: ['B_list', 'A_list'],
        fallback: config_createVarStratConfig({
          type: 'markov',
          fallback: config_createVarStratConfig({
            type: 'size',
          }),
        }),
      }));
    });

    it('should put the priority hash on the var opts even if fallback', function() {
      let config = config_create();
      config_setOption(config, 'varStrategy', {
        type: 'max',
        fallback: {
          type: 'list',
          priorityList: ['B_list', 'A_list'],
        },
      });

      expect(config.varStratConfig).to.eql(config_createVarStratConfig({
        type: 'max',
        fallback: config_createVarStratConfig({
          type: 'list',
          priorityList: ['B_list', 'A_list'],
        }),
      }));
    });

    it('should throw for some legacy config structs', function() {
      let config = config_create();

      expect(_ => config_setOption(config, 'var', {})).to.throw('REMOVED. Replace `var` with `varStrategy`');
      expect(_ => config_setOption(config, 'varStrategy', _ => 0)).to.throw('functions no longer supported');
      expect(_ => config_setOption(config, 'varStrategy', 'foo')).to.throw('strings should be passed on as');
      expect(_ => config_setOption(config, 'varStrategy', 15)).to.throw('varStrategy should be object');
      expect(_ => config_setOption(config, 'varStrategy', {name: 'foo'})).to.throw('name should be type');
      expect(_ => config_setOption(config, 'varStrategy', {dist_name: 'foo'})).to.throw('dist_name should be type');
      expect(_ => config_setOption(config, 'val', {})).to.throw('REMOVED. Replace `var` with `valueStrategy`');
    });

    it('should copy the targeted var names', function() {
      let config = config_create();
      config_setOption(config, 'targeted_var_names', ['A']);

      expect(config.targetedVars).to.eql(['A']);
    });

    it('should copy the var distribution config', function() {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {valtype: 'B'}, 'A');

      expect(config.var_dist_options).to.eql({A: {valtype: 'B'}});
    });

    it('DEPRECATED; remove once actually obsolete', function() {
      let config = config_create();

      expect(_ => config_setOption(config, 'varStratOverride', {valtype: 'B'}, 'A')).to.throw('deprecated');
    });

    it('should copy the timeout callback', function() {
      let config = config_create();
      config_setOption(config, 'timeout_callback', 'A');

      expect(config.timeout_callback).to.equal('A');
    });

    it('should override value strats per var', function() {
      let config = config_create();
      config_setOption(config, 'varStratOverrides', {
        'A': 'foobar',
      });

      expect(config.var_dist_options).to.be.an('object');
      expect(config.var_dist_options.A).to.equal('foobar');
    });

    it('should override value strats per var', function() {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {
        'strat': 'foobar',
      }, 'A');

      expect(config.var_dist_options).to.be.an('object');
      expect(config.var_dist_options.A).to.be.an('object');
      expect(config.var_dist_options.A.strat).to.equal('foobar');
    });

    it('should throw for setting it twice', function() {
      let config = config_create();
      config_setOption(config, 'varValueStrat', {
        'strat': 'foobar',
      }, 'A');

      expect(_ => config_setOption(config, 'varValueStrat', {'another': 'thing'}, 'A')).to.throw('should not be known yet');
    });

    it('should throw for unknown config values', function() {
      let config = config_create();
      expect(_ => config_setOption(config, 'unknown value test', {'strat': 'foobar'}, 'A')).to.throw('unknown option');
    });
  });

  describe('config_setOptions', function() {

    it('should exist', function() {
      expect(config_setOptions).to.be.a('function');
    });

    it('should not require an options object', function() {
      let config = config_create();
      config_setOptions(config);

      expect(true).to.eql(true);
    });

    it('should override the global var strategy', function() {
      let config = config_create();
      config_setOptions(config, {
        varStrategy: {
          type: 'midmax',
        },
      });

      expect(config.varStratConfig.type).to.eql('midmax');
    });

    it('should override the global value strategy', function() {
      let config = config_create();
      expect(config.valueStratName).to.not.eql('mid');

      config_setOptions(config, {valueStrategy: 'mid'});

      expect(config.valueStratName).to.eql('mid');
    });

    it('should override the list of targeted var names', function() {
      let config = config_create();
      expect(config.targetedVars).to.eql('all');

      config_setOptions(config, {targeted_var_names: ['A', 'B']});

      expect(config.targetedVars).to.eql(['A', 'B']);
    });

    it('should override the var-specific strategies for multiple vars', function() {
      let config = config_create();
      expect(config.var_dist_options).to.eql({});

      config_setOptions(config, {varStratOverrides: {
        'A': 'something for a',
        'B': 'something for b',
      }});

      expect(config.var_dist_options).to.eql({
        'A': 'something for a',
        'B': 'something for b',
      });
    });

    it('should override the var-specific strategy for one var', function() {
      let config = config_create();
      expect(config.var_dist_options).to.eql({});

      config_setOptions(config, {varValueStrat: 'max', varStratOverrideName: 'A'});

      expect(config.var_dist_options).to.eql({
        'A': 'max',
      });
    });

    it('DEPRECATED; remove once obsoleted', function() {
      let config = config_create();
      expect(config.var_dist_options).to.eql({});

      config_setOptions(config, {varStratOverride: 'max', varStratOverrideName: 'A'});

      expect(config.var_dist_options).to.eql({
        'A': 'max',
      });
    });

    it('should set the timeout callback', function() {
      let config = config_create();
      config_setOptions(config, {timeout_callback: function() {}});

      expect(true).to.eql(true);
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
      let newVars = [];
      let clone = config_clone(config, newVars);

      expect(clone.initial_domains).to.eql(newVars);
    });
  });

  it('should reject a known var', function() {
    let config = config_create();
    config_addVarRange(config, 'again', 0, 10);
    expect(_ => config_addVarRange(config, 'again', 0, 10)).to.throw('Var name already part of this config. Probably a bug?');
  });

  it('should reject number as var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, 200, 0, 10)).to.throw('A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  });

  it('should reject zero as var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, 0, 0, 10)).to.throw('A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  });

  it('should reject stringified zero as var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, '0', 0, 10)).to.throw('DONT_USE_NUMBERS_AS_VAR_NAMES');
  });

  it('should reject adding a number as a var', function() {
    let config = config_create();
    expect(_ => config_addVarRange(config, '0', 0, 10)).to.throw('DONT_USE_NUMBERS_AS_VAR_NAMES');
  });
});
