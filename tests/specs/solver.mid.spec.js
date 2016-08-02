import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_arrdom_value,
} from '../fixtures/domain.fixt';
import {
  countSolutions,
} from '../fixtures/lib';

import Solver from '../../src/solver';

describe('solver.mid.spec', function() {

  it('should exist', function() {
    expect(Solver).to.be.a('function');
  });

  describe('process values by picking the middle value', function() {

    function itDistributes(solutionMap, options) {
      it(`itDistributes(o = ${JSON.stringify(options)})`, function() {
        let solver = new Solver(options);
        solver.addVar({
          id: 'Hello',
          domain: fixt_arrdom_range(1, 99),
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

    itDistributes({0: 50, 97: 99, 98: 1}, {distribute: {valueStrategy: 'mid'}});
    itDistributes({0: 50, 97: 99, 98: 1}, {distribute: {valueStrategy: 'mid', varStrategy: {type: 'naive'}}});
    itDistributes({0: 50, 97: 99, 98: 1}, {distribute: {valueStrategy: 'mid', varStrategy: {type: 'size'}}});
    itDistributes({0: 50, 97: 99, 98: 1}, {distribute: {valueStrategy: 'mid', varStrategy: {type: 'min'}}});
    itDistributes({0: 50, 97: 99, 98: 1}, {distribute: {valueStrategy: 'mid', varStrategy: {type: 'max'}}});
  });
});
