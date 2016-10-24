import expect from '../fixtures/mocha_proxy.fixt';
import {
  stripAnonVarsFromArrays,
} from '../fixtures/domain.fixt';
import {
  countSolutions,
} from '../fixtures/lib';

import Solver from '../../src/solver';

describe('solver.minmaxcycle.spec', function() {

  it('should exist', function() {
    expect(Solver).to.be.a('function');
  });

  describe('process values by alternating between picking the lowest and highest value', function() {

    it('should cycle', function() {
      let solver = new Solver({distribute: {valueStrategy: 'minMaxCycle'}});
      solver.declRange('V1', 1, 4);
      solver.declRange('V2', 1, 4);
      solver['>']('V1', 0);
      solver['>']('V2', 0);

      let solutions = solver.solve();
      expect(countSolutions(solver)).to.equal(16);
      // algo starts with 'min'
      // v1 is first so it gets 'min'
      // v2 is second so it gets 'max'
      // on backtracking, v1 remains low and v2 remains 'max'
      // as a result, v1 should go from 1 to 4 and v2 from 4 to 1
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
  });
});
