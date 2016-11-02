import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_domainEql,
  fixt_arrdom_nums,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_arrdom_value,
  fixt_numdom_empty,
  fixt_numdom_nums,
  fixt_strdom_range,
  stripAnonVars,
} from '../fixtures/domain.fixt';

import {
  SUB,
  SUP,
} from '../../src/helpers';
import {
  config_addConstraint,
  config_addVarAnonConstant,
  config_addVarAnonRange,
  config_addVarConstant,
  config_addVarDomain,
  config_addVarNothing,
  config_addVarRange,
  config_create,
  config_setOption,
} from '../../src/config';
import {
  space_createClone,
  //space_createFromConfig,
  space_createRoot,
  space_getUnsolvedVarCount,
  _space_getUnsolvedVarNamesFresh,
  space_initFromConfig,
  space_updateUnsolvedVarList,
  space_propagate,
  space_solution,
  space_toConfig,
} from '../../src/space';

describe('src/space.spec', function() {

  describe('Space class', function() {

    describe('space_createRoot()', function() {

      it('should exist', function() {
        expect(space_createRoot).to.be.a('function');
      });

      it('should create a new instance', function() {
        // I dont want to test for instanceof... but i dont think we can change that due to ext. api.
        expect(space_createRoot()).to.be.an('object');
      });

      it('should init vars and var_names', function() {
        expect(space_createRoot().vardoms).to.be.an('array');
      });
    });

    describe('space_createClone()', function() {
      let config;
      let space;
      let clone;

      beforeEach(function() {
        config = config_create();
        space = space_createRoot();
        space_initFromConfig(space, config);
        clone = space_createClone(space);
      });

      it('should return a new space', function() {
        expect(clone).to.not.equal(space);
      });

      it('should clone vardoms', function() {
        expect(space.vardoms).to.not.equal(clone.vardoms);
      });

      it('should clone solved var list', function() {
        expect(space._unsolved).to.not.equal(clone._unsolved);
      });

      it('should deep clone the vars', function() {
        //for var_name in config.all_var_names
        for (let i = 0; i < config.all_var_names.length; ++i) {
          let varName = config.all_var_names[i];

          if (typeof clone.vardoms[varName] !== 'number') expect(clone.vardoms[varName]).to.not.equal(space.vardoms[varName]);
          expect(clone.vardoms[varName]).to.eql(space.vardoms[varName]);
        }
      });
    });

    describe('targeted vars', function() {

      it('should not add unconstrained vars when targeting all', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config_addVarRange(config, 'C', 0, 1);
        config.targetedVars = 'all';

        let space = space_createRoot();
        space_initFromConfig(space, config);

        expect(space_getUnsolvedVarCount(space, config)).to.eql(0);
      });

      it('should use explicitly targeted vars regardless of being constrained', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config.targetedVars = ['A', 'B'];

        let space = space_createRoot();
        space_initFromConfig(space, config);

        expect(_space_getUnsolvedVarNamesFresh(space, config).sort()).to.eql(['A', 'B']);
      });

      it('should not care about the order of the var names', function() {
        let targets = ['B', 'A'];
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config.targetedVars = targets.slice(0);

        let space = space_createRoot();
        space_initFromConfig(space, config);

        expect(_space_getUnsolvedVarNamesFresh(space, config).sort()).to.eql(targets.sort());
      });

      it('should throw if var names dont exist', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 32, 55);
        config_addVarRange(config, 'B', 0, 1);
        config_addVarRange(config, 'C', 0, 1);
        config.targetedVars = ['FAIL'];

        let space = space_createRoot();
        expect(_ => space_initFromConfig(space, config)).to.throw('E_TARGETED_VARS_SHOULD_EXIST_NOW');
      });
    });

    describe('space_isSolved()', function() {

      it('should return true if there are no vars', function() {
        let config = config_create();
        let space = space_createRoot();
        space_initFromConfig(space, config);
        expect(space_updateUnsolvedVarList(space, config)).to.equal(true);
      });

      it('should return true if all 1 vars are solved', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonConstant(config, 1);
        space_initFromConfig(space, config);

        expect(space_updateUnsolvedVarList(space, config), 'only one solved var').to.equal(true);
      });

      it('should return true if all 2 vars are solved', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonConstant(config, 1);
        config_addVarAnonConstant(config, 1);
        space_initFromConfig(space, config);

        expect(space_updateUnsolvedVarList(space, config), 'two solved vars').to.equal(true);
      });

      it('should return false if one var is not solved and is targeted', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonRange(config, 0, 1);
        config.targetedVars = config.all_var_names.slice(0);
        space_initFromConfig(space, config);

        expect(space_updateUnsolvedVarList(space, config), 'only one unsolved var').to.equal(false);
      });

      it('should have no unsolved var indexes if explicitly targeting no vars', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonRange(config, 0, 1);
        config.targetedVars = [];
        space_initFromConfig(space, config);

        expect(space_getUnsolvedVarCount(space, config), 'unsolved vars to solve').to.equal(0);
      });

      it('should return false if at least one var of two is not solved and targeted', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonRange(config, 0, 1);
        config_addVarAnonRange(config, 0, 1);
        config.targetedVars = config.all_var_names.slice(0);
        space_initFromConfig(space, config);

        expect(space_updateUnsolvedVarList(space, config), 'two unsolved vars').to.equal(false);
      });

      it('should return false if at least one var of two is not solved and not targeted', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonRange(config, 0, 1);
        config_addVarAnonRange(config, 0, 1);
        space_initFromConfig(space, config);

        expect(space_updateUnsolvedVarList(space, config), 'two unsolved vars').to.equal(true);
      });

      it('should return false if at least one var of three is not solved and all targeted', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonRange(config, 0, 1);
        config_addVarAnonRange(config, 0, 1);
        config_addVarAnonConstant(config, 1);
        config.targetedVars = config.all_var_names.slice(0);
        space_initFromConfig(space, config);

        expect(space_updateUnsolvedVarList(space, config), 'two unsolved vars and a solved var').to.equal(false);
      });

      it('should return false if at least one var of three is not solved and not targeted', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonRange(config, 0, 1);
        config_addVarAnonRange(config, 0, 1);
        config_addVarAnonConstant(config, 1);
        space_initFromConfig(space, config);

        expect(space_updateUnsolvedVarList(space, config), 'two unsolved vars and a solved var').to.equal(true);
      });

      it('should return false if at least one var of three is not solved and only that one not is targeted', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonRange(config, 0, 1);
        config_addVarAnonRange(config, 0, 1);
        let A = config_addVarAnonConstant(config, 1);
        config.targetedVars = [config.all_var_names[A]];
        space_initFromConfig(space, config);

        expect(space_updateUnsolvedVarList(space, config), 'two unsolved vars and a solved var').to.equal(true);
      });

      it('should return false if at least one var of three is not solved and that one is targeted', function() {
        let config = config_create();
        let space = space_createRoot();
        let A = config_addVarAnonRange(config, 0, 1);
        let B = config_addVarAnonRange(config, 0, 1);
        config_addVarAnonConstant(config, 1);
        config.targetedVars = [config.all_var_names[A], config.all_var_names[B]];
        space_initFromConfig(space, config);

        expect(space_updateUnsolvedVarList(space, config), 'two unsolved vars and a solved var').to.equal(false);
      });
    });

    describe('space_solution()', function() {

      it('should return an object, not array', function() {
        let config = config_create();
        expect(space_solution(space_createRoot(), config)).to.be.an('object');
        expect(space_solution(space_createRoot(), config)).not.to.be.an('array');
      });

      it('should return an empty object if there are no vars', function() {
        let config = config_create();
        let space = space_createRoot();
        expect(space_solution(space, config)).to.eql({});
      });

      it('should return false if a var covers no (more) elements', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarDomain(config, 'test', fixt_arrdom_nums(100));
        space_initFromConfig(space, config);
        space.vardoms[config.all_var_names.indexOf('test')] = fixt_numdom_empty();

        expect(space_solution(space, config)).to.eql({test: false});
      });

      it('should return the value of a var is solved', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarDomain(config, 'test', fixt_arrdom_value(5, true));
        space_initFromConfig(space, config);

        expect(space_solution(space, config)).to.eql({test: 5});
      });

      it('should return the domain of a var if not yet determined', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarRange(config, 'single_range', 10, 120);
        config_addVarDomain(config, 'multi_range', fixt_arrdom_ranges([10, 20], [30, 40]));
        config_addVarDomain(config, 'multi_range_with_solved', fixt_arrdom_ranges([18, 20], [25, 25], [30, 40]));
        space_initFromConfig(space, config);

        expect(space_solution(space, config)).to.eql({
          single_range: fixt_arrdom_range(10, 120),
          multi_range: fixt_arrdom_ranges([10, 20], [30, 40]),
          multi_range_with_solved: fixt_arrdom_ranges([18, 20], [25, 25], [30, 40]),
        });
      });

      it('should not add anonymous vars to the result', function() {
        let config = config_create();
        let space = space_createRoot();
        config_addVarAnonConstant(config, 15);
        config_addVarConstant(config, 'addme', 20);
        space_initFromConfig(space, config);

        expect(stripAnonVars(space_solution(space, config))).to.eql({addme: 20});
      });
    });

    describe('space_toConfig', function() {

      it('should convert a space to its config', function() {
        let config = config_create();
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let config2 = config_create(); // fresh config object

        // if a space has no special things, it should produce a
        // fresh config... (but it's a fickle test at best)
        expect(space_toConfig(space, config)).to.eql(config2);
      });

      it('should convert a space with a var without domain', function() {
        let config = config_create();
        let space = space_createRoot(); // fresh space object
        config_addVarNothing(config, 'A'); // becomes [SUB SUP]
        space_initFromConfig(space, config);

        let config2 = space_toConfig(space, config);

        expect(config2.all_var_names).to.eql(['A']);
        expect(config2.initial_domains, 'empty property should exist').to.eql([fixt_strdom_range(SUB, SUP)]);
      });
    });

    describe('space_propagate', function() {

      describe('simple cases', function() {

        it('should not reject this multiply case', function() {
          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 10);
          config_addVarRange(config, 'B', 0, 10);
          config_addVarRange(config, 'MAX', 25, 25);
          config_addVarRange(config, 'MUL', 0, 100);

          config_addConstraint(config, 'ring-mul', ['A', 'B', 'MUL'], 'mul');
          config_addConstraint(config, 'lt', ['MUL', 'MAX']);

          space_initFromConfig(space, config);

          expect(space_propagate(space, config)).to.eql(false);
        });
      });

      describe('vars tied to only one propagator', function() {

        it('step 0; two bools at start of search', function() {
          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 1);
          config_addVarRange(config, 'B', 0, 1);

          config_addConstraint(config, 'neq', ['A', 'B']);

          space_initFromConfig(space, config);

          // A and B only connect to one propagator
          // at the start of a search nothing should change
          // so after propagate() the vars should remain the same
          space_propagate(space, config);

          expect(space.vardoms[config.all_var_names.indexOf('B')]).to.eql(fixt_numdom_nums(0, 1));
          expect(space.vardoms[config.all_var_names.indexOf('A')]).to.eql(fixt_numdom_nums(0, 1));
        });

        it('step 1; first bool updated', function() {
          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 0);
          config_addVarRange(config, 'B', 0, 1);
          config_addConstraint(config, 'neq', ['A', 'B']);

          space_initFromConfig(space, config);
          space.updatedVarIndex = config.all_var_names.indexOf('A'); // mark A as having been updated externally

          // A "was updated" by a distributor
          // since it ties to neq it should step that propagator which should
          // affect B and solve the space. if it doesn't that probably means
          // the propagator is incorrectly skipped (or hey, some other bug)
          space_propagate(space, config);

          fixt_domainEql(space.vardoms[config.all_var_names.indexOf('A')], fixt_numdom_nums(0)); // we set it
          fixt_domainEql(space.vardoms[config.all_var_names.indexOf('B')], fixt_numdom_nums(1)); // by neq
        });

        it('step 1; second bool updated', function() {
          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 1);
          config_addVarRange(config, 'B', 0, 0);
          config_addConstraint(config, 'neq', ['A', 'B']);

          space_initFromConfig(space, config);
          space.updatedVarIndex = config.all_var_names.indexOf('B'); // mark A as having been updated externally

          // B "was updated" by a distributor
          // since it ties to neq it should step that propagator which should
          // affect A and solve the space. if it doesn't that probably means
          // the propagator is incorrectly skipped (or hey, some other bug)
          space_propagate(space, config);

          fixt_domainEql(space.vardoms[config.all_var_names.indexOf('A')], fixt_numdom_nums(1)); // by neq
          fixt_domainEql(space.vardoms[config.all_var_names.indexOf('B')], fixt_numdom_nums(0)); // we set it
        });
      });

      describe('timeout callback', function() {

        it('should ignore timeout callback if not set at all', function() {
          // (base timeout callback test)

          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 10);
          config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'lt', ['A', 'B']);

          space_initFromConfig(space, config);
          expect(space_propagate(space, config)).to.eql(false);
        });

        it('should not break early if callback doesnt return true', function() {
          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 10);
          config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'lt', ['A', 'B']);

          config_setOption(config, 'timeout_callback', _ => false);
          space_initFromConfig(space, config);

          expect(space_propagate(space, config)).to.eql(false);
        });

        it('should break early if callback returns true', function() {
          let config = config_create();
          let space = space_createRoot();

          config_addVarRange(config, 'A', 0, 10);
          config_addVarRange(config, 'B', 0, 10);

          config_addConstraint(config, 'lt', ['A', 'B']);

          config_setOption(config, 'timeout_callback', _ => true);
          space_initFromConfig(space, config);

          expect(space_propagate(space, config)).to.eql(true);
        });
      });
    });
  });
});
