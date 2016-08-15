import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_empty,
  fixt_arrdom_nums,
  fixt_arrdom_range,
} from '../../fixtures/domain.fixt';

import Solver from '../../../src/solver';
import propagator_markovStepBare from '../../../src/propagators/markov';

describe('propagators/markov.spec', function() {

  it('should exist', function() {
    expect(propagator_markovStepBare).to.be.a('function');
  });

  describe('simple unit tests', function() {

    it('should pass if solved value is in legend with prob>0', function() {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        domain: fixt_arrdom_range(0, 0, true),
        distributeOptions: {
          valtype: 'markov',
          legend: [0],
          matrix: [
            {vector: [1]},
          ],
        },
      });
      solver._prepare({});

      let Aindex = solver.config.all_var_names.indexOf('A');

      // A=0, which is in legend and has prob=1
      propagator_markovStepBare(solver._space, solver.config, Aindex);
      expect(solver.getDomain(solver._space, Aindex)).to.eql(fixt_arrdom_nums(0));
    });

    it('should reject if solved value is not in legend', function() {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        domain: fixt_arrdom_range(0, 0, true),
        distributeOptions: {
          valtype: 'markov',
          legend: [1],
          matrix: [
            {vector: [1]},
          ],
        },
      });
      solver._prepare({});

      let Aindex = solver.config.all_var_names.indexOf('A');

      // A=0, which is not in legend
      propagator_markovStepBare(solver._space, solver.config, Aindex);
      expect(solver.getDomain(solver._space, Aindex)).to.eql(fixt_arrdom_empty(1));
    });

    describe('matrix with one row', function() {

      it('should reject if solved value does not have prob>0', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: fixt_arrdom_range(0, 0, true),
          distributeOptions: {
            valtype: 'markov',
            legend: [0],
            matrix: [
              {vector: [0]},
            ],
          },
        });
        solver._prepare({});

        let Aindex = solver.config.all_var_names.indexOf('A');

        // A=0, which is in legend but has prob=0
        propagator_markovStepBare(solver._space, solver.config, Aindex);
        expect(solver.getDomain(solver._space, Aindex)).to.eql(fixt_arrdom_empty(1));
      });

      it('should pass if solved value does has prob>0', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: fixt_arrdom_range(0, 0, true),
          distributeOptions: {
            valtype: 'markov',
            legend: [0],
            matrix: [
              {vector: [0]},
            ],
          },
        });
        solver._prepare({});

        let Aindex = solver.config.all_var_names.indexOf('A');

        // A=0, which is in legend and has prob=1
        propagator_markovStepBare(solver._space, solver.config, Aindex);
        expect(solver.getDomain(solver._space, Aindex)).to.eql(fixt_arrdom_empty(1));
      });
    });

    describe('multi layer matrix', function() {

      it('should pass if second row gives value prob>0', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: fixt_arrdom_range(0, 0, true),
          distributeOptions: {
            valtype: 'markov',
            legend: [0],
            matrix: [{
              vector: [0],
              boolean: solver.constant(0),
            }, {
              vector: [1],
            }],
          },
        });
        solver._prepare({});

        let Aindex = solver.config.all_var_names.indexOf('A');

        // A=0, which is in legend and has prob=0 in first row,
        // but only second row is considered which gives prob=1
        propagator_markovStepBare(solver._space, solver.config, Aindex);
        expect(solver.getDomain(solver._space, Aindex)).to.eql(fixt_arrdom_nums(0));
      });

      it('should reject if second row gives value prob=0', function() {

        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: fixt_arrdom_range(0, 0, true),
          distributeOptions: {
            valtype: 'markov',
            legend: [0],
            matrix: [{
              vector: [1],
              boolean: solver.constant(0),
            }, {
              vector: [0],
            }],
          },
        });
        solver._prepare({});

        let Aindex = solver.config.all_var_names.indexOf('A');

        // A=0, which is in legend and has prob=1 in first row,
        // but only second row is considered which gives prob=0
        propagator_markovStepBare(solver._space, solver.config, Aindex);
        expect(solver.getDomain(solver._space, Aindex)).to.eql(fixt_arrdom_empty(1));
      });
    });
  });
});
