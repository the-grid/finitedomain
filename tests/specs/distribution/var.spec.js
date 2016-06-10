import expect from '../../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateValue,
  specDomainFromNums,
} from '../../fixtures/domain.fixt';

import distribution_getNextVar, {
  BETTER,
  SAME,
  WORSE,

  distribution_varByMin,
  distribution_varByMax,
  distribution_varByMinSize,
  distribution_varByMarkov,
  distribution_varByList,
} from '../../../src/distribution/var';
import Solver from '../../../src/solver';
import {
  config_addVarDomain,
  config_addVarRange,
  config_create,
  config_setOptions,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';

describe('distribution/var.spec', function() {

  describe('distribution_var_by_throw', function() {
    it('should throw', function() {
      expect(_ => distribution_getNextVar({config: {next_var_func: 'throw'}}, {})).to.throw('not expecting to pick this distributor');
    });
  });

  function itAvsB(dist_name, range_a, range_b, out, desc) {
    let stack = new Error('from').stack; // mocha wont tell us which line called itAvsB :(
    if (stack && stack.slice) stack = stack.slice(0, stack.indexOf('._compile')) + ' ...'; // dont need the whole thing

    it(`${desc}; distName: ${dist_name}, rangeA: ${range_a}, rangeB: ${range_b}, out: ${out}`, function() {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        domain: specDomainCreateRange(...range_a, true),
      });
      solver.addVar({
        id: 'B',
        domain: specDomainCreateRange(...range_b, true),
      });
      solver.prepare({
        distribute: {
          var: dist_name,
        },
      });
      let A = solver._space.config.all_var_names.indexOf('A');
      let B = solver._space.config.all_var_names.indexOf('B');

      let varName = distribution_getNextVar(solver._space, [A, B]);

      expect(varName, stack).to.equal(solver._space.config.all_var_names.indexOf(out));
    });
  }

  describe('by_min', function() {

    describe('unit', function() {

      it('should return BETTER if lo(v1) < lo(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateValue(10, true));
        config_addVarDomain(config, 'B', specDomainCreateValue(11, true));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMin(space, A, B)).to.equal(BETTER);
      });

      it('should return SAME if lo(v1) = lo(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateValue(11, true));
        config_addVarDomain(config, 'B', specDomainCreateValue(11, true));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMin(space, A, B)).to.equal(SAME);
      });

      it('should return WORSE if lo(v1) > lo(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateValue(12, true));
        config_addVarDomain(config, 'B', specDomainCreateValue(11, true));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMin(space, A, B)).to.equal(WORSE);
      });
    });

    describe('integration', function() {
      itAvsB('min', [0, 1], [10, 11], 'A', 'should decide on lowest vars first A');
      itAvsB('min', [20, 30], [5, 8], 'B', 'should decide on lowest vars first B');
      itAvsB('min', [9, 21], [10, 20], 'A', 'should base decision on lowest lo, not lowest hi');
    });
  });

  describe('by_max', function() {

    describe('unit', function() {

      it('should return BETTER if hi(v1) > hi(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateValue(12, true));
        config_addVarDomain(config, 'B', specDomainCreateValue(11, true));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMax(space, A, B)).to.equal(BETTER);
      });

      it('should return SAME if hi(v1) = hi(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateValue(11, true));
        config_addVarDomain(config, 'B', specDomainCreateValue(11, true));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMax(space, A, B)).to.equal(SAME);
      });

      it('should return WORSE if hi(v1) < hi(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainCreateValue(10, true));
        config_addVarDomain(config, 'B', specDomainCreateValue(11, true));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMax(space, A, B)).to.equal(WORSE);
      });
    });

    describe('integration', function() {
      itAvsB('max', [0, 1], [10, 11], 'B', 'should decide on highest vars first A');
      itAvsB('max', [20, 30], [5, 8], 'A', 'should decide on highest vars first B');
      itAvsB('max', [9, 21], [10, 20], 'A', 'should base decision on highest hi, not highest lo');
    });
  });

  describe('by_size', function() {

    describe('unit', function() {
      // note: further tests should be unit tests on domain_size instead

      it('should return BETTER if size(v1) < size(v2)', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 5, 5);
        config_addVarRange(config, 'B', 11, 12);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, A, B)).to.equal(BETTER);
      });

      it('should return SAME if size(v1) = size(v2) with single range', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 11);
        config_addVarRange(config, 'B', 8, 8);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, A, B)).to.equal(SAME);
      });

      it('should return SAME if size(v1) = size(v2) with multiple ranges', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(11, 15, 16, 17, 18, 19));
        config_addVarDomain(config, 'B', specDomainFromNums(8, 9, 10, 12, 13, 14));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, A, B)).to.equal(SAME);
      });

      it('should return SAME if size(v1) = size(v2) with different range count', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', specDomainFromNums(11, 13, 14, 18, 19));
        config_addVarDomain(config, 'B', specDomainFromNums(8, 9, 10, 13, 14));
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, A, B)).to.equal(SAME);
      });

      it('should return WORSE if size(v1) > size(v2)', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, A, B)).to.equal(WORSE);
      });
    });

    describe('integration', function() {

      itAvsB('size', [0, 1], [10, 12], 'A', 'should decide on largest domain first A');
      itAvsB('size', [20, 30], [50, 55], 'B', 'should decide on largest domain first B');

      it('should count actual elements in the domain A', function() {

        // note: further tests should be unit tests on domain_size instead
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: specDomainCreateRanges([30, 100]), // 71 elements
        });
        solver.addVar({
          id: 'B',
          domain: specDomainCreateRanges([0, 50], [60, 90]), // 82 elements
        });
        solver.prepare({distribute: {var: 'size'}});
        let A = solver._space.config.all_var_names.indexOf('A');
        let B = solver._space.config.all_var_names.indexOf('B');

        let varName = distribution_getNextVar(solver._space, [A, B]);
        expect(varName).to.eql(A);
      });

      it('should count actual elements in the domain B', function() {

        // note: further tests should be unit tests on domain_size instead
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: specDomainCreateRanges([0, 5], [10, 15], [20, 25], [30, 35], [40, 45], [50, 55], [60, 65], [70, 75], [80, 100]), // 69 elements
        });
        solver.addVar({
          id: 'B',
          domain: specDomainCreateRanges([0, 10], [30, 40], [50, 60], [670, 700]), // 64 elements
        });
        solver.prepare({distribute: {var: 'size'}});
        let A = solver._space.config.all_var_names.indexOf('A');
        let B = solver._space.config.all_var_names.indexOf('B');

        let varName = distribution_getNextVar(solver._space, [A, B]);
        expect(varName).to.eql(B);
      });
    });
  });

  describe('by_markov', function() {

    describe('unit', function() {

      it('should say v1 is BETTER if v1 is a markov var', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        config_setOptions(config, {
          var_dist_config: {
            A: {
              distributor_name: 'markov',
            },
          },
        });
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, A, B, {})).to.equal(BETTER);
      });

      it('should say v1 is WORSE if v1 not a markov but v2 is', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        config_setOptions(config, {
          var_dist_config: {
            B: {
              distributor_name: 'markov',
            },
          },
        });
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, A, B, {})).to.equal(WORSE);
      });

      it('should say v1 is BETTER if v1 and v2 are both markov vars', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        config_setOptions(config, {
          var_dist_config: {
            A: {
              distributor_name: 'markov',
            },
            B: {
              distributor_name: 'markov',
            },
          },
        });
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, A, B, {})).to.equal(BETTER);
      });

      it('should say v1 is SAME as v2 if neither is a markov var', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        config_setOptions(config, {
          var_dist_config: {
          },
        });
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, A, B, {})).to.equal(SAME);
      });

      it('should use fallback if available and vars are SAME and then return BETTER', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 11);
        config_addVarRange(config, 'B', 11, 12);
        config_setOptions(config, {
          var_dist_config: {
            var_dist_options: {}, // neither is markov
          },
        });
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let fallback_config = {fallback_config: 'size'};
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, A, B, fallback_config)).to.equal(BETTER);
      });

      it('should use fallback if available and vars are SAME but then still return SAME', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 11);
        config_addVarRange(config, 'B', 11, 11);
        config_setOptions(config, {
          var_dist_config: {
            var_dist_options: {}, // neither is markov
          },
        });
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let fallback_config = {fallback_config: 'size'};
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, A, B, fallback_config)).to.equal(SAME);
      });

      it('should use fallback if available and vars are SAME and then return WORSE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        config_setOptions(config, {
          var_dist_config: {
            var_dist_options: {}, // neither is markov
          },
        });
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let fallback_config = {fallback_config: 'size'};
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, A, B, fallback_config)).to.equal(WORSE);
      });
    });

    describe('integration', function() {

      it('should prioritize markov vars', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: specDomainCreateRange(0, 1, true),
        });
        solver.addVar({
          id: 'B',
          domain: specDomainCreateRange(10, 12, true),
          distributeOptions: {
            distributor_name: 'markov',
            expandVectorsWith: 1,
          },
        });
        solver.addVar({
          id: 'C',
          domain: specDomainCreateRange(5, 17, true),
        });
        solver.addVar({
          id: 'D',
          domain: specDomainCreateRange(13, 13, true),
        });
        solver.prepare({
          distribute: {
            var: 'markov',
          },
        });
        let A = solver._space.config.all_var_names.indexOf('A');
        let B = solver._space.config.all_var_names.indexOf('B');
        let C = solver._space.config.all_var_names.indexOf('C');
        let D = solver._space.config.all_var_names.indexOf('D');

        let varName = distribution_getNextVar(solver._space, [A, B, C, D]);

        expect(varName).to.eql(B);
      });

      it('should get markov vars back to front', function() {
        // it's not really a hard requirement but that's how it works

        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: specDomainCreateRange(0, 1, true),
        });
        solver.addVar({
          id: 'B',
          domain: specDomainCreateRange(10, 12, true),
          distributeOptions: {
            distributor_name: 'markov',
            expandVectorsWith: 1,
          },
        });
        solver.addVar({
          id: 'C',
          domain: specDomainCreateRange(5, 17, true),
          distributeOptions: {
            distributor_name: 'markov',
            expandVectorsWith: 1,
          },
        });
        solver.addVar({
          id: 'D',
          domain: specDomainCreateRange(13, 13, true),
        });
        solver.prepare({
          distribute: {
            var: 'markov',
          },
        });
        let A = solver._space.config.all_var_names.indexOf('A');
        let B = solver._space.config.all_var_names.indexOf('B');
        let C = solver._space.config.all_var_names.indexOf('C');
        let D = solver._space.config.all_var_names.indexOf('D');

        let varName = distribution_getNextVar(solver._space, [A, B, C, D]);

        expect(varName).to.eql(C);
      });
    });
  });

  describe('by_list', function() {

    describe('unit', function() {

      it('should return BETTER if the priority hash says A is higher than B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {
            A: 2,
            B: 1,
          },
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return WORSE if the inverted priority hash says A is higher than B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          priority_hash: {
            A: 2,
            B: 1,
          },
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(WORSE);
      });

      it('should THROW if the priority hash says A is equal to B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {
            A: 2,
            B: 2,
          },
        };

        expect(() => distribution_varByList(space, A, B, nvconfig)).to.throw('A_CANNOT_GET_SAME_INDEX_FOR_DIFFERENT_NAME');
      });

      it('should return WORSE if the priority hash says A is lower than B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {
            A: 1,
            B: 2,
          },
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(WORSE);
      });

      it('should return BETTER if the inverted priority hash says A is lower than B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          priority_hash: {
            A: 1,
            B: 2,
          },
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return BETTER if A is in the hash but B is not', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {
            A: 2,
          },
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return WORSE if A is in the inverted hash but B is not', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          priority_hash: {
            A: 2,
          },
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(WORSE);
      });

      it('should return WORSE if B is in the hash but A is not', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {
            B: 2,
          },
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(WORSE);
      });

      it('should return BETTER if B is in the inverted hash but A is not', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          priority_hash: {
            B: 2,
          },
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should throw if A gets value 0 from the hash', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {
            A: 0,
          },
        };

        let f = _ => distribution_varByList(space, A, B, nvconfig);
        expect(f).to.throw('SHOULD_NOT_USE_INDEX_ZERO');
      });

      it('should throw if B gets value 0 from the hash', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {
            B: 0,
          },
        };

        let f = _ => distribution_varByList(space, A, B, nvconfig);
        expect(f).to.throw('SHOULD_NOT_USE_INDEX_ZERO');
      });

      it('should return SAME if neither A nor B is in the hash without fallback', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {},
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(SAME);
      });

      it('should return SAME if neither A nor B is in the inverted hash without fallback', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          priority_hash: {},
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(SAME);
      });

      it('should return BETTER if neither is in the hash and fallback is size with A smaller', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {},
          fallback_config: 'size',
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return BETTER if neither is in the inverted hash and fallback is size with A smaller', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          priority_hash: {},
          fallback_config: 'size',
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return SAME if neither is in the hash and fallback is size with A same size as B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 10);
        config_addVarRange(config, 'B', 0, 10);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {},
          fallback_config: 'size',
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(SAME);
      });

      it('should return WORSE if neither is in the hash and fallback is size with A larger', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 10);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot(config);
        space_initFromConfig(space);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          priority_hash: {},
          fallback_config: 'size',
        };

        expect(distribution_varByList(space, A, B, nvconfig)).to.equal(WORSE);
      });
    });

    describe('integration', function() {

      it('should solve vars in the explicit order of the list A', function() {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver.addVar({id: 'B'});
        solver.prepare({
          distribute: {
            var: {
              dist_name: 'list',
              priority_list: ['A', 'B'],
            },
          },
        });
        let A = solver._space.config.all_var_names.indexOf('A');
        let B = solver._space.config.all_var_names.indexOf('B');

        let varName = distribution_getNextVar(solver._space, [A, B]);

        expect(varName).to.eql(A);
      });

      it('should solve vars in the explicit order of the list B', function() {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver.addVar({id: 'B'});
        solver.prepare({
          distribute: {
            var: {
              dist_name: 'list',
              priority_list: ['B', 'A'],
            },
          },
        });
        let A = solver._space.config.all_var_names.indexOf('A');
        let B = solver._space.config.all_var_names.indexOf('B');

        let varName = distribution_getNextVar(solver._space, [A, B]);

        expect(varName).to.eql(B);
      });

      it('should not crash if a var is not on the list or when list is empty', function() {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver.prepare({
          distribute: {
            var: {
              dist_name: 'list',
              priority_list: [],
            },
          },
        });
        let A = solver._space.config.all_var_names.indexOf('A');

        let varName = distribution_getNextVar(solver._space, [A]);

        expect(varName).to.eql(A);
      });

      it('should assume unlisted vars come after listed vars', function() {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver.addVar({id: 'B'});
        solver.addVar({id: 'C'});
        solver.prepare({
          distribute: {
            var: {
              dist_name: 'list',
              priority_list: ['A', 'C'],
            },
          },
        });
        let A = solver._space.config.all_var_names.indexOf('A');
        let B = solver._space.config.all_var_names.indexOf('B');
        let C = solver._space.config.all_var_names.indexOf('C');

        let varName = distribution_getNextVar(solver._space, [A, B, C]);
        expect(varName, 'A and C should go before B').to.eql(A);
        varName = distribution_getNextVar(solver._space, [A, B]);
        expect(varName, 'A should go before B').to.eql(A);
        varName = distribution_getNextVar(solver._space, [B, C]);
        expect(varName, 'C should go before B').to.eql(C);
        varName = distribution_getNextVar(solver._space, [B]);
        expect(varName, 'B is only one left').to.eql(B);
      });

      it('should work with list as fallback dist', function() {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver.addVar({id: 'B'});
        solver.addVar({id: 'C'});
        solver.prepare({
          distribute: {
            var: {
              dist_name: 'markov', // there are no markov vars so it will fallback immediately
              fallback_config: {
                dist_name: 'list',
                priority_list: ['A', 'C'],
              },
            },
          },
        });
        let A = solver._space.config.all_var_names.indexOf('A');
        let B = solver._space.config.all_var_names.indexOf('B');
        let C = solver._space.config.all_var_names.indexOf('C');

        let varName = distribution_getNextVar(solver._space, [A, B, C]);
        expect(varName, 'A and C should go before B').to.eql(A);
        varName = distribution_getNextVar(solver._space, [A, B]);
        expect(varName, 'A should go before B').to.eql(A);
        varName = distribution_getNextVar(solver._space, [B, C]);
        expect(varName, 'C should go before B').to.eql(C);
        varName = distribution_getNextVar(solver._space, [B]);
        expect(varName, 'B is only one left').to.eql(B);
      });
    });
  });

  describe('fallback list -> markov -> size', function() {

    // each test will ask for a var and supply a more limited list of vars

    let solver = new Solver();
    solver.addVar({
      id: 'A_list',
      domain: [0, 10],
    });
    solver.addVar({
      id: 'B_list',
      domain: [0, 20],
    });
    solver.addVar({
      id: 'C_markov',
      domain: [0, 100],
      distributeOptions: {
        distributor_name: 'markov',
        expandVectorsWith: 1,
      },
    });
    solver.addVar({
      id: 'D_markov',
      domain: [0, 50],
      distributeOptions: {
        distributor_name: 'markov',
        expandVectorsWith: 1,
      },
    });
    solver.addVar({
      id: 'E_pleb',
      domain: [0, 100],
    });
    solver.addVar({
      id: 'F_pleb',
      domain: [0, 75],
    });
    solver.prepare({
      distribute: {
        var: {
          dist_name: 'list',
          priority_list: ['B_list', 'A_list'],
          fallback_config: {
            dist_name: 'markov',
            fallback_config: 'size',
          },
        },
      },
    });

    let A_list = solver._space.config.all_var_names.indexOf('A_list');
    let B_list = solver._space.config.all_var_names.indexOf('B_list');
    let C_markov = solver._space.config.all_var_names.indexOf('C_markov');
    let D_markov = solver._space.config.all_var_names.indexOf('D_markov');
    let E_pleb = solver._space.config.all_var_names.indexOf('E_pleb');
    let F_pleb = solver._space.config.all_var_names.indexOf('F_pleb');

    it('base test: should get highest priority on the list; A_list', function() {
      let varName = distribution_getNextVar(solver._space, [A_list, B_list, C_markov, D_markov, E_pleb, F_pleb]);

      expect(varName).to.equal(B_list);
    });

    it('missing first item from list', function() {
      let varName = distribution_getNextVar(solver._space, [A_list, C_markov, D_markov, E_pleb, F_pleb]);

      expect(varName).to.equal(A_list);
    });

    it('nothing on list, fallback to markov, get last markov', function() {
      let varName = distribution_getNextVar(solver._space, [C_markov, D_markov, E_pleb, F_pleb]);

      expect(varName).to.equal(D_markov);
    });

    it('nothing on list, fallback to markov, get only markov', function() {
      let varName = distribution_getNextVar(solver._space, [C_markov, E_pleb, F_pleb]);

      expect(varName).to.equal(C_markov);
    });

    it('nothing on list, no markov vars, pick smallest by size', function() {
      let varName = distribution_getNextVar(solver._space, [E_pleb, F_pleb]);

      expect(varName).to.equal(F_pleb);
    });

    it('nothing on list, no markov vars, pick only var left', function() {
      let varName = distribution_getNextVar(solver._space, [E_pleb]);

      expect(varName).to.equal(E_pleb);
    });

    it('should throw for getting the next var without passing on names', function() {
      expect(_ => distribution_getNextVar(solver._space, [])).to.throw('SHOULD_HAVE_VARS');
    });

    it('dont crash on randomized inclusion and order', function() {
      let all = [A_list, B_list, C_markov, D_markov, E_pleb, F_pleb];
      for (let i = 0; i < 20; ++i) {
        // randomly remove elements from the list
        let names = all.filter(() => Math.random() > 0.3);
        // shuffle list the ugly way
        names.sort(() => Math.random() - 0.5);

        expect(() => distribution_getNextVar(solver._space, names)).not.to.throw();
      }
    });
  });

  describe('list -> inverted list -> min', function() {
    let solver = new Solver();
    solver.addVar({
      id: 'A',
      domain: [0, 10],
    });
    solver.addVar({
      id: 'B',
      domain: [10, 20],
    });
    solver.addVar({
      id: 'C',
      domain: [0, 20],
    });
    solver.addVar({
      id: 'D',
      domain: [10, 20],
    });
    solver.addVar({
      id: 'E',
      domain: [0, 20],
    });
    solver.addVar({
      id: 'F',
      domain: [10, 20],
    });
    solver.prepare({
      distribute: {
        var: {
          dist_name: 'list',
          priority_list: ['B', 'A'],
          fallback_config: {
            dist_name: 'list',
            inverted: true,
            priority_list: ['D', 'C'],
            fallback_config: 'min',
          },
        },
      },
    });

    let A = solver._space.config.all_var_names.indexOf('A');
    let B = solver._space.config.all_var_names.indexOf('B');
    let C = solver._space.config.all_var_names.indexOf('C');
    let D = solver._space.config.all_var_names.indexOf('D');
    let E = solver._space.config.all_var_names.indexOf('E');
    let F = solver._space.config.all_var_names.indexOf('F');

    it('should prioritize list over rest A', function() {
      let varName = distribution_getNextVar(solver._space, [D, C, A, E, F]);

      expect(varName).to.equal(A);
    });

    it('should prioritize list over rest B', function() {
      let varName = distribution_getNextVar(solver._space, [D, C, B, E, F]);

      expect(varName).to.equal(B);
    });

    it('should prioritize un-blacklisted over rest E', function() {
      let varName = distribution_getNextVar(solver._space, [D, E, C]);

      expect(varName).to.equal(E);
    });

    it('should prioritize un-blacklisted over rest F', function() {
      let varName = distribution_getNextVar(solver._space, [D, F, C]);

      expect(varName).to.equal(F);
    });

    it('should prioritize C over D in blacklist', function() {
      let varName = distribution_getNextVar(solver._space, [D, C]);

      expect(varName).to.equal(C);
    });
  });
});
