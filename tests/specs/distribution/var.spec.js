import setup from '../../fixtures/helpers.spec';
import {
  specDomainCreateBool,
  specDomainCreateValue,
  specDomainCreateRange,
  specDomainCreateRanges,
  specDomainCreateZero,
} from '../../fixtures/domain.spec';
import {
  expect,
  assert,
} from 'chai';

import distribution_getNextVar, {
  BETTER,
  SAME,
  WORSE,

  _distribution_var_min as by_min,
  _distribution_var_max as by_max,
  _distribution_var_size as by_min_size,
  _distribution_var_markov as by_markov,
  _distribution_var_list as by_list,
} from '../../../src/distribution/var';
import {
  fdvar_create,
} from '../../../src/fdvar';

describe('distribution/var.spec', function() {

  describe('distribution_var_by_throw', function() {
    it('should throw', function () {
      expect(_ => distribution_getNextVar({config: {next_var_func: 'throw'}}, {})).to.throw('not expecting to pick this distributor');
    });
  });

  function itAvsB(dist_name, range_a, range_b, out, desc) {
    it(desc, function () {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        domain: specDomainCreateRanges(range_a),
      });
      solver.addVar({
        id: 'B',
        domain: specDomainCreateRanges(range_b),
      });
      solver.prepare({
        distribute: {
          var: dist_name,
        },
      });

      let fdvar = distribution_getNextVar(solver._space, ['A', 'B']);

      expect(fdvar.id).to.eql(out);
    });
  }

  describe('by_min', function() {

    describe('unit', function() {

      it('should return BETTER if lo(v1) < lo(v2)', function() {
        let v1 = fdvar_create('1', [10, 11]);
        let v2 = fdvar_create('2', [11, 11]);

        expect(by_min(v1, v2)).to.equal(BETTER);
      });

      it('should return SAME if lo(v1) = lo(v2)', function() {
        let v1 = fdvar_create('1', [11, 11]);
        let v2 = fdvar_create('2', [11, 11]);

        expect(by_min(v1, v2)).to.equal(SAME);
      });

      it('should return WORSE if lo(v1) > lo(v2)', function() {
        let v1 = fdvar_create('1', [12, 11]);
        let v2 = fdvar_create('2', [11, 11]);

        expect(by_min(v1, v2)).to.equal(WORSE);
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
        let v1 = fdvar_create('1', [11, 12]);
        let v2 = fdvar_create('2', [11, 11]);

        expect(by_max(v1, v2)).to.equal(BETTER);
      });

      it('should return SAME if hi(v1) = hi(v2)', function() {
        let v1 = fdvar_create('1', [11, 11]);
        let v2 = fdvar_create('2', [11, 11]);

        expect(by_max(v1, v2)).to.equal(SAME);
      });

      it('should return WORSE if hi(v1) < hi(v2)', function() {
        let v1 = fdvar_create('1', [11, 10]);
        let v2 = fdvar_create('2', [11, 11]);

        expect(by_max(v1, v2)).to.equal(WORSE);
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
        let v1 = fdvar_create('1', [5, 5]);
        let v2 = fdvar_create('2', [11, 12]);

        expect(by_min_size(v1, v2)).to.equal(BETTER);
      });

      it('should return SAME if size(v1) = size(v2) with single range', function() {
        let v1 = fdvar_create('1', [11, 11]);
        let v2 = fdvar_create('2', [8, 8]);

        expect(by_min_size(v1, v2)).to.equal(SAME);
      });

      it('should return SAME if size(v1) = size(v2) with multiple ranges', function() {
        let v1 = fdvar_create('1', specDomainCreateRanges([11, 11], [15, 19]));
        let v2 = fdvar_create('2', specDomainCreateRanges([8, 10], [12, 14]));

        expect(by_min_size(v1, v2)).to.equal(SAME);
      });

      it('should return SAME if size(v1) = size(v2) with different range count', function() {
        let v1 = fdvar_create('1', specDomainCreateRanges([11, 11], [13, 14], [18, 19]));
        let v2 = fdvar_create('2', specDomainCreateRanges([8, 10], [12, 13]));

        expect(by_min_size(v1, v2)).to.equal(SAME);
      });

      it('should return WORSE if size(v1) > size(v2)', function() {
        let v1 = fdvar_create('1', [11, 12]);
        let v2 = fdvar_create('2', [11, 11]);

        expect(by_min_size(v1, v2)).to.equal(WORSE);
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
          domain: specDomainCreateRanges([30, 100]) // 71 elements
        });
        solver.addVar({
          id: 'B',
          domain: specDomainCreateRanges([0, 50], [60, 90]) // 82 elements
        });
        solver.prepare(
          {distribute: { var: 'size'
        }});

        let fdvar = distribution_getNextVar(solver._space, ['A', 'B']);

        expect(fdvar.id).to.eql('A');
      });

      it('should count actual elements in the domain B', function() {

        // note: further tests should be unit tests on domain_size instead
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: specDomainCreateRanges([0, 5], [10, 15], [20, 25], [30, 35], [40, 45], [50, 55], [60, 65], [70, 75], [80, 100]) // 69 elements
        });
        solver.addVar({
          id: 'B',
          domain: specDomainCreateRanges([0, 10], [30, 40], [50, 60], [670, 700]) // 64 elements
        });
        solver.prepare(
          {distribute: { var: 'size'
        }});
        let fdvar = distribution_getNextVar(solver._space, ['A', 'B']);

        expect(fdvar.id).to.eql('B');
      });
    });
  });

  describe('by_markov', function() {

    describe('unit', function() {

      it('should say v1 is BETTER if v1 is a markov var', function() {
        let v1 = fdvar_create('A', [11, 12]);
        let v2 = fdvar_create('B', [11, 11]);
        let fake_space = {
          config: {
            var_dist_options: {
              A: {
                distributor_name: 'markov',
              },
            },
          },
        };

        expect(by_markov(v1, v2, fake_space)).to.equal(BETTER);
      });

      it('should say v2 is WORSE if v1 not a markov but v2 is', function() {
        let v1 = fdvar_create('A', [11, 12]);
        let v2 = fdvar_create('B', [11, 11]);
        let fake_space = {
          config: {
            var_dist_options: {
              B: {
                distributor_name: 'markov',
              },
            },
          },
        };

        expect(by_markov(v1, v2, fake_space)).to.equal(WORSE);
      });

      it('should say v1 is BETTER if v1 and v2 are both markov vars', function() {
        let v1 = fdvar_create('A', [11, 12]);
        let v2 = fdvar_create('B', [11, 11]);
        let fake_space = {
          config: {
            var_dist_options: {
              A: {
                distributor_name: 'markov',
              },
              B: {
                distributor_name: 'markov',
              },
            },
          },
        };

        expect(by_markov(v1, v2, fake_space)).to.equal(BETTER);
      });

      it('should say v1 is SAME as v2 if neither is a markov var', function() {
        let v1 = fdvar_create('A', [11, 12]);
        let v2 = fdvar_create('B', [11, 11]);
        let fake_space = {
          config: {
            var_dist_options: {},
          },
        };
        let fake_config = {}; // its okay to expect this to exist

        expect(by_markov(v1, v2, fake_space, fake_config)).to.equal(SAME);
      });

      it('should use fallback if available and vars are SAME and then return BETTER', function() {
        let v1 = fdvar_create('A', [11, 11]);
        let v2 = fdvar_create('B', [11, 12]);
        let fake_space = {
          config: {
            var_dist_options: {}, // neither is markov
          },
        };
        let fallback_config = {fallback_config: 'size'};

        expect(by_markov(v1, v2, fake_space, fallback_config)).to.equal(BETTER);
      });

      it('should use fallback if available and vars are SAME but then still return SAME', function() {
        let v1 = fdvar_create('A', [11, 11]);
        let v2 = fdvar_create('B', [11, 11]);
        let fake_space = {
          config: {
            var_dist_options: {}, // neither is markov
          },
        };
        let fallback_config = {fallback_config: 'size'};

        expect(by_markov(v1, v2, fake_space, fallback_config)).to.equal(SAME);
      });

      it('should use fallback if available and vars are SAME and then return WORSE', function() {
        let v1 = fdvar_create('A', [11, 12]);
        let v2 = fdvar_create('B', [11, 11]);
        let fake_space = {
          config: {
            var_dist_options: {}, // neither is markov
          },
        };
        let fallback_config = {fallback_config: 'size'};

        expect(by_markov(v1, v2, fake_space, fallback_config)).to.equal(WORSE);
      });
    });

    describe('integration', function() {

      it('should prioritize markov vars', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: specDomainCreateRanges([0, 1]),
        });
        solver.addVar({
          id: 'B',
          domain: specDomainCreateRanges([10, 12]),
          distributeOptions: {
            distributor_name: 'markov',
            expandVectorsWith: 1,
          }
        });
        solver.addVar({
          id: 'C',
          domain: specDomainCreateRanges([5, 17]),
        });
        solver.addVar({
          id: 'D',
          domain: specDomainCreateRanges([13, 13]),
        });
        solver.prepare({
          distribute: {
            var: 'markov',
          },
        });

        let fdvar = distribution_getNextVar(solver._space, ['A', 'B', 'C', 'D']);

        expect(fdvar.id).to.eql('B');
      });

      it('should get markov vars back to front', function() {
        // it's not really a hard requirement but that's how it works

        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: specDomainCreateRanges([0, 1])
        });
        solver.addVar({
          id: 'B',
          domain: specDomainCreateRanges([10, 12]),
          distributeOptions: {
            distributor_name: 'markov',
            expandVectorsWith: 1
          }
        });
        solver.addVar({
          id: 'C',
          domain: specDomainCreateRanges([5, 17]),
          distributeOptions: {
            distributor_name: 'markov',
            expandVectorsWith: 1
          }
        });
        solver.addVar({
          id: 'D',
          domain: specDomainCreateRanges([13, 13])
        });
        solver.prepare({
          distribute: {
            var: 'markov',
          },
        });

        let fdvar = distribution_getNextVar(solver._space, ['A', 'B', 'C', 'D']);

        expect(fdvar.id).to.eql('C');
      });
    });
  });

  describe('by_list', function() {

    describe('unit', function() {

      it('should return BETTER if the priority hash says A is higher than B', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          priority_hash: {
            A: 2,
            B: 1,
          },
        };

        expect(by_list(v1, v2, {}, config)).to.equal(BETTER);
      });

      it('should return WORSE if the inverted priority hash says A is higher than B', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          inverted: true,
          priority_hash: {
            A: 2,
            B: 1,
          },
        };

        expect(by_list(v1, v2, {}, config)).to.equal(WORSE);
      });

      it('should THROW if the priority hash says A is equal to B', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          priority_hash: {
            A: 2,
            B: 2,
          },
        };

        expect(() => by_list(v1, v2, {}, config)).to.throw();
      });

      it('should return WORSE if the priority hash says A is lower than B', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          priority_hash: {
            A: 1,
            B: 2,
          },
        };

        expect(by_list(v1, v2, {}, config)).to.equal(WORSE);
      });

      it('should return BETTER if the inverted priority hash says A is lower than B', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          inverted: true,
          priority_hash: {
            A: 1,
            B: 2,
          },
        };

        expect(by_list(v1, v2, {}, config)).to.equal(BETTER);
      });

      it('should return BETTER if A is in the hash but B is not', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          priority_hash: {
            A: 2,
          },
        };

        expect(by_list(v1, v2, {}, config)).to.equal(BETTER);
      });

      it('should return WORSE if A is in the inverted hash but B is not', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          inverted: true,
          priority_hash: {
            A: 2,
          },
        };

        expect(by_list(v1, v2, {}, config)).to.equal(WORSE);
      });

      it('should return WORSE if B is in the hash but A is not', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          priority_hash: {
            B: 2,
          },
        };

        expect(by_list(v1, v2, {}, config)).to.equal(WORSE);
      });

      it('should return BETTER if B is in the inverted hash but A is not', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          inverted: true,
          priority_hash: {
            B: 2,
          },
        };

        expect(by_list(v1, v2, {}, config)).to.equal(BETTER);
      });

      it('should throw if A gets value 0 from the hash', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let fake_space = {
          config: {
            var_dist_options: {
              priority_hash: {
                A: 0,
              },
            },
          },
        };

        expect(() => by_list(v1, v2, fake_space, {})).to.throw();
      });

      it('should throw if B gets value 0 from the hash', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          priority_hash: {
            B: 0,
          },
        };

        expect(() => by_list(v1, v2, {}, config)).to.throw();
      });

      it('should return SAME if neither A nor B is in the hash without fallback', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          priority_hash: {},
        };

        expect(by_list(v1, v2, {}, config)).to.equal(SAME);
      });

      it('should return SAME if neither A nor B is in the inverted hash without fallback', function() {
        let v1 = fdvar_create('A', []);
        let v2 = fdvar_create('B', []);
        let config = {
          inverted: true,
          priority_hash: {},
        };

        expect(by_list(v1, v2, {}, config)).to.equal(SAME);
      });

      it('should return BETTER if neither is in the hash and fallback is size with A smaller', function() {
        let v1 = fdvar_create('A', [0, 0]);
        let v2 = fdvar_create('B', [0, 10]);
        let config = {
          priority_hash: {},
          fallback_config: 'size',
        };

        expect(by_list(v1, v2, {}, config)).to.equal(BETTER);
      });

      it('should return BETTER if neither is in the inverted hash and fallback is size with A smaller', function() {
        let v1 = fdvar_create('A', [0, 0]);
        let v2 = fdvar_create('B', [0, 10]);
        let config = {
          inverted: true,
          priority_hash: {},
          fallback_config: 'size',
        };

        expect(by_list(v1, v2, {}, config)).to.equal(BETTER);
      });

      it('should return SAME if neither is in the hash and fallback is size with A same size as B', function() {
        let v1 = fdvar_create('A', [0, 10]);
        let v2 = fdvar_create('B', [0, 10]);
        let config = {
          priority_hash: {},
          fallback_config: 'size',
        };

        expect(by_list(v1, v2, {}, config)).to.equal(SAME);
      });

      it('should return WORSE if neither is in the hash and fallback is size with A larger', function() {
        let v1 = fdvar_create('A', [0, 10]);
        let v2 = fdvar_create('B', [0, 0]);
        let config = {
          priority_hash: {},
          fallback_config: 'size',
        };

        expect(by_list(v1, v2, {}, config)).to.equal(WORSE);
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

        let fdvar = distribution_getNextVar(solver._space, ['A', 'B']);

        expect(fdvar.id).to.eql('A');
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

        let fdvar = distribution_getNextVar(solver._space, ['A', 'B']);

        expect(fdvar.id).to.eql('B');
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

        let fdvar = distribution_getNextVar(solver._space, ['A']);

        expect(fdvar.id).to.eql('A');
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

        let fdvar = distribution_getNextVar(solver._space, ['A', 'B', 'C']);
        expect(fdvar.id, 'A and C should go before B').to.eql('A');
        fdvar = distribution_getNextVar(solver._space, ['A', 'B']);
        expect(fdvar.id, 'A should go before B').to.eql('A');
        fdvar = distribution_getNextVar(solver._space, ['B', 'C']);
        expect(fdvar.id, 'C should go before B').to.eql('C');
        fdvar = distribution_getNextVar(solver._space, ['B']);
        expect(fdvar.id, 'B is only one left').to.eql('B');
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

        let fdvar = distribution_getNextVar(solver._space, ['A', 'B', 'C']);
        expect(fdvar.id, 'A and C should go before B').to.eql('A');
        fdvar = distribution_getNextVar(solver._space, ['A', 'B']);
        expect(fdvar.id, 'A should go before B').to.eql('A');
        fdvar = distribution_getNextVar(solver._space, ['B', 'C']);
        expect(fdvar.id, 'C should go before B').to.eql('C');
        fdvar = distribution_getNextVar(solver._space, ['B']);
        expect(fdvar.id, 'B is only one left').to.eql('B');
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

    it('base test: should get highest priority on the list; A_list', function() {
      let fdvar = distribution_getNextVar(solver._space, ['A_list', 'B_list', 'C_markov', 'D_markov', 'E_pleb', 'F_pleb']);

      expect(fdvar.id).to.equal('B_list');
    });

    it('missing first item from list', function() {
      let fdvar = distribution_getNextVar(solver._space, ['A_list', 'C_markov', 'D_markov', 'E_pleb', 'F_pleb']);

      expect(fdvar.id).to.equal('A_list');
    });

    it('nothing on list, fallback to markov, get last markov', function() {
      let fdvar = distribution_getNextVar(solver._space, ['C_markov', 'D_markov', 'E_pleb', 'F_pleb']);

      expect(fdvar.id).to.equal('D_markov');
    });

    it('nothing on list, fallback to markov, get only markov', function() {
      let fdvar = distribution_getNextVar(solver._space, ['C_markov', 'E_pleb', 'F_pleb']);

      expect(fdvar.id).to.equal('C_markov');
    });

    it('nothing on list, no markov vars, pick smallest by size', function() {
      let fdvar = distribution_getNextVar(solver._space, ['E_pleb', 'F_pleb']);

      expect(fdvar.id).to.equal('F_pleb');
    });

    it('nothing on list, no markov vars, pick only var left', function() {
      let fdvar = distribution_getNextVar(solver._space, ['E_pleb']);

      expect(fdvar.id).to.equal('E_pleb');
    });

    it('should just return undefined despite config', function() {
      let fdvar = distribution_getNextVar(solver._space, []);

      expect(fdvar.id).to.equal(undefined);
    });

    it('dont crash on randomized inclusion and order', function() {
      let all = ['A_list', 'B_list', 'C_markov', 'D_markov', 'E_pleb', 'F_pleb'];
      for (let i = 0; i < 20; ++i) {
        // randomly remove elements from the list
        let names = all.filter(() => Math.random() > 0.3);
        // shuffle list the ugly way
        names.sort(() => Math.random() - .5);

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

    it('should prioritize list over rest A', function() {
      let fdvar = distribution_getNextVar(solver._space, ['D', 'C', 'A', 'E', 'F']);

      expect(fdvar.id).to.equal('A');
    });

    it('should prioritize list over rest B', function() {
      let fdvar = distribution_getNextVar(solver._space, ['D', 'C', 'B', 'E', 'F']);

      expect(fdvar.id).to.equal('B');
    });

    it('should prioritize un-blacklisted over rest E', function() {
      let fdvar = distribution_getNextVar(solver._space, ['D', 'E', 'C']);

      expect(fdvar.id).to.equal('E');
    });

    it('should prioritize un-blacklisted over rest F', function() {
      let fdvar = distribution_getNextVar(solver._space, ['D', 'F', 'C']);

      expect(fdvar.id).to.equal('F');
    });

    it('should prioritize C over D in blacklist', function() {
      let fdvar = distribution_getNextVar(solver._space, ['D', 'C']);

      expect(fdvar.id).to.equal('C');
    });
  });
});
