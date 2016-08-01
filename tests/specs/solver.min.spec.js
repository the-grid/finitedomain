import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_arrdom_value,
} from '../fixtures/domain.fixt';
import {
  countSolutions,
} from '../fixtures/lib';

import Solver from '../../src/solver';

describe('solver.min.spec', function() {

  it('should exist', function() {
    expect(Solver).to.be.a('function');
  });

  describe('process values by picking the lowest value', function() {

    function itDistributes(solutionMap, o) {
      it(`$tDistributes(o = ${JSON.stringify(o)})`, function() {
        let solver = new Solver(o);
        solver.addVar({
          id: 'Hello',
          domain: fixt_arrdom_range(1, 99, true),
        });
        solver.addVar({
          id: 'World',
          domain: fixt_arrdom_value(0, true),
        });
        solver['>']('Hello', 'World');

        let solutions = solver.solve();
        expect(countSolutions(solver)).to.equal(99);

        for (let i = 0; i < solutionMap.length; ++i) {
          let val = solutionMap[i];
          expect(solutions[i].Hello, `nth: ${i} solution`).to.equal(val);
        }
        //for n, val of solutionMap
        //  expect(solutions[n].Hello, "nth: #{n} solution").to.equal val
      });
    }

    itDistributes({0: 1, 98: 99}, {});
    itDistributes({0: 1, 98: 99}, {distribute: 'naive'});
    itDistributes({0: 1, 98: 99}, {distribute: 'fail_first'});
    itDistributes({0: 1, 98: 99}, {distribute: 'split'});
    itDistributes({0: 1, 98: 99}, {distribute: {var: 'naive'}});
    itDistributes({0: 1, 98: 99}, {distribute: {val: 'min'}});
    itDistributes({0: 1, 98: 99}, {distribute: {val: 'min', var: 'naive'}});
    itDistributes({0: 1, 98: 99}, {distribute: {val: 'min', var: 'size'}});
    itDistributes({0: 1, 98: 99}, {distribute: {val: 'min', var: 'min'}});
    itDistributes({0: 1, 98: 99}, {distribute: {val: 'min', var: 'max'}});
  });
});
