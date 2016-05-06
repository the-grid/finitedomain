import {
  expect,
  assert,
} from 'chai';
import {Solver} from '../../../src/';
import {
  spec_d_create_bool,
  spec_d_create_range,
  spec_d_create_value,
  strip_anon_vars,
  strip_anon_vars_a
} from '../../fixtures/domain.spec';

describe('distribution/distribute.spec', function() {

  describe('override value distribution strategy per var', function() {

    it('v1=min, v2=max', function() {

      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: spec_d_create_range(1, 4),
        distribute: 'min',
      });
      solver.addVar({
        id: 'V2',
        domain: spec_d_create_range(1, 4),
        distribute: 'max',
      });
      solver['>']('V1', solver.constant(0));
      solver['>']('V2', solver.constant(0));

      let solutions = solver.solve();
      expect(solutions.length, 'all solutions').to.equal(16);

      // (basically V1 solves lo to hi, V2 goes hi to lo)
      expect(strip_anon_vars_a(solutions)).to.eql([
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
        {V1: 4, V2: 1}
      ]);
    });

    it('v1=min, v2=max (regression)', function() {

      // regression: when domains include 0, should still lead to same result

      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: spec_d_create_range(0, 4),
        distribute: 'min'
      });
      solver.addVar({
        id: 'V2',
        domain: spec_d_create_range(0, 4),
        distribute: 'max'
      });
      solver['>']('V1', solver.constant(0));
      solver['>']('V2', solver.constant(0));

      let solutions = solver.solve();
      expect(solutions.length, 'all solutions').to.equal(16);

      // (basically V1 solves lo to hi, V2 goes hi to lo)
      expect(strip_anon_vars_a(solutions)).to.eql([
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
        {V1: 4, V2: 1}
      ]);
    });

    it('should pick a random() value in markov', function() {

      // note: this is pretty much the same as the previous min/max test except it uses
      // markov for it but it mimics min/max because we fixate the random() outcome

      let solver = new Solver({});
      solver.addVar({
        id: 'V1',
        domain: spec_d_create_range(0, 4),
        distribute: 'markov',
        distributeOptions: {
          legend: [1, 2, 3, 4],
          random() { return 0; }, // always take the first element
          matrix: [
            {vector: [1, 1, 1, 1]}
          ]
        }
      });
      solver.addVar({
        id: 'V2',
        domain: spec_d_create_range(0, 4),
        distribute: 'markov',
        distributeOptions: {
          legend: [1, 2, 3, 4],
          random() { return 1 - 1e-5; }, // always take the last element
          matrix: [
            {vector: [1, 1, 1, 1]}
          ]
        }
      });
      solver['>']('V1', solver.constant(0));
      solver['>']('V2', solver.constant(0));

      let solutions = solver.solve();
      expect(solutions.length, 'all solutions').to.equal(16);
      expect(strip_anon_vars_a(solutions)).to.eql([
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
        {V1: 4, V2: 1}
      ]);
    });
  });
});
