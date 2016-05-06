import setup from '../../fixtures/helpers.spec';
import {
  spec_d_create_bool,
  spec_d_create_range,
  spec_d_create_ranges,
  spec_d_create_value,
} from '../../fixtures/domain.spec';
import finitedomain from '../../../src/index';
import {
  expect,
  assert,
} from 'chai';

const {
  Solver,
} = finitedomain;

const {
  REJECTED,
  ZERO_CHANGES,
} = finitedomain.helpers;

const {
  propagator_markov_step_bare,
} = finitedomain.propagators.markov;

describe("propagators/markov.spec", function() {

  if (!finitedomain.__DEV_BUILD) {
    return;
  }

  it('should exist', function() {
    expect(propagator_markov_step_bare).to.be.a('function');
  });

  describe('simple unit tests', function() {

    it('should pass if solved value is in legend with prob>0', function() {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        domain: spec_d_create_range(0, 0),
        distributeOptions: {
          distributor_name: 'markov',
          legend: [0],
          matrix: [
            {vector: [1]},
          ],
        },
      });
      solver.prepare();

      // A=0, which is in legend and has prob=1
      expect(propagator_markov_step_bare(solver._space, 'A')).to.eql(ZERO_CHANGES);
    });

    it('should reject if solved value is not in legend', function() {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        domain: spec_d_create_range(0, 0),
        distributeOptions: {
          distributor_name: 'markov',
          legend: [1],
          matrix: [
            {vector: [1]},
          ],
        },
      });
      solver.prepare();

      // A=0, which is not in legend
      expect(propagator_markov_step_bare(solver._space, 'A')).to.eql(REJECTED);
    });

    describe('matrix with one row', function() {

      it('should reject if solved value does not have prob>0', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: spec_d_create_range(0, 0),
          distributeOptions: {
            distributor_name: 'markov',
            legend: [0],
            matrix: [
              {vector: [0]},
            ],
          },
        });
        solver.prepare();

        // A=0, which is in legend but has prob=0
        expect(propagator_markov_step_bare(solver._space, 'A')).to.eql(REJECTED);
      });

      it('should pass if solved value does has prob>0', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: spec_d_create_range(0, 0),
          distributeOptions: {
            distributor_name: 'markov',
            legend: [0],
            matrix: [
              {vector: [0]},
            ],
          },
        });
        solver.prepare();

        // A=0, which is in legend and has prob=1
        expect(propagator_markov_step_bare(solver._space, 'A')).to.eql(REJECTED);
      });
    });

    describe('multi layer matrix', function() {

      it('should pass if second row gives value prob>0', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: spec_d_create_range(0, 0),
          distributeOptions: {
            distributor_name: 'markov',
            legend: [0],
            matrix: [{
              vector: [0],
              boolean: solver.constant(0),
            }, {
              vector: [1],
            }],
          },
        });
        solver.prepare();

        // A=0, which is in legend and has prob=0 in first row,
        // but only second row is considered which gives prob=1
        expect(propagator_markov_step_bare(solver._space, 'A')).to.eql(ZERO_CHANGES);
      });

      it('should reject if second row gives value prob=0', function() {

        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: spec_d_create_range(0, 0),
          distributeOptions: {
            distributor_name: 'markov',
            legend: [0],
            matrix: [{
              vector: [1],
              boolean: solver.constant(0),
            }, {
              vector: [0],
            }],
          },
        });
        solver.prepare();

        // A=0, which is in legend and has prob=1 in first row,
        // but only second row is considered which gives prob=0
        expect(propagator_markov_step_bare(solver._space, 'A')).to.eql(REJECTED);
      });
    });
  });
});
