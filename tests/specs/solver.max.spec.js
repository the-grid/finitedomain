import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainCreateValue,
} from '../fixtures/domain.fixt';

import Solver from '../../src/solver';

describe('solver.max.spec', function() {

  it('should exist', function() {
    expect(Solver).to.be.a('function');
  });

  describe('process values in from high to low', function() {

    function itDistributes(solutionMap, options) {
      it(`itDistributes(o = ${JSON.stringify(options)})`, function() {
        let solver = new Solver(options);
        solver.addVar({
          id: 'Hello',
          domain: specDomainCreateRange(1, 99, true),
        });
        solver.addVar({
          id: 'World',
          domain: specDomainCreateValue(0, true),
        });
        solver['>']('Hello', 'World');

        let solutions = solver.solve();
        expect(solutions.length, 'all solutions').to.equal(99);

        for (let i = 0; i < solutionMap.length; ++i) {
          let val = solutionMap[i];
          expect(solutions[i].Hello, `nth: ${i} solution`).to.equal(val);
        }
        //for n, val of solutionMap
        //  expect(solutions[n].Hello, `nth: ${n} solution`).to.equal val
      });
    }

    itDistributes({0: 99, 98: 1}, {distribute: {val: 'max'}});
    itDistributes({0: 99, 98: 1}, {distribute: {val: 'max', var: 'naive'}});
    itDistributes({0: 99, 98: 1}, {distribute: {val: 'max', var: 'size'}});
    itDistributes({0: 99, 98: 1}, {distribute: {val: 'max', var: 'min'}});
    itDistributes({0: 99, 98: 1}, {distribute: {val: 'max', var: 'max'}});
  });
});
