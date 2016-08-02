import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  stripAnonVarsFromArrays,
} from '../fixtures/domain.fixt';
import {
  countSolutions,
} from '../fixtures/lib';

import Solver from '../../src/solver';
import {
  space_getVarSolveState,
} from '../../src/space';

describe('src/solver.list.spec', function() {

  it('should exist', function() {
    expect(Solver).to.be.a('function');
  });

  describe('explicit list per var of distribution', function() {

    it('should try values in order of the list', function() {
      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: fixt_arrdom_range(1, 4, true),
        distribute: 'list',
        distributeOptions: {
          list: [2, 4, 3, 1],
        },
      });
      solver.addVar({
        id: 'V2',
        domain: fixt_arrdom_range(1, 4, true),
        distribute: 'list',
        distributeOptions: {
          list: [3, 1, 4, 2],
        },
      });
      solver['>']('V1', solver.constant(0));
      solver['>']('V2', 0);

      let solutions = solver.solve();
      expect(countSolutions(solver)).to.equal(16);
      expect(stripAnonVarsFromArrays(solutions)).to.eql([
        {V1: 2, V2: 3},
        {V1: 2, V2: 1},
        {V1: 2, V2: 4},
        {V1: 2, V2: 2},

        {V1: 4, V2: 3},
        {V1: 4, V2: 1},
        {V1: 4, V2: 4},
        {V1: 4, V2: 2},

        {V1: 3, V2: 3},
        {V1: 3, V2: 1},
        {V1: 3, V2: 4},
        {V1: 3, V2: 2},

        {V1: 1, V2: 3},
        {V1: 1, V2: 1},
        {V1: 1, V2: 4},
        {V1: 1, V2: 2},
      ]);
    });

    it('should solve markov according to the list in order when random=0', function() {
      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: [1, 4],
        distribute: 'markov',
        distributeOptions: {
          legend: [2, 4, 3, 1],
          expandVectorsWith: 1,
          random() { return 0; }, // causes first element in legend to be picked
        },
      });
      solver.addVar({
        id: 'V2',
        domain: [1, 4],
        distribute: 'markov',
        distributeOptions: {
          legend: [3, 1, 4, 2],
          expandVectorsWith: 1,
          random() { return 0; }, // causes first element in legend to be picked
        },
      });
      solver['>']('V1', solver.constant(0));
      solver['>']('V2', solver.constant(0));

      let solutions = solver.solve();
      expect(countSolutions(solver), 'all solutions').to.equal(16);
      expect(stripAnonVarsFromArrays(solutions)).to.eql([
        {V1: 2, V2: 3},
        {V1: 2, V2: 1},
        {V1: 2, V2: 4},
        {V1: 2, V2: 2},

        {V1: 4, V2: 3},
        {V1: 4, V2: 1},
        {V1: 4, V2: 4},
        {V1: 4, V2: 2},

        {V1: 3, V2: 3},
        {V1: 3, V2: 1},
        {V1: 3, V2: 4},
        {V1: 3, V2: 2},

        {V1: 1, V2: 3},
        {V1: 1, V2: 1},
        {V1: 1, V2: 4},
        {V1: 1, V2: 2},
      ]);
    });

    it('should call the list if it is a function', function() {
      function space_solutionFor(space, varNames) {
        let result = {};
        for (let varIndex = 0; varIndex < varNames.length; varIndex++) {
          let varName = varNames[varIndex];
          result[varName] = space_getVarSolveState(space, varIndex);
        }

        return result;
      }

      function listCallback(space, varName) {
        let solution = space_solutionFor(space, ['STATE', 'V1', 'V2']);
        if (solution['STATE'] === 5) {
          if (varName === 'V1') {
            return [2, 4, 3, 1];
          } else if (varName === 'V2') {
            if (solution['V1'] > 0) {
              return [3, 1, 4, 2];
            }
          }
        }
        return [1, 2, 3, 4];
      }

      let solver = new Solver({});
      solver.addVar({
        id: 'STATE',
        domain: fixt_arrdom_range(0, 10, true),
      });
      solver.addVar({
        id: 'V1',
        domain: fixt_arrdom_range(1, 4, true),
        distribute: 'list',
        distributeOptions: {
          list: listCallback,
        },
      });
      solver.addVar({
        id: 'V2',
        domain: fixt_arrdom_range(1, 4, true),
        distribute: 'list',
        distributeOptions: {
          list: listCallback,
        },
      });
      solver['==']('STATE', solver.constant(5));
      solver['>']('V1', solver.constant(0));
      solver['>']('V2', solver.constant(0));

      let solutions = solver.solve();
      expect(countSolutions(solver)).to.equal(16);
      expect(stripAnonVarsFromArrays(solutions)).to.eql([
        {V1: 2, V2: 3, STATE: 5},
        {V1: 2, V2: 1, STATE: 5},
        {V1: 2, V2: 4, STATE: 5},
        {V1: 2, V2: 2, STATE: 5},

        {V1: 4, V2: 3, STATE: 5},
        {V1: 4, V2: 1, STATE: 5},
        {V1: 4, V2: 4, STATE: 5},
        {V1: 4, V2: 2, STATE: 5},

        {V1: 3, V2: 3, STATE: 5},
        {V1: 3, V2: 1, STATE: 5},
        {V1: 3, V2: 4, STATE: 5},
        {V1: 3, V2: 2, STATE: 5},

        {V1: 1, V2: 3, STATE: 5},
        {V1: 1, V2: 1, STATE: 5},
        {V1: 1, V2: 4, STATE: 5},
        {V1: 1, V2: 2, STATE: 5},
      ]);
    });
  });

  describe('list values trump domain values', function() {

    it('should ignore values in the domain that are not in the list', function() {
      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: fixt_arrdom_range(0, 5, true),
        distributeOptions: {
          valtype: 'list',
          list: [0, 3, 4],
        },
      });
      solver['>']('V1', 0);

      let solutions = solver.solve();
      expect(countSolutions(solver)).to.equal(2); // list.length
      expect(stripAnonVarsFromArrays(solutions)).to.eql([
        {V1: 3},
        {V1: 4},
      ]);
    });

    it('should not solve when the list contains no values in the domain', function() {
      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: fixt_arrdom_range(0, 10, true),
        distributeOptions: {
          valtype: 'list',
          list: [0, 15],
        },
      });
      solver['>']('V1', 0);

      solver.solve();
      expect(countSolutions(solver)).to.equal(0);
    });

    it('should use the fallback when the list contains no values in the domain', function() {
      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: fixt_arrdom_range(0, 5, true),
        distributeOptions: {
          valtype: 'list',
          list: [0, 15],
          fallback_dist_name: 'max',
        },
      });
      solver['>']('V1', 0);
      let solutions = solver.solve();

      // Ok. First the propagators run. this will reduce
      // V1 to [1, 5] because there's a constraint that
      // says [0,5]>0 meaning the 0 is removed from the
      // domain. So [1,5]. Then the propagators run into
      // a stalemate and a choice has to be made. There
      // is a value distributor based on a list. This
      // means a value from the domain to be picked has
      // to exist in that list. Since the list is [0,15]
      // and we just eliminated the 0, so we may only
      // pick 15 except the domain doesn't have that so
      // it ends up picking no value. That means the
      // fallback distributor will kick in, which is
      // "max". Since there are no other constraints it
      // will solve V1 for all remaining values of it
      // in descending order (5,4,3,2,1).

      expect(countSolutions(solver)).to.equal(5);
      expect(stripAnonVarsFromArrays(solutions)).to.eql([
        {V1: 5},
        {V1: 4},
        {V1: 3},
        {V1: 2},
        {V1: 1},
      ]);
    });

    it('should prioritize the list before applying the fallback', function() {
      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: fixt_arrdom_range(0, 5, true),
        distributeOptions: {
          valtype: 'list',
          list: [3, 0, 1, 5],
          fallback_dist_name: 'max',
        },
      });
      solver['>']('V1', 0);

      let solutions = solver.solve();
      expect(countSolutions(solver)).to.equal(5);
      expect(stripAnonVarsFromArrays(solutions)).to.eql([
        {V1: 3},
        {V1: 1},
        {V1: 5},
        {V1: 4},
        {V1: 2},
      ]);
    });

    it('should still be able to reject if fallback fails too', function() {
      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: fixt_arrdom_range(0, 5, true),
        distributeOptions: {
          valtype: 'list',
          list: [3, 0, 1, 15, 5],
          fallback_dist_name: 'max',
        },
      });
      solver['>']('V1', 6);

      solver.solve();
      // original domain contains 0~5 but constraint requires >6
      // list contains 15 but since domain doesnt thats irrelevant
      expect(countSolutions(solver)).to.equal(0);
    });
  });
});
