import expect from '../fixtures/mocha_proxy.fixt';
//import {
//} from '../fixtures/domain.fixt';
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
        solver.declRange('Hello', 1, 99);
        solver.decl('World', 0);
        solver.gt('Hello', 'World');

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
    itDistributes({0: 1, 98: 99}, {distribute: {varStrategy: {type: 'naive'}}});
    itDistributes({0: 1, 98: 99}, {distribute: {valueStrategy: 'min'}});
    itDistributes({0: 1, 98: 99}, {distribute: {valueStrategy: 'min', varStrategy: {type: 'naive'}}});
    itDistributes({0: 1, 98: 99}, {distribute: {valueStrategy: 'min', varStrategy: {type: 'size'}}});
    itDistributes({0: 1, 98: 99}, {distribute: {valueStrategy: 'min', varStrategy: {type: 'min'}}});
    itDistributes({0: 1, 98: 99}, {distribute: {valueStrategy: 'min', varStrategy: {type: 'max'}}});
  });
});
