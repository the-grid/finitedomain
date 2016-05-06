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

describe("solver.min.spec", function() {

  it('finitedomain.Solver?', function() {
    expect(Solver).to.be.a('function');
  });

  describe('process values by picking the lowest value', function() {

    function itDistributes(solutionMap, o) {
      it(`$tDistributes(o = ${JSON.stringify(o)})`, function() {
        let solver = new Solver(o);
        solver.addVar({
          id: 'Hello',
          domain: spec_d_create_range(1, 99)
        });
        solver.addVar({
          id: 'World',
          domain: spec_d_create_value(0)
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

    itDistributes({0:1, 98:99}, {});
    itDistributes({0:1, 98:99}, {distribute: 'naive'});
    itDistributes({0:1, 98:99}, {distribute: 'fail_first'});
    itDistributes({0:1, 98:99}, {distribute: 'split'});
    itDistributes({0:1, 98:99}, {distribute: { var: 'naive'}});
    itDistributes({0:1, 98:99}, {distribute: { val: 'min'}});
    itDistributes({0:1, 98:99}, {distribute: { val: 'min', var: 'naive'}});
    itDistributes({0:1, 98:99}, {distribute: { val: 'min', var: 'size'}});
    itDistributes({0:1, 98:99}, {distribute: { val: 'min', var: 'min'}});
    itDistributes({0:1, 98:99}, {distribute: { val: 'min', var: 'max'}});
  });
});
