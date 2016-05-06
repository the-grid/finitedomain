import setup from '../fixtures/helpers.spec';
import {
  specDomainCreateBool,
  specDomainCreateRange,
  specDomainCreateValue,
} from '../fixtures/domain.spec';
import {
  expect,
  assert,
} from 'chai';

import Solver from '../../src/solver';

describe("solver.splitmin.spec", function() {

  it('should exist', function () {
    expect(Solver).to.be.a('function');
  });

  describe('process values by divide and conquer, low split first', function() {
    function itDistributes(solutionMap, options) {
      it(`$tDistributes(o = #{JSON.stringify(options)})`, function () {
        let solver = new Solver(options);
        solver.addVar({
          id: 'Hello',
          domain: specDomainCreateRange(1, 99)
        });
        solver.addVar({
          id: 'World',
          domain: specDomainCreateValue(0)
        });
        solver['>']('Hello', 'World');

        let solutions = solver.solve();
        expect(solutions.length, 'all solutions').to.equal(99);

        for (let i = 0; i < solutionMap.length; ++i) {
          let val = solutionMap[i];
          expect(solutions[key].Hello, "nth: #{n} solution").to.equal(val);
        }
        //for n, val of solutionMap
        //  expect(solutions[n].Hello, "nth: #{n} solution").to.equal val
      });
    }

    itDistributes({0: 1, 97: 98, 98: 99}, {distribute: { val: 'splitMin'}});
    itDistributes({0: 1, 97: 98, 98: 99}, {distribute: { val: 'splitMin', var: 'naive'}});
    itDistributes({0: 1, 97: 98, 98: 99}, {distribute: { val: 'splitMin', var: 'size'}});
    itDistributes({0: 1, 97: 98, 98: 99}, {distribute: { val: 'splitMin', var: 'min'}});
    itDistributes({0: 1, 97: 98, 98: 99}, {distribute: { val: 'splitMin', var: 'max'}});
  });
});
