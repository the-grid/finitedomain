import setup from '../fixtures/helpers.spec';
import {
  spec_d_create_bool,
  spec_d_create_range,
  spec_d_create_value,
} from '../fixtures/domain.spec';
import finitedomain from '../../src/index';
import {
  expect,
  assert,
} from 'chai';

const {
  Solver
} = finitedomain;

describe("solver.minmaxcycle.spec", function() {

  it('finitedomain.Solver?', function() {
    expect(Solver).to.be.a('function');
  });

  describe('process values by alternating between picking the lowest and highest value', function() {

    it('should cycle', function () {
      let solver = new Solver({distribute: {val: 'minMaxCycle'}});
      solver.addVar({
        id: 'V1',
        domain: spec_d_create_range(1, 4)
      });
      solver.addVar({
        id: 'V2',
        domain: spec_d_create_range(1, 4)
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
