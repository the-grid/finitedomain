import expect from '../fixtures/mocha_proxy.fixt';
import {
  fixt_arrdom_nums,
  fixt_arrdom_range,
  fixt_arrdom_ranges,
  stripAnonVarsFromArrays,
} from '../fixtures/domain.fixt';
import {
  SUB,
  SUP,
} from '../../src/helpers';
import {
  domain__debug,
} from '../../src/domain';
import Solver from '../../src/solver';

describe('src/constraint.spec', function() {

  describe('solver integration', function() {

    it('should work without constraints (FIX THIS ONE FIRST)', function() {
      // if this test fails the problem is _probably_ unrelated to constraints... :)
      let solver = new Solver();
      solver.decl('A', 100);
      solver.decl('B', 100);
      let solution = solver.solve();

      expect(solution).to.eql([{A: 100, B: 100}]);
    });

    describe('eq', function() {

      it('should work with a simple solved vars', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 100);
        solver.eq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}]);
      });

      it('should work with a simple solved and unsolved vars', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', fixt_arrdom_range(100, 101));
        solver.eq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}]);
      });

      it('should work with a simple unsolved vars that do not reject', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 101));
        solver.decl('B', fixt_arrdom_range(100, 101));
        solver.eq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}, {A: 101, B: 101}]);
      });

      it('should work with a simple unsolved vars that reduce but do not reject', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 101));
        solver.decl('B', fixt_arrdom_range(100, 102));
        solver.eq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}, {A: 101, B: 101}]);
      });

      it('should work with a simple unsolved vars that reject', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 101));
        solver.decl('B', fixt_arrdom_range(200, 201));
        solver.eq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      describe('pre-computable', function() {

        function preEq(desc, A, B, out) {
          it(desc, function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.eq('A', 'B');
            let solution = solver.solve({});

            expect(solution).to.eql(out);
            expect(solver.config.allConstraints.length, 'constraint count').to.eql(0);
          });
        }

        preEq('should not create a constraint if A is solved as number', 101, fixt_arrdom_range(100, 102), [{A: 101, B: 101}]);
        preEq('should not create a constraint if A is solved as array', fixt_arrdom_range(101, 101), fixt_arrdom_range(100, 102), [{A: 101, B: 101}]);
        preEq('should not create a constraint if B is solved as number', fixt_arrdom_range(100, 102), 101, [{A: 101, B: 101}]);
        preEq('should not create a constraint if B is solved as array', fixt_arrdom_range(100, 102), fixt_arrdom_range(101, 101), [{A: 101, B: 101}]);
        preEq('should not create a constraint if A and B solved as number and reject', 100, 99, []);
        preEq('should not create a constraint if A and B solved as number and pass', 101, 101, [{A: 101, B: 101}]);
        preEq('should not create a constraint if A and B solved as array and reject', fixt_arrdom_range(100, 100), fixt_arrdom_range(99, 99), []);
        preEq('should not create a constraint if A and B solved as array and pass', fixt_arrdom_range(101, 101), fixt_arrdom_range(101, 101), [{A: 101, B: 101}]);
      });

      describe('brute force bool table', function() {

        function test(A, B, out) {
          it('test: A=[' + A + '] B=[' + B + '] out=' + JSON.stringify(out).replace(/"/g, ''), function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.eq('A', 'B');
            solver.solve({max: 5}); // only 4 possible outcomes; 00 01 10 11 or none

            expect(solver.solutions).to.eql(out);
          });
        }

        test([0, 0], [0, 0], [{A: 0, B: 0}]);
        test([0, 1], [0, 0], [{A: 0, B: 0}]); // doe dit voor alle propagators. en zoek uit waarom deze niet werkt.
        test([1, 1], [0, 0], []);
        test([0, 0], [0, 1], [{A: 0, B: 0}]);
        test([0, 1], [0, 1], [{A: 0, B: 0}, {A: 1, B: 1}]);
        test([1, 1], [0, 1], [{A: 1, B: 1}]);
        test([0, 0], [1, 1], []);
        test([0, 1], [1, 1], [{A: 1, B: 1}]);
        test([1, 1], [1, 1], [{A: 1, B: 1}]);
      });
    });

    describe('neq', function() {

      it('should work with a simple solved vars', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 100);
        solver.neq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      it('should work with a simple solved and unsolved vars', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', fixt_arrdom_range(100, 101));
        solver.neq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}]);
      });

      it('should work with a simple unsolved vars', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 101));
        solver.decl('B', fixt_arrdom_range(100, 101));
        solver.neq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}, {A: 101, B: 100}]);
      });

      describe('pre-computable', function() {

        function preNeq(desc, A, B, out) {
          it(desc, function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.neq('A', 'B');
            let solution = solver.solve({});

            expect(solution).to.eql(out);
            expect(solver.config.allConstraints.length, 'constraint count').to.eql(0);
          });
        }

        preNeq('should not create a constraint if A is solved as number', 101, fixt_arrdom_range(100, 102), [{A: 101, B: 100}, {A: 101, B: 102}]);
        preNeq('should not create a constraint if A is solved as array', fixt_arrdom_range(101, 101), fixt_arrdom_range(100, 102), [{A: 101, B: 100}, {A: 101, B: 102}]);
        preNeq('should not create a constraint if B is solved as number', fixt_arrdom_range(100, 102), 101, [{A: 100, B: 101}, {A: 102, B: 101}]);
        preNeq('should not create a constraint if B is solved as array', fixt_arrdom_range(100, 102), fixt_arrdom_range(101, 101), [{A: 100, B: 101}, {A: 102, B: 101}]);
        preNeq('should not create a constraint if A and B solved as number and reject', 101, 101, []);
        preNeq('should not create a constraint if A and B solved as number and pass', 100, 99, [{A: 100, B: 99}]);
        preNeq('should not create a constraint if A and B solved as array and reject', fixt_arrdom_range(101, 101), fixt_arrdom_range(101, 101), []);
        preNeq('should not create a constraint if A and B solved as array and pass', fixt_arrdom_range(100, 100), fixt_arrdom_range(99, 99), [{A: 100, B: 99}]);
      });

      describe('brute force bool table', function() {

        function test(A, B, out) {
          it('test: A=[' + A + '] B=[' + B + '] out=' + JSON.stringify(out).replace(/"/g, ''), function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.neq('A', 'B');
            solver.solve({max: 5}); // only 4 possible outcomes; 00 01 10 11 or none

            expect(solver.solutions).to.eql(out);
          });
        }

        test([0, 0], [0, 0], []);
        test([0, 1], [0, 0], [{A: 1, B: 0}]);
        test([1, 1], [0, 0], [{A: 1, B: 0}]);
        test([0, 0], [0, 1], [{A: 0, B: 1}]);
        test([0, 1], [0, 1], [{A: 0, B: 1}, {A: 1, B: 0}]);
        test([1, 1], [0, 1], [{A: 1, B: 0}]);
        test([0, 0], [1, 1], [{A: 0, B: 1}]);
        test([0, 1], [1, 1], [{A: 0, B: 1}]);
        test([1, 1], [1, 1], []);
      });
    });

    describe('lt', function() {

      it('should work when A < B', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 101);
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}]);
      });

      it('should work when A <= B', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', fixt_arrdom_range(100, 101));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}]);
      });

      it('should work when A >= B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 101));
        solver.decl('B', fixt_arrdom_range(100, 100));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      it('should work when A <= B <= A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 102));
        solver.decl('B', fixt_arrdom_range(101, 101));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}]);
      });

      it('should work when B <= A <= B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(101, 101));
        solver.decl('B', fixt_arrdom_range(100, 102));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 102}]);
      });

      it('should work A > B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(101, 101));
        solver.decl('B', fixt_arrdom_range(100, 100));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      describe('pre-computable', function() {

        function preLt(desc, A, B, out) {
          it(desc, function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.lt('A', 'B');
            let solution = solver.solve({});

            expect(solution).to.eql(out);
            expect(solver.config.allConstraints.length, 'constraint count').to.eql(0);
          });
        }

        preLt('should not create a constraint if A is solved as number', 101, fixt_arrdom_range(100, 102), [{A: 101, B: 102}]);
        preLt('should not create a constraint if A is solved as array', fixt_arrdom_range(101, 101), fixt_arrdom_range(100, 102), [{A: 101, B: 102}]);
        preLt('should not create a constraint if B is solved as number', fixt_arrdom_range(100, 102), 101, [{A: 100, B: 101}]);
        preLt('should not create a constraint if B is solved as array', fixt_arrdom_range(100, 102), fixt_arrdom_range(101, 101), [{A: 100, B: 101}]);
        preLt('should not create a constraint if A and B solved as number and reject', 100, 99, []);
        preLt('should not create a constraint if A and B solved as number and pass', 100, 101, [{A: 100, B: 101}]);
        preLt('should not create a constraint if A and B solved as array and reject', fixt_arrdom_range(100, 100), fixt_arrdom_range(99, 99), []);
        preLt('should not create a constraint if A and B solved as array and pass', fixt_arrdom_range(100, 100), fixt_arrdom_range(101, 101), [{A: 100, B: 101}]);
      });

      describe('brute force bool table', function() {

        function test(A, B, out) {
          it('test: A=[' + A + '] B=[' + B + '] out=' + JSON.stringify(out).replace(/"/g, ''), function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.lt('A', 'B');
            solver.solve({max: 5}); // only 4 possible outcomes; 00 01 10 11 or none

            expect(solver.solutions).to.eql(out);
          });
        }

        test([0, 0], [0, 0], []);
        test([0, 1], [0, 0], []);
        test([1, 1], [0, 0], []);
        test([0, 0], [0, 1], [{A: 0, B: 1}]);
        test([0, 1], [0, 1], [{A: 0, B: 1}]);
        test([1, 1], [0, 1], []);
        test([0, 0], [1, 1], [{A: 0, B: 1}]);
        test([0, 1], [1, 1], [{A: 0, B: 1}]);
        test([1, 1], [1, 1], []);
      });
    });

    describe('lte', function() {

      it('should work when A < B', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 101);
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}]);
      });

      it('should work when A <= B', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', fixt_arrdom_range(100, 101));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}, {A: 100, B: 101}]);
      });

      it('should work when A >= B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 101));
        solver.decl('B', fixt_arrdom_range(100, 100));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}]);
      });

      it('should work when A <= B <= A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 102));
        solver.decl('B', fixt_arrdom_range(101, 101));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}, {A: 101, B: 101}]);
      });

      it('should work when B <= A <= B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(101, 101));
        solver.decl('B', fixt_arrdom_range(100, 102));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 101}, {A: 101, B: 102}]);
      });

      it('should work A > B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(101, 101));
        solver.decl('B', fixt_arrdom_range(100, 100));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      describe('pre-computable', function() {

        function preLte(desc, A, B, out) {
          it(desc, function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.lte('A', 'B');
            let solution = solver.solve({});

            expect(solution).to.eql(out);
            expect(solver.config.allConstraints.length, 'constraint count').to.eql(0);
          });
        }

        preLte('should not create a constraint if A is solved as number', 101, fixt_arrdom_range(100, 102), [{A: 101, B: 101}, {A: 101, B: 102}]);
        preLte('should not create a constraint if A is solved as array', fixt_arrdom_range(101, 101), fixt_arrdom_range(100, 102), [{A: 101, B: 101}, {A: 101, B: 102}]);
        preLte('should not create a constraint if B is solved as number', fixt_arrdom_range(100, 102), 101, [{A: 100, B: 101}, {A: 101, B: 101}]);
        preLte('should not create a constraint if B is solved as array', fixt_arrdom_range(100, 102), fixt_arrdom_range(101, 101), [{A: 100, B: 101}, {A: 101, B: 101}]);
        preLte('should not create a constraint if A and B solved as number and reject', 100, 99, []);
        preLte('should not create a constraint if A and B solved as number and pass', 100, 100, [{A: 100, B: 100}]);
        preLte('should not create a constraint if A and B solved as array and reject', fixt_arrdom_range(100, 100), fixt_arrdom_range(99, 99), []);
        preLte('should not create a constraint if A and B solved as array and pass', fixt_arrdom_range(100, 100), fixt_arrdom_range(100, 100), [{A: 100, B: 100}]);
      });

      describe('brute force bool table', function() {

        function test(A, B, out) {
          it('test: A=[' + A + '] B=[' + B + '] out=' + JSON.stringify(out).replace(/"/g, ''), function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.lte('A', 'B');
            solver.solve({max: 5}); // only 4 possible outcomes; 00 01 10 11 or none

            expect(solver.solutions).to.eql(out);
          });
        }

        test([0, 0], [0, 0], [{A: 0, B: 0}]);
        test([0, 1], [0, 0], [{A: 0, B: 0}]);
        test([1, 1], [0, 0], []);
        test([0, 0], [0, 1], [{A: 0, B: 0}, {A: 0, B: 1}]);
        test([0, 1], [0, 1], [{A: 0, B: 0}, {A: 0, B: 1}, {A: 1, B: 1}]);
        test([1, 1], [0, 1], [{A: 1, B: 1}]);
        test([0, 0], [1, 1], [{A: 0, B: 1}]);
        test([0, 1], [1, 1], [{A: 0, B: 1}, {A: 1, B: 1}]);
        test([1, 1], [1, 1], [{A: 1, B: 1}]);
      });
    });

    describe('gt', function() {

      it('should work when A < B', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 101);
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      it('should work when A <= B', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', fixt_arrdom_range(100, 101));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      it('should work when A >= B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 101));
        solver.decl('B', fixt_arrdom_range(100, 100));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}]);
      });

      it('should work when A <= B <= A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 102));
        solver.decl('B', fixt_arrdom_range(101, 101));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 102, B: 101}]);
      });

      it('should work when B <= A <= B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(101, 101));
        solver.decl('B', fixt_arrdom_range(100, 102));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}]);
      });

      it('should work A > B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(101, 101));
        solver.decl('B', fixt_arrdom_range(100, 100));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}]);
      });

      describe('pre-computable', function() {

        function preGt(desc, A, B, out) {
          it(desc, function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.gt('A', 'B');
            let solution = solver.solve({});

            expect(solution).to.eql(out);
            expect(solver.config.allConstraints.length, 'constraint count').to.eql(0);
          });
        }

        preGt('should not create a constraint if A is solved as number', 101, fixt_arrdom_range(100, 102), [{A: 101, B: 100}]);
        preGt('should not create a constraint if A is solved as array', fixt_arrdom_range(101, 101), fixt_arrdom_range(100, 102), [{A: 101, B: 100}]);
        preGt('should not create a constraint if B is solved as number', fixt_arrdom_range(100, 102), 101, [{A: 102, B: 101}]);
        preGt('should not create a constraint if B is solved as array', fixt_arrdom_range(100, 102), fixt_arrdom_range(101, 101), [{A: 102, B: 101}]);
        preGt('should not create a constraint if A and B solved as number and reject', 99, 100, []);
        preGt('should not create a constraint if A and B solved as number and pass', 101, 100, [{A: 101, B: 100}]);
        preGt('should not create a constraint if A and B solved as array and reject', fixt_arrdom_range(99, 99), fixt_arrdom_range(100, 100), []);
        preGt('should not create a constraint if A and B solved as array and pass', fixt_arrdom_range(101, 101), fixt_arrdom_range(100, 100), [{A: 101, B: 100}]);
      });

      describe('brute force bool table', function() {

        function test(A, B, out) {
          it('test: A=[' + A + '] B=[' + B + '] out=' + JSON.stringify(out).replace(/"/g, ''), function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.gt('A', 'B');
            solver.solve({max: 5}); // only 4 possible outcomes; 00 01 10 11 or none

            expect(solver.solutions).to.eql(out);
          });
        }

        test([0, 0], [0, 0], []);
        test([0, 1], [0, 0], [{A: 1, B: 0}]);
        test([1, 1], [0, 0], [{A: 1, B: 0}]);
        test([0, 0], [0, 1], []);
        test([0, 1], [0, 1], [{A: 1, B: 0}]);
        test([1, 1], [0, 1], [{A: 1, B: 0}]);
        test([0, 0], [1, 1], []);
        test([0, 1], [1, 1], []);
        test([1, 1], [1, 1], []);
      });
    });

    describe('gte', function() {

      it('should work when A < B', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 101);
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      it('should work when A <= B', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', fixt_arrdom_range(100, 101));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}]);
      });

      it('should work when A >= B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 101));
        solver.decl('B', fixt_arrdom_range(100, 100));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}, {A: 101, B: 100}]);
      });

      it('should work when A <= B <= A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 102));
        solver.decl('B', fixt_arrdom_range(101, 101));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 101}, {A: 102, B: 101}]);
      });

      it('should work when B <= A <= B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(101, 101));
        solver.decl('B', fixt_arrdom_range(100, 102));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}, {A: 101, B: 101}]);
      });

      it('should work A > B', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(101, 101));
        solver.decl('B', fixt_arrdom_range(100, 100));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}]);
      });

      describe('pre-computable', function() {

        function preGte(desc, A, B, out) {
          it(desc, function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.gte('A', 'B');
            let solution = solver.solve({});

            expect(solution).to.eql(out);
            expect(solver.config.allConstraints.length, 'constraint count').to.eql(0);
          });
        }

        preGte('should not create a constraint if A is solved as number', 101, fixt_arrdom_range(100, 102), [{A: 101, B: 100}, {A: 101, B: 101}]);
        preGte('should not create a constraint if A is solved as array', fixt_arrdom_range(101, 101), fixt_arrdom_range(100, 102), [{A: 101, B: 100}, {A: 101, B: 101}]);
        preGte('should not create a constraint if B is solved as number', fixt_arrdom_range(100, 102), 101, [{A: 101, B: 101}, {A: 102, B: 101}]);
        preGte('should not create a constraint if B is solved as array', fixt_arrdom_range(100, 102), fixt_arrdom_range(101, 101), [{A: 101, B: 101}, {A: 102, B: 101}]);
        preGte('should not create a constraint if A and B solved as number and reject', 99, 100, []);
        preGte('should not create a constraint if A and B solved as number and pass', 101, 100, [{A: 101, B: 100}]);
        preGte('should not create a constraint if A and B solved as array and reject', fixt_arrdom_range(99, 99), fixt_arrdom_range(100, 100), []);
        preGte('should not create a constraint if A and B solved as array and pass', fixt_arrdom_range(101, 101), fixt_arrdom_range(100, 100), [{A: 101, B: 100}]);
      });

      describe('brute force bool table', function() {

        function test(A, B, out) {
          it('test: A=[' + A + '] B=[' + B + '] out=' + JSON.stringify(out).replace(/"/g, ''), function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            solver.gte('A', 'B');
            solver.solve({max: 5}); // only 4 possible outcomes; 00 01 10 11 or none

            expect(solver.solutions).to.eql(out);
          });
        }

        test([0, 0], [0, 0], [{A: 0, B: 0}]);
        test([0, 1], [0, 0], [{A: 0, B: 0}, {A: 1, B: 0}]);
        test([1, 1], [0, 0], [{A: 1, B: 0}]);
        test([0, 0], [0, 1], [{A: 0, B: 0}]);
        test([0, 1], [0, 1], [{A: 0, B: 0}, {A: 1, B: 0}, {A: 1, B: 1}]);
        test([1, 1], [0, 1], [{A: 1, B: 0}, {A: 1, B: 1}]);
        test([0, 0], [1, 1], []);
        test([0, 1], [1, 1], [{A: 1, B: 1}]);
        test([1, 1], [1, 1], [{A: 1, B: 1}]);
      });
    });

    describe('reifier', function() {

      it('should find two solutions with a constant left', function() {
        let solver = new Solver();
        solver.decl('A', 0);
        solver.decl('B', [0, 1]);
        solver.decl('C', [0, 1]);
        solver.isLt('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 1}]);
      });

      it('should find two solutions with a constant right', function() {
        let solver = new Solver();
        solver.decl('A', [0, 1]);
        solver.decl('B', 0);
        solver.decl('C', [0, 1]);
        solver.isLt('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 0}]);
      });

      describe('exhaustive bool tables to check optimizations in propagator_addReified', function() {

        describe('eq', function() {

          function test(domain1, domain2, domain3, out, desc) {
            it('should solve despite optimizations. ' + [domain__debug(domain1), '==', domain__debug(domain2), '->', domain__debug(domain3)] + ' solves to: ' + (JSON.stringify(out).replace(/"/g, '')) + (desc ? '; ' + desc : ''), function() {
              let solver = new Solver();
              let A = solver.decl('A', domain1);
              let B = solver.decl('B', domain2);
              let C = solver.decl('C', domain3);
              solver.isEq(A, B, C);

              solver.solve({vars: ['A', 'B', 'C']});
              expect(solver.solutions).to.eql(out);
            });
          }

          [
            {A: [0, 0], B: [0, 0], C: [0, 0], out: []},
            {A: [0, 0], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 1}]},
            {A: [0, 0], B: [0, 0], C: [1, 1], out: [{A: 0, B: 0, C: 1}]},
            {A: [0, 0], B: [0, 1], C: [0, 0], out: [{A: 0, B: 1, C: 0}]},
            {A: [0, 0], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 1}, {A: 0, B: 1, C: 0}]},
            {A: [0, 0], B: [0, 1], C: [1, 1], out: [{A: 0, B: 0, C: 1}]},
            {A: [0, 0], B: [1, 1], C: [0, 0], out: [{A: 0, B: 1, C: 0}]},
            {A: [0, 0], B: [1, 1], C: [0, 1], out: [{A: 0, B: 1, C: 0}]},
            {A: [0, 0], B: [1, 1], C: [1, 1], out: []},
            {A: [0, 1], B: [0, 0], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
            {A: [0, 1], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 1}, {A: 1, B: 0, C: 0}]},
            {A: [0, 1], B: [0, 0], C: [1, 1], out: [{A: 0, B: 0, C: 1}]},
            {A: [0, 1], B: [0, 1], C: [0, 0], out: [{A: 0, B: 1, C: 0}, {A: 1, B: 0, C: 0}]},
            {A: [0, 1], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 1}, {A: 0, B: 1, C: 0}, {A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 1}]},
            {A: [0, 1], B: [0, 1], C: [1, 1], out: [{A: 0, B: 0, C: 1}, {A: 1, B: 1, C: 1}]},
            {A: [0, 1], B: [1, 1], C: [0, 0], out: [{A: 0, B: 1, C: 0}]},
            {A: [0, 1], B: [1, 1], C: [0, 1], out: [{A: 0, B: 1, C: 0}, {A: 1, B: 1, C: 1}]},
            {A: [0, 1], B: [1, 1], C: [1, 1], out: [{A: 1, B: 1, C: 1}]},
            {A: [1, 1], B: [0, 0], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
            {A: [1, 1], B: [0, 0], C: [0, 1], out: [{A: 1, B: 0, C: 0}]},
            {A: [1, 1], B: [0, 0], C: [1, 1], out: []},
            {A: [1, 1], B: [0, 1], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
            {A: [1, 1], B: [0, 1], C: [0, 1], out: [{A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 1}]},
            {A: [1, 1], B: [0, 1], C: [1, 1], out: [{A: 1, B: 1, C: 1}]},
            {A: [1, 1], B: [1, 1], C: [0, 0], out: []},
            {A: [1, 1], B: [1, 1], C: [0, 1], out: [{A: 1, B: 1, C: 1}]},
            {A: [1, 1], B: [1, 1], C: [1, 1], out: [{A: 1, B: 1, C: 1}]},
          ].forEach(testCase => test(testCase.A, testCase.B, testCase.C, testCase.out));
        });

        describe('neq', function() {

          function test(domain1, domain2, domain3, out, desc) {
            it('should solve despite optimizations. ' + [domain__debug(domain1), '!=', domain__debug(domain2), '->', domain__debug(domain3)] + ' solves to: ' + (JSON.stringify(out).replace(/"/g, '')) + (desc ? '; ' + desc : ''), function() {
              let solver = new Solver();
              let A = solver.decl('A', domain1);
              let B = solver.decl('B', domain2);
              let C = solver.decl('C', domain3);
              solver.isNeq(A, B, C);

              solver.solve({vars: ['A', 'B', 'C']});
              expect(solver.solutions).to.eql(out);
            });
          }

          [
            {A: [0, 0], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
            {A: [0, 0], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 0}]},
            {A: [0, 0], B: [0, 0], C: [1, 1], out: []},
            {A: [0, 0], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
            {A: [0, 0], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 1}]},
            {A: [0, 0], B: [0, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [0, 0], B: [1, 1], C: [0, 0], out: []},
            {A: [0, 0], B: [1, 1], C: [0, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [0, 0], B: [1, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [0, 1], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
            {A: [0, 1], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 1}]},
            {A: [0, 1], B: [0, 0], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
            {A: [0, 1], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 1, C: 0}]},
            {A: [0, 1], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 1}, {A: 1, B: 0, C: 1}, {A: 1, B: 1, C: 0}]},
            {A: [0, 1], B: [0, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}, {A: 1, B: 0, C: 1}]},
            {A: [0, 1], B: [1, 1], C: [0, 0], out: [{A: 1, B: 1, C: 0}]},
            {A: [0, 1], B: [1, 1], C: [0, 1], out: [{A: 0, B: 1, C: 1}, {A: 1, B: 1, C: 0}]},
            {A: [0, 1], B: [1, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [1, 1], B: [0, 0], C: [0, 0], out: []},
            {A: [1, 1], B: [0, 0], C: [0, 1], out: [{A: 1, B: 0, C: 1}]},
            {A: [1, 1], B: [0, 0], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
            {A: [1, 1], B: [0, 1], C: [0, 0], out: [{A: 1, B: 1, C: 0}]},
            {A: [1, 1], B: [0, 1], C: [0, 1], out: [{A: 1, B: 0, C: 1}, {A: 1, B: 1, C: 0}]},
            {A: [1, 1], B: [0, 1], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
            {A: [1, 1], B: [1, 1], C: [0, 0], out: [{A: 1, B: 1, C: 0}]},
            {A: [1, 1], B: [1, 1], C: [0, 1], out: [{A: 1, B: 1, C: 0}]},
            {A: [1, 1], B: [1, 1], C: [1, 1], out: []},
          ].forEach(testCase => test(testCase.A, testCase.B, testCase.C, testCase.out));
        });

        describe('lt-', function() {

          function test(domain1, domain2, domain3, out, desc) {
            it('should solve despite optimizations. ' + [domain__debug(domain1), '<', domain__debug(domain2), '->', domain__debug(domain3)] + ' solves to: ' + (JSON.stringify(out).replace(/"/g, '')) + (desc ? '; ' + desc : ''), function() {
              let solver = new Solver();
              let A = solver.decl('A', domain1);
              let B = solver.decl('B', domain2);
              let C = solver.decl('C', domain3);
              solver.isLt(A, B, C);

              solver.solve({vars: ['A', 'B', 'C']});
              expect(solver.solutions).to.eql(out);
            });
          }

          [
            {A: [0, 0], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
            {A: [0, 0], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 0}]},
            {A: [0, 0], B: [0, 0], C: [1, 1], out: []},
            {A: [0, 0], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
            {A: [0, 0], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 1}]},
            {A: [0, 0], B: [0, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [0, 0], B: [1, 1], C: [0, 0], out: []},
            {A: [0, 0], B: [1, 1], C: [0, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [0, 0], B: [1, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [0, 1], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 0}]},
            {A: [0, 1], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 0}]},
            {A: [0, 1], B: [0, 0], C: [1, 1], out: []},
            {A: [0, 1], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 0}]},
            {A: [0, 1], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 1}, {A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 0}]},
            {A: [0, 1], B: [0, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [0, 1], B: [1, 1], C: [0, 0], out: [{A: 1, B: 1, C: 0}]},
            {A: [0, 1], B: [1, 1], C: [0, 1], out: [{A: 0, B: 1, C: 1}, {A: 1, B: 1, C: 0}]},
            {A: [0, 1], B: [1, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [1, 1], B: [0, 0], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
            {A: [1, 1], B: [0, 0], C: [0, 1], out: [{A: 1, B: 0, C: 0}]},
            {A: [1, 1], B: [0, 0], C: [1, 1], out: []},
            {A: [1, 1], B: [0, 1], C: [0, 0], out: [{A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 0}]},
            {A: [1, 1], B: [0, 1], C: [0, 1], out: [{A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 0}]},
            {A: [1, 1], B: [0, 1], C: [1, 1], out: []},
            {A: [1, 1], B: [1, 1], C: [0, 0], out: [{A: 1, B: 1, C: 0}]},
            {A: [1, 1], B: [1, 1], C: [0, 1], out: [{A: 1, B: 1, C: 0}]},
            {A: [1, 1], B: [1, 1], C: [1, 1], out: []},
          ].forEach(testCase => test(testCase.A, testCase.B, testCase.C, testCase.out));
        });


        describe('lte', function() {

          function test(domain1, domain2, domain3, out, desc) {
            it('should solve despite optimizations. ' + [domain__debug(domain1), '<=', domain__debug(domain2), '->', domain__debug(domain3)] + ' solves to: ' + (JSON.stringify(out).replace(/"/g, '')) + (desc ? '; ' + desc : ''), function() {
              let solver = new Solver();
              let A = solver.decl('A', domain1);
              let B = solver.decl('B', domain2);
              let C = solver.decl('C', domain3);
              solver.isLte(A, B, C);

              solver.solve({vars: ['A', 'B', 'C']});
              expect(solver.solutions).to.eql(out);
            });
          }

          [
            {A: [0, 0], B: [0, 0], C: [0, 0], out: []},
            {A: [0, 0], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 1}]},
            {A: [0, 0], B: [0, 0], C: [1, 1], out: [{A: 0, B: 0, C: 1}]},
            {A: [0, 0], B: [0, 1], C: [0, 0], out: []},
            {A: [0, 0], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 1}, {A: 0, B: 1, C: 1}]},
            {A: [0, 0], B: [0, 1], C: [1, 1], out: [{A: 0, B: 0, C: 1}, {A: 0, B: 1, C: 1}]},
            {A: [0, 0], B: [1, 1], C: [0, 0], out: []},
            {A: [0, 0], B: [1, 1], C: [0, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [0, 0], B: [1, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
            {A: [0, 1], B: [0, 0], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
            {A: [0, 1], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 1}, {A: 1, B: 0, C: 0}]},
            {A: [0, 1], B: [0, 0], C: [1, 1], out: [{A: 0, B: 0, C: 1}]},
            {A: [0, 1], B: [0, 1], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
            {A: [0, 1], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 1}, {A: 0, B: 1, C: 1}, {A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 1}]},
            {A: [0, 1], B: [0, 1], C: [1, 1], out: [{A: 0, B: 0, C: 1}, {A: 0, B: 1, C: 1}, {A: 1, B: 1, C: 1}]},
            {A: [0, 1], B: [1, 1], C: [0, 0], out: []},
            {A: [0, 1], B: [1, 1], C: [0, 1], out: [{A: 0, B: 1, C: 1}, {A: 1, B: 1, C: 1}]},
            {A: [0, 1], B: [1, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}, {A: 1, B: 1, C: 1}]},
            {A: [1, 1], B: [0, 0], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
            {A: [1, 1], B: [0, 0], C: [0, 1], out: [{A: 1, B: 0, C: 0}]},
            {A: [1, 1], B: [0, 0], C: [1, 1], out: []},
            {A: [1, 1], B: [0, 1], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
            {A: [1, 1], B: [0, 1], C: [0, 1], out: [{A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 1}]},
            {A: [1, 1], B: [0, 1], C: [1, 1], out: [{A: 1, B: 1, C: 1}]},
            {A: [1, 1], B: [1, 1], C: [0, 0], out: []},
            {A: [1, 1], B: [1, 1], C: [0, 1], out: [{A: 1, B: 1, C: 1}]},
            {A: [1, 1], B: [1, 1], C: [1, 1], out: [{A: 1, B: 1, C: 1}]},
          ].forEach(testCase => test(testCase.A, testCase.B, testCase.C, testCase.out));
        });

        // note: gt and gte map to lt and lte so there's no real need to test them as well... but we could :)
      });
    });

    describe('plus', function() {

      it('should work with simple case', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 101);
        solver.decl('C', fixt_arrdom_range(150, 250));
        solver.plus('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101, C: 201}]);
      });

      function testABC(A, B, C, solves) {
        it(`should work with A=${A} B=${B} C=${C} -> ${solves}`, function() {
          let solver = new Solver();
          solver.decl('A', A);
          solver.decl('B', B);
          solver.decl('C', C);
          solver.plus('A', 'B', 'C');
          let solution = solver.solve({});


          expect(solution).to.eql(solves);
        });
      }

      testABC(0, 1, 1, [{A: 0, B: 1, C: 1}]);
      testABC(1, 0, 1, [{A: 1, B: 0, C: 1}]);
      testABC(0, 0, 0, [{A: 0, B: 0, C: 0}]);
      testABC(1, 1, 2, [{A: 1, B: 1, C: 2}]);

      testABC(fixt_arrdom_range(100, 110), fixt_arrdom_range(50, 60), fixt_arrdom_range(150, 151), [
        {A: 100, B: 50, C: 150},
        {A: 100, B: 51, C: 151},
        {A: 101, B: 50, C: 151},
      ]);

      it('should work without C', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 102));
        solver.decl('B', fixt_arrdom_range(50, 52));
        solver.plus('A', 'B');
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([
          // Note: order is not relevant to the test!
          { A: 100, B: 50 },
          { A: 100, B: 51 },
          { A: 100, B: 52 },
          { A: 101, B: 50 },
          { A: 101, B: 51 },
          { A: 101, B: 52 },
          { A: 102, B: 50 },
          { A: 102, B: 51 },
          { A: 102, B: 52 },
        ]);
      });

      it('should find a solution for A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 150));
        solver.decl('B', fixt_arrdom_range(SUB, 50));
        solver.decl('C', 200);
        solver.plus('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 150, B: 50, C: 200}]);
      });

      describe('brute force bool table', function() {

        function test(A, B, C, out) {
          it('test: A=[' + A + '] B=[' + B + '] C=[' + C + '] out=' + JSON.stringify(out).replace(/"/g, ''), function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            if (C !== undefined) solver.decl('C', C);
            solver.plus('A', 'B', C === undefined ? undefined : 'C');
            solver.solve({max: 20}); // arbitrary number

            expect(solver.solutions.length).to.be.below(20); // if this breaks (validly) increase the max above
            if (C !== undefined) {
              // easy
              expect(solver.solutions).to.eql(out);
            } else {
              // difficult. find the anonymous var and test it.
              solver.solutions.forEach((solution, i) => {
                let foundAnon = false;
                for (let key in solution) {
                  if (key === 'A') expect(solution.A).to.eql(out[i].A);
                  else if (key === 'B') expect(solution.B).to.eql(out[i].B);
                  else {
                    // this is not a bug per se, unless there's no reason for the additional anon var(s)
                    expect(foundAnon, 'expecting only one anon var').to.eql(false);
                    foundAnon = true;
                    expect(solution[key]).to.eql(out[i].anon);
                  }
                }
                expect(solution.A).to.eql(out[i].A);
              });
            }
          });
        }

        [
          {A: [0, 0], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 0], B: [0, 0], C: [0, 10], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 0], B: [0, 0], out: [{A: 0, B: 0, anon: 0}]},
          {A: [0, 0], B: [0, 0], C: [1, 1], out: []},
          {A: [0, 0], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 0], B: [0, 1], C: [0, 10], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 1}]},
          {A: [0, 0], B: [0, 1], out: [{A: 0, B: 0, anon: 0}, {A: 0, B: 1, anon: 1}]},
          {A: [0, 0], B: [0, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
          {A: [0, 0], B: [1, 1], C: [0, 0], out: []},
          {A: [0, 0], B: [1, 1], C: [0, 10], out: [{A: 0, B: 1, C: 1}]},
          {A: [0, 0], B: [1, 1], out: [{A: 0, B: 1, anon: 1}]},
          {A: [0, 0], B: [1, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
          {A: [0, 1], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 1], B: [0, 0], C: [0, 10], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 1}]},
          {A: [0, 1], B: [0, 0], out: [{A: 0, B: 0, anon: 0}, {A: 1, B: 0, anon: 1}]},
          {A: [0, 1], B: [0, 0], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
          {A: [0, 1], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 1], B: [0, 1], C: [0, 10], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 1}, {A: 1, B: 0, C: 1}, {A: 1, B: 1, C: 2}]},
          {A: [0, 1], B: [0, 1], out: [{A: 0, B: 0, anon: 0}, {A: 0, B: 1, anon: 1}, {A: 1, B: 0, anon: 1}, {A: 1, B: 1, anon: 2}]},
          {A: [0, 1], B: [0, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}, {A: 1, B: 0, C: 1}]},
          {A: [0, 1], B: [1, 1], C: [0, 0], out: []},
          {A: [0, 1], B: [1, 1], C: [0, 10], out: [{A: 0, B: 1, C: 1}, {A: 1, B: 1, C: 2}]},
          {A: [0, 1], B: [1, 1], out: [{A: 0, B: 1, anon: 1}, {A: 1, B: 1, anon: 2}]},
          {A: [0, 1], B: [1, 1], C: [1, 1], out: [{A: 0, B: 1, C: 1}]},
          {A: [1, 1], B: [0, 0], C: [0, 0], out: []},
          {A: [1, 1], B: [0, 0], C: [0, 10], out: [{A: 1, B: 0, C: 1}]},
          {A: [1, 1], B: [0, 0], out: [{A: 1, B: 0, anon: 1}]},
          {A: [1, 1], B: [0, 0], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
          {A: [1, 1], B: [0, 1], C: [0, 0], out: []},
          {A: [1, 1], B: [0, 1], C: [0, 10], out: [{A: 1, B: 0, C: 1}, {A: 1, B: 1, C: 2}]},
          {A: [1, 1], B: [0, 1], out: [{A: 1, B: 0, anon: 1}, {A: 1, B: 1, anon: 2}]},
          {A: [1, 1], B: [0, 1], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
          {A: [1, 1], B: [1, 1], C: [0, 0], out: []},
          {A: [1, 1], B: [1, 1], C: [0, 10], out: [{A: 1, B: 1, C: 2}]},
          {A: [1, 1], B: [1, 1], out: [{A: 1, B: 1, anon: 2}]},
          {A: [1, 1], B: [1, 1], C: [1, 1], out: []},
        ].forEach(testCase => test(testCase.A, testCase.B, testCase.C, testCase.out));
      });
    });

    describe('minus', function() {

      it('should work with simple case', function() {
        let solver = new Solver();
        solver.decl('A', 500);
        solver.decl('B', 100);
        solver.decl('C', 400);
        solver.minus('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 500, B: 100, C: 400}]);
      });

      it('should reject if result is negative', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 101);
        solver.decl('C', fixt_arrdom_range(0, 0)); // it should not even clamp to zero...
        solver.minus('A', 'B', 'C');
        let solution = solver.solve();

        expect(solution).to.eql([]);
      });

      function testABC(A, B, C, solves) {
        it(`should work with A=${A} B=${B} C=${C} -> ${solves}`, function() {
          let solver = new Solver();
          solver.decl('A', A);
          solver.decl('B', B);
          solver.decl('C', C);
          solver.minus('A', 'B', 'C');
          let solution = solver.solve({});

          expect(solution).to.eql(solves);
        });
      }

      testABC(0, 1, 1, []);
      testABC(1, 0, 1, [{A: 1, B: 0, C: 1}]);
      testABC(0, 0, 0, [{A: 0, B: 0, C: 0}]);
      testABC(1, 1, 0, [{A: 1, B: 1, C: 0}]);

      testABC(fixt_arrdom_range(100, 110), fixt_arrdom_range(50, 60), fixt_arrdom_range(150, 151), []);
      testABC(fixt_arrdom_range(100, 110), fixt_arrdom_range(50, 60), fixt_arrdom_range(59, 100), [
        // Note: order irrelevant to test
        {A: 109, B: 50, C: 59},
        {A: 110, B: 50, C: 60},
        {A: 110, B: 51, C: 59},
      ]);

      it('should work without C', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 102));
        solver.decl('B', fixt_arrdom_range(50, 52));
        solver.minus('A', 'B');
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([
          // Note: order is not relevant to the test!
          { A: 100, B: 50 },
          { A: 100, B: 51 },
          { A: 100, B: 52 },
          { A: 101, B: 50 },
          { A: 101, B: 51 },
          { A: 101, B: 52 },
          { A: 102, B: 50 },
          { A: 102, B: 51 },
          { A: 102, B: 52 },
        ]);
      });

      it('should find a solution for A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 150));
        solver.decl('B', fixt_arrdom_range(50, SUP));
        solver.decl('C', 100);
        solver.minus('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 150, B: 50, C: 100}]);
      });

      describe('brute force bool table', function() {

        function test(A, B, C, out) {
          it('test: A=[' + A + '] B=[' + B + '] C=[' + C + '] out=' + JSON.stringify(out).replace(/"/g, ''), function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            if (C !== undefined) solver.decl('C', C);
            solver.minus('A', 'B', C === undefined ? undefined : 'C');
            solver.solve({max: 20}); // arbitrary number

            expect(solver.solutions.length).to.be.below(20); // if this breaks (validly) increase the max above
            if (C !== undefined) {
              // easy
              expect(solver.solutions).to.eql(out);
            } else {
              // difficult. find the anonymous var and test it.
              expect(solver.solutions.length, 'solve count (solution=' + JSON.stringify(solver.solutions) + ')').to.eql(out.length);
              solver.solutions.forEach((solution, i) => {
                let foundAnon = false;
                for (let key in solution) {
                  if (key === 'A') expect(solution.A).to.eql(out[i].A);
                  else if (key === 'B') expect(solution.B).to.eql(out[i].B);
                  else {
                    // this is not a bug per se, unless there's no reason for the additional anon var(s)
                    expect(foundAnon, 'expecting only one anon var').to.eql(false);
                    foundAnon = true;
                    expect(solution[key]).to.eql(out[i].anon);
                  }
                }
                expect(solution.A).to.eql(out[i].A);
              });
            }
          });
        }

        [
          {A: [0, 0], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 0], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 0], B: [0, 0], out: [{A: 0, B: 0, anon: 0}]},
          {A: [0, 0], B: [0, 0], C: [1, 1], out: []},
          {A: [0, 0], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 0], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 0], B: [0, 1], out: [{A: 0, B: 0, anon: 0}]},
          {A: [0, 0], B: [0, 1], C: [1, 1], out: []},
          {A: [0, 0], B: [1, 1], C: [0, 0], out: []},
          {A: [0, 0], B: [1, 1], C: [0, 1], out: []},
          {A: [0, 0], B: [1, 1], out: []},
          {A: [0, 0], B: [1, 1], C: [1, 1], out: []},
          {A: [0, 1], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 1], B: [0, 0], C: [0, 1], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 1}]},
          {A: [0, 1], B: [0, 0], out: [{A: 0, B: 0, anon: 0}, {A: 1, B: 0, anon: 1}]},
          {A: [0, 1], B: [0, 0], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
          {A: [0, 1], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 1, C: 0}]},
          {A: [0, 1], B: [0, 1], C: [0, 1], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 1}, {A: 1, B: 1, C: 0}]},
          {A: [0, 1], B: [0, 1], out: [{A: 0, B: 0, anon: 0}, {A: 1, B: 0, anon: 1}, {A: 1, B: 1, anon: 0}]},
          {A: [0, 1], B: [0, 1], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
          {A: [0, 1], B: [1, 1], C: [0, 0], out: [{A: 1, B: 1, C: 0}]},
          {A: [0, 1], B: [1, 1], C: [0, 1], out: [{A: 1, B: 1, C: 0}]},
          {A: [0, 1], B: [1, 1], out: [{A: 1, B: 1, anon: 0}]},
          {A: [0, 1], B: [1, 1], C: [1, 1], out: []},
          {A: [1, 1], B: [0, 0], C: [0, 0], out: []},
          {A: [1, 1], B: [0, 0], C: [0, 1], out: [{A: 1, B: 0, C: 1}]},
          {A: [1, 1], B: [0, 0], out: [{A: 1, B: 0, anon: 1}]},
          {A: [1, 1], B: [0, 0], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
          {A: [1, 1], B: [0, 1], C: [0, 0], out: [{A: 1, B: 1, C: 0}]},
          {A: [1, 1], B: [0, 1], C: [0, 1], out: [{A: 1, B: 0, C: 1}, {A: 1, B: 1, C: 0}]},
          {A: [1, 1], B: [0, 1], out: [{A: 1, B: 0, anon: 1}, {A: 1, B: 1, anon: 0}]},
          {A: [1, 1], B: [0, 1], C: [1, 1], out: [{A: 1, B: 0, C: 1}]},
          {A: [1, 1], B: [1, 1], C: [0, 0], out: [{A: 1, B: 1, C: 0}]},
          {A: [1, 1], B: [1, 1], C: [0, 1], out: [{A: 1, B: 1, C: 0}]},
          {A: [1, 1], B: [1, 1], out: [{A: 1, B: 1, anon: 0}]},
          {A: [1, 1], B: [1, 1], C: [1, 1], out: []},
        ].forEach(testCase => test(testCase.A, testCase.B, testCase.C, testCase.out));
      });
    });

    describe('ring-mul', function() {

      it('should work with simple case', function() {
        let solver = new Solver();
        solver.decl('A', 50);
        solver.decl('B', 10);
        solver.decl('C', 500);
        solver.mul('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 50, B: 10, C: 500}]);
      });

      function testABC(A, B, C, solves) {
        it(`should work with A=${A} B=${B} C=${C} -> ${solves}`, function() {
          let solver = new Solver();
          solver.decl('A', A);
          solver.decl('B', B);
          solver.decl('C', C);
          solver.mul('A', 'B', 'C');
          let solution = solver.solve({});

          expect(solution).to.eql(solves);
        });
      }

      testABC(1, 1, 1, [{A: 1, B: 1, C: 1}]);
      testABC(fixt_arrdom_range(100, 110), fixt_arrdom_range(50, 60), fixt_arrdom_range(150, 151), []);

      it('should work without C', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(50, 52));
        solver.decl('B', fixt_arrdom_range(70, 72));
        solver.mul('A', 'B');
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([
          // Note: order is not relevant to the test!
          { A: 50, B: 70 },
          { A: 50, B: 71 },
          { A: 50, B: 72 },
          { A: 51, B: 70 },
          { A: 51, B: 71 },
          { A: 51, B: 72 },
          { A: 52, B: 70 },
          { A: 52, B: 71 },
          { A: 52, B: 72 },
        ]);
      });

      it('should find a solution for A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 150));
        solver.decl('B', fixt_arrdom_range(10, SUP));
        solver.decl('C', 1000);
        solver.mul('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 10, C: 1000}]);
      });


      describe('brute force bool table', function() {

        function test(A, B, C, out) {
          it('test: A=[' + A + '] B=[' + B + '] C=[' + C + '] out=' + JSON.stringify(out).replace(/"/g, ''), function() {
            let solver = new Solver();
            solver.decl('A', A);
            solver.decl('B', B);
            if (C !== undefined) solver.decl('C', C);
            solver.mul('A', 'B', C === undefined ? undefined : 'C');
            solver.solve({max: 20, vars: C === undefined ? ['A', 'B'] : ['A', 'B', 'C']}); // arbitrary number

            expect(solver.solutions.length).to.be.below(20); // if this breaks (validly) increase the max above
            if (C !== undefined) {
              // easy
              expect(solver.solutions).to.eql(out);
            } else {
              // difficult. find the anonymous var and test it.
              expect(solver.solutions.length, 'solve count (solution=' + JSON.stringify(solver.solutions) + ')').to.eql(out.length);
              solver.solutions.forEach((solution, i) => {
                let foundAnon = false;
                for (let key in solution) {
                  if (key === 'A') expect(solution.A, 'A of sol ' + i + ' of ' + JSON.stringify(solver.solutions)).to.eql(out[i].A);
                  else if (key === 'B') expect(solution.B, 'B of sol ' + i + ' of ' + JSON.stringify(solver.solutions)).to.eql(out[i].B);
                  else {
                    // this is not a bug per se, unless there's no reason for the additional anon var(s)
                    expect(foundAnon, 'expecting only one anon var').to.eql(false);
                    foundAnon = true;
                    expect(solution[key]).to.eql(out[i].anon);
                  }
                }
                expect(solution.A).to.eql(out[i].A);
              });
            }
          });
        }

        [
          {A: [0, 0], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 0], B: [0, 0], C: [0, 10], out: [{A: 0, B: 0, C: 0}]},
          {A: [0, 0], B: [0, 0], out: [{A: 0, B: 0, anon: 0}]},
          {A: [0, 0], B: [0, 0], C: [1, 1], out: []},
          {A: [0, 0], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 0}]},
          {A: [0, 0], B: [0, 1], C: [0, 10], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 0}]},
          {A: [0, 0], B: [0, 1], out: [{A: 0, B: 0, anon: 0}, {A: 0, B: 1, anon: 0}]},
          {A: [0, 0], B: [0, 1], C: [1, 1], out: []},
          {A: [0, 0], B: [1, 1], C: [0, 0], out: [{A: 0, B: 1, C: 0}]},
          {A: [0, 0], B: [1, 1], C: [0, 10], out: [{A: 0, B: 1, C: 0}]},
          {A: [0, 0], B: [1, 1], out: [{A: 0, B: 1, anon: 0}]},
          {A: [0, 0], B: [1, 1], C: [1, 1], out: []},
          {A: [0, 1], B: [0, 0], C: [0, 0], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 0}]},
          {A: [0, 1], B: [0, 0], C: [0, 10], out: [{A: 0, B: 0, C: 0}, {A: 1, B: 0, C: 0}]},
          {A: [0, 1], B: [0, 0], out: [{A: 0, B: 0, anon: 0}, {A: 1, B: 0, anon: 0}]},
          {A: [0, 1], B: [0, 0], C: [1, 1], out: []},
          {A: [0, 1], B: [0, 1], C: [0, 0], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 0}, {A: 1, B: 0, C: 0}]},
          {A: [0, 1], B: [0, 1], C: [0, 10], out: [{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 0}, {A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 1}]},
          {A: [0, 1], B: [0, 1], out: [{A: 0, B: 0, anon: 0}, {A: 0, B: 1, anon: 0}, {A: 1, B: 0, anon: 0}, {A: 1, B: 1, anon: 1}]},
          {A: [0, 1], B: [0, 1], C: [1, 1], out: [{A: 1, B: 1, C: 1}]},
          {A: [0, 1], B: [1, 1], C: [0, 0], out: [{A: 0, B: 1, C: 0}]},
          {A: [0, 1], B: [1, 1], C: [0, 10], out: [{A: 0, B: 1, C: 0}, {A: 1, B: 1, C: 1}]},
          {A: [0, 1], B: [1, 1], out: [{A: 0, B: 1, anon: 0}, {A: 1, B: 1, anon: 1}]},
          {A: [0, 1], B: [1, 1], C: [1, 1], out: [{A: 1, B: 1, C: 1}]},
          {A: [1, 1], B: [0, 0], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
          {A: [1, 1], B: [0, 0], C: [0, 10], out: [{A: 1, B: 0, C: 0}]},
          {A: [1, 1], B: [0, 0], out: [{A: 1, B: 0, anon: 0}]},
          {A: [1, 1], B: [0, 0], C: [1, 1], out: []},
          {A: [1, 1], B: [0, 1], C: [0, 0], out: [{A: 1, B: 0, C: 0}]},
          {A: [1, 1], B: [0, 1], C: [0, 10], out: [{A: 1, B: 0, C: 0}, {A: 1, B: 1, C: 1}]},
          {A: [1, 1], B: [0, 1], out: [{A: 1, B: 0, anon: 0}, {A: 1, B: 1, anon: 1}]},
          {A: [1, 1], B: [0, 1], C: [1, 1], out: [{A: 1, B: 1, C: 1}]},
          {A: [1, 1], B: [1, 1], C: [0, 0], out: []},
          {A: [1, 1], B: [1, 1], C: [0, 10], out: [{A: 1, B: 1, C: 1}]},
          {A: [1, 1], B: [1, 1], out: [{A: 1, B: 1, anon: 1}]},
          {A: [1, 1], B: [1, 1], C: [1, 1], out: [{A: 1, B: 1, C: 1}]},
        ].forEach(testCase => test(testCase.A, testCase.B, testCase.C, testCase.out));
      });
    });

    // these tests are for division where fractions are floored then included, not discarded
    // internally this method exists but it is not exposed...
    //describe('ring-div', function() {
    //
    //  it('should work with simple case', function() {
    //    let solver = new Solver();
    //    solver.decl('A', 50);
    //    solver.decl('B', 10);
    //    solver.decl('C', 5);
    //    solver.ring_div('A', 'B', 'C');
    //    let solution = solver.solve({});
    //
    //    expect(solution).to.eql([{A: 50, B: 10, C: 5}]);
    //  });
    //
    //  function testABC(A, B, C, solves) {
    //    it(`should work with A=${A} B=${B} C=${C} -> ${solves}`, function() {
    //      let solver = new Solver();
    //      solver.decl('A', A);
    //      solver.decl('B', B);
    //      solver.decl('C', C);
    //      solver.ring_div('A', 'B', 'C');
    //      let solution = solver.solve({});
    //
    //      expect(solution).to.eql(solves);
    //    });
    //  }
    //
    //  testABC(1, 1, 1, [{A:1, B:1, C:1}]);
    //  testABC(specDomainCreateRange(100, 110), specDomainCreateRange(5, 10), specDomainCreateRange(1, 2), []);
    //  testABC(specDomainCreateRange(100, 110), specDomainCreateRange(5, 10), specDomainCreateRange(10, 20), [
    //    {A: 100, B: 5, C: 20},
    //    {A: 100, B: 10, C: 10},
    //    {A: 101, B: 8, C: 12},
    //    {A: 102, B: 6, C: 17},
    //    {A: 103, B: 8, C: 12},
    //    {A: 104, B: 8, C: 13},
    //    {A: 108, B: 6, C: 18},
    //    {A: 108, B: 9, C: 12},
    //    {A: 109, B: 8, C: 13},
    //    {A: 110, B: 8, C: 13},
    //    {A: 110, B: 10, C: 11},
    //  ]);
    //
    //  it('should work xxxwithout C', function() {
    //    let solver = new Solver();
    //    solver.decl('A', specDomainCreateRange(70, 75));
    //    solver.decl('B', specDomainCreateRange(5, 10));
    //    solver.ring_div('A', 'B');
    //    let solution = solver.solve({});
    //
    //    expect(stripAnonVarsFromArrays(solution)).to.eql([
    //      // Note: order is not relevant to the test!
    //      { A: 70, B: 5 },
    //      { A: 70, B: 10 },
    //      { A: 72, B: 9 },
    //      { A: 73, B: 7 },
    //      { A: 75, B: 5 },
    //      { A: 75, B: 6 },
    //    ]);
    //  });
    //
    //  it('should find a solution for A', function() {
    //    let solver = new Solver();
    //    solver.decl('A', specDomainCreateRange(100, 150));
    //    solver.decl('B', specDomainCreateRange(10, SUP));
    //    solver.decl('C', 10);
    //    solver.ring_div('A', 'B', 'C');
    //    let solution = solver.solve({});
    //
    //    expect(solution).to.eql([
    //      {A: 100, B: 10, C: 10},
    //      {A: 150, B: 15, C: 10}
    //    ]);
    //  });
    //});

    describe('mul', function() {

      it('should work with simple case', function() {
        let solver = new Solver();
        solver.decl('A', 50);
        solver.decl('B', 10);
        solver.decl('C', 500);
        solver.mul('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 50, B: 10, C: 500}]);
      });

      function testABC(A, B, C, solves) {
        it(`should work with A=${A} B=${B} C=${C} -> ${solves}`, function() {
          let solver = new Solver();
          solver.decl('A', A);
          solver.decl('B', B);
          solver.decl('C', C);
          solver.mul('A', 'B', 'C');
          let solution = solver.solve({});

          expect(solution).to.eql(solves);
        });
      }

      testABC(1, 1, 1, [{A: 1, B: 1, C: 1}]);
      testABC(fixt_arrdom_range(100, 110), fixt_arrdom_range(50, 60), fixt_arrdom_range(150, 151), []);

      it('should work without C', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(70, 72));
        solver.decl('B', fixt_arrdom_range(50, 52));
        solver.mul('A', 'B');
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([
          // Note: order is not relevant to the test!
          { A: 70, B: 50 },
          { A: 70, B: 51 },
          { A: 70, B: 52 },
          { A: 71, B: 50 },
          { A: 71, B: 51 },
          { A: 71, B: 52 },
          { A: 72, B: 50 },
          { A: 72, B: 51 },
          { A: 72, B: 52 },
        ]);
      });

      it('should find a solution for A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 150));
        solver.decl('B', fixt_arrdom_range(10, SUP));
        solver.decl('C', 1000);
        solver.mul('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 10, C: 1000}]);
      });

      it('should solve this old test case', function() {
        let solver = new Solver({});

        solver.decl('A', [0, 10]);
        solver.decl('B', [0, 10]);
        solver.decl('MIN', [19, 19]);
        solver.decl('MAX', [21, 21]);
        solver.decl('S', [0, 100]);

        solver.mul('A', 'B', 'S');
        solver.lte('S', 'MAX');
        solver.gte('S', 'MIN');

        let solution = solver.solve({});
        // There are only three values that multiply to 20 or
        // 21 (and none to 19 because it is a prime). Times
        // two because each value appears in A and B.
        expect(solution).to.eql([
          {A: 2, B: 10, MIN: 19, MAX: 21, S: 20},
          {A: 3, B: 7, MIN: 19, MAX: 21, S: 21},
          {A: 4, B: 5, MIN: 19, MAX: 21, S: 20},
          {A: 5, B: 4, MIN: 19, MAX: 21, S: 20},
          {A: 7, B: 3, MIN: 19, MAX: 21, S: 21},
          {A: 10, B: 2, MIN: 19, MAX: 21, S: 20},
        ]);
      });
    });

    describe('sum', function() {

      it('should work with simple case', function() {
        let solver = new Solver();
        solver.decl('A', 50);
        solver.decl('B', 10);
        solver.decl('C', 500);
        solver.decl('S', 560);
        solver.sum(['A', 'B', 'C'], 'S');
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 50, B: 10, C: 500, S: 560}]);
      });

      function testABC(A, B, C, S, solves) {
        it(`should work with A=${A} B=${B} C=${C} -> ${solves}`, function() {
          let solver = new Solver();
          solver.decl('A', A);
          solver.decl('B', B);
          solver.decl('C', C);
          solver.decl('S', S);
          solver.sum(['A', 'B', 'C'], 'S');
          let solution = solver.solve({});

          expect(stripAnonVarsFromArrays(solution)).to.eql(solves);
        });
      }

      testABC(1, 1, 1, 3, [{A: 1, B: 1, C: 1, S: 3}]);
      testABC(5, 1, 0, 6, [{A: 5, B: 1, C: 0, S: 6}]);
      testABC(fixt_arrdom_range(100, 101), fixt_arrdom_range(50, 51), fixt_arrdom_range(150, 151), fixt_arrdom_range(300, 321), [
        // note: order not relevant to this test
        {A: 100, B: 50, C: 150, S: 300},
        {A: 100, B: 50, C: 151, S: 301},
        {A: 100, B: 51, C: 150, S: 301},
        {A: 100, B: 51, C: 151, S: 302},
        {A: 101, B: 50, C: 150, S: 301},
        {A: 101, B: 50, C: 151, S: 302},
        {A: 101, B: 51, C: 150, S: 302},
        {A: 101, B: 51, C: 151, S: 303},
      ]);

      it('should work without param', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(70, 72));
        solver.decl('B', fixt_arrdom_range(50, 52));
        solver.sum(['A', 'B']);
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([
          // Note: order is not relevant to the test!
          {A: 70, B: 50},
          {A: 70, B: 51},
          {A: 70, B: 52},
          {A: 71, B: 50},
          {A: 71, B: 51},
          {A: 71, B: 52},
          {A: 72, B: 50},
          {A: 72, B: 51},
          {A: 72, B: 52},
        ]);
      });

      it('should find a solution for A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 150));
        solver.decl('B', fixt_arrdom_range(99, SUP));
        solver.decl('C', 200);
        solver.sum(['A', 'B'], 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([
          {A: 100, B: 100, C: 200},
          {A: 101, B: 99, C: 200},
        ]);
      });

      it('should sum a single zero', function() {
        // edge case
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(0, 0));
        solver.sum(['A']);
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 0}]);
      });

      it('should sum two zeroes', function() {
        // edge case
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(0, 0));
        solver.decl('B', fixt_arrdom_range(0, 0));
        solver.sum(['A', 'B']);
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 0, B: 0}]);
      });

      it('should sum two zeroes into result', function() {
        // edge case
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(0, 0));
        solver.decl('B', fixt_arrdom_range(0, 0));
        solver.decl('C', fixt_arrdom_range(0, 10));
        solver.sum(['A', 'B'], 'C');
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 0, B: 0, C: 0}]);
      });

      it('should sum two zeroes and a one into result', function() {
        // edge case
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(0, 0));
        solver.decl('B', fixt_arrdom_range(0, 0));
        solver.decl('C', fixt_arrdom_range(1, 1));
        solver.decl('S', fixt_arrdom_range(0, 10));
        solver.sum(['A', 'B', 'C'], 'S');
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 0, B: 0, C: 1, S: 1}]);
      });

      it('should sum two zeroes and a bool into result', function() {
        // edge case
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(0, 0));
        solver.decl('B', fixt_arrdom_range(0, 0));
        solver.decl('C', fixt_arrdom_range(0, 1));
        solver.decl('S', fixt_arrdom_range(0, 10));
        solver.sum(['A', 'B', 'C'], 'S');
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 0, B: 0, C: 0, S: 0}, {A: 0, B: 0, C: 1, S: 1}]);
      });
    });

    describe('product', function() {

      it('should work with simple case', function() {
        let solver = new Solver();
        solver.decl('A', 50);
        solver.decl('B', 10);
        solver.decl('C', 500);
        solver.decl('S', 250000);
        solver.product(['A', 'B', 'C'], 'S');
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 50, B: 10, C: 500, S: 250000}]);
      });

      it('should solve a simple case', function() {
        let solver = new Solver();
        solver.decl('A', 50);
        solver.decl('B', 10);
        solver.decl('C', 500);
        let S = solver.product(['A', 'B', 'C']);

        let solution = solver.solve({});
        expect(solution[0][S]).to.eql(250000);
        expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 50, B: 10, C: 500}]);
      });

      function testABC(A, B, C, S, solves) {
        it(`should work with A=${A} B=${B} C=${C} -> ${solves}`, function() {
          let solver = new Solver();
          solver.decl('A', A);
          solver.decl('B', B);
          solver.decl('C', C);
          solver.decl('S', S);
          solver.product(['A', 'B', 'C'], 'S');
          let solution = solver.solve({});

          expect(stripAnonVarsFromArrays(solution)).to.eql(solves);
        });
      }

      testABC(1, 1, 1, 1, [{A: 1, B: 1, C: 1, S: 1}]);
      testABC(fixt_arrdom_range(100, 101), fixt_arrdom_range(50, 51), fixt_arrdom_range(150, 151), fixt_arrdom_range(750000, 777801), [
        // note: order not relevant to this test
        {A: 100, B: 50, C: 150, S: 100 * 50 * 150},
        {A: 100, B: 50, C: 151, S: 100 * 50 * 151},
        {A: 100, B: 51, C: 150, S: 100 * 51 * 150},
        {A: 100, B: 51, C: 151, S: 100 * 51 * 151},
        {A: 101, B: 50, C: 150, S: 101 * 50 * 150},
        {A: 101, B: 50, C: 151, S: 101 * 50 * 151},
        {A: 101, B: 51, C: 150, S: 101 * 51 * 150},
        {A: 101, B: 51, C: 151, S: 101 * 51 * 151},
      ]);

      it('should work without param', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(70, 72));
        solver.decl('B', fixt_arrdom_range(50, 52));
        solver.product(['A', 'B']);
        let solution = solver.solve({});

        expect(stripAnonVarsFromArrays(solution)).to.eql([
          // Note: order is not relevant to the test!
          {A: 70, B: 50},
          {A: 70, B: 51},
          {A: 70, B: 52},
          {A: 71, B: 50},
          {A: 71, B: 51},
          {A: 71, B: 52},
          {A: 72, B: 50},
          {A: 72, B: 51},
          {A: 72, B: 52},
        ]);
      });

      it('should find a solution for A', function() {
        let solver = new Solver();
        solver.decl('A', fixt_arrdom_range(100, 150));
        solver.decl('B', fixt_arrdom_range(99, SUP));
        solver.decl('C', 10000);
        solver.product(['A', 'B'], 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([
          {A: 100, B: 100, C: 10000},
        ]);
      });
    });

    describe('distinct', function() {

      function test(A, B, C, solves) {
        it(`should distinct(${A}, ${B}, ${C}) -> ${solves}`, function() {
          let solver = new Solver();
          solver.decl('A', A);
          solver.decl('B', B);
          solver.decl('C', C);
          solver.distinct(['A', 'B', 'C']);
          let solution = solver.solve({});

          expect(solution).to.eql(solves);
        });
      }

      test(50, 10, 0, [{A: 50, B: 10, C: 0}]);
      test(50, 50, 0, []);
      test(50, 0, 50, []);
      test(0, 0, 50, []);
      test(0, 0, 0, []);
      test(0, 1, 2, [{A: 0, B: 1, C: 2}]);
      test(1, 2, 3, [{A: 1, B: 2, C: 3}]);
      test(fixt_arrdom_range(4, 7), 5, 6, [
        {A: fixt_arrdom_nums(4, 7), B: 5, C: 6},
      ]);
      test(fixt_arrdom_ranges([4, 5], [100, 101]), fixt_arrdom_range(4, 5), fixt_arrdom_range(100, 101), [
        {A: 4, B: 5, C: 100},
        {A: 4, B: 5, C: 101},
        {A: 5, B: 4, C: 100},
        {A: 5, B: 4, C: 101},
        {A: 100, B: 4, C: 101},
        {A: 100, B: 5, C: 101},
        {A: 101, B: 4, C: 100},
        {A: 101, B: 5, C: 100},
      ]);
    });

    describe('markov', function() {
      // markov isn't a constraint per se but if you declare a
      // markov var we need to make sure it doesn't go OOB so
      // one is implicitly generated to ensure this.

      it('should pass if solved value is in legend with prob>0', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 0, {
          valtype: 'markov',
          legend: [0],
          matrix: [
            {vector: [1]},
          ],
        });

        let solution = solver.solve({});
        expect(solution).to.eql([{A: 0}]);
      });

      it('should reject if solved value is not in legend', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 0, {
          valtype: 'markov',
          legend: [1],
          matrix: [
            {vector: [1]},
          ],
        });

        let solution = solver.solve({});
        expect(solution).to.eql([]); // no value in legend appears in domain so it rejects
      });

      describe('matrix with one row', function() {

        it('should reject if solved value does not have prob>0', function() {
          let solver = new Solver();
          solver.declRange('A', 0, 0, {
            valtype: 'markov',
            legend: [0],
            matrix: [
            {vector: [0]},
            ],
          });

          let solution = solver.solve({});
          expect(solution).to.eql([]); // solved to 0 but the only zero in legend has prob 0 and cannot be picked
        });

        it('should pass if solved value does has prob>0', function() {
          let solver = new Solver();
          solver.declRange('A', 0, 0, {
            valtype: 'markov',
            legend: [0],
            matrix: [
              {vector: [1]},
            ],
          });

          let solution = solver.solve({});
          expect(solution).to.eql([{A: 0}]); // solved value has prob>0 in legend so can be picked
        });
      });

      describe('multi layer matrix', function() {

        it('should pass if second row gives value prob>0', function() {
          let solver = new Solver();
          solver.declRange('A', 0, 0, {
            valtype: 'markov',
            legend: [0],
            matrix: [{
              vector: [0],
              boolVarName: solver.num(0),
            }, {
              vector: [1],
            }],
          });

          let solution = solver.solve({});
          expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 0}]);
        });

        it('should reject if second row gives value prob=0', function() {

          let solver = new Solver();
          solver.declRange('A', 0, 0, {
            valtype: 'markov',
            legend: [0],
            matrix: [{
              vector: [1],
              boolVarName: solver.num(0),
            }, {
              vector: [0],
            }],
          });

          let solution = solver.solve({});
          expect(solution).to.eql([]);
        });
      });
    });

    describe('dupe constraints', function() {
      // this set contains integration tests with explicitly duplicate constraints.
      // this case can occur as an procedural artifact in the wild and is optimized.

      it('should work with duplicate eqs', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);

        solver.eq('A', 'B');
        solver.eq('A', 'B');

        solver.solve({vars: ['A', 'B']});

        // the order is irrelevant..
        expect(solver.solutions).to.eql([{A: 0, B: 0}, {A: 1, B: 1}]);
      });

      it('should work with optimizable constraints', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 0);
        solver.declRange('B', 1, 1);

        solver.neq('A', 'B');
        solver.neq('A', 'B');

        solver.solve({vars: ['A', 'B']});

        // the order is irrelevant..
        expect(solver.solutions).to.eql([{A: 0, B: 1}]);
      });

      it('should work with result var', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 2);

        solver.plus('A', 'B', 'C');
        solver.plus('A', 'B', 'C');

        solver.solve({vars: ['A', 'B', 'C']});

        // the order is irrelevant..
        expect(solver.solutions).to.eql([
          {A: 0, B: 0, C: 0},
          {A: 0, B: 1, C: 1},
          {A: 1, B: 0, C: 1},
          {A: 1, B: 1, C: 2},
        ]);
      });

      it('should work with different result vars on same constraint', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 2);
        solver.declRange('D', 0, 2);

        solver.plus('A', 'B', 'C');
        solver.plus('A', 'B', 'D');

        solver.solve({vars: ['A', 'B', 'C', 'D']});

        // the order is irrelevant..
        expect(solver.solutions).to.eql([
          {A: 0, B: 0, C: 0, D: 0},
          {A: 0, B: 1, C: 1, D: 1},
          {A: 1, B: 0, C: 1, D: 1},
          {A: 1, B: 1, C: 2, D: 2},
        ]);
      });

      it('should work with sum on same result', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 1);
        solver.declRange('D', 0, 3);

        solver.sum(['A', 'B', 'C'], 'D');
        solver.sum(['A', 'B', 'C'], 'D');

        solver.solve({vars: ['A', 'B', 'C', 'D']});

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 0, C: 0, D: 0},
          {A: 0, B: 0, C: 1, D: 1},
          {A: 0, B: 1, C: 0, D: 1},
          {A: 0, B: 1, C: 1, D: 2},
          {A: 1, B: 0, C: 0, D: 1},
          {A: 1, B: 0, C: 1, D: 2},
          {A: 1, B: 1, C: 0, D: 2},
          {A: 1, B: 1, C: 1, D: 3},
        ]);
      });

      it('should work with sum on different result', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 1);
        solver.declRange('CC', 0, 1);
        solver.declRange('D', 0, 3);
        solver.declRange('E', 0, 3);

        solver.sum(['A', 'B', 'C'], 'D');
        solver.sum(['A', 'B', 'CC'], 'E');

        solver.solve({vars: ['A', 'B', 'C', 'CC', 'D', 'E']});

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 0, C: 0, CC: 0, D: 0, E: 0},
          {A: 0, B: 0, C: 0, CC: 1, D: 0, E: 1},
          {A: 0, B: 0, C: 1, CC: 0, D: 1, E: 0},
          {A: 0, B: 0, C: 1, CC: 1, D: 1, E: 1},
          {A: 0, B: 1, C: 0, CC: 0, D: 1, E: 1},
          {A: 0, B: 1, C: 0, CC: 1, D: 1, E: 2},
          {A: 0, B: 1, C: 1, CC: 0, D: 2, E: 1},
          {A: 0, B: 1, C: 1, CC: 1, D: 2, E: 2},
          {A: 1, B: 0, C: 0, CC: 0, D: 1, E: 1},
          {A: 1, B: 0, C: 0, CC: 1, D: 1, E: 2},
          {A: 1, B: 0, C: 1, CC: 0, D: 2, E: 1},
          {A: 1, B: 0, C: 1, CC: 1, D: 2, E: 2},
          {A: 1, B: 1, C: 0, CC: 0, D: 2, E: 2},
          {A: 1, B: 1, C: 0, CC: 1, D: 2, E: 3},
          {A: 1, B: 1, C: 1, CC: 0, D: 3, E: 2},
          {A: 1, B: 1, C: 1, CC: 1, D: 3, E: 3},
        ]);
      });

      it('should work with sum on partially same vars', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 1);
        solver.declRange('D', 0, 1);
        solver.declRange('E', 0, 2);
        solver.declRange('F', 0, 2);

        solver.sum(['A', 'B', 'C'], 'E');
        solver.sum(['A', 'B', 'D'], 'F');

        solver.solve({vars: ['A', 'B', 'C', 'D', 'E', 'F']});

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 0, C: 0, D: 0, E: 0, F: 0},
          {A: 0, B: 0, C: 0, D: 1, E: 0, F: 1},
          {A: 0, B: 0, C: 1, D: 0, E: 1, F: 0},
          {A: 0, B: 0, C: 1, D: 1, E: 1, F: 1},
          {A: 0, B: 1, C: 0, D: 0, E: 1, F: 1},
          {A: 0, B: 1, C: 0, D: 1, E: 1, F: 2},
          {A: 0, B: 1, C: 1, D: 0, E: 2, F: 1},
          {A: 0, B: 1, C: 1, D: 1, E: 2, F: 2},
          {A: 1, B: 0, C: 0, D: 0, E: 1, F: 1},
          {A: 1, B: 0, C: 0, D: 1, E: 1, F: 2},
          {A: 1, B: 0, C: 1, D: 0, E: 2, F: 1},
          {A: 1, B: 0, C: 1, D: 1, E: 2, F: 2},
          {A: 1, B: 1, C: 0, D: 0, E: 2, F: 2},
        ]);
      });

      it('should work with product on same result', function() {
        let solver = new Solver();
        solver.declRange('A', 1, 2);
        solver.declRange('B', 1, 2);
        solver.declRange('C', 1, 2);
        solver.declRange('D', 0, 8);
        solver.product(['A', 'B', 'C'], 'D');
        solver.product(['A', 'B', 'C'], 'D');

        solver.solve({vars: ['A', 'B', 'C', 'D']});

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 1, B: 1, C: 1, D: 1},
          {A: 1, B: 1, C: 2, D: 2},
          {A: 1, B: 2, C: 1, D: 2},
          {A: 1, B: 2, C: 2, D: 4},
          {A: 2, B: 1, C: 1, D: 2},
          {A: 2, B: 1, C: 2, D: 4},
          {A: 2, B: 2, C: 1, D: 4},
          {A: 2, B: 2, C: 2, D: 8},
        ]);
      });

      it('should work with product on different result', function() {
        let solver = new Solver();
        solver.declRange('A', 1, 2);
        solver.declRange('B', 1, 2);
        solver.declRange('C', 1, 2);
        solver.declRange('D', 0, 8);
        solver.declRange('E', 0, 8);
        solver.product(['A', 'B', 'C'], 'D');
        solver.product(['A', 'B', 'C'], 'E');

        solver.solve({vars: ['A', 'B', 'C', 'D', 'E']});

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 1, B: 1, C: 1, D: 1, E: 1},
          {A: 1, B: 1, C: 2, D: 2, E: 2},
          {A: 1, B: 2, C: 1, D: 2, E: 2},
          {A: 1, B: 2, C: 2, D: 4, E: 4},
          {A: 2, B: 1, C: 1, D: 2, E: 2},
          {A: 2, B: 1, C: 2, D: 4, E: 4},
          {A: 2, B: 2, C: 1, D: 4, E: 4},
          {A: 2, B: 2, C: 2, D: 8, E: 8},
        ]);
      });

      it('should work with product on partially same vars', function() {
        let solver = new Solver();
        solver.declRange('A', 1, 2);
        solver.declRange('B', 1, 2);
        solver.declRange('C', 1, 2);
        solver.declRange('D', 1, 2);
        solver.declRange('E', 0, 8);
        solver.declRange('F', 0, 8);

        solver.product(['A', 'B', 'C'], 'E');
        solver.product(['A', 'B', 'D'], 'F');

        solver.solve({vars: ['A', 'B', 'C', 'D', 'E', 'F']});

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 1, B: 1, C: 1, D: 1, E: 1, F: 1},
          {A: 1, B: 1, C: 1, D: 2, E: 1, F: 2},
          {A: 1, B: 1, C: 2, D: 1, E: 2, F: 1},
          {A: 1, B: 1, C: 2, D: 2, E: 2, F: 2},
          {A: 1, B: 2, C: 1, D: 1, E: 2, F: 2},
          {A: 1, B: 2, C: 1, D: 2, E: 2, F: 4},
          {A: 1, B: 2, C: 2, D: 1, E: 4, F: 2},
          {A: 1, B: 2, C: 2, D: 2, E: 4, F: 4},
          {A: 2, B: 1, C: 1, D: 1, E: 2, F: 2},
          {A: 2, B: 1, C: 1, D: 2, E: 2, F: 4},
          {A: 2, B: 1, C: 2, D: 1, E: 4, F: 2},
          {A: 2, B: 1, C: 2, D: 2, E: 4, F: 4},
          {A: 2, B: 2, C: 1, D: 1, E: 4, F: 4},
          {A: 2, B: 2, C: 1, D: 2, E: 4, F: 8},
          {A: 2, B: 2, C: 2, D: 1, E: 8, F: 4},
          {A: 2, B: 2, C: 2, D: 2, E: 8, F: 8},
        ]);
      });

      it('should work with distinct on same result', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 2);
        solver.declRange('B', 0, 2);
        solver.declRange('C', 0, 2);

        solver.distinct(['A', 'B', 'C']);
        solver.distinct(['A', 'B', 'C']);

        solver.solve();

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 1, C: 2},
          {A: 0, B: 2, C: 1},
          {A: 1, B: 0, C: 2},
          {A: 1, B: 2, C: 0},
          {A: 2, B: 0, C: 1},
          {A: 2, B: 1, C: 0},
        ]);
      });

      it('should work with distinct on partially same vars', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 3);
        solver.declRange('B', 0, 3);
        solver.declRange('C', 0, 3);
        solver.declRange('D', 0, 3);

        solver.distinct(['A', 'B', 'C']);
        solver.distinct(['A', 'B', 'D']);

        solver.solve();

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions), JSON.stringify(stripAnonVarsFromArrays(solver.solutions)).replace(/"/g, '')).to.eql([
          {A: 0, B: 1, C: 2, D: 2},
          {A: 0, B: 1, C: 2, D: 3},
          {A: 0, B: 1, C: 3, D: 2},
          {A: 0, B: 1, C: 3, D: 3},
          {A: 0, B: 2, C: 1, D: 1},
          {A: 0, B: 2, C: 1, D: 3},
          {A: 0, B: 2, C: 3, D: 1},
          {A: 0, B: 2, C: 3, D: 3},
          {A: 0, B: 3, C: 1, D: 1},
          {A: 0, B: 3, C: 1, D: 2},
          {A: 0, B: 3, C: 2, D: 1},
          {A: 0, B: 3, C: 2, D: 2},
          {A: 1, B: 0, C: 2, D: 2},
          {A: 1, B: 0, C: 2, D: 3},
          {A: 1, B: 0, C: 3, D: 2},
          {A: 1, B: 0, C: 3, D: 3},
          {A: 1, B: 2, C: 0, D: 0},
          {A: 1, B: 2, C: 0, D: 3},
          {A: 1, B: 2, C: 3, D: 0},
          {A: 1, B: 2, C: 3, D: 3},
          {A: 1, B: 3, C: 0, D: 0},
          {A: 1, B: 3, C: 0, D: 2},
          {A: 1, B: 3, C: 2, D: 0},
          {A: 1, B: 3, C: 2, D: 2},
          {A: 2, B: 0, C: 1, D: 1},
          {A: 2, B: 0, C: 1, D: 3},
          {A: 2, B: 0, C: 3, D: 1},
          {A: 2, B: 0, C: 3, D: 3},
          {A: 2, B: 1, C: 0, D: 0},
          {A: 2, B: 1, C: 0, D: 3},
          {A: 2, B: 1, C: 3, D: 0},
          {A: 2, B: 1, C: 3, D: 3},
          {A: 2, B: 3, C: 0, D: 0},
          {A: 2, B: 3, C: 0, D: 1},
          {A: 2, B: 3, C: 1, D: 0},
          {A: 2, B: 3, C: 1, D: 1},
          {A: 3, B: 0, C: 1, D: 1},
          {A: 3, B: 0, C: 1, D: 2},
          {A: 3, B: 0, C: 2, D: 1},
          {A: 3, B: 0, C: 2, D: 2},
          {A: 3, B: 1, C: 0, D: 0},
          {A: 3, B: 1, C: 0, D: 2},
          {A: 3, B: 1, C: 2, D: 0},
          {A: 3, B: 1, C: 2, D: 2},
          {A: 3, B: 2, C: 0, D: 0},
          {A: 3, B: 2, C: 0, D: 1},
          {A: 3, B: 2, C: 1, D: 0},
          {A: 3, B: 2, C: 1, D: 1},
        ]);
      });

      it('should work with reifiers on same result', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 1);

        solver.isEq('A', 'B', 'C');
        solver.isEq('A', 'B', 'C');

        solver.solve();

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 0, C: 1},
          {A: 0, B: 1, C: 0},
          {A: 1, B: 0, C: 0},
          {A: 1, B: 1, C: 1},
        ]);
      });

      it('should work with reifiers on different result', function() {
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 1);
        solver.declRange('D', 0, 1);

        solver.isEq('A', 'B', 'C');
        solver.isEq('A', 'B', 'D');

        solver.solve();

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 0, C: 1, D: 1},
          {A: 0, B: 1, C: 0, D: 0},
          {A: 1, B: 0, C: 0, D: 0},
          {A: 1, B: 1, C: 1, D: 1},
        ]);
      });

      it('should work with reifiers on dupe different result', function() {
        // this case is slightly different in that it should eliminate the
        // second redirection C->D when A=?B is compiled for D twice
        // (and if it doesn't it should still just work)
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 1);
        solver.declRange('D', 0, 1);

        solver.isEq('A', 'B', 'C');
        solver.isEq('A', 'B', 'D'); // should do D==C, nothing else
        solver.isEq('A', 'B', 'D'); // twice! should be a noop now

        solver.solve();

        // the order is irrelevant..
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 0, C: 1, D: 1},
          {A: 0, B: 1, C: 0, D: 0},
          {A: 1, B: 0, C: 0, D: 0},
          {A: 1, B: 1, C: 1, D: 1},
        ]);
      });

      it('should work with different reifiers on same var (regression)', function() {
        // make sure reifiers arent cached as "reifiers" but as their op
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 1);

        solver.isGte('A', 'B', 'C');
        solver.isLte('A', 'B', 'C');

        solver.solve();

        // the order is irrelevant..
        // because same result var is used, when A!=B it wants different values for C and so it rejects
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 0, C: 1},
          {A: 1, B: 1, C: 1},
        ]);
      });

      it('should work with different reifiers on different var (regression)', function() {
        // make sure reifiers arent cached as "reifiers" but as their op
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 1);
        solver.declRange('D', 0, 1);

        solver.isGte('A', 'B', 'C');
        solver.isLte('A', 'B', 'D');

        solver.solve();

        // the order is irrelevant..
        // unlike before, C and D can solve now
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 0, C: 1, D: 1},
          {A: 0, B: 1, C: 0, D: 1},
          {A: 1, B: 0, C: 1, D: 0},
          {A: 1, B: 1, C: 1, D: 1},
        ]);
      });

      it('should work with a reifier and a constraint on the same op', function() {
        // make sure reifiers arent cached as their op without reifier mark
        let solver = new Solver();
        solver.declRange('A', 0, 1);
        solver.declRange('B', 0, 1);
        solver.declRange('C', 0, 1);

        solver.isEq('A', 'B', 'C'); // should cache A=?B -> C
        solver.eq('A', 'B'); // should not use the cached A=?B for this but force A==B, so there can only be two results

        solver.solve();

        // the order is irrelevant..
        // note that the eq discards the A!=B results so there are only two
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([
          {A: 0, B: 0, C: 1},
          {A: 1, B: 1, C: 1},
        ]);
      });
    });

    describe('nall', function() {

      it('should work with zeroes', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 10]
          nall(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0}]);
      });

      it('should work with A nonzero', function() {
        let solver = new Solver().imp(`
          : A [5 10]
          : B [0 10]
          nall(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 5, B: 0}]);
      });

      it('should work with B nonzero', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [1 8]
          nall(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 1}]);
      });

      it('should reject both nonzero', function() {
        let solver = new Solver().imp(`
          : A [18 20]
          : B [50 100]
          nall(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      it('should work with zeroes', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 10]
          : C [0 10]
          nall(A B C)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, C: 0}]);
      });
    });

    describe('isall', function() {

      it('should work with boolies', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 10]
          : R [0 10]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 0}]);
      });

      it('should work with zero/booly', function() {
        let solver = new Solver().imp(`
          : A [0 0]
          : B [0 10]
          : R [0 10]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: [0, 10], R: 0}]);
      });

      it('should work with booly/zero', function() {
        let solver = new Solver().imp(`
          : A [0 0]
          : B [0 0]
          : R [0 10]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 0}]);
      });

      it('should work with nonzeroes', function() {
        let solver = new Solver().imp(`
          : A [1 10]
          : B [20 60]
          : R [0 10]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 1, B: 20, R: 1}]);
      });

      it('should force a pass when R is nonzero', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 0 23 60]
          : R [1 10]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 1, B: 23, R: 1}]);
      });

      it('should force a pass when R is zero', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 0 23 60]
          : R [0 0]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 0}]);
      });

      it('should reject when R is zero and cant be fulfilled', function() {
        let solver = new Solver().imp(`
          : A [10 10]
          : B [23 60]
          : R [0 0]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      it('should reject when R is nonzero and cant be fulfilled', function() {
        let solver = new Solver().imp(`
          : A [10 10]
          : B [0 0]
          : R [100 2000]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      it('should not fail previous test because R didnt have a 1', function() {
        let solver = new Solver().imp(`
          : A [10 10]
          : B [0 0]
          : R [1 1]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      // TODO: we can enable this test once isall (and friends) are properly implemented and not through product()
      it.skip('should work with very high values that mul beyond sup', function() {
        let solver = new Solver().imp(`
          : A [100000 1000000]
          : B [100000 1000000]
          : R [1 1]
          R = all?(A B)
        `);
        solver.solve({max: 1});
        // internally isall is mapped to a multiply which will try 100000*100000 which is way beyond
        // SUP and results in an empty domain which rejects the whole thing by default. tricky thing
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 100000, B: 100000, R: 1}]);
      });
    });

    describe('isnall', function() {

      it('should work with boolies', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 10]
          : R [0 10]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 1}]);
      });

      it('should work with zero/booly', function() {
        let solver = new Solver().imp(`
          : A [0 0]
          : B [0 10]
          : R [0 10]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: [0, 10], R: 1}]);
      });

      it('should work with booly/zero', function() {
        let solver = new Solver().imp(`
          : A [0 0]
          : B [0 0]
          : R [0 10]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 1}]);
      });

      it('should work with nonzeroes', function() {
        let solver = new Solver().imp(`
          : A [1 10]
          : B [20 60]
          : R [0 10]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 1, B: 20, R: 0}]);
      });

      it('should force a pass when R is nonzero', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 0 23 60]
          : R [1 10]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 1}]);
      });

      it('should force a pass when R is zero', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 0 23 60]
          : R [0 0]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 1, B: 23, R: 0}]);
      });

      it('should reject when R is zero and cant be fulfilled', function() {
        let solver = new Solver().imp(`
          : A [0 0]
          : B [23 60]
          : R [0 0]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      it('should reject when R is nonzero and cant be fulfilled', function() {
        let solver = new Solver().imp(`
          : A [10 10]
          : B [450 2000]
          : R [100 2000]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      it('should not fail previous test because R didnt have a 1', function() {
        let solver = new Solver().imp(`
          : A [10 10]
          : B [450 2000]
          : R [1 1]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      // TODO: we can enable this test once isall (and friends) are properly implemented and not through product()
      it.skip('should work with very high values that mul beyond sup', function() {
        let solver = new Solver().imp(`
          : A [100000 1000000]
          : B [100000 1000000]
          : R [0 0]
          R = nall?(A B)
        `);
        solver.solve({max: 1});
        // internally isall is mapped to a multiply which will try 100000*100000 which is way beyond
        // SUP and results in an empty domain which rejects the whole thing by default. tricky thing
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 100000, B: 100000, R: 0}]);
      });
    });

    describe('isnone', function() {

      it('should work with boolies', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 10]
          : R [0 10]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 1}]);
      });

      it('should work with zero/booly', function() {
        let solver = new Solver().imp(`
          : A [0 0]
          : B [0 10]
          : R [0 10]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 1}]);
      });

      it('should work with booly/zero', function() {
        let solver = new Solver().imp(`
          : A [0 0]
          : B [0 0]
          : R [0 10]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 1}]);
      });

      it('should work with nonzeroes', function() {
        let solver = new Solver().imp(`
          : A [1 10]
          : B [20 60]
          : R [0 10]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 1, B: 20, R: 0}]);
      });

      it('should force a pass when R is nonzero', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 0 23 60]
          : R [1 10]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 0, R: 1}]);
      });

      it('should force a pass when R is zero', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 0 23 60]
          : R [0 0]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 0, B: 23, R: 0}]);
      });

      it('should reject when R is zero and cant be fulfilled', function() {
        let solver = new Solver().imp(`
          : A [0 0]
          : B [0 0]
          : R [0 0]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      it('should reject when R is nonzero and cant be fulfilled', function() {
        let solver = new Solver().imp(`
          : A [10 200]
          : B [0 0]
          : R [100 2000]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      it('should not fail previous test because R didnt have a 1', function() {
        let solver = new Solver().imp(`
          : A [10 200]
          : B [0 0]
          : R [1 1]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      // TODO: we can enable this test once isall (and friends) are properly implemented and not through sum()
      it.skip('should work with very high values that mul beyond sup', function() {
        let solver = new Solver().imp(`
          : A [100000 1000000]
          : B [100000 1000000]
          : R [0 0]
          R = none?(A B)
        `);
        solver.solve({max: 1});
        // internally isall is mapped to a multiply which will try 100000*100000 which is way beyond
        // SUP and results in an empty domain which rejects the whole thing by default. tricky thing
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 100000, B: 100000, R: 0}]);
      });
    });

    describe('and', function() {

      it('should work with boolies', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 10]
          A & B
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 1, B: 1}]);
      });

      it('should reject with zero/booly', function() {
        let solver = new Solver().imp(`
          : A [0 0]
          : B [0 10]
          A & B
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      it('should work with booly/zero', function() {
        let solver = new Solver().imp(`
          : A [0 10]
          : B [0 0]
          A & B
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([]);
      });

      it('should work with nonzeroes', function() {
        let solver = new Solver().imp(`
          : A [1 10]
          : B [8 10]
          A & B
        `);
        solver.solve({max: 1});
        expect(stripAnonVarsFromArrays(solver.solutions)).to.eql([{A: 1, B: 8}]);
      });
    });
  });
});
