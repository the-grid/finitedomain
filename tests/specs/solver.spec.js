import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  fixt_dom_ranges,
  stripAnonVarsFromArrays,
} from '../fixtures/domain.fixt';
import {
  countSolutions,
} from '../fixtures/lib';

import Solver from '../../src/solver';
import {
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,
  SUB,
  SUP,
} from '../../src/helpers';

describe('solver.spec', function() {

  this.timeout(60000); // takes long under istanbul / even longer under travis

  describe('api', function() {

    describe('solver constructor', function() {

      it('should exist', function() {
        expect(typeof Solver).to.be.equal('function');
      });

      it('should not require the options arg', function() {
        let solver = new Solver();

        expect(solver).to.be.an('object');
        expect(solver instanceof Solver);
      });

      it('should accept a string for distribution options', function() {
        let solver = new Solver({distribute: 'naive'});

        expect(solver).to.be.an('object');
        expect(solver instanceof Solver);
      });

      it('should throw for unknown distribute strings', function() {
        expect(_ => new Solver({distribute: 'fail'}).solve()).to.throw('distribution.get_defaults: Unknown preset: fail');
        expect(_ => new Solver().solve({distribute: 'fail'})).to.throw('distribution.get_defaults: Unknown preset: fail');
      });

      it('should accept an object for distribution options', function() {
        let solver = new Solver({distribute: {}});

        expect(solver).to.be.an('object');
        expect(solver instanceof Solver);
      });
    });

    describe('solver.constant', function() {

      it('constant(false)', function() {
        let solver = new Solver();
        let name = solver.constant(false);

        expect(name).to.be.a('string');
      });

      it('constant(true)', function() {
        let solver = new Solver();
        let name = solver.constant(true);

        expect(name).to.be.a('string');
      });

      it('constant(0)', function() {
        let solver = new Solver();
        let name = solver.constant(0);

        expect(name).to.be.a('string');
      });

      it('constant(10)', function() {
        let solver = new Solver();
        let name = solver.constant(10);

        expect(name).to.be.a('string');
      });
    });

    describe('solver.num', function() {

      it('num(false)', function() {
        let solver = new Solver();

        expect(_ => solver.num(false)).to.throw('Solver#num: expecting a number, got false (a boolean)');
      });

      it('num(true)', function() {
        let solver = new Solver();

        expect(_ => solver.num(true)).to.throw('Solver#num: expecting a number, got true (a boolean)');
      });

      it('num(0)', function() {
        let solver = new Solver();
        let name = solver.num(0);

        expect(name).to.be.a('string');
      });

      it('num(10)', function() {
        let solver = new Solver();
        let name = solver.num(10);

        expect(name).to.be.a('string');
      });

      it('should throw for undefined', function() {
        let solver = new Solver();

        expect(_ => solver.num(undefined)).to.throw('Solver#num: expecting a number, got undefined (a undefined)');
      });

      it('should throw for null', function() {
        let solver = new Solver();

        expect(_ => solver.num(null)).to.throw('Solver#num: expecting a number, got null (a object)');
      });

      it('should throw for NaN', function() {
        let solver = new Solver();

        expect(_ => solver.num(NaN)).to.throw('Solver#num: expecting a number, got NaN');
      });
    });

    describe('solver.decl', function() {

      it('should work', function() {
        let solver = new Solver();

        expect(solver.decl('foo')).to.equal('foo');
      });

      it('should accept a flat array for domain', function() {
        let solver = new Solver();
        solver.decl('foo', [0, 10, 20, 30]); // dont use fixtures because small domain

        expect(solver.config.initial_domains[solver.config.all_var_names.indexOf('foo')]).to.eql(fixt_dom_ranges([0, 10], [20, 30]));
      });

      it('should accept a legacy nested array for domain', function() {
        let solver = new Solver();
        solver.decl('foo', [[0, 10], [20, 30]]);

        expect(solver.config.initial_domains[solver.config.all_var_names.indexOf('foo')]).to.eql(fixt_dom_ranges([0, 10], [20, 30]));
      });

      describe('legacy', function() {

        it('should throw for bad legacy domain ', function() {
          let solver = new Solver();

          expect(_ => solver.decl('foo', [[0]])).to.throw('Fatal: unable to fix domain: [[0]]');
        });

        it('should throw for bad legacy domain with multiple ranges', function() {
          let solver = new Solver();

          expect(_ => solver.decl('foo', [[0], [20, 30]])).to.throw('Fatal: unable to fix domain: [[0],[20,30]]');
        });
      });

      it('should throw for domains with numbers <SUB', function() {
        let solver = new Solver();

        expect(_ => solver.decl('foo', [SUB - 2, SUB - 1])).to.throw('Fatal: unable to fix domain: [-2,-1]');
      });

      it('should throw for domains with numbers >SUP', function() {
        let solver = new Solver();

        expect(_ => solver.decl('foo', [SUP + 1, SUP + 2])).to.throw('Fatal: unable to fix domain: [100000001,100000002]');
      });

      it('should throw for domains with NaNs', function() {
        let solver = new Solver();
        expect(_ => solver.decl('foo', [0, NaN])).to.throw('Fatal: unable to fix domain: [0,null]');

        let solver2 = new Solver();
        expect(_ => solver2.decl('foo', [NaN, 1])).to.throw('Fatal: unable to fix domain: [null,1]');

        let solver3 = new Solver();
        expect(_ => solver3.decl('foo', [NaN, NaN])).to.throw('Fatal: unable to fix domain: [null,null]');
      });

      it('should throw for domains with inverted range', function() {
        let solver = new Solver();

        expect(_ => solver.decl('foo', [2, 1])).to.throw('Fatal: unable to fix domain: [2,1]');
      });

      it('should throw for legacy domains with inverted range', function() {
        let solver = new Solver();

        expect(_ => solver.decl('foo', [[2, 1]])).to.throw('Fatal: unable to fix domain: [[2,1]]');
      });

      it('should throw for domains with garbage', function() {
        let solver = new Solver();

        expect(_ => solver.decl('foo', [{}, {}])).to.throw('Fatal: unable to fix domain: [{},{}]');
      });

      it('should throw for legacy domains with garbage', function() {
        let solver = new Solver();

        expect(_ => solver.decl('foo', [[{}]])).to.throw('Fatal: unable to fix domain: [[{}]]');
      });

      it('should throw for domains with one number', function() {
        let solver = new Solver();

        expect(_ => solver.decl('foo', [1])).to.throw('Fatal: unable to fix domain: [1]');
      });
    });

    describe('solver.addVar', function() {

      it('should throw for addVar with undefined name', function() {
        let solver = new Solver();

        expect(_ => solver.addVar({id: undefined})).to.throw('Solver#addVar: requires id');
      });

      it('should throw for addVar twice with the same name', function() {
        let solver = new Solver();
        let opts = {id: 'foo'};
        let opts2 = {id: 'foo'}; // to ensure opts isnt adjusted

        expect(solver.addVar(opts)).to.equal(opts);
        expect(_ => solver.addVar(opts2)).to.throw('Do not declare the same varName twice');
      });

      it('should update byId', function() {
        let solver = new Solver();
        expect(solver.vars.byId).to.eql({});
        let opt = {id: 'foo'};
        solver.addVar(opt);
        expect(solver.vars.byId).to.eql({foo: opt});
      });

      it('should add the var options to solver.vars.all', function() {
        let solver = new Solver();
        expect(solver.vars.all).to.eql([]);
        let opt = {id: 'foo'};
        solver.addVar(opt);
        expect(solver.vars.all).to.eql([opt]);
      });

      it('should not update byName if name is undefined', function() {
        let solver = new Solver();

        expect(solver.vars.byName.foo, 'before').to.equal(undefined);
        solver.addVar({id: 'foo'});
        expect(solver.vars.byName.foo, 'still unset').to.equal(undefined);
      });

      it('should add the name to byName if not set', function() {
        let solver = new Solver();
        let opt = {id: 'foo', name: 'foo'};

        expect(solver.vars.byName.foo, 'before').to.equal(undefined);
        solver.addVar(opt);
        expect(solver.vars.byName.foo).to.be.an('array');
        expect(solver.vars.byName.foo.length).to.equal(1);
        expect(solver.vars.byName.foo[0]).to.equal(opt);
      });

      it('should add the name to the list in byName if already set', function() {
        let solver = new Solver();
        let opt = {id: 'foo', name: 'foo'};
        solver.addVar(opt);

        let opt2 = {id: 'bar', name: 'foo'};
        solver.addVar(opt2);

        expect(solver.vars.byName.foo).to.eql([opt, opt2]);
      });

      it('should add two vars with different names to byName', function() {
        let solver = new Solver();
        let opt = {id: 'foo', name: 'foo'};
        solver.addVar(opt);
        let opt2 = {id: 'bar', name: 'foo'};
        solver.addVar(opt2);
        let opt3 = {id: 'boo', name: 'other'};
        solver.addVar(opt3);

        expect(solver.vars.byName).to.eql({
          foo: [opt, opt2],
          other: [opt3],
        });
      });
    });

    describe('solver.plus', function() {

      function alias(method) {
        it('should work without result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          expect(solver[method]('A', 'B')).to.be.a('string');
        });

        it('should work with a result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method]('A', 'B', 'C')).to.equal('C');
        });

        it('should accept numbers on either of the three positions', function() {
          let solver = new Solver();
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method](1, 'B', 'C')).to.equal('C');

          let solver2 = new Solver();
          solver2.decl('A', 100);
          solver2.decl('C', 100);
          expect(solver2[method]('A', 2, 'C')).to.equal('C');

          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(solver3[method]('A', 'B', 3)).to.be.a('string');
        });

        it('should throw for bad result name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(_ => solver3[method](['A', 'B'], {})).to.throw('STRING_KEY');
        });

        it('should have at leat one string var name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          solver3.decl('C', 100);

          expect(solver3[method]('A', 'B')).to.be.a('string');
          expect(solver3[method](1, 'B')).to.be.a('string');
          expect(solver3[method]('A', 1)).to.be.a('string');
          expect(_ => solver3[method](1, 2)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method]('A', 'B', 'C')).to.be.a('string');
          expect(solver3[method](1, 'B', 'C')).to.be.a('string');
          expect(solver3[method]('A', 2, 'C')).to.be.a('string');
          expect(_ => solver3[method](1, 2, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method]('A', 'B', 3)).to.be.a('string');
          expect(solver3[method](1, 'B', 3)).to.be.a('string');
          expect(solver3[method]('A', 2, 3)).to.be.a('string');
          expect(_ => solver3[method](1, 2, 3)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
        });
      }

      alias('plus');
      alias('+');
    });

    describe('solver.minus', function() {

      function alias(method) {
        it('should work without result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          expect(solver[method]('A', 'B')).to.be.a('string');
        });

        it('should work with a result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method]('A', 'B', 'C')).to.equal('C');
        });

        it('should accept numbers on either of the three positions', function() {
          let solver = new Solver();
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method](1, 'B', 'C')).to.equal('C');

          let solver2 = new Solver();
          solver2.decl('A', 100);
          solver2.decl('C', 100);
          expect(solver2[method]('A', 2, 'C')).to.equal('C');

          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(solver3[method]('A', 'B', 3)).to.be.a('string');
        });

        it('should throw for bad result name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(_ => solver3[method](['A', 'B'], {})).to.throw('STRING_KEY');
        });

        it('should have at leat one string var name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          solver3.decl('C', 100);

          expect(solver3[method]('A', 'B')).to.be.a('string');
          expect(solver3[method](1, 'B')).to.be.a('string');
          expect(solver3[method]('A', 1)).to.be.a('string');
          expect(_ => solver3[method](1, 2)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method]('A', 'B', 'C')).to.be.a('string');
          expect(solver3[method](1, 'B', 'C')).to.be.a('string');
          expect(solver3[method]('A', 2, 'C')).to.be.a('string');
          expect(_ => solver3[method](1, 2, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method]('A', 'B', 3)).to.be.a('string');
          expect(solver3[method](1, 'B', 3)).to.be.a('string');
          expect(solver3[method]('A', 2, 3)).to.be.a('string');
          expect(_ => solver3[method](1, 2, 3)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
        });
      }

      alias('minus');
      alias('-');
      alias('min');
    });

    describe('solver.times', function() {

      function alias(method) {
        it('should work without result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          expect(solver[method]('A', 'B')).to.be.a('string');
        });

        it('should work with a result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method]('A', 'B', 'C')).to.equal('C');
        });

        it('should accept numbers on either of the three positions', function() {
          let solver = new Solver();
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method](1, 'B', 'C')).to.equal('C');

          let solver2 = new Solver();
          solver2.decl('A', 100);
          solver2.decl('C', 100);
          expect(solver2[method]('A', 2, 'C')).to.equal('C');

          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(solver3[method]('A', 'B', 3)).to.be.a('string');
        });

        it('should throw for bad result name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(_ => solver3[method](['A', 'B'], {})).to.throw('STRING_KEY');
        });

        it('should have at leat one string var name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          solver3.decl('C', 100);

          expect(solver3[method]('A', 'B')).to.be.a('string');
          expect(solver3[method](1, 'B')).to.be.a('string');
          expect(solver3[method]('A', 1)).to.be.a('string');
          expect(_ => solver3[method](1, 2)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method]('A', 'B', 'C')).to.be.a('string');
          expect(solver3[method](1, 'B', 'C')).to.be.a('string');
          expect(solver3[method]('A', 2, 'C')).to.be.a('string');
          expect(_ => solver3[method](1, 2, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method]('A', 'B', 3)).to.be.a('string');
          expect(solver3[method](1, 'B', 3)).to.be.a('string');
          expect(solver3[method]('A', 2, 3)).to.be.a('string');
          expect(_ => solver3[method](1, 2, 3)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
        });
      }

      alias('times');
      alias('*');
      alias('ring_mul');
    });

    describe('solver.div', function() {

      function alias(method) {
        it('should work without result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          expect(solver[method]('A', 'B')).to.be.a('string');
        });

        it('should work with a result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method]('A', 'B', 'C')).to.equal('C');
        });

        it('should accept numbers on either of the three positions', function() {
          let solver = new Solver();
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method](1, 'B', 'C')).to.equal('C');

          let solver2 = new Solver();
          solver2.decl('A', 100);
          solver2.decl('C', 100);
          expect(solver2[method]('A', 2, 'C')).to.equal('C');

          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(solver3[method]('A', 'B', 3)).to.be.a('string');
        });

        it('should throw for bad result name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(_ => solver3[method](['A', 'B'], {})).to.throw('STRING_KEY');
        });

        it('should have at leat one string var name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          solver3.decl('C', 100);

          expect(solver3[method]('A', 'B')).to.be.a('string');
          expect(solver3[method](1, 'B')).to.be.a('string');
          expect(solver3[method]('A', 1)).to.be.a('string');
          expect(_ => solver3[method](1, 2)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method]('A', 'B', 'C')).to.be.a('string');
          expect(solver3[method](1, 'B', 'C')).to.be.a('string');
          expect(solver3[method]('A', 2, 'C')).to.be.a('string');
          expect(_ => solver3[method](1, 2, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method]('A', 'B', 3)).to.be.a('string');
          expect(solver3[method](1, 'B', 3)).to.be.a('string');
          expect(solver3[method]('A', 2, 3)).to.be.a('string');
          expect(_ => solver3[method](1, 2, 3)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
        });
      }

      alias('div');
      alias('/');
    });

    describe('solver.product', function() {

      function alias(method) {
        it('should work without result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          expect(solver[method](['A', 'B'])).to.be.a('string');
        });

        it('should work with a result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method](['A', 'B'], 'C')).to.equal('C');
        });

        it('should accept numbers on either of the three positions', function() {
          let solver = new Solver();
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method]([1, 'B'], 'C')).to.equal('C');

          let solver2 = new Solver();
          solver2.decl('A', 100);
          solver2.decl('C', 100);
          expect(solver2[method](['A', 2], 'C')).to.equal('C');

          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(solver3[method](['A', 'B'], 3)).to.be.a('string');
        });

        it('should throw for bad result name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(_ => solver3[method](['A', 'B'], {})).to.throw('expecting result var name to be absent or a number or string:');
        });

        it('should have at leat one string var name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          solver3.decl('C', 100);

          expect(solver3[method]('A', 'B')).to.be.a('string');
          expect(_ => solver3[method](1, 'B')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME'); // special case
          expect(solver3[method]('A', 1)).to.be.a('string');
          expect(_ => solver3[method](1, 2)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method](['A', 'B'], 'C')).to.be.a('string');
          expect(solver3[method]([1, 'B'], 'C')).to.be.a('string');
          expect(solver3[method](['A', 2], 'C')).to.be.a('string');
          expect(_ => solver3[method]([1, 2], 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method](['A', 'B'], 3)).to.be.a('string');
          expect(solver3[method]([1, 'B'], 3)).to.be.a('string');
          expect(solver3[method](['A', 2], 3)).to.be.a('string');
          expect(_ => solver3[method]([1, 2], 3)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
        });
      }

      alias('product');
      alias('∏');
    });

    describe('solver.mul', function() {

      it('should work without result var', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 100);
        expect(solver.mul('A', 'B')).to.be.a('string');
      });

      it('should work with a result var', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 100);
        solver.decl('C', 100);
        expect(solver.mul('A', 'B', 'C')).to.equal('C');
      });

      it('should accept numbers on either of the three positions', function() {
        let solver = new Solver();
        solver.decl('B', 100);
        solver.decl('C', 100);
        expect(solver.mul(1, 'B', 'C')).to.equal('C');

        let solver2 = new Solver();
        solver2.decl('A', 100);
        solver2.decl('C', 100);
        expect(solver2.mul('A', 2, 'C')).to.equal('C');

        let solver3 = new Solver();
        solver3.decl('A', 100);
        solver3.decl('B', 100);
        expect(solver3.mul('A', 'B', 3)).to.be.a('string');
      });
    });

    describe('solver.sum', function() {

      function alias(method) {
        it('should work without result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          expect(solver[method](['A', 'B'])).to.be.a('string');
        });

        it('should work with a result var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method](['A', 'B'], 'C')).to.equal('C');
        });

        it('should accept numbers on either of the three positions; 1', function() {
          let solver = new Solver();
          solver.decl('B', 100);
          solver.decl('C', 100);
          expect(solver[method]([1, 'B'], 'C')).to.equal('C');
        });

        it('should accept numbers on either of the three positions; 2', function() {
          let solver2 = new Solver();
          solver2.decl('A', 100);
          solver2.decl('C', 100);
          expect(solver2[method](['A', 2], 'C')).to.equal('C');
        });

        it('should accept numbers on either of the three positions; 3', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(solver3[method](['A', 'B'], 3)).to.be.a('string');
        });

        it('should throw for bad result name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          expect(_ => solver3[method](['A', 'B'], {})).to.throw('expecting result var name to be absent or a number or string:');
        });

        it('should have at least one string var name', function() {
          let solver3 = new Solver();
          solver3.decl('A', 100);
          solver3.decl('B', 100);
          solver3.decl('C', 100);

          expect(solver3[method]('A', 'B')).to.be.a('string');
          expect(_ => solver3[method](1, 'B')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
          expect(solver3[method]('A', 1)).to.be.a('string');
          expect(_ => solver3[method](1, 2)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method](['A', 'B'], 'C')).to.be.a('string');
          expect(solver3[method]([1, 'B'], 'C')).to.be.a('string');
          expect(solver3[method](['A', 2], 'C')).to.be.a('string');
          expect(_ => solver3[method]([1, 2], 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

          expect(solver3[method](['A', 'B'], 3)).to.be.a('string');
          expect(solver3[method]([1, 'B'], 3)).to.be.a('string');
          expect(solver3[method](['A', 2], 3)).to.be.a('string');
          expect(_ => solver3[method]([1, 2], 3)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
        });
      }

      alias('sum');
      alias('∑');
    });

    describe('solver.distinct', function() {

      function alias(method) {
        it('should work', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          solver.decl('C', 100);
          solver.decl('D', 100);
          solver.decl('E', 100);
          expect(solver[method](['A', 'B', 'C', 'D'], 'E')).to.equal(undefined);
        });

        it('accept zero vars', function() {
          let solver = new Solver();
          expect(_ => solver[method]([])).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
        });

        it('accept one var', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          expect(solver[method](['A'])).to.equal(undefined);
        });

        it('accept two vars', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          expect(solver[method](['A', 'B'])).to.equal(undefined);
        });
      }

      alias('distinct');
      alias('{}≠');
    });

    describe('solver comparison with .eq and .neq', function() {

      function alias(method) {
        it('should work', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          expect(solver[method]('A', 'B')).to.equal('A'); // returns v1
        });

        it('should work with a number left', function() {
          let solver = new Solver();
          solver.decl('B', 100);
          expect(solver[method](1, 'B')).to.be.a('string');
        });

        it('should work with a number right', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          expect(solver[method]('A', 2)).to.be.a('string'); // not A!
        });

        it('should return the new var name for v2 if that was a number', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          expect(solver[method]('A', 2)).not.to.equal('A');
        });

        it('should work with an empty array', function() {
          let solver = new Solver();
          solver.decl('B', 100);
          expect(solver[method]([], 'B')).to.equal('B'); // returns v2!
        });

        it('should work with an array of one element', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          expect(solver[method](['A'], 'B')).to.equal(undefined);
        });

        it('should work with an array of multiple elements', function() {
          let solver = new Solver();
          solver.decl('A', 100);
          solver.decl('B', 100);
          solver.decl('C', 100);
          solver.decl('D', 100);
          expect(solver[method](['A', 'C', 'D'], 'B')).to.equal(undefined);
        });
      }

      alias('eq');
      alias('==');
      alias('neq');
      alias('!=');
    });

    describe('solver relative comparisons', function() {

      function alias(method) {
        describe('method [' + method + ']', function() {

          it('should work', function() {
            let solver = new Solver();
            solver.decl('A', 100);
            solver.decl('B', 100);
            expect(solver[method]('A', 'B')).to.equal('A');
          });

          it('should work with a number left', function() {
            let solver = new Solver();
            solver.decl('B', 100);
            expect(solver[method](1, 'B')).to.equal('1'); // if we change anonymous var naming, this'll break
          });

          it('should work with a number right', function() {
            let solver = new Solver();
            solver.decl('A', 100);
            expect(solver[method]('A', 2)).to.equal('1'); // if we change anonymous var naming, this'll break
          });
          it('should not work with an empty array', function() {
            let solver = new Solver();
            solver.decl('B', 100);
            expect(_ => solver[method]([], 'B')).to.throw('NOT_ACCEPTING_ARRAYS');
          });

          it('should work with an array of one element', function() {
            let solver = new Solver();
            solver.decl('A', 100);
            solver.decl('B', 100);
            expect(_ => solver[method](['A'], 'B')).to.throw('NOT_ACCEPTING_ARRAYS');
          });

          it('should work with an array of multiple elements', function() {
            let solver = new Solver();
            solver.decl('A', 100);
            solver.decl('B', 100);
            solver.decl('C', 100);
            solver.decl('D', 100);
            expect(_ => solver[method](['A', 'C', 'D'], 'B')).to.throw('NOT_ACCEPTING_ARRAYS');
          });
        });
      }

      alias('gte');
      alias('>=');
      alias('gt');
      alias('>');
      alias('lte');
      alias('<=');
      alias('lt');
      alias('<');
    });

    describe('solver reifiers', function() {

      function alias(method) {
        describe('method = ' + method, function() {

          it('should work:' + method, function() {
            let solver = new Solver();
            solver.decl('A', 100);
            solver.decl('B', 100);
            expect(solver[method]('A', 'B')).to.be.a('string');
          });

          it('should work with a number left: ' + method, function() {
            let solver = new Solver();
            solver.decl('B', 100);
            expect(solver[method](1, 'B')).to.be.a('string');
          });

          it('should work with a number right: ' + method, function() {
            let solver = new Solver();
            solver.decl('A', 100);
            expect(solver[method]('A', 2)).to.be.a('string');
          });

          it('should accept a result name: ' + method, function() {
            let solver = new Solver();
            solver.decl('A', 100);
            solver.decl('B', 100);
            solver.decl('C', 100);
            expect(solver[method]('A', 'B', 'C')).to.equal('C');
          });

          it('should accept a result number: ' + method, function() {
            let solver = new Solver();
            solver.decl('A', 100);
            solver.decl('B', 1);
            expect(solver[method]('A', 'B', 1)).to.be.a('string');
          });

          it('should throw for bad result name', function() {
            let solver3 = new Solver();
            solver3.decl('A', 100);
            solver3.decl('B', 100);
            expect(_ => solver3[method](['A', 'B'], {})).to.throw('STRING_KEY');
          });

          it('should have at leat one string var name', function() {
            let solver3 = new Solver();
            solver3.decl('A', 100);
            solver3.decl('B', 100);
            solver3.decl('C', 100);

            expect(solver3[method]('A', 'B')).to.be.a('string');
            expect(solver3[method](1, 'B')).to.be.a('string');
            expect(solver3[method]('A', 1)).to.be.a('string');
            expect(_ => solver3[method](1, 2)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

            expect(solver3[method]('A', 'B', 'C')).to.be.a('string');
            expect(solver3[method](1, 'B', 'C')).to.be.a('string');
            expect(solver3[method]('A', 2, 'C')).to.be.a('string');
            expect(_ => solver3[method](1, 2, 'C')).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

            expect(solver3[method]('A', 'B', 3)).to.be.a('string');
            expect(solver3[method](1, 'B', 3)).to.be.a('string');
            expect(solver3[method]('A', 2, 3)).to.be.a('string');
            expect(_ => solver3[method](1, 2, 3)).to.throw('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
          });
        });
      }

      alias('isNeq');
      alias('!=?');
      alias('isEq');
      alias('==?');
      alias('isGt');
      alias('>?');
      alias('isGte');
      alias('>=?');
      alias('isLt');
      alias('<?');
      alias('isLte');
      alias('<=?');
    });

    describe('solver.solve', function() {

      it('should solve a trivial case when targeted', function() {
        let solver = new Solver({});
        solver.addVar('A', [1, 2]);

        expect(solver.solve({vars: ['A']})).to.eql([{A: 1}, {A: 2}]);
      });

      it('should solve a trivial case when not targeted', function() {
        let solver = new Solver({});
        solver.addVar('A', [1, 2]);

        expect(solver.solve()).to.eql([{A: [1, 2]}]);
      });

      function forLevel(level) {
        it('should accept all log levels (' + level + ')', function() {
          let solver = new Solver();

          expect(solver.solve({log: level})).to.eql([{}]);
        });

        it('should accept all dbg levels (' + level + ')', function() {
          let solver = new Solver();

          expect(solver.solve({dbg: level})).to.eql([{}]);
        });
      }

      forLevel(undefined);
      forLevel(null);
      forLevel(false);
      forLevel(true);
      forLevel(LOG_NONE);
      forLevel(LOG_STATS);
      forLevel(LOG_SOLVES);
      forLevel(LOG_MAX);
      forLevel(LOG_MIN);
    });

    describe('solver._prepare', function() {

      it('should prepare for war', function() {
        let solver = new Solver();

        solver._prepare({});
        expect(true).to.equal(true);
      });

      it('should not require options object', function() {
        let solver = new Solver();

        solver._prepare({});
        expect(true).to.equal(true);
      });
    });

    describe('solver.space_add_var_range', function() {

      it('should just map to config_addVar', function() {
        let solver = new Solver();

        expect(solver.space_add_var_range('foo', 1, 2)).to.equal('foo');
      });
    });

    describe('solver.domain_fromList', function() {

      it('should map to domain_fromList', function() {
        let solver = new Solver();

        expect(solver.domain_fromList([1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 15, 118])).to.eql(fixt_arrdom_ranges([1, 2], [4, 5], [7, 7], [9, 13], [15, 15], [118, 118]));
      });

      it('should always return an array even for small domains', function() {
        let solver = new Solver();

        expect(solver.domain_fromList([1, 2, 4, 5, 7, 9, 10, 11, 12, 13, 15])).to.eql([1, 2, 4, 5, 7, 7, 9, 13, 15, 15]);
      });
    });
  });

  describe('API integration tests', function() {

    it('4 branch 2 level example w/ string vars (binary)', function() {

      /*
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
      */

      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 1, true)});

      // branch vars
      solver.addVars(['A', 'C', 'B', 'D']);

      // path vars
      let Avars = ['A1', 'A2', 'A3'];
      let Bvars = ['B1', 'B2', 'B3'];
      let Cvars = ['C1', 'C2', 'C3'];
      let Dvars = ['D1', 'D2', 'D3'];
      solver.addVars([].concat(Avars, Bvars, Cvars, Dvars));

      // path to branch binding
      solver['∑'](Avars, 'A');
      solver['∑'](Bvars, 'B');
      solver['∑'](Cvars, 'C');
      solver['∑'](Dvars, 'D');

      // root branches must be on
      solver['==']('A', solver.constant(1));
      solver['==']('C', solver.constant(1));

      // child-parent binding
      solver['==']('B', 'A2');
      solver['==']('D', 'C2');

      // D & B counterpoint
      solver['==?']('B', 'D', solver.addVar('BsyncD', [0, 1]));

      let BD1 = solver['==?']('B1', 'D1');
      solver['>='](BD1, 'BsyncD');
      let BD2 = solver['==?']('B2', 'D2');
      solver['>='](BD2, 'BsyncD');
      let BD3 = solver['==?']('B3', 'D3');
      solver['>='](BD3, 'BsyncD');

      solver.solve();

      expect(countSolutions(solver)).to.equal(19);
    });

    it('4 branch 2 level example w/ var objs (binary)', function() {

      /*
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
       */

      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 1, true)});

      let branches = {
        A: 3,
        B: 3,
        C: 3,
        D: 3,
      };

      let pathCount = 3;
      for (let branchId in branches) {
        let branchVar = {id: branchId}; // A B C D
        solver.addVar(branchVar);
        let pathVars = [];
        for (let i = 1; i <= pathCount; ++i) {
          pathVars.push({id: branchId + i});
        }
        solver.addVars(pathVars);
        // path to branch binding
        solver['∑'](pathVars, branchVar);
      }

      // root branches must be on
      solver['==']('A', solver.constant(1));
      solver['==']('C', solver.constant(1));

      // child-parent binding
      solver['==']('B', 'A2');
      solver['==']('D', 'C2');

      // D & B counterpoint
      //S['==?'] 'B', 'D', S.addVar('BsyncD')

      let BD = solver['==?']('B', 'D');
      solver['<='](BD, solver['==?']('B1', 'D1'));
      solver['<='](BD, solver['==?']('B2', 'D2'));
      solver['<='](BD, solver['==?']('B3', 'D3'));

      solver.solve();

      expect(countSolutions(solver), 'solution count').to.equal(19);
    });

    it('4 branch 2 level example w/ var objs (non-binary)', function() {

      /*
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
       */

      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 1, true)});

      solver.addVar('A', fixt_arrdom_range(0, 3, true));
      solver.addVar('B', fixt_arrdom_range(0, 3, true));
      solver.addVar('C', fixt_arrdom_range(0, 3, true));
      solver.addVar('D', fixt_arrdom_range(0, 3, true));

      // root branches must be on
      solver['>=']('A', solver.constant(1));
      solver['>=']('C', solver.constant(1));

      // child-parent binding
      let A = solver['==?']('A', solver.constant(2));
      let B = solver['>?']('B', solver.constant(0));
      solver['=='](A, B);
      let C = solver['==?']('C', solver.constant(2));
      let D = solver['>?']('D', solver.constant(0));
      solver['=='](C, D);

      // Synchronize D & B if possible
      // if B > 0 and D > 0, then B == D
      solver['>='](
        solver['==?']('B', 'D'),
        solver['==?'](
          solver['>?']('B', solver.constant(0)),
          solver['>?']('D', solver.constant(0))
        )
      );

      solver.solve();

      expect(countSolutions(solver)).to.equal(19);
    });
  });

  describe('plain tests', function() {

    it('should solve a sparse domain', function() {
      let solver = new Solver({});

      solver.decl('item1', fixt_arrdom_range(1, 5, true));
      solver.decl('item2', [2, 2, 4, 5]); // TODO: restore to specDomainCreateRanges([2, 2], [4, 5]));
      solver.decl('item3', fixt_arrdom_range(1, 5, true));
      solver.decl('item4', fixt_arrdom_range(4, 4, true));
      solver.decl('item5', fixt_arrdom_range(1, 5, true));

      solver['<']('item1', 'item2');
      solver['<']('item2', 'item3');
      solver['<']('item3', 'item4');
      solver['<']('item4', 'item5');

      let solutions = solver.solve();

      expect(countSolutions(solver)).to.equal(1);
      expect(solutions[0].item1, 'item1').to.equal(1);
      expect(solutions[0].item2, 'item2').to.equal(2);
    });

    it('should reject a simple > test (regression)', function() {
      // regression: x>y was wrongfully mapped to y<=x
      let solver = new Solver({});

      solver.decl('item5', fixt_arrdom_range(1, 5, true));
      solver.decl('item4', [2, 2, 3, 5]); // TODO: restore to specDomainCreateRanges([2, 2], [3, 5]));
      solver.decl('item3', fixt_arrdom_range(1, 5, true));
      solver.decl('item2', fixt_arrdom_range(4, 4, true));
      solver.decl('item1', fixt_arrdom_range(1, 5, true));

      solver['==']('item5', solver.constant(5));
      solver['>']('item1', 'item2');
      solver['>']('item2', 'item3');
      solver['>']('item3', 'item4');
      solver['>']('item4', 'item5');

      // there is no solution since item 5 must be 5 and item 2 must be 4
      solver.solve();

      expect(countSolutions(solver), 'solution count').to.equal(0);
    });

    it('should solve a simple >= test', function() {
      let solver = new Solver({});

      solver.decl('item5', fixt_arrdom_range(1, 5, true));
      solver.decl('item4', [2, 2, 3, 5]); // TODO: restore to specDomainCreateRanges([2, 2], [3, 5]));
      solver.decl('item3', fixt_arrdom_range(1, 5, true));
      solver.decl('item2', fixt_arrdom_range(4, 5, true));
      solver.decl('item1', fixt_arrdom_range(1, 5, true));

      solver['==']('item5', solver.constant(5));
      solver['>=']('item1', 'item2');
      solver['>=']('item2', 'item3');
      solver['>=']('item3', 'item4');
      solver['>=']('item4', 'item5');

      solver.solve();

      // only solution is where everything is `5`
      expect(countSolutions(solver)).to.equal(1);
    });

    it('should solve a simple < test', function() {
      let solver = new Solver({});

      solver.decl('item5', fixt_arrdom_range(1, 5, true));
      solver.decl('item4', fixt_arrdom_range(4, 4, true));
      solver.decl('item3', fixt_arrdom_range(1, 5, true));
      solver.decl('item2', [2, 2, 3, 5]); // TODO: restore to specDomainCreateRanges([2, 2], [3, 5]));
      solver.decl('item1', fixt_arrdom_range(1, 5, true));

      solver['==']('item5', solver.constant(5));
      solver['<']('item1', 'item2');
      solver['<']('item2', 'item3');
      solver['<']('item3', 'item4');
      solver['<']('item4', 'item5');

      solver.solve();

      // only solution is where each var is prev+1, 1 2 3 4 5
      expect(countSolutions(solver)).to.equal(1);
    });

    it('should solve a simple / test', function() {
      let solver = new Solver({});

      solver.addVar('A', fixt_arrdom_range(50, 100));
      solver.addVar('B', fixt_arrdom_range(5, 10, true));
      solver.addVar('C', fixt_arrdom_range(0, 100));

      solver.div('A', 'B', 'C');
      solver.eq('C', 15);

      let solutions = solver.solve();

      // there are two integer solutions (75/5 and 90/6) and
      // 9 fractional solutions whose floor result in 15
      expect(countSolutions(solver)).to.equal(11);

      // there are two cases where A/B=15 with input ranges:
      expect(stripAnonVarsFromArrays(solutions)).to.eql([{
        A: 75,
        B: 5,
        C: 15,
      }, {
        A: 76,
        B: 5,
        C: 15, // floored
      }, {
        A: 77,
        B: 5,
        C: 15, // floored
      }, {
        A: 78,
        B: 5,
        C: 15, // floored
      }, {
        A: 79,
        B: 5,
        C: 15, // floored
      }, {
        A: 90,
        B: 6,
        C: 15,
      }, {
        A: 91,
        B: 6,
        C: 15, // floored
      }, {
        A: 92,
        B: 6,
        C: 15, // floored
      }, {
        A: 93,
        B: 6,
        C: 15, // floored
      }, {
        A: 94,
        B: 6,
        C: 15, // floored
      }, {
        A: 95,
        B: 6,
        C: 15, // floored
      }]);
    });

    it('should solve another simple / test', function() {
      let solver = new Solver({});

      solver.addVar('A', fixt_arrdom_range(3, 5, true));
      solver.addVar('B', fixt_arrdom_range(2, 2, true));
      solver.addVar('C', fixt_arrdom_range(0, 100));

      solver.div('A', 'B', 'C');
      solver.eq('C', 2);

      let solutions = solver.solve();

      // expecting two solutions; one integer division and one floored fractional division
      expect(countSolutions(solver)).to.equal(2);

      // there is only one case where 3~5 / 2 equals 2 and that is when A is 4.
      // but when flooring results, 5/2=2.5 -> 2, so there are two answers
      expect(stripAnonVarsFromArrays(solutions)).to.eql([{
        A: 4,
        B: 2,
        C: 2,
      }, {
        A: 5,
        B: 2,
        C: 2, // floored
      }]);
    });

    it('should solve a simple * test', function() {
      let solver = new Solver({});

      solver.addVar('A', fixt_arrdom_range(3, 8, true));
      solver.addVar('B', fixt_arrdom_range(2, 10, true));
      solver.addVar('C', fixt_arrdom_range(0, 100));

      solver.mul('A', 'B', 'C');
      solver.eq('C', 30);

      let solutions = solver.solve();

      expect(countSolutions(solver)).to.equal(3);

      // 3*10=30
      // 5*6=30
      // 6*5=30
      expect(stripAnonVarsFromArrays(solutions)).to.eql([{
        A: 3,
        B: 10,
        C: 30,
      }, {
        A: 5,
        B: 6,
        C: 30,
      }, {
        A: 6,
        B: 5,
        C: 30,
      }]);
    });

    it('should solve a simple - test', function() {
      let solver = new Solver({});
      solver.decl('A', 400);
      solver.decl('B', 50);
      solver.decl('C', fixt_arrdom_range(0, 10000));

      solver.min('A', 'B', 'C');

      let solutions = solver.solve();

      expect(solutions).to.eql([{
        A: 400,
        B: 50,
        C: 350,
      }]);
    });

    it('should not skip over when a var only has one propagator and is affected', function() {
      // this is more thoroughly tested with space unit tests
      let solver = new Solver({});
      solver.decl('A', fixt_arrdom_range(0, 1, true));
      solver.decl('B', fixt_arrdom_range(0, 1, true));

      solver.neq('A', 'B');

      solver.solve();

      expect(countSolutions(solver)).to.eql(2); // 0 1, and 1 0
    });
  });

  describe('targeting vars', function() {
    it('should want to solve all vars if targets are not set at all', function() {
      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 1, true)});

      solver.decl('A');
      solver.decl('B');
      solver.decl('C');
      solver['==?']('A', 'B', solver.decl('AnotB'));

      let solutions = solver.solve({});
      // a, b, c are not constrained in any way, so 2^3=8
      // no var is targeted so they should all solve
      // however, the constraint will force A and B to solve
      // to a single value, where C is left as "any"
      expect(countSolutions(solver)).to.equal(8);
      expect(solutions).to.eql([
        {A: 0, B: 0, C: [0, 1], AnotB: 1},
        {A: 0, B: 1, C: [0, 1], AnotB: 0},
        {A: 1, B: 0, C: [0, 1], AnotB: 0},
        {A: 1, B: 1, C: [0, 1], AnotB: 1},
      ]);
    });

    it('should throw if explicitly targeting no vars', function() {
      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 1, true)});

      solver.decl('A');
      solver.decl('B');
      solver.decl('C');
      solver['==?']('A', 'B', solver.decl('AnotB'));

      expect(_ => solver.solve({vars: []})).to.throw('ONLY_USE_WITH_SOME_TARGET_VARS');
    });

    it('should ignore C when only A and B are targeted', function() {
      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 1, true)});

      solver.decl('A');
      solver.decl('B');
      solver.decl('C');
      solver['==?']('A', 'B', solver.decl('AnotB'));

      let solutions = solver.solve({vars: ['A', 'B']});
      // A and B are targeted, they have [0,1] [0,1] so
      // 4 solutions. the result of C is irrelevant here
      // so that's x2=8 (pretty much same as before)
      expect(countSolutions(solver)).to.equal(8);
      expect(solutions).to.eql([
        {A: 0, B: 0, C: [0, 1], AnotB: 1},
        {A: 0, B: 1, C: [0, 1], AnotB: 0},
        {A: 1, B: 0, C: [0, 1], AnotB: 0},
        {A: 1, B: 1, C: [0, 1], AnotB: 1},
      ]);
    });

    it('should ignore A when only B and C are targeted', function() {
      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 1, true)});

      solver.decl('A');
      solver.decl('B');
      solver.decl('C');
      solver['==?']('A', 'B', solver.decl('AnotB'));

      solver.solve({vars: ['B', 'C']});
      // B and C are targeted, they have [0,1] [0,1] so
      // 4 solutions. the result of A is irrelevant so x2
      // and here the reifier is not a constraint on its
      // so that's another x2 total(l)ing 16.
      expect(countSolutions(solver)).to.equal(16);
    });

    it('should not solve anonymous vars if no targets given', function() {
      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 1, true)});

      solver.decl('A');
      solver.decl('B');
      solver['==?']('A', 'B');

      solver.solve({});
      // internally there will be three vars; A B and the reifier result var
      // make sure we don't accidentally require to solve that one too
      expect(countSolutions(solver)).to.equal(4);
    });

    it('should be capable of solving an anonymous var', function() {
      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 1, true)});

      solver.decl('A');
      solver.decl('B');
      let anon = solver['==?']('A', 'B');

      solver.solve({vars: [anon]});
      // the anonymous var will be boolean. since we only target
      // that var, there ought to be two solutions (0 and 1) for
      // it and any for the others, 2x2x2=8
      expect(countSolutions(solver)).to.equal(8);
    });
  });

  describe('brute force entire space', function() {

    it('should solve a single unconstrainted var', function() {
      let solver = new Solver({});
      solver.addVar('A', fixt_arrdom_range(1, 2, true));
      solver.solve();

      // A solves to 1 or 2
      expect(countSolutions(solver)).to.eql(2);
    });

    it('should combine multiple unconstrained vars when targeted', function() {
      let solver = new Solver({});

      solver.addVar('_ROOT_BRANCH_', [0, 1]);
      solver.addVar('SECTION', [1, 1]);
      solver.addVar('VERSE_INDEX', [2, 2, 4, 4, 9, 9]);
      solver.addVar('ITEM_INDEX', [1, 2]);
      solver.addVar('align', [1, 2]);
      solver.addVar('text_align', [1, 2]);
      solver.addVar('SECTION&n=1', [1, 1]);
      solver.addVar('VERSE_INDEX&n=1', [5, 6, 8, 8]);
      solver.addVar('ITEM_INDEX&n=1', [2, 2]);
      solver.addVar('align&n=1', [1, 2]);
      solver.addVar('text_align&n=1', [1, 2]);
      solver.addVar('SECTION&n=2', [1, 1]);
      solver.addVar('VERSE_INDEX&n=2', [1, 1, 3, 3, 7, 7]);
      solver.addVar('ITEM_INDEX&n=2', [3, 3]);
      solver.addVar('align&n=2', [1, 2]);
      solver.addVar('text_align&n=2', [1, 2]);

      solver.solve({max: 10000, vars: solver.config.all_var_names.slice(0)});

      // 2×3×2×2×2×3×2×2×3×2×2 (size of each domain multiplied)
      // there are no constraints so it's just all combinations
      expect(countSolutions(solver)).to.eql(6912);
    });

    it('should return all domains as is when not targeted', function() {
      let solver = new Solver({});

      solver.addVar('_ROOT_BRANCH_', [0, 1]);
      solver.addVar('SECTION', [1, 1]);
      solver.addVar('VERSE_INDEX', [2, 2, 4, 4, 9, 9]);
      solver.addVar('ITEM_INDEX', [1, 2]);
      solver.addVar('align', [1, 2]);
      solver.addVar('text_align', [1, 2]);
      solver.addVar('SECTION&n=1', [1, 1]);
      solver.addVar('VERSE_INDEX&n=1', [5, 6, 8, 8]);
      solver.addVar('ITEM_INDEX&n=1', [2, 2]);
      solver.addVar('align&n=1', [1, 2]);
      solver.addVar('text_align&n=1', [1, 2]);
      solver.addVar('SECTION&n=2', [1, 1]);
      solver.addVar('VERSE_INDEX&n=2', [1, 1, 3, 3, 7, 7]);
      solver.addVar('ITEM_INDEX&n=2', [3, 3]);
      solver.addVar('align&n=2', [1, 2]);
      solver.addVar('text_align&n=2', [1, 2]);

      solver.solve({max: 10000});

      // same as before but none are targeted so algo considers them
      // "solved" and returns all valid values (=init) so it becomes
      // a multiplication of all the number of options...
      expect(countSolutions(solver)).to.eql(36864);
    });

    it('should constrain one var to be equal to another', function() {
      let solver = new Solver({});

      solver.addVar('_ROOT_BRANCH_', [0, 1]);
      solver.addVar('SECTION', [1, 1]);
      solver.addVar('VERSE_INDEX', [2, 2, 4, 4, 9, 9]);
      solver.addVar('ITEM_INDEX', [1, 2]);
      solver.addVar('align', [1, 2]);
      solver.addVar('text_align', [1, 2]);
      solver.addVar('SECTION&n=1', [1, 1]);
      solver.addVar('VERSE_INDEX&n=1', [5, 6, 8, 8]);
      solver.addVar('ITEM_INDEX&n=1', [2, 2]);
      solver.addVar('align&n=1', [1, 2]);
      solver.addVar('text_align&n=1', [1, 2]);
      solver.addVar('SECTION&n=2', [1, 1]);
      solver.addVar('VERSE_INDEX&n=2', [1, 1, 3, 3, 7, 7]);
      solver.addVar('ITEM_INDEX&n=2', [3, 3]);
      solver.addVar('align&n=2', [1, 2]);
      solver.addVar('text_align&n=2', [1, 2]);

      solver.eq('_ROOT_BRANCH_', 'SECTION');

      solver.solve({max: 10000, vars: solver.config.all_var_names.slice(0)});

      // same as 'combine multiple unconstrained vars' but one var has one instead of two options, so /2
      // note: must target all vars explicitly or you'll validly get just one solution back.
      expect(countSolutions(solver)).to.eql(6912 / 2);
    });

    it('should allow useless constraints', function() {
      let solver = new Solver({});

      solver.addVar('x2', [1, 1]);
      solver.addVar('_ROOT_BRANCH_', [0, 1]); // becomes 1
      solver.addVar('SECTION', [1, 1]);
      solver.addVar('VERSE_INDEX', [2, 2, 4, 4, 9, 9]);
      solver.addVar('ITEM_INDEX', [1, 2]); // becomes 2
      solver.addVar('align', [1, 2]);
      solver.addVar('text_align', [1, 2]);
      solver.addVar('SECTION&n=1', [1, 1]);
      solver.addVar('VERSE_INDEX&n=1', [5, 6, 8, 8]);
      solver.addVar('ITEM_INDEX&n=1', [2, 2]);
      solver.addVar('align&n=1', [1, 2]);
      solver.addVar('text_align&n=1', [1, 2]);
      solver.addVar('SECTION&n=2', [1, 1]);
      solver.addVar('VERSE_INDEX&n=2', [1, 1, 3, 3, 7, 7]);
      solver.addVar('ITEM_INDEX&n=2', [3, 3]);
      solver.addVar('align&n=2', [1, 2]);
      solver.addVar('text_align&n=2', [1, 2]);

      solver.eq('_ROOT_BRANCH_', 'SECTION'); // root branch can only be 1 because section only has 1

      // these are meaningless since 'x2' is [0,1] and all the rhs have no zeroes
      solver.lte('x2', 'SECTION');
      solver.lte('x2', 'VERSE_INDEX');
      solver.lte('x2', 'ITEM_INDEX');
      solver.lte('x2', 'align');
      solver.lte('x2', 'text_align');
      solver.lte('x2', 'SECTION&n=1');
      solver.lte('x2', 'VERSE_INDEX&n=1');
      solver.lte('x2', 'ITEM_INDEX&n=1');
      solver.lte('x2', 'align&n=1');
      solver.lte('x2', 'text_align&n=1');
      solver.lte('x2', 'SECTION&n=2');
      solver.lte('x2', 'VERSE_INDEX&n=2');
      solver.lte('x2', 'ITEM_INDEX&n=2');
      solver.lte('x2', 'align&n=2');
      solver.lte('x2', 'text_align&n=2');

      solver.neq('ITEM_INDEX&n=1', 'ITEM_INDEX'); // the lhs is [2,2] and rhs is [1,2] so rhs must be [2,2]
      solver.neq('ITEM_INDEX&n=2', 'ITEM_INDEX'); // lhs is [3,3] and rhs [1,2] so this is a noop
      solver.neq('ITEM_INDEX&n=2', 'ITEM_INDEX&n=1'); // [2,2] and [3,3] so noop

      solver.solve({max: 10000});

      // only two conditions are relevant and cuts the space by 2x2, so we get 6912/4
      expect(countSolutions(solver)).to.eql(6912 / 4);
    });

    // there was a "sensible reason" why this test doesnt work but I forgot about it right now... :)
    it.skip('should resolve a simple sum with times case', function() {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [25, 25]);
      solver.addVar('MUL', [0, 100]);

      solver.mul('A', 'B', 'MUL');
      solver.lt('MUL', 'MAX');

      solver.solve({max: 10000, vars: ['A', 'B', 'MUL']});

      // There are 11x11=121 combinations (inc dupes)
      // There's a restriction that the product of
      // A and B must be lower than 25 so only a couple
      // of combinations are valid:
      // a*b<25
      // 0x0 0x1 0x2 0x3 0x4 0x5 0x6 0x7 0x8 0x9 0x10
      // 1x0 1x1 1x2 1x3 1x4 1x5 1x6 1x7 1x8 1x9 1x10
      // 2x0 2x1 2x2 2x3 2x4 2x5 2x6 2x7 2x8 2x9 2x10
      // 3x0 3x1 3x2 3x3 3x4 3x5 3x6 3x7 3x8 <| 3x9 3x10
      // 4x0 4x1 4x2 4x3 4x4 4x5 4x6 <| 4x7 4x8 4x9 4x10
      // 5x0 5x1 5x2 5x3 5x4 <| 5x5 5x6 5x7 5x8 5x9 5x10
      // 6x0 6x1 6x2 6x3 6x4 <| 6x5 6x6 6x7 6x8 6x9 6x10
      // 7x0 7x1 7x2 7x3 <| 7x4 7x5 7x6 7x7 7x8 7x9 7x10
      // 8x0 8x1 8x2 8x3 <| 8x4 8x5 8x6 8x7 8x8 8x9 8x10
      // 9x0 9x1 9x2 <| 9x3 9x4 9x5 9x6 9x7 9x8 9x9 9x10
      // 10x0 10x1 10x2 <| 10x3 10x4 10x5 10x6 10x7 10x8 10x9 10x10
      // Counting everything to the left of <| you
      // get 73 combos of A and B that result in A*B<25
      expect(countSolutions(solver)).to.eql(73);
    });

    it('should solve a simplified case from old PathBinarySolver tests', function() {
      let solver = new Solver({});

      solver.addVar('x2', [1, 1]);
      solver.addVar('x3', [0, 0]);
      solver.addVar('x4', [2, 2]);
      solver.addVar('x5', [4, 4]);
      solver.addVar('x6', [9, 9]);
      solver.addVar('x7', [5, 5]);
      solver.addVar('x8', [6, 6]);
      solver.addVar('x9', [8, 8]);
      solver.addVar('x10', [3, 3]);
      solver.addVar('x11', [7, 7]);
      solver.addVar('x12', [0, 1]); // -> 1
      solver.addVar('x13', [0, 1]); // -> 0
      solver.addVar('x14', [0, 1]); // -> 0
      solver.addVar('_ROOT_BRANCH_', [0, 1]); // -> 1
      solver.addVar('SECTION', [1, 1]);
      solver.addVar('VERSE_INDEX', [2, 2, 4, 4, 9, 9]); // -> 4
      solver.addVar('ITEM_INDEX', [1, 1]);
      solver.addVar('align', [1, 2]);
      solver.addVar('text_align', [1, 2]);
      solver.addVar('SECTION&n=1', [1, 1]);
      solver.addVar('VERSE_INDEX&n=1', [5, 6, 8, 8]); // -> 5 or 8
      solver.addVar('ITEM_INDEX&n=1', [2, 2]);
      solver.addVar('align&n=1', [1, 2]);
      solver.addVar('text_align&n=1', [1, 2]);
      solver.addVar('SECTION&n=2', [1, 1]);
      solver.addVar('VERSE_INDEX&n=2', [1, 1, 3, 3, 7, 7]); // -> 3 or 7
      solver.addVar('ITEM_INDEX&n=2', [3, 3]);
      solver.addVar('align&n=2', [1, 2]);
      solver.addVar('text_align&n=2', [1, 2]);

      solver.eq('_ROOT_BRANCH_', 'x2'); // root must be 1
      // these are meaningless
      solver.lte('x2', 'SECTION');
      solver.lte('x2', 'VERSE_INDEX');
      solver.lte('x2', 'ITEM_INDEX');
      solver.lte('x2', 'align');
      solver.lte('x2', 'text_align');
      solver.lte('x2', 'SECTION&n=1');
      solver.lte('x2', 'VERSE_INDEX&n=1');
      solver.lte('x2', 'ITEM_INDEX&n=1');
      solver.lte('x2', 'align&n=1');
      solver.lte('x2', 'text_align&n=1');
      solver.lte('x2', 'SECTION&n=2');
      solver.lte('x2', 'VERSE_INDEX&n=2');
      solver.lte('x2', 'ITEM_INDEX&n=2');
      solver.lte('x2', 'align&n=2');
      solver.lte('x2', 'text_align&n=2');
      // item_index is 1 so the others cannot be 1
      solver.neq('ITEM_INDEX&n=1', 'ITEM_INDEX'); // 2 (noop)
      solver.neq('ITEM_INDEX&n=2', 'ITEM_INDEX'); // 3 (noop)
      solver.neq('ITEM_INDEX&n=2', 'ITEM_INDEX&n=1'); // 2!=3 (noop)
      // constraints are enforced with an eq below. the first must be on, the second/third must be off.
      solver._cacheReified('eq', 'VERSE_INDEX', 'x5', 'x12');
      solver._cacheReified('eq', 'VERSE_INDEX&n=1', 'x8', 'x13');
      solver._cacheReified('eq', 'VERSE_INDEX&n=2', 'x2', 'x14');
      solver.eq('x12', 'x2'); // so vi must be 4 (it can be)
      solver.eq('x13', 'x3'); // so vi1 must not be 6 (so 5 or 8)
      solver.eq('x14', 'x3'); // so vi2 must not be 1 (so 3 or 7)

      solver.solve({
        max: 10000,
        vars: [
          '_ROOT_BRANCH_',
          'SECTION',
          'VERSE_INDEX',
          'ITEM_INDEX',
          'align',
          'text_align',
          'SECTION&n=1',
          'VERSE_INDEX&n=1',
          'ITEM_INDEX&n=1',
          'align&n=1',
          'text_align&n=1',
          'SECTION&n=2',
          'VERSE_INDEX&n=2',
          'ITEM_INDEX&n=2',
          'align&n=2',
          'text_align&n=2',
        ],
      });

      // 2×2×2×2×2×2×2×2=256
      expect(countSolutions(solver)).to.eql(256);
    });

    it('should solve 4 branch 2 level example (binary)', function() {

      /*
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
       */

      let branchVars = ['A', 'C', 'B', 'D'];
      // path vars
      let Avars = ['A1', 'A2', 'A3'];
      let Bvars = ['B1', 'B2', 'B3'];
      let Cvars = ['C1', 'C2', 'C3'];
      let Dvars = ['D1', 'D2', 'D3'];
      let pathVars = [].concat(Avars, Bvars, Cvars, Dvars);

      let solver = new Solver({defaultDomain: [0, 1]});
      solver.addVars(branchVars);
      solver.addVars(pathVars);

      // path to branch binding
      solver.sum(Avars, 'A');
      solver.sum(Bvars, 'B');
      solver.sum(Cvars, 'C');
      solver.sum(Dvars, 'D');

      // root branches must be on
      solver.eq('A', 1);
      solver.eq('C', 1);

      // child-parent binding
      solver.eq('B', 'A2');
      solver.eq('D', 'C2');

      // D & B counterpoint
      solver.addVar('BsyncD', [0, 1]);
      solver['==?']('B', 'D', 'BsyncD');
      solver['>='](solver['==?']('B1', 'D1'), 'BsyncD');
      solver['>='](solver['==?']('B2', 'D2'), 'BsyncD');
      solver['>='](solver['==?']('B3', 'D3'), 'BsyncD');

      solver.solve({
        distribute: 'fail_first',
        vars: pathVars,
      });

      expect(countSolutions(solver)).to.equal(19);
    });

    it('quick minus test', function() {
      let solver = new Solver();

      solver.decl('A', [1, 1]);
      solver.decl('B', [1, 1]);
      solver.decl('C', [0, 1]);

      solver.min('A', 'B', 'C');
      solver.solve();

      expect(solver.solutions).to.eql([{A: 1, B: 1, C: 0}]);
    });

    it('should solve a regression case', function() {

      let solver = new Solver();
      solver.decl('A', [0, 1]);
      solver.decl('B', [0, 1]);
      solver.decl('C', [0, 1]);

      // path to branch binding
      solver.sum(['A', 'B', 'C'], 1);

      solver.solve({});

      expect(solver.solutions).to.eql([
        {'3': 1, '4': 1, A: 0, B: 0, C: 1},
        {'3': 1, '4': 1, A: 0, B: 1, C: 0},
        {'3': 1, '4': 0, A: 1, B: 0, C: 0},
        // the bug would return an extra solution here and no other test would catch it
      ]);
    });
  });

  describe('reifiers', function() {

    it('should resolve a simple reified eq case', function() {
      let solver = new Solver({});

      solver.addVar('ONE', [1, 1]);
      solver.addVar('FOUR', [4, 4]);
      solver.addVar('LIST', [2, 2, 4, 4, 9, 9]); // becomes 4
      solver.addVar('IS_LIST_FOUR', [0, 1]); // becomes 1

      solver._cacheReified('eq', 'LIST', 'FOUR', 'IS_LIST_FOUR');
      solver.eq('IS_LIST_FOUR', 'ONE');

      solver.solve({max: 10000});

      // list can be one of three elements.
      // there is a bool var that checks whether list is resolved to 4
      // there is a constraint that requires the above bool to be 1
      // ergo; list must be 4 to satisfy all constraints
      // ergo; there is 1 possible solution
      expect(countSolutions(solver)).to.eql(1);
    });

    it('should resolve a simple reified !eq case', function() {
      let solver = new Solver({});

      solver.addVar('ZERO', [0, 0]);
      solver.addVar('FOUR', [4, 4]);
      solver.addVar('LIST', [2, 2, 4, 4, 9, 9]); // becomes 4
      solver.addVar('IS_LIST_FOUR', [0, 1]); // becomes 1

      solver._cacheReified('eq', 'LIST', 'FOUR', 'IS_LIST_FOUR');
      solver.eq('IS_LIST_FOUR', 'ZERO');

      solver.solve({max: 10000});

      // list can be one of three elements.
      // there is a bool var that checks whether list is resolved to 4
      // there is a constraint that requires the above bool to be 0
      // ergo; list must be 2 or 9 to satisfy all constraints
      // ergo; there are 2 possible solutions
      expect(countSolutions(solver)).to.eql(2);
    });

    it('should resolve a simple reified neq case', function() {
      let solver = new Solver({});

      solver.addVar('ONE', [1, 1]);
      solver.addVar('FOUR', [4, 4]);
      solver.addVar('LIST', [2, 2, 4, 4, 9, 9]); // becomes 2 or 9
      solver.addVar('IS_LIST_FOUR', [0, 1]); // becomes 1

      solver._cacheReified('neq', 'LIST', 'FOUR', 'IS_LIST_FOUR');
      solver.eq('IS_LIST_FOUR', 'ONE');

      solver.solve({max: 10000});

      // list can be one of three elements.
      // there is a bool var that checks whether list is resolved to 4
      // there is a constraint that requires the above bool to be 1
      // ergo; list must be 2 or 9 to satisfy all constraints
      // ergo; there are 2 possible solutions
      expect(countSolutions(solver)).to.eql(2);
    });

    it('should resolve a simple reified !neq case', function() {
      let solver = new Solver({});

      solver.addVar('ZERO', [0, 0]);
      solver.addVar('FOUR', [4, 4]);
      solver.addVar('LIST', [2, 2, 4, 4, 9, 9]); // becomes 4
      solver.addVar('IS_LIST_FOUR', [0, 1]); // becomes 0

      solver._cacheReified('neq', 'LIST', 'FOUR', 'IS_LIST_FOUR');
      solver.eq('IS_LIST_FOUR', 'ZERO');

      solver.solve({max: 10000});

      // list can be one of three elements.
      // there is a bool var that checks whether list is resolved to 4
      // there is a constraint that requires the above bool to be 0
      // ergo; list must be 4 to satisfy all constraints
      // ergo; there is 1 possible solution
      expect(countSolutions(solver)).to.eql(1);
    });

    it('should resolve a simple reified lt case', function() {
      let solver = new Solver({});

      solver.addVar('STATE', [1, 1]);
      solver.addVar('ONE_TWO_THREE', [1, 3]); // 1 2 or 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3 4 or 5
      solver.addVar('IS_LT', [0, 1]); // becomes 1

      solver._cacheReified('lt', 'ONE_TWO_THREE', 'THREE_FOUR_FIVE', 'IS_LT');
      solver.eq('IS_LT', 'STATE');

      solver.solve({max: 10000});

      // two lists, 123 and 345
      // reified checks whether 123<345 which is only the case when
      // the 3 is dropped from at least one side
      // IS_LT is required to have one outcome
      // 3 + 3 + 2 = 8  ->  1:3 1:4 1:5 2:3 2:4 2:5 3:4 3:5
      expect(countSolutions(solver)).to.eql(8);
    });

    it('should resolve a simple reified !lt case', function() {
      let solver = new Solver({});

      solver.addVar('STATE', [0, 0]);
      solver.addVar('ONE_TWO_THREE', [1, 3]); // 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3
      solver.addVar('IS_LT', [0, 1]); // 0

      solver._cacheReified('lt', 'ONE_TWO_THREE', 'THREE_FOUR_FIVE', 'IS_LT');
      solver.eq('IS_LT', 'STATE');

      solver.solve({max: 10000});

      // two lists, 123 and 345
      // reified checks whether 123<345 which is only the case when
      // the 3 is dropped from at least one side
      // IS_LT is required to have one outcome
      // since it must be 0, that is only when both lists are 3
      // ergo; one solution
      expect(countSolutions(solver)).to.eql(1);
    });

    it('should resolve a simple reified lte case', function() {
      let solver = new Solver({});

      solver.addVar('STATE', [1, 1]);
      solver.addVar('ONE_TWO_THREE_FOUR', [1, 4]); // 1 2 or 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3 4 or 5
      solver.addVar('IS_LTE', [0, 1]); // becomes 1

      solver._cacheReified('lte', 'ONE_TWO_THREE_FOUR', 'THREE_FOUR_FIVE', 'IS_LTE');
      solver.eq('IS_LTE', 'STATE');

      solver.solve({max: 10000});

      // two lists, 123 and 345
      // reified checks whether 1234<=345 which is only the case when
      // the 4 is dropped from at least one side
      // IS_LTE is required to have one outcome
      // 3 + 3 + 3 + 2 = 11  ->  1:3 1:4 1:5 2:3 2:4 2:5 3:3 3:4 3:5 4:4 4:5
      expect(countSolutions(solver)).to.eql(11);
    });

    it('should resolve a simple reified !lte case', function() {
      let solver = new Solver({});

      solver.addVar('STATE', [0, 0]);
      solver.addVar('ONE_TWO_THREE_FOUR', [1, 4]); // 4
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3
      solver.addVar('IS_LTE', [0, 1]); // 0

      solver._cacheReified('lte', 'ONE_TWO_THREE_FOUR', 'THREE_FOUR_FIVE', 'IS_LTE');
      solver.eq('IS_LTE', 'STATE');

      solver.solve({max: 10000});

      // two lists, 1234 and 345
      // reified checks whether 1234<=345 which is only the case when
      // the 4 is dropped from at least one side
      // IS_LTE is required to have one outcome
      // since it must be 0, that is only when left is 4 and right is 3
      // ergo; one solution
      expect(countSolutions(solver)).to.eql(1);
    });

    it('should resolve an even simpler reified !lte case', function() {
      let solver = new Solver({});

      solver.addVar('A', [4, 5]);
      solver.addVar('B', [4, 4]);
      solver.addVar('NO', [0, 0]);

      solver._cacheReified('lte', 'A', 'B', 'NO');

      solver.solve({max: 10000});

      // two lists, 1234 and 345
      // reified checks whether 1234<=345 which is only the case when
      // the 4 is dropped from at least one side
      // IS_LTE is required to have one outcome
      // since it must be 0, that is only when left is 4 and right is 3
      // ergo; one solution
      expect(countSolutions(solver)).to.eql(1);
    });

    it('should resolve a simple reified gt case', function() {
      let solver = new Solver({});

      solver.addVar('STATE', [1, 1]);
      solver.addVar('ONE_TWO_THREE', [1, 3]); // 1 2 or 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3 4 or 5
      solver.addVar('IS_GT', [0, 1]); // becomes 1

      solver._cacheReified('gt', 'THREE_FOUR_FIVE', 'ONE_TWO_THREE', 'IS_GT');
      solver.eq('IS_GT', 'STATE');

      solver.solve({max: 10000});

      // two lists, 123 and 345
      // reified checks whether 345>123 which is only the case when
      // the 3 is dropped from at least one side
      // IS_GT is required to have one outcome
      // 3 + 3 + 2 = 8  ->  3:1 4:1 5:1 3:2 4:2 5:2 3:1 3:2
      expect(countSolutions(solver)).to.eql(8);
    });

    it('should resolve a simple reified !gt case', function() {
      let solver = new Solver({});

      solver.addVar('STATE', [0, 0]);
      solver.addVar('ONE_TWO_THREE', [1, 3]); // 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3
      solver.addVar('IS_GT', [0, 1]); // 0

      solver._cacheReified('gt', 'THREE_FOUR_FIVE', 'ONE_TWO_THREE', 'IS_GT');
      solver.eq('IS_GT', 'STATE');

      solver.solve({max: 10000});

      // two lists, 123 and 345
      // reified checks whether 123<345 which is only the case when
      // the 3 is dropped from at least one side
      // IS_GT is required to have one outcome
      // since it must be 0, that is only when both lists are 3
      // ergo; one solution
      expect(countSolutions(solver)).to.eql(1);
    });

    it('should resolve a simple reified gte case', function() {
      let solver = new Solver({});

      solver.addVar('STATE', [1, 1]);
      solver.addVar('ONE_TWO_THREE_FOUR', [1, 4]); // 1 2 or 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3 4 or 5
      solver.addVar('IS_GTE', [0, 1]); // becomes 1

      solver._cacheReified('gte', 'THREE_FOUR_FIVE', 'ONE_TWO_THREE_FOUR', 'IS_GTE');
      solver.eq('IS_GTE', 'STATE');

      solver.solve({max: 10000});

      // two lists, 1234 and 345
      // reified checks whether 345>=1234 which is only the case when
      // left is not 3 or right is not 4
      // IS_GTE is required to have one outcome
      // 3 + 3 + 3 + 2 = 11  ->
      //     3:1 4:1 5:1
      //     3:2 4:2 5:2
      //     3:3 4:3 5:3
      //     4:4 5:4
      //     5:5
      expect(countSolutions(solver)).to.eql(11);
    });

    it('should resolve an already solved 5>=4 trivial gte case', function() {
      let solver = new Solver({});

      solver.decl('A', 5);
      solver.decl('B', 4);
      solver.decl('YES', 1);

      solver._cacheReified('gte', 'A', 'B', 'YES');

      solver.solve({max: 10000});

      // the input is already solved and there is only one solution
      expect(countSolutions(solver)).to.eql(1);
    });

    it('should resolve an already solved 4>=4 trivial gte case', function() {
      let solver = new Solver({});

      solver.decl('A', 4);
      solver.decl('B', 4);
      solver.decl('YES', 1);

      solver._cacheReified('gte', 'A', 'B', 'YES');

      solver.solve({max: 10000});

      // the input is already solved and there is only one solution
      expect(countSolutions(solver)).to.eql(1);
    });

    it('should resolve a simple reified !gte case', function() {
      let solver = new Solver({});

      solver.decl('STATE', 0);
      solver.addVar('ONE_TWO_THREE_FOUR', [1, 4]); // 4
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3
      solver.addVar('IS_GTE', [0, 1]); // 0

      solver._cacheReified('gte', 'THREE_FOUR_FIVE', 'ONE_TWO_THREE_FOUR', 'IS_GTE');
      solver.eq('IS_GTE', 'STATE');

      solver.solve({max: 10000});

      // two lists, 123 and 345
      // reified checks whether 1234<=345 which is only the case when
      // the 4 is dropped from at least one side
      // IS_LTE is required to have one outcome
      // since it must be 0, that is only when left is 3 and right is 4
      // ergo; one solution
      expect(countSolutions(solver)).to.eql(1);
    });

    it('should resolve a simple sum with lte case', function() {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [5, 5]);
      solver.addVar('SUM', [0, 100]);

      solver.sum(['A', 'B'], 'SUM');
      solver.lte('SUM', 'MAX');

      solver.solve({max: 10000});

      // a+b<=5
      // so that's the case for: 0+0, 0+1, 0+2, 0+3,
      // 0+4, 0+5, 1+0, 1+1, 1+2, 1+3, 1+4, 2+0, 2+1,
      // 2+2, 2+3, 3+0, 3+1, 3+2, 4+0, 4+1, and 5+0
      // ergo: 21 solutions
      expect(countSolutions(solver)).to.eql(21);
    });

    it('should resolve a simple sum with lt case', function() {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [5, 5]);
      solver.addVar('SUM', [0, 100]);

      solver.sum(['A', 'B'], 'SUM');
      solver.lt('SUM', 'MAX');

      solver.solve({max: 10000});

      // a+b<5
      // so that's the case for: 0+0, 0+1, 0+2,
      // 0+3, 0+4, 1+0, 1+1, 1+2, 1+3, 2+0, 2+1,
      // 2+2, 3+0, 3+1, and 4+0
      // ergo: 16 solutions
      expect(countSolutions(solver)).to.eql(15);
    });

    it('should resolve a simple sum with gt case', function() {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [5, 5]);
      solver.addVar('SUM', [0, 100]);

      solver.sum(['A', 'B'], 'SUM');
      solver.gt('SUM', 'MAX');

      solver.solve({max: 10000});

      // a+b>5
      // there are 11x11=121 cases. a+b<=5 is 21 cases
      // (see other test) so there must be 100 results.
      expect(countSolutions(solver)).to.eql(100);
    });

    it('should resolve a simple sum with gte case', function() {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [5, 5]);
      solver.addVar('SUM', [0, 100]);

      solver.sum(['A', 'B'], 'SUM');
      solver.gte('SUM', 'MAX');

      solver.solve({max: 10000});

      // a+b>=5
      // there are 11x11=121 cases. a+b<5 is 15 cases
      // (see other test) so there must be 106 results.
      expect(countSolutions(solver)).to.eql(106);
    });
  });

  describe('gss poc', function() {

    it('with everything in finitedomain', function() {

      /*

      // assuming
      // ::window[width] is 1200
      // ::window[height] is 800

      #box1 {
        width:== 100;
        height:== 100;
      }
      #box2 {
        width: == 100;
        height: == 100;
      }

      #box1[right] == :window[center-x] - 10;
      #box2[left] == :window[center-x] + 10;

      #box1[center-y] == #box2[center-y] == ::window[center-y];

      */

      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 10000)});
      solver.decl('VIEWPORT_WIDTH', 1200);
      solver.decl('VIEWPORT_HEIGHT', 800);
      solver.addVars([
        // box1
        '#box1[x]',
        '#box1[width]',
        '#box1[y]',
        '#box1[height]',
        // box2
        '#box2[x]',
        '#box2[width]',
        '#box2[y]',
        '#box2[height]',
        // middle of the viewport, to be computed later
        'VIEWPORT_MIDDLE_HEIGHT',
        'VIEWPORT_MIDDLE_WIDTH',
      ]);

      // simple constraints
      // #box1 { width:== 100; height:== 100; } #box2 { width: == 100; height: == 100; }
      solver.eq('#box1[width]', 100);
      solver.eq('#box1[height]', 100);
      solver.eq('#box2[width]', 100);
      solver.eq('#box2[height]', 100);
      // make sure boxes are within viewport

      solver.lt('#box1[x]', solver.minus('VIEWPORT_WIDTH', '#box1[width]'));
      solver.lt('#box1[y]', solver.minus('VIEWPORT_HEIGHT', '#box1[height]'));
      solver.lt('#box2[x]', solver.minus('VIEWPORT_WIDTH', '#box2[width]'));
      solver.lt('#box2[y]', solver.minus('VIEWPORT_HEIGHT', '#box2[height]'));

      // VIEWPORT_WIDTH / 2
      solver.div('VIEWPORT_WIDTH', 2, 'VIEWPORT_MIDDLE_WIDTH');

      // #box1[right] == :window[center-x] - 10;
      // so: #box1[x] + #box[width] + 10 == VIEWPORT_MIDDLE_WIDTH
      solver.eq(solver.plus(solver.plus('#box1[x]', '#box1[width]'), 10), 'VIEWPORT_MIDDLE_WIDTH');

      // similar for #box2[left] == :window[center-x] + 10;
      solver.eq(solver.min('#box2[x]', 10), 'VIEWPORT_MIDDLE_WIDTH');

      // #box1[center-y] == #box2[center-y] == ::window[center-y];
      // center-y = height/2 -> y=(height/2)-(box_height/2)
      solver.div('VIEWPORT_HEIGHT', 2, 'VIEWPORT_MIDDLE_HEIGHT');
      solver.minus('VIEWPORT_MIDDLE_HEIGHT', solver.div('#box1[height]', 2), '#box1[y]');
      solver.minus('VIEWPORT_MIDDLE_HEIGHT', solver.div('#box2[height]', 2), '#box2[y]');

      let solutions = solver.solve({max: 3});

      // viewport is 1200 x 800
      // boxes are 100x100
      // box1 is 10 left to center so box1.x = 1200/2-110=490
      // box2 is 10 right of center so box2.x = 1200/2+10=610
      // box1 and box2 are vertically centered, same height so same y: (800/2)-(100/2)=350

      expect(stripAnonVarsFromArrays(solutions)).to.eql([{
        '#box1[x]': 490, // 490+100+10=600=1200/2
        '#box1[width]': 100,
        '#box1[y]': 350,
        '#box1[height]': 100,
        '#box2[x]': 610,
        '#box2[width]': 100,
        '#box2[y]': 350,
        '#box2[height]': 100,

        'VIEWPORT_WIDTH': 1200,
        'VIEWPORT_HEIGHT': 800,
        'VIEWPORT_MIDDLE_WIDTH': 600,
        'VIEWPORT_MIDDLE_HEIGHT': 400,
      }]);

      expect(countSolutions(solver)).to.equal(1);
    });

    it('with viewport constants hardcoded', function() {

      /*

      // assuming
      // ::window[width] is 1200
      // ::window[height] is 800

      #box1 {
        width:== 100;
        height:== 100;
      }
      #box2 {
        width: == 100;
        height: == 100;
      }

      #box1[right] == :window[center-x] - 10;
      #box2[left] == :window[center-x] + 10;

      #box1[center-y] == #box2[center-y] == ::window[center-y];

      */

      let FLOOR = Math.floor;
      let VIEWPORT_WIDTH = 1200;
      let VIEWPORT_HEIGHT = 800;

      let solver = new Solver({defaultDomain: fixt_arrdom_range(0, 10000)});
      solver.addVars([
        // box1
        '#box1[x]',
        '#box1[width]',
        '#box1[y]',
        '#box1[height]',
        // box2
        '#box2[x]',
        '#box2[width]',
        '#box2[y]',
        '#box2[height]',
      ]);

      // simple constraints
      // #box1 { width:== 100; height:== 100; } #box2 { width: == 100; height: == 100; }
      solver.eq('#box1[width]', 100);
      solver.eq('#box1[height]', 100);
      solver.eq('#box2[width]', 100);
      solver.eq('#box2[height]', 100);
      // make sure boxes are within viewport

      solver.lt('#box1[x]', solver.minus(VIEWPORT_WIDTH, '#box1[width]'));
      solver.lt('#box1[y]', solver.minus(VIEWPORT_HEIGHT, '#box1[height]'));
      solver.lt('#box2[x]', solver.minus(VIEWPORT_WIDTH, '#box2[width]'));
      solver.lt('#box2[y]', solver.minus(VIEWPORT_HEIGHT, '#box2[height]'));

      // VIEWPORT_WIDTH / 2
      let VIEWPORT_MIDDLE_WIDTH = FLOOR(VIEWPORT_WIDTH / 2);

      // #box1[right] == :window[center-x] - 10;
      // so: #box1[x] + #box[width] + 10 == VIEWPORT_MIDDLE_WIDTH
      solver.eq(solver.plus('#box1[x]', '#box1[width]'), VIEWPORT_MIDDLE_WIDTH - 10);

      // similar for #box2[left] == :window[center-x] + 10;
      solver.eq(VIEWPORT_MIDDLE_WIDTH + 10, '#box2[x]');

      // #box1[center-y] == #box2[center-y] == ::window[center-y];
      // center-y = height/2 -> y=(height/2)-(box_height/2)
      let VIEWPORT_MIDDLE_HEIGHT = FLOOR(VIEWPORT_HEIGHT / 2);
      solver.minus(VIEWPORT_MIDDLE_HEIGHT, solver.div('#box1[height]', 2), '#box1[y]');
      solver.minus(VIEWPORT_MIDDLE_HEIGHT, solver.div('#box2[height]', 2), '#box2[y]');

      let solutions = solver.solve({max: 3});

      // viewport is 1200 x 800
      // boxes are 100x100
      // box1 is 10 left to center so box1.x = 1200/2-110=490
      // box2 is 10 right of center so box2.x = 1200/2+10=610
      // box1 and box2 are vertically centered, same height so same y: (800/2)-(100/2)=350

      expect(stripAnonVarsFromArrays(solutions)).to.eql([{
        '#box1[x]': 490, // 490+100+10=600=1200/2
        '#box1[width]': 100,
        '#box1[y]': 350,
        '#box1[height]': 100,
        '#box2[x]': 610,
        '#box2[width]': 100,
        '#box2[y]': 350,
        '#box2[height]': 100,
      }]);

      expect(countSolutions(solver)).to.equal(1);
    });
  });

  describe('solver.setOption', function() {

    it('should exist', function() {
      let solver = new Solver();
      expect(solver.setOption).to.be.a('function');
    });
  });

  describe('continue solved space', function() {

    it('should solve this in one go', function() {
      let solver = new Solver({});

      solver.addVar('A', fixt_arrdom_range(2, 5, true));
      solver.addVar('B', [2, 2, 4, 5]); // TODO: restore to specDomainCreateRanges([2, 2], [4, 5]));
      solver.addVar('C', fixt_arrdom_range(1, 5, true));
      solver['<']('A', 'B');

      // in the next test we'll add this constraint afterwards
      solver['<']('C', 'A');

      // C could be either 1 or 2 to pass all the constraints
      solver.solve({
        vars: ['A', 'B', 'C'],
        max: 1,
      });
      expect(countSolutions(solver), 'solve count 1').to.eql(1);
      expect(solver.solutions[0].C < solver.solutions[0].B).to.equal(true);
    });

    it('should be able to continue a solution with extra vars', function() {
      let solver = new Solver({});

      solver.addVar('A', fixt_arrdom_range(2, 5, true));
      solver.addVar('B', [2, 2, 4, 5]); // TODO: restore to specDomainCreateRanges([2, 2], [4, 5]));
      solver.addVar('C', fixt_arrdom_range(1, 5, true));
      solver['<']('A', 'B');

      // should find a solution (there are three or four or whatever)
      solver.solve({
        vars: ['A', 'B'],
        max: 1,
      });
      // should not solve C yet because only A and B
      // were targeted so 1x1x2=4 solutions
      expect(countSolutions(solver), 'solve count 1').to.eql(2);
      expect(solver.solutions).to.eql([{A: 2, B: 4, C: [1, 5]}]);

      let solver2 = solver.branch_from_current_solution();
      // add a new constraint to the space and solve it
      solver2['<']('C', 'A');

      solver2.solve({
        vars: ['A', 'B', 'C'],
        max: 1,
        test: 1,
      });

      // now C is constrained as well so all vars have one possible value
      expect(countSolutions(solver2), 'solve count 2').to.eql(1);
      expect(solver2.solutions[0].C < solver2.solutions[0].B).to.equal(true);
      expect(solver2.solutions).to.eql([{A: 2, B: 4, C: 1}]);
    });
  });
});
