import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainCreateRanges,
  stripAnonVars,
} from '../fixtures/domain.fixt';

import {
  config_addPropagator,
  config_addVar,
  config_addVarAnon,
  config_create,
  config_setOptions,
} from '../../src/config';
import {
  space_createClone,
  //space_createFromConfig,
  space_createRoot,
  space_initFromConfig,
  space_isSolved,
  space_propagate,
  space_solution,
  space_solutionFor,
  space_toConfig,

  // debugging / testing
  __space_debugVarDomains,
  __space_getUnsolved,
} from '../../src/space';

describe('space.spec', function() {

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
        expect(space_createRoot().vars).to.be.an('object');
        expect(space_createRoot().unsolvedVarNames).to.be.an('array');
        expect(space_createRoot().config.all_var_names).to.be.an('array');
      });
    });

    describe('space_createClone()', function() {

      let space = space_createRoot();
      let clone = space_createClone(space);

      it('should return a new space', function() {
        expect(clone).to.not.equal(space);
      });

      it('should clone vars', function() {
        expect(space.vars).to.not.equal(clone.vars);
      });

      it('should deep clone the vars', function() {
        //for var_name in space.config.all_var_names
        for (let i = 0; i < space.config.all_var_names.length; ++i) {
          let var_name = space.config.all_var_names[i];

          expect(clone.vars[var_name]).to.not.equal(space.vars[var_name]);
        }
      });

      // note: the deep clone check is already done above, no need to repeat it
      it('should clone certain props, copy others', function() {
        expect(space.unsolvedVarNames).to.not.equal(clone.unsolvedVarNames);
        expect(space.unsolvedVarNames.join()).to.equal(clone.unsolvedVarNames.join());
        expect(space.config).to.equal(clone.config);
        expect(space.unsolvedPropagators).to.eql(clone.unsolvedPropagators);
      });
    });

    describe('space_isSolved()', function() {

      it('should return true if there are no vars', function() {
        expect(space_isSolved(space_createRoot())).to.equal(true);
      });

      it('should return true if all 1 vars are solved', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 1);
        space_initFromConfig(space);

        expect(space_isSolved(space), 'only one solved var').to.equal(true);
      });

      it('should return true if all 2 vars are solved', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 1);
        config_addVarAnon(space.config, 1);
        space_initFromConfig(space);

        expect(space_isSolved(space), 'two solved vars').to.equal(true);
      });

      it('should return false if at least one var is not solved', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 0, 1);
        space_initFromConfig(space);

        expect(space_isSolved(space), 'only one unsolved var').to.equal(false);
      });

      it('should return false if at least one var of two is not solved', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 0, 1);
        config_addVarAnon(space.config, 0, 1);
        space_initFromConfig(space);

        expect(space_isSolved(space), 'two unsolved vars').to.equal(false);
      });

      it('should return false if at least one var of three is not solved', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 0, 1);
        config_addVarAnon(space.config, 0, 1);
        config_addVarAnon(space.config, 1);
        space_initFromConfig(space);

        expect(space_isSolved(space), 'two unsolved vars and a solved var').to.equal(false);
      });
    });

    describe('space_solution()', function() {

      it('should return an object, not array', function() {
        expect(space_solution(space_createRoot())).to.be.an('object');
        expect(space_solution(space_createRoot())).not.to.be.an('array');
      });

      it('should return an empty object if there are no vars', function() {
        expect(space_solution(space_createRoot())).to.eql({});
      });

      it('should return false if a var covers no (more) elements', function() {
        let space = space_createRoot();
        config_addVar(space.config, 'test', []);
        space_initFromConfig(space);

        expect(space_solution(space)).to.eql({test: false});
      });

      it('should return the value of a var is solved', function() {
        let space = space_createRoot();
        config_addVar(space.config, 'test', 5);
        space_initFromConfig(space);

        expect(space_solution(space)).to.eql({test: 5});
      });

      it('should return the domain of a var if not yet determined', function() {
        let space = space_createRoot();
        config_addVar(space.config, 'single_range', 10, 20);
        config_addVar(space.config, 'multi_range', specDomainCreateRanges([10, 20], [30, 40]));
        config_addVar(space.config, 'multi_range_with_solved', specDomainCreateRanges([10, 20], [25, 25], [30, 40]));
        space_initFromConfig(space);

        expect(space_solution(space)).to.eql({
          single_range: specDomainCreateRange(10, 20),
          multi_range: specDomainCreateRanges([10, 20], [30, 40]),
          multi_range_with_solved: specDomainCreateRanges([10, 20], [25, 25], [30, 40]),
        });
      });

      it('should not add anonymous vars to the result', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 15);
        config_addVar(space.config, 'addme', 20);
        space_initFromConfig(space);

        expect(stripAnonVars(space_solution(space))).to.eql({addme: 20});
      });
    });

    describe('space_solutionFor()', function() {

      it('should only collect results for given var names', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 10); // should be ignored
        config_addVar(space.config, 'nope', 10, 20);
        config_addVar(space.config, 'yep10', 10);
        config_addVar(space.config, 'yep20', 20);
        config_addVar(space.config, 'yep30', 30);
        space_initFromConfig(space);

        expect(space_solutionFor(space, ['yep10', 'yep20', 'yep30'])).to.eql({yep10: 10, yep20: 20, yep30: 30});
      });

      it('should return normal even if a var is unsolved when complete=false', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 10); // should be ignored
        config_addVar(space.config, 'yep10', 10);
        config_addVar(space.config, 'oops20', []);
        config_addVar(space.config, 'yep30', 30);
        space_initFromConfig(space);

        expect(space_solutionFor(space, ['yep10', 'oops20', 'yep30'])).to.eql({yep10: 10, oops20: false, yep30: 30});
      });

      it('should return false if a var is unsolved when complete=true', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 10); // should be ignored
        config_addVar(space.config, 'yep10', 10);
        config_addVar(space.config, 'oops20', []);
        config_addVar(space.config, 'yep30', 30);
        space_initFromConfig(space);

        expect(space_solutionFor(space, ['yep10', 'oops20', 'yep30'], true)).to.equal(false);
      });

      it('should return true if a var is unsolved that was not requested when complete=true', function() {
        let space = space_createRoot();
        config_addVarAnon(space.config, 10); // should be ignored
        config_addVar(space.config, 'yep10', 10);
        config_addVar(space.config, 'nope20', []);
        config_addVar(space.config, 'yep30', 30);
        space_initFromConfig(space);

        expect(space_solutionFor(space, ['yep10', 'yep30'], true)).to.eql({yep10: 10, yep30: 30});
      });
    });

    describe('space_toConfig', function() {

      it('should convert a space to its config', function() {
        let space = space_createRoot(); // fresh space object
        space_initFromConfig(space);
        let config = config_create(); // fresh config object

        // if a space has no special things, it should produce a
        // fresh config... (but it's a fickle test at best)
        expect(space_toConfig(space)).to.eql(config);
      });

      it('should convert a space with a var without domain', function() {
        let space = space_createRoot(); // fresh space object
        config_addVar(space.config, 'A');
        space_initFromConfig(space);

        let config = space_toConfig(space);
        expect(config.all_var_names).to.eql(['A']);
        expect(config.initial_vars, 'not an empty object').not.to.eql({});
        expect(config.initial_vars, 'empty property should exist').to.eql({A: undefined});

      });
    });

    describe('space_propagate', function() {

      describe('simple cases', () =>

        it('should not reject this multiply case', function() {
          let space = space_createRoot();

          config_addVar(space.config, 'A', 0, 10);
          config_addVar(space.config, 'B', 0, 10);
          config_addVar(space.config, 'MAX', 25, 25);
          config_addVar(space.config, 'MUL', 0, 100);

          config_addPropagator(space.config, ['ring', ['A', 'B', 'MUL'], 'mul']);
          config_addPropagator(space.config, ['ring', ['MUL', 'A', 'B'], 'div']);
          config_addPropagator(space.config, ['ring', ['MUL', 'B', 'A'], 'div']);
          config_addPropagator(space.config, ['lt', ['MUL', 'MAX']]);

          space_initFromConfig(space);
          expect(space_propagate(space)).to.eql(true);
        })
      );

      describe('timeout callback', function() {

        it('should ignore timeout callback if not set at all', function() {
          // (base timeout callback test)

          let space = space_createRoot();

          config_addVar(space.config, 'A', 0, 10);
          config_addVar(space.config, 'B', 0, 10);

          config_addPropagator(space.config, ['lt', ['A', 'B']]);

          space_initFromConfig(space);
          expect(space_propagate(space)).to.eql(true);
        });

        it('should not break early if callback doesnt return true', function() {
          let space = space_createRoot();

          config_addVar(space.config, 'A', 0, 10);
          config_addVar(space.config, 'B', 0, 10);

          config_addPropagator(space.config, ['lt', ['A', 'B']]);

          config_setOptions(space.config, {timeout_callback() { return false; }});
          space_initFromConfig(space);

          expect(space_propagate(space)).to.eql(true);
        });

        it('should break early if callback returns true', function() {
          let space = space_createRoot();

          config_addVar(space.config, 'A', 0, 10);
          config_addVar(space.config, 'B', 0, 10);

          config_addPropagator(space.config, ['lt', ['A', 'B']]);

          config_setOptions(space.config, {timeout_callback() { return true; }});
          space_initFromConfig(space);

          expect(space_propagate(space)).to.eql(false);
        });

        it('debugs', function() {
          let space = space_createRoot();

          expect(__space_debugVarDomains(space)).to.be.an('array');
          expect(__space_getUnsolved(space)).to.be.an('array');
        });
      });
    });
  });
});
