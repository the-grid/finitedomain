import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateEmpty,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateValue,
  specDomainSmallNums,
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
        expect(space_createRoot().unsolvedVarIndexes).to.be.an('array');
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
        expect(space.vardoms).to.not.equal(clone.vardoms);
      });

      it('should deep clone the vars', function() {
        //for var_name in space.config.all_var_names
        for (let i = 0; i < space.config.all_var_names.length; ++i) {
          let varName = space.config.all_var_names[i];

          if (typeof clone.vardoms[varName] !== 'number') expect(clone.vardoms[varName]).to.not.equal(space.vardoms[varName]);
          expect(clone.vardoms[varName]).to.eql(space.vardoms[varName]);
        }
      });

      // note: the deep clone check is already done above, no need to repeat it
      it('should clone certain props, copy others', function() {
        expect(space.unsolvedVarIndexes).to.not.equal(clone.unsolvedVarIndexes);
        expect(space.unsolvedVarIndexes.join()).to.equal(clone.unsolvedVarIndexes.join());
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
        config_addVarAnonConstant(space.config, 1);
        space_initFromConfig(space);

        expect(space_isSolved(space), 'only one solved var').to.equal(true);
      });

      it('should return true if all 2 vars are solved', function() {
        let space = space_createRoot();
        config_addVarAnonConstant(space.config, 1);
        config_addVarAnonConstant(space.config, 1);
        space_initFromConfig(space);

        expect(space_isSolved(space), 'two solved vars').to.equal(true);
      });

      it('should return false if at least one var is not solved', function() {
        let space = space_createRoot();
        config_addVarAnonRange(space.config, 0, 1);
        space_initFromConfig(space);

        expect(space_isSolved(space), 'only one unsolved var').to.equal(false);
      });

      it('should return false if at least one var of two is not solved', function() {
        let space = space_createRoot();
        config_addVarAnonRange(space.config, 0, 1);
        config_addVarAnonRange(space.config, 0, 1);
        space_initFromConfig(space);

        expect(space_isSolved(space), 'two unsolved vars').to.equal(false);
      });

      it('should return false if at least one var of three is not solved', function() {
        let space = space_createRoot();
        config_addVarAnonRange(space.config, 0, 1);
        config_addVarAnonRange(space.config, 0, 1);
        config_addVarAnonConstant(space.config, 1);
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
        config_addVarDomain(space.config, 'test', specDomainCreateEmpty());
        space_initFromConfig(space);

        expect(space_solution(space)).to.eql({test: false});
      });

      it('should return the value of a var is solved', function() {
        let space = space_createRoot();
        config_addVarDomain(space.config, 'test', specDomainCreateValue(5, true));
        space_initFromConfig(space);

        expect(space_solution(space)).to.eql({test: 5});
      });

      it('should return the domain of a var if not yet determined', function() {
        let space = space_createRoot();
        config_addVarRange(space.config, 'single_range', 10, 120);
        config_addVarDomain(space.config, 'multi_range', specDomainCreateRanges([10, 20], [30, 40]));
        config_addVarDomain(space.config, 'multi_range_with_solved', specDomainCreateRanges([18, 20], [25, 25], [30, 40]));
        space_initFromConfig(space);

        expect(space_solution(space)).to.eql({
          single_range: specDomainCreateRange(10, 120),
          multi_range: specDomainCreateRanges([10, 20], [30, 40]),
          multi_range_with_solved: specDomainCreateRanges([18, 20], [25, 25], [30, 40]),
        });
      });

      it('should not add anonymous vars to the result', function() {
        let space = space_createRoot();
        config_addVarAnonConstant(space.config, 15);
        config_addVarConstant(space.config, 'addme', 20);
        space_initFromConfig(space);

        expect(stripAnonVars(space_solution(space))).to.eql({addme: 20});
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
        config_addVarNothing(space.config, 'A'); // becomes [SUB SUP]
        space_initFromConfig(space);

        let config = space_toConfig(space);

        expect(config.all_var_names).to.eql(['A']);
        expect(config.initial_domains, 'empty property should exist').to.eql([specDomainCreateRange(SUB, SUP)]);
      });
    });

    describe('space_propagate', function() {

      describe('simple cases', function() {

        it('should not reject this multiply case', function() {
          let space = space_createRoot();

          config_addVarRange(space.config, 'A', 0, 10);
          config_addVarRange(space.config, 'B', 0, 10);
          config_addVarRange(space.config, 'MAX', 25, 25);
          config_addVarRange(space.config, 'MUL', 0, 100);

          config_addConstraint(space.config, 'ring-mul', ['A', 'B', 'MUL'], 'mul');
          config_addConstraint(space.config, 'lt', ['MUL', 'MAX']);

          space_initFromConfig(space);

          expect(space_propagate(space)).to.eql(false);
        });
      });

      describe('vars tied to only one propagator', function() {

        it('step 0; two bools at start of search', function() {
          let space = space_createRoot();

          config_addVarRange(space.config, 'A', 0, 1);
          config_addVarRange(space.config, 'B', 0, 1);

          config_addConstraint(space.config, 'neq', ['A', 'B']);

          space_initFromConfig(space);

          // A and B only connect to one propagator
          // at the start of a search nothing should change
          // so after propagate() the vars should remain the same
          space_propagate(space);

          expect(space.vardoms[space.config.all_var_names.indexOf('B')]).to.eql(specDomainSmallNums(0, 1));
          expect(space.vardoms[space.config.all_var_names.indexOf('A')]).to.eql(specDomainSmallNums(0, 1));
        });

        it('step 1; first bool updated', function() {
          let space = space_createRoot();

          config_addVarRange(space.config, 'A', 0, 0);
          config_addVarRange(space.config, 'B', 0, 1);
          config_addConstraint(space.config, 'neq', ['A', 'B']);

          space_initFromConfig(space);
          space.updatedVarIndex = space.config.all_var_names.indexOf('A'); // mark A as having been updated externally

          // A "was updated" by a distributor
          // since it ties to neq it should step that propagator which should
          // affect B and solve the space. if it doesn't that probably means
          // the propagator is incorrectly skipped (or hey, some other bug)
          space_propagate(space);

          expect(space.vardoms[space.config.all_var_names.indexOf('A')]).to.eql(specDomainSmallNums(0)); // we set it
          expect(space.vardoms[space.config.all_var_names.indexOf('B')]).to.eql(specDomainSmallNums(1)); // by neq
        });

        it('step 1; second bool updated', function() {
          let space = space_createRoot();

          config_addVarRange(space.config, 'A', 0, 1);
          config_addVarRange(space.config, 'B', 0, 0);
          config_addConstraint(space.config, 'neq', ['A', 'B']);

          space_initFromConfig(space);
          space.updatedVarIndex = space.config.all_var_names.indexOf('B'); // mark A as having been updated externally

          // B "was updated" by a distributor
          // since it ties to neq it should step that propagator which should
          // affect A and solve the space. if it doesn't that probably means
          // the propagator is incorrectly skipped (or hey, some other bug)
          space_propagate(space);

          expect(space.vardoms[space.config.all_var_names.indexOf('A')]).to.eql(specDomainSmallNums(1)); // by neq
          expect(space.vardoms[space.config.all_var_names.indexOf('B')]).to.eql(specDomainSmallNums(0)); // we set it
        });
      });

      describe('timeout callback', function() {

        it('should ignore timeout callback if not set at all', function() {
          // (base timeout callback test)

          let space = space_createRoot();

          config_addVarRange(space.config, 'A', 0, 10);
          config_addVarRange(space.config, 'B', 0, 10);

          config_addConstraint(space.config, 'lt', ['A', 'B']);

          space_initFromConfig(space);
          expect(space_propagate(space)).to.eql(false);
        });

        it('should not break early if callback doesnt return true', function() {
          let space = space_createRoot();

          config_addVarRange(space.config, 'A', 0, 10);
          config_addVarRange(space.config, 'B', 0, 10);

          config_addConstraint(space.config, 'lt', ['A', 'B']);

          config_setOptions(space.config, {timeout_callback() { return false; }});
          space_initFromConfig(space);

          expect(space_propagate(space)).to.eql(false);
        });

        it('should break early if callback returns true', function() {
          let space = space_createRoot();

          config_addVarRange(space.config, 'A', 0, 10);
          config_addVarRange(space.config, 'B', 0, 10);

          config_addConstraint(space.config, 'lt', ['A', 'B']);

          config_setOptions(space.config, {timeout_callback() { return true; }});
          space_initFromConfig(space);

          expect(space_propagate(space)).to.eql(true);
        });
      });
    });
  });
});
