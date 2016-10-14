import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_arrdom_value,
  fixt_arrdom_nums,
} from '../../fixtures/domain.fixt';

import distribution_getNextVarIndex, {
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
  config_setOption,
} from '../../../src/config';
import {
  space_createRoot,
  space_initFromConfig,
} from '../../../src/space';

describe('distribution/var.spec', function() {

  describe('distribution_var_by_throw', function() {

    it('should throw', function() {
      expect(_ => distribution_getNextVarIndex({}, {varStratConfig: {type: 'throw'}})).to.throw('not expecting to pick this distributor');
    });

    it('should throw', function() {
      expect(_ => distribution_getNextVarIndex({}, {varStratConfig: {type: 'unknown'}})).to.throw('unknown next var func');
    });
  });

  function itAvsB(type, range_a, range_b, out, desc) {
    let stack = new Error('from').stack; // mocha wont tell us which line called itAvsB :(
    if (stack && stack.slice) stack = stack.slice(0, stack.indexOf('._compile')) + ' ...'; // dont need the whole thing

    it(`itAvsB: ${desc}; type: ${type}, rangeA: ${range_a}, rangeB: ${range_b}, out: ${out}`, function() {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        domain: fixt_arrdom_range(...range_a, true),
      });
      solver.addVar({
        id: 'B',
        domain: fixt_arrdom_range(...range_b, true),
      });
      solver._prepare({
        distribute: {
          varStrategy: {
            type: type,
          },
          targeted_var_names: ['A', 'B'], // otherwise nothing happens
        },
      });

      let varIndex = distribution_getNextVarIndex(solver._space, solver.config);

      expect(varIndex, stack).to.equal(solver.config.all_var_names.indexOf(out));
    });
  }

  describe('by_min', function() {

    describe('unit', function() {

      it('should return BETTER if lo(v1) < lo(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_value(10, true));
        config_addVarDomain(config, 'B', fixt_arrdom_value(11, true));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMin(space, config, A, B)).to.equal(BETTER);
      });

      it('should return SAME if lo(v1) = lo(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_value(11, true));
        config_addVarDomain(config, 'B', fixt_arrdom_value(11, true));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMin(space, config, A, B)).to.equal(SAME);
      });

      it('should return WORSE if lo(v1) > lo(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_value(12, true));
        config_addVarDomain(config, 'B', fixt_arrdom_value(11, true));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMin(space, config, A, B)).to.equal(WORSE);
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
        config_addVarDomain(config, 'A', fixt_arrdom_value(12, true));
        config_addVarDomain(config, 'B', fixt_arrdom_value(11, true));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMax(space, config, A, B)).to.equal(BETTER);
      });

      it('should return SAME if hi(v1) = hi(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_value(11, true));
        config_addVarDomain(config, 'B', fixt_arrdom_value(11, true));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMax(space, config, A, B)).to.equal(SAME);
      });

      it('should return WORSE if hi(v1) < hi(v2)', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_value(10, true));
        config_addVarDomain(config, 'B', fixt_arrdom_value(11, true));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMax(space, config, A, B)).to.equal(WORSE);
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
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, config, A, B)).to.equal(BETTER);
      });

      it('should return SAME if size(v1) = size(v2) with single range', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 11);
        config_addVarRange(config, 'B', 8, 8);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, config, A, B)).to.equal(SAME);
      });

      it('should return SAME if size(v1) = size(v2) with multiple ranges', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(11, 15, 16, 17, 18, 19));
        config_addVarDomain(config, 'B', fixt_arrdom_nums(8, 9, 10, 12, 13, 14));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, config, A, B)).to.equal(SAME);
      });

      it('should return SAME if size(v1) = size(v2) with different range count', function() {
        let config = config_create();
        config_addVarDomain(config, 'A', fixt_arrdom_nums(11, 13, 14, 18, 19));
        config_addVarDomain(config, 'B', fixt_arrdom_nums(8, 9, 10, 13, 14));
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, config, A, B)).to.equal(SAME);
      });

      it('should return WORSE if size(v1) > size(v2)', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMinSize(space, config, A, B)).to.equal(WORSE);
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
          domain: fixt_arrdom_ranges([30, 100]), // 71 elements
        });
        solver.addVar({
          id: 'B',
          domain: fixt_arrdom_ranges([0, 50], [60, 90]), // 82 elements
        });
        solver._prepare({
          distribute: {
            varStrategy: {
              type: 'size',
            },
            targeted_var_names: ['A', 'B'], // else nothing happens
          },
        });

        let varName = distribution_getNextVarIndex(solver._space, solver.config);
        expect(varName).to.eql(solver.config.all_var_names.indexOf('A'));
      });

      it('should count actual elements in the domain B', function() {

        // note: further tests should be unit tests on domain_size instead
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: fixt_arrdom_ranges([0, 5], [10, 15], [20, 25], [30, 35], [40, 45], [50, 55], [60, 65], [70, 75], [80, 100]), // 69 elements
        });
        solver.addVar({
          id: 'B',
          domain: fixt_arrdom_ranges([0, 10], [30, 40], [50, 60], [670, 700]), // 64 elements
        });
        solver._prepare({
          distribute: {
            varStrategy: {
              type: 'size',
            },
            targeted_var_names: ['A', 'B'], // else nothing happens
          },
        });

        let varName = distribution_getNextVarIndex(solver._space, solver.config);
        expect(varName).to.eql(solver.config.all_var_names.indexOf('B'));
      });
    });
  });

  describe('by_markov', function() {

    describe('unit', function() {

      it('should say v1 is BETTER if v1 is a markov var', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        config_setOption(config, 'varValueStrat', {valtype: 'markov'}, 'A');
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, config, A, B, {})).to.equal(BETTER);
      });

      it('should say v1 is WORSE if v1 not a markov but v2 is', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        config_setOption(config, 'varValueStrat', {valtype: 'markov'}, 'B');
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, config, A, B, {})).to.equal(WORSE);
      });

      it('should say v1 is BETTER if v1 and v2 are both markov vars', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_setOption(config, 'varValueStrat', {valtype: 'markov'}, 'A');
        config_addVarRange(config, 'B', 11, 11);
        config_setOption(config, 'varValueStrat', {valtype: 'markov'}, 'B');
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, config, A, B, {})).to.equal(BETTER);
      });

      it('should say v1 is SAME as v2 if neither is a markov var', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, config, A, B, {})).to.equal(SAME);
      });

      it('should use fallback if available and vars are SAME and then return BETTER', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 11);
        config_addVarRange(config, 'B', 11, 12);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let fallback = {fallback: {type: 'size'}};
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, config, A, B, fallback)).to.equal(BETTER);
      });

      it('should use fallback if available and vars are SAME but then still return SAME', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 11);
        config_addVarRange(config, 'B', 11, 11);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let fallback = {fallback: {type: 'size'}};
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, config, A, B, fallback)).to.equal(SAME);
      });

      it('should use fallback if available and vars are SAME and then return WORSE', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 11, 12);
        config_addVarRange(config, 'B', 11, 11);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let fallback = {fallback: {type: 'size'}};
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        expect(distribution_varByMarkov(space, config, A, B, fallback)).to.equal(WORSE);
      });
    });

    describe('integration', function() {

      it('should prioritize markov vars', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: fixt_arrdom_range(0, 1, true),
        });
        solver.addVar({
          id: 'B',
          domain: fixt_arrdom_range(10, 12, true),
          distributeOptions: {
            valtype: 'markov',
            expandVectorsWith: 1,
          },
        });
        solver.addVar({
          id: 'C',
          domain: fixt_arrdom_range(5, 17, true),
        });
        solver.addVar({
          id: 'D',
          domain: fixt_arrdom_range(13, 13, true),
        });
        solver._prepare({
          distribute: {
            varStrategy: {type: 'markov'},
          },
        });

        let varIndex = distribution_getNextVarIndex(solver._space, solver.config);

        expect(varIndex).to.eql(solver.config.all_var_names.indexOf('B'));
      });

      it('should get markov vars back to front', function() {
        // it's not really a hard requirement but that's how it works

        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: fixt_arrdom_range(0, 1, true),
        });
        solver.addVar({
          id: 'B',
          domain: fixt_arrdom_range(10, 12, true),
          distributeOptions: {
            valtype: 'markov',
            expandVectorsWith: 1,
          },
        });
        solver.addVar({
          id: 'C',
          domain: fixt_arrdom_range(5, 17, true),
          distributeOptions: {
            valtype: 'markov',
            expandVectorsWith: 1,
          },
        });
        solver.addVar({
          id: 'D',
          domain: fixt_arrdom_range(13, 13, true),
        });
        solver._prepare({
          distribute: {
            varStrategy: {type: 'markov'},
          },
        });

        let varIndex = distribution_getNextVarIndex(solver._space, solver.config);

        expect(varIndex).to.eql(solver.config.all_var_names.indexOf('C'));
      });
    });
  });

  describe('by_list', function() {

    describe('unit', function() {

      it('should return BETTER if the priority hash says A is higher than B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {
            [A]: 2,
            [B]: 1,
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return WORSE if the inverted priority hash says A is higher than B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          _priorityByIndex: {
            [A]: 2,
            [B]: 1,
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(WORSE);
      });

      it('should THROW if the priority hash says A is equal to B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {
            [A]: 2,
            [B]: 2,
          },
        };

        expect(() => distribution_varByList(space, config, A, B, nvconfig)).to.throw('A_CANNOT_GET_SAME_INDEX_FOR_DIFFERENT_NAME');
      });

      it('should return WORSE if the priority hash says A is lower than B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {
            [A]: 1,
            [B]: 2,
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(WORSE);
      });

      it('should return BETTER if the inverted priority hash says A is lower than B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          _priorityByIndex: {
            [A]: 1,
            [B]: 2,
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return BETTER if A is in the hash but B is not', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {
            [A]: 2,
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return WORSE if A is in the inverted hash but B is not', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          _priorityByIndex: {
            [A]: 2,
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(WORSE);
      });

      it('should return WORSE if B is in the hash but A is not', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {
            [B]: 2,
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(WORSE);
      });

      it('should return BETTER if B is in the inverted hash but A is not', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          _priorityByIndex: {
            [B]: 2,
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should throw if A gets value 0 from the hash', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {
            [A]: 0,
          },
        };

        let f = _ => distribution_varByList(space, config, A, B, nvconfig);
        expect(f).to.throw('SHOULD_NOT_USE_INDEX_ZERO');
      });

      it('should throw if B gets value 0 from the hash', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {
            [B]: 0,
          },
        };

        let f = _ => distribution_varByList(space, config, A, B, nvconfig);
        expect(f).to.throw('SHOULD_NOT_USE_INDEX_ZERO');
      });

      it('should return SAME if neither A nor B is in the hash without fallback', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {},
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(SAME);
      });

      it('should return SAME if neither A nor B is in the inverted hash without fallback', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          _priorityByIndex: {},
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(SAME);
      });

      it('should return BETTER if neither is in the hash and fallback is size with A smaller', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {},
          fallback: {
            type: 'size',
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return BETTER if neither is in the inverted hash and fallback is size with A smaller', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 0);
        config_addVarRange(config, 'B', 0, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          inverted: true,
          _priorityByIndex: {},
          fallback: {
            type: 'size',
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(BETTER);
      });

      it('should return SAME if neither is in the hash and fallback is size with A same size as B', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 10);
        config_addVarRange(config, 'B', 0, 10);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {},
          fallback: {
            type: 'size',
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(SAME);
      });

      it('should return WORSE if neither is in the hash and fallback is size with A larger', function() {
        let config = config_create();
        config_addVarRange(config, 'A', 0, 10);
        config_addVarRange(config, 'B', 0, 0);
        let space = space_createRoot();
        space_initFromConfig(space, config);
        let A = config.all_var_names.indexOf('A');
        let B = config.all_var_names.indexOf('B');

        let nvconfig = {
          _priorityByIndex: {},
          fallback: {
            type: 'size',
          },
        };

        expect(distribution_varByList(space, config, A, B, nvconfig)).to.equal(WORSE);
      });
    });

    describe('integration', function() {

      it('should solve vars in the explicit order of the list A', function() {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver.addVar({id: 'B'});
        solver._prepare({
          distribute: {
            varStrategy: {
              type: 'list',
              priorityList: ['A', 'B'],
            },
            targeted_var_names: ['A', 'B'], // else nothing happens
          },
        });

        let varName = distribution_getNextVarIndex(solver._space, solver.config);

        expect(varName).to.eql(solver.config.all_var_names.indexOf('A'));
      });

      it('should solve vars in the explicit order of the list B', function() {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver.addVar({id: 'B'});
        solver._prepare({
          distribute: {
            varStrategy: {
              type: 'list',
              priorityList: ['B', 'A'],
            },
            targeted_var_names: ['A', 'B'], // else nothing happens
          },
        });

        let varName = distribution_getNextVarIndex(solver._space, solver.config);

        expect(varName).to.eql(solver.config.all_var_names.indexOf('B'));
      });

      it('should not crash if a var is not on the list or when list is empty', function() {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver._prepare({
          distribute: {
            varStrategy: {
              type: 'list',
              priorityList: [],
            },
            targeted_var_names: ['A'], // else nothing happens
          },
        });

        let varName = distribution_getNextVarIndex(solver._space, solver.config);

        expect(varName).to.eql(solver.config.all_var_names.indexOf('A'));
      });

      function unlistedTest(desc, targetNames, expectingName) {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver.addVar({id: 'B'});
        solver.addVar({id: 'C'});
        solver._prepare({
          distribute: {
            varStrategy: {
              type: 'list',
              priorityList: ['A', 'C'],
            },
            targeted_var_names: targetNames, // else nothing happens
          },
        });

        let varName = distribution_getNextVarIndex(solver._space, solver.config);
        expect(varName, desc).to.eql(solver.config.all_var_names.indexOf(expectingName));
      }

      it('should assume unlisted vars come after listed vars', function() {
        unlistedTest('A and C should go before B', ['A', 'B', 'C'], 'A');
        unlistedTest('A should go before B', ['A', 'B'], 'A');
        unlistedTest('C should go before B', ['B', 'C'], 'C');
        unlistedTest('B is only one left', ['B'], 'B');
      });

      function fallbackTest(desc, targetNames, expectedName) {
        let solver = new Solver();
        solver.addVar({id: 'A'});
        solver.addVar({id: 'B'});
        solver.addVar({id: 'C'});
        solver._prepare({
          distribute: {
            varStrategy: {
              type: 'markov', // there are no markov vars so it will fallback immediately
              fallback: {
                type: 'list',
                priorityList: ['A', 'C'],
              },
            },
            targeted_var_names: targetNames, // else nothing happens
          },
        });

        let varName = distribution_getNextVarIndex(solver._space, solver.config);
        expect(varName, desc).to.eql(solver.config.all_var_names.indexOf(expectedName));
      }

      it('should work with list as fallback dist', function() {
        fallbackTest('A and C should go before B', ['A', 'B', 'C'], 'A');
        fallbackTest('A should go before B', ['A', 'B'], 'A');
        fallbackTest('C should go before B', ['B', 'C'], 'C');
        fallbackTest('B is only one left', ['B'], 'B');
      });
    });
  });

  describe('fallback list -> markov -> size', function() {
    // each test will ask for a var and supply a more limited list of vars


    function test(targetNames, resultName) {
      let solver;
      solver = new Solver();
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
          valtype: 'markov',
          expandVectorsWith: 1,
        },
      });
      solver.addVar({
        id: 'D_markov',
        domain: [0, 50],
        distributeOptions: {
          valtype: 'markov',
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

      solver._prepare({
        distribute: {
          varStrategy: {
            type: 'list',
            priorityList: ['B_list', 'A_list'],
            fallback: {
              type: 'markov',
              fallback: {
                type: 'size',
              },
            },
          },
          targeted_var_names: targetNames, // else nothing happens
        },
      });

      let varIndex = distribution_getNextVarIndex(solver._space, solver.config);

      if (resultName !== undefined) {
        expect(varIndex).to.equal(solver.config.all_var_names.indexOf(resultName));
      }
    }

    it('base test: should get highest priority on the list; A_list', function() {
      test(['A_list', 'B_list', 'C_markov', 'D_markov', 'E_pleb', 'F_pleb'], 'B_list');
    });

    it('missing first item from list', function() {
      test(['A_list', 'C_markov', 'D_markov', 'E_pleb', 'F_pleb'], 'A_list');
    });

    it('nothing on list, fallback to markov, get last markov', function() {
      test(['C_markov', 'D_markov', 'E_pleb', 'F_pleb'], 'D_markov');
    });

    it('nothing on list, fallback to markov, get only markov', function() {
      test(['C_markov', 'E_pleb', 'F_pleb'], 'C_markov');
    });

    it('nothing on list, no markov vars, pick smallest by size', function() {
      test(['E_pleb', 'F_pleb'], 'F_pleb');
    });

    it('nothing on list, no markov vars, pick only var left', function() {
      test(['E_pleb'], 'E_pleb');
    });

    it('dont crash on randomized inclusion and order', function() {
      let all = ['A_list', 'B_list', 'C_markov', 'D_markov', 'E_pleb', 'F_pleb'];
      for (let i = 0; i < 20; ++i) {
        // randomly remove elements from the list
        let names = all.filter(() => Math.random() > 0.3);
        // shuffle list the ugly way
        names.sort(() => Math.random() - 0.5);
        // must have some names or assertions are broken
        if (names.length) test(names);
      }
    });
  });

  describe('list -> inverted list -> min', function() {

    function test(targetNames, expectName) {
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
      solver._prepare({
        distribute: {
          varStrategy: {
            type: 'list',
            priorityList: ['B', 'A'],
            fallback: {
              type: 'list',
              inverted: true,
              priorityList: ['D', 'C'],
              fallback: {
                type: 'min',
              },
            },
          },
          targeted_var_names: targetNames, // else nothing happens
        },
      });

      let varIndex = distribution_getNextVarIndex(solver._space, solver.config);

      expect(varIndex).to.equal(solver.config.all_var_names.indexOf(expectName));
    }

    it('should prioritize list over rest A', function() {
      test(['D', 'C', 'A', 'E', 'F'], 'A');
    });

    it('should prioritize list over rest B', function() {
      test(['D', 'C', 'B', 'E', 'F'], 'B');
    });

    it('should prioritize un-blacklisted over rest E', function() {
      test(['D', 'E', 'C'], 'E');
    });

    it('should prioritize un-blacklisted over rest F', function() {
      test(['D', 'F', 'C'], 'F');
    });

    it('should prioritize C over D in blacklist', function() {
      test(['D', 'C'], 'C');
    });
  });
});
