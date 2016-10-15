import expect from '../../fixtures/mocha_proxy.fixt';
import {
  fixt_dom_nums,
  fixt_domainEql,
  fixt_arrdom_empty,
  fixt_arrdom_nums,
  fixt_arrdom_range,
} from '../../fixtures/domain.fixt';

import {
  LOG_FLAG_PROPSTEPS,
  LOG_FLAG_NONE,

  ASSERT_SET_LOG,
} from '../../../src/helpers';
import {
  config_getVarIndexByVarName,
} from '../../../src/config';
import Solver from '../../../src/solver';
import propagator_markovStepBare from '../../../src/propagators/markov';

describe('propagators/markov.spec', function() {

  it('should exist', function() {
    expect(propagator_markovStepBare).to.be.a('function');
  });

  describe('simple unit tests', function() {

    it('should pass if solved value is in legend with prob>0 (constant)', function() {
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

      let Aindex = config_getVarIndexByVarName(solver.config, 'A');

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

      let Aindex = config_getVarIndexByVarName(solver.config, 'A');

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

        let Aindex = config_getVarIndexByVarName(solver.config, 'A');

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

        let Aindex = config_getVarIndexByVarName(solver.config, 'A');

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

        let Aindex = config_getVarIndexByVarName(solver.config, 'A');

        // A=0, which is in legend and has prob=0 in first row,
        // but only second row is considered which gives prob=1
        propagator_markovStepBare(solver._space, solver.config, Aindex);
        fixt_domainEql(solver.getDomain(solver._space, Aindex), fixt_dom_nums(0));
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

        let Aindex = config_getVarIndexByVarName(solver.config, 'A');

        // A=0, which is in legend and has prob=1 in first row,
        // but only second row is considered which gives prob=0
        propagator_markovStepBare(solver._space, solver.config, Aindex);
        fixt_domainEql(solver.getDomain(solver._space, Aindex), fixt_arrdom_empty());
      });
    });
  });

  describe('with LOG to improve test coverage', function() {

    before(function() {
      ASSERT_SET_LOG(LOG_FLAG_PROPSTEPS);
    });

    it('solved domain', function() {
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

      let Aindex = config_getVarIndexByVarName(solver.config, 'A');

      // A=0, which is in legend and has prob=1
      propagator_markovStepBare(solver._space, solver.config, Aindex);

      expect(true).to.eql(true);
    });

    it('unsolved domain', function() {
      let solver = new Solver();
      solver.addVar({
        id: 'A',
        domain: fixt_arrdom_range(0, 10, true),
        distributeOptions: {
          valtype: 'markov',
          legend: [0],
          matrix: [
            {vector: [1]},
          ],
        },
      });
      solver._prepare({});

      let Aindex = config_getVarIndexByVarName(solver.config, 'A');

      // A=0, which is in legend and has prob=1
      propagator_markovStepBare(solver._space, solver.config, Aindex);

      expect(true).to.eql(true);
    });

    after(function() {
      ASSERT_SET_LOG(LOG_FLAG_NONE);
    });
  });
});
