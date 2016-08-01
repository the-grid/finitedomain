import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  stripAnonVars,
  stripAnonVarsFromArrays,
} from '../fixtures/domain.fixt';
import {
  countSolutions,
} from '../fixtures/lib';

import Solver from '../../src/solver';

// These Solver specs focus on using Markov
describe('solver.markov.spec', function() {

  this.timeout(60000); // takes long under istanbul / even longer under travis

  it('should exist', function() {
    expect(Solver).to.be.a('function');
  });

  it('should enforce markov which should only allow values from the legend', function() {
    // if this test fails, the default markov propagator is probably not added
    // any markov var should only allow solutions with values of the legend.
    // this markov config has only zeroes, your test probably failed with two
    // solutions where should only be one; that where V=0.
    // See solver_collectDistributionOverrides for the markov propagator.

    let solver = new Solver({});
    solver.addVar({
      id: 'V',
      domain: fixt_arrdom_range(0, 1, true),
      distribute: 'markov',
      distributeOptions: {
        legend: [0, 0], // this means only 0 can be picked, regardless. bust otherwise.
        matrix: [
          {vector: [1, 1]},
        ],
      },
    });

    let solutions = solver.solve();
    // will only try (and pass) V=0 because V=1 is not in the legend
    expect(countSolutions(solver)).to.equal(1);
    expect(solutions).to.eql([{V: 0}]);
  });

  describe('random functions', function() {

    const FUNCS = {
      default: undefined,

      'Math.random': Math.random,

      // Multiverse.Random should be tested on its own in its own package...
      //'seeded': new Multiverse.Random "sjf20ru"

      // redundant.
      custom() {
        return Math.random();
      },

      MIN_FIRST() {
        return 0;
      },

      MAX_FIRST() {
        return 1 - 1e-5;
      },
    };

    function setupSolverForRandomTest(random_func) {
      let solver = new Solver({});

      solver.addVar({
        id: 'STATE',
        domain: fixt_arrdom_range(0, 10, true),
      });
      solver.addVar({
        id: 'V1',
        domain: fixt_arrdom_range(0, 1, true),
        distribute: 'markov',
        distributeOptions: {
          legend: [0, 1],
          random: random_func,
          matrix: [
            {
              vector: [0.1, 1],
              boolean(S) {
                return S['==?']('STATE', S.constant(5));
              },
            }, {
              vector: [1, 1],
            },
          ],
        },
      });
      solver.addVar({
        id: 'V2',
        domain: fixt_arrdom_range(0, 1, true),
        distribute: 'markov',
        distributeOptions: {
          legend: [0, 1],
          random: random_func,
          matrix: [
            {
              vector: [0.1, 1],
              boolean(Solver) {
                return Solver['==?']('STATE', solver.constant(100));
              },
            }, {
              vector: [1, 1],
            },
          ],
        },
      });

      solver['==']('STATE', solver.constant(5));

      return solver;
    }

    function testRandom(random_name) {
      let random_func = FUNCS[random_name];

      describe(`random function: ${random_name}`, function() {

        it(`should have a fixed outcome for ${random_name}`, function() {
          if (random_name === 'MIN_FIRST') {
            let solver = setupSolverForRandomTest(random_func);
            let solutions = solver.solve({max: 1});

            expect(stripAnonVarsFromArrays(solutions)).to.eql([{STATE: 5, V1: 0, V2: 0}]);
          }
          if (random_name === 'MAX_FIRST') {
            let solver = setupSolverForRandomTest(random_func);
            let solutions = solver.solve({max: 1});

            expect(stripAnonVarsFromArrays(solutions)).to.eql([{STATE: 5, V1: 1, V2: 1}]);
          }
        });

        it('should have a certain probability distribution of the random function when getting _one_ solution 1000x', function() {

          let v1_count = [0, 0];
          let v2_count = [0, 0];
          for (let i = 0; i < 1000; ++i) {
            let solver = setupSolverForRandomTest(random_func);

            let solutions = solver.solve({max: 1});

            expect(countSolutions(solver)).to.equal(1);
            for (let k = 0; k < solutions.length; k++) {
              let solution = solutions[k];
              v1_count[solution['V1']]++;
              v2_count[solution['V2']]++;
            }
          }

          switch (random_name) {
            case 'MIN_FIRST':
              expect(v1_count, 'minfirst v1 count').to.eql([1000, 0]);
              expect(v2_count, 'minfirst v2 count').to.eql([1000, 0]);
              break;

            case 'MAX_FIRST':
              expect(v1_count, 'maxfirst v1 count').to.eql([0, 1000]);
              expect(v2_count, 'maxfirst v2 count').to.eql([0, 1000]);
              break;

            default: // random functions are within 15% error assuming a normal distribution
              let v1_c = (v1_count[0] / v1_count[1]) - (1 / 10);
              //let v2_c = (v2_count[0] / v2_count[1]) - (1 / 10);

              expect(v1_c < 0.15, `${v1_c} < .15`).to.equal(true);
              //expect(v2_c > .85, `${v2_c} > .85`).to.equal(true); // TOFIX: confirm and fix this line....
          }
        });

        it('should express equal probabilities when getting _all_ solutions x500 times', function() {

          let v1_count = [0, 0];
          let v2_count = [0, 0];
          for (let i = 0; i < 500; ++i) {
            let solver = setupSolverForRandomTest(random_func);

            let solutions = solver.solve(); // no max!

            for (let k = 0; k < solutions.length; k++) {
              let solution = solutions[k];
              v1_count[solution['V1']]++;
              v2_count[solution['V2']]++;
            }
          }

          expect(v1_count[0] === v1_count[1]).to.equal(true);
          expect(v2_count[0] === v2_count[1]).to.equal(true);
        });
      });
    }

    Object.keys(FUNCS).forEach(testRandom);
  });

  it('should interpret large domain w/ sparse legend & 0 probability as a constraint', function() {
    let solver = new Solver({});

    solver.addVar({
      id: 'STATE',
      domain: fixt_arrdom_range(0, 10, true),
    });
    solver.addVar({
      id: 'V1',
      domain: fixt_arrdom_range(0, 100),
      distribute: 'markov',
      distributeOptions: {
        legend: [10, 100],
        matrix: [
          {
            vector: [1, 0],
            boolean(S) {
              return S['==?']('STATE', S.constant(5));
            },
          }, {
            vector: [0, 1],
          },
        ],
      },
    });
    solver.addVar({
      id: 'V2',
      domain: fixt_arrdom_range(0, 100),
      distribute: 'markov',
      distributeOptions: {
        legend: [10, 100],
        matrix: [
          {
            vector: [1, 0],
            boolean(S) {
              return S['==?']('STATE', solver.constant(100));
            },
          }, {
            vector: [0, 1],
          },
        ],
      },
    });

    solver['==']('STATE', solver.constant(5));

    let solutions = solver.solve();

    // there is only one solution for STATE (5), in which case V1 will
    // use vector [1,0] on legend [10,100], meaning 10. V2 will use
    // vector [0,1] on [10,100], meaning 100. so the only valid
    // solution can be STATE=5,V1=10,V2=100
    expect(countSolutions(solver)).to.equal(1);
    expect(stripAnonVars(solutions[0])).to.eql({
      STATE: 5,
      V1: 10,
      V2: 100,
    });
  });

  it('should expand vectors in markov with the expandVectorsWith option', function() {
    // same as previous markov test, but with incomplete, to-be-padded, vectors

    let solver = new Solver({});
    solver.addVar({
      id: 'V1',
      domain: fixt_arrdom_range(1, 4, true),
      distribute: 'markov',
      distributeOptions: {
        legend: [1, 2], // 3,4]
        expandVectorsWith: 1,
        random() { return 0; }, // always pick first element
        matrix: [
          {vector: [1, 1]}, // 1,1] padded by expandVectorsWith
        ],
      },
    });

    solver.addVar({
      id: 'V2',
      domain: fixt_arrdom_range(1, 4, true),
      distribute: 'markov',
      distributeOptions: {
        legend: [1, 2], // 3,4]
        expandVectorsWith: 1,
        random() { return 1 - 1e-5; }, // always pick last element
        matrix: [
          {vector: [1, 1]}, // 1,1] padded by expandVectorsWith
        ],
      },
    });
    solver['>']('V1', solver.constant(0));
    solver['>']('V2', solver.constant(0));

    let solutions = solver.solve();
    expect(countSolutions(solver)).to.equal(16);
    expect(stripAnonVarsFromArrays(solutions)).to.eql([
      {V1: 1, V2: 4},
      {V1: 1, V2: 3},
      {V1: 1, V2: 2},
      {V1: 1, V2: 1},
      {V1: 2, V2: 4},
      {V1: 2, V2: 3},
      {V1: 2, V2: 2},
      {V1: 2, V2: 1},
      {V1: 3, V2: 4},
      {V1: 3, V2: 3},
      {V1: 3, V2: 2},
      {V1: 3, V2: 1},
      {V1: 4, V2: 4},
      {V1: 4, V2: 3},
      {V1: 4, V2: 2},
      {V1: 4, V2: 1},
    ]);
  });

  it('Markov expandVectorsWith w/o any legend or vector', function() {
    let solver = new Solver({});
    solver.addVar({
      id: 'V1',
      domain: fixt_arrdom_range(1, 4, true),
      distribute: 'markov',
      distributeOptions: {
        // legend: [1,2,3,4]
        expandVectorsWith: 1,
        random() { return 0; }, // pick first eligible legend value
      },
    });
    // matrix is added by expandVectorsWith, set to [1, 1, 1, 1]
    solver.addVar({
      id: 'V2',
      domain: fixt_arrdom_range(1, 4, true),
      distribute: 'markov',
      distributeOptions: {
        // legend: [1,2,3,4]
        expandVectorsWith: 1,
        random() { return 1 - 1e-5; }, // pick last eligible legend value
      },
    });
    // matrix is added by expandVectorsWith, set to [1, 1, 1, 1]
    solver['>']('V1', solver.constant(0));
    solver['>']('V2', solver.constant(0));

    let solutions = solver.solve();
    expect(countSolutions(solver)).to.equal(16);
    expect(stripAnonVarsFromArrays(solutions)).to.eql([
      {V1: 1, V2: 4},
      {V1: 1, V2: 3},
      {V1: 1, V2: 2},
      {V1: 1, V2: 1},
      {V1: 2, V2: 4},
      {V1: 2, V2: 3},
      {V1: 2, V2: 2},
      {V1: 2, V2: 1},
      {V1: 3, V2: 4},
      {V1: 3, V2: 3},
      {V1: 3, V2: 2},
      {V1: 3, V2: 1},
      {V1: 4, V2: 4},
      {V1: 4, V2: 3},
      {V1: 4, V2: 2},
      {V1: 4, V2: 1},
    ]);
  });

  describe('markov legend should govern valid domain', () =>

    it('should reject if legend contains no values in the domain without vector expansion', function() {
      // this examples the case where a solution automatically solves a markov
      // var before the markov distributor gets a chance to do anything

      let solver = new Solver();
      solver.addVar({
        id: 'A_NORM',
        domain: fixt_arrdom_range(0, 1, true),
      });
      solver.addVar({
        id: 'B_MARK',
        domain: fixt_arrdom_range(0, 1, true),
        distributeOptions: {
          distributor_name: 'markov',
          legend: [2],
          matrix: [
            {vector: [1]},
          ],
        },
      });
      solver['>']('B_MARK', 'A_NORM');

      // B can only become 2 as goverened by the legend, but the domain
      // never contained 2 so it will never be considered. No solution
      // should be possible as no valid value for B can be picked.
      solver.solve({
        max: 1,
        distribute: {
          // distribute should be ignored as it should reject immediately
          varStrategy: {type: 'throw'},
          val: 'throw',
        },
      });

      expect(countSolutions(solver)).to.eql(0);
    })
  );
});
