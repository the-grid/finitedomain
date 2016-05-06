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

describe('solver.max.spec', function() {

  it('finitedomain.Solver?', function() {
    expect(Solver).to.be.a('function');
  });

  describe('process values in from high to low', function() {

    function itDistributes(solutionMap, options) {
      it(`itDistributes(o = ${JSON.stringify(options)})`, function () {
        let solver = new Solver(options);
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

    itDistributes({0:99, 98:1 }, {distribute: { val: 'max'}});
    itDistributes({0:99, 98:1 }, {distribute: { val: 'max', var:'naive'}});
    itDistributes({0:99, 98:1 }, {distribute: { val: 'max', var:'size'}});
    itDistributes({0:99, 98:1 }, {distribute: { val: 'max', var:'min'}});
    itDistributes({0:99, 98:1 }, {distribute: { val: 'max', var:'max'}});
  });
});
