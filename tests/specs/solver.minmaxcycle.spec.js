import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  stripAnonVarsFromArrays,
} from '../fixtures/domain.fixt';

import Solver from '../../src/solver';

describe('solver.minmaxcycle.spec', function() {

  it('should exist', function() {
    expect(Solver).to.be.a('function');
  });

  describe('process values by alternating between picking the lowest and highest value', function() {

    it('should cycle', function() {
      let solver = new Solver({distribute: {val: 'minMaxCycle'}});
      solver.addVar({
        id: 'V1',
        domain: specDomainCreateRange(1, 4),
      });
      solver.addVar({
        id: 'V2',
        domain: specDomainCreateRange(1, 4),
      });
      solver['>']('V1', solver.constant(0));
      solver['>']('V2', solver.constant(0));

      let solutions = solver.solve();
      expect(solutions.length, 'all solutions').to.equal(16);
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
