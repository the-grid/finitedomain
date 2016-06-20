import expect from '../fixtures/mocha_proxy.fixt';
import {
  specDomainCreateRange,
  specDomainCreateRanges,
  stripAnonVarsFromArrays,
} from '../fixtures/domain.fixt';
import {
  SUB,
  SUP,
  EMPTY,
} from '../../src/helpers';
import Solver from '../../src/solver';

describe('src/constraint.spec', function() {

  describe('solver integration', function() {

    it('should work without constraints (FIX THIS ONE FIRST)', function() {
      // if this test fails the problem is _probably_ unrelated to constraints... :)
      let solver = new Solver();
      solver.decl('A', 100);
      solver.decl('B', 100);
      let solution = solver.solve({});

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
        solver.decl('B', specDomainCreateRange(100, 101));
        solver.eq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}]);
      });

      it('should work with a simple unsolved vars that do not reject', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 101));
        solver.decl('B', specDomainCreateRange(100, 101));
        solver.eq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}, {A: 101, B: 101}]);
      });

      it('should work with a simple unsolved vars that reduce but do not reject', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 101));
        solver.decl('B', specDomainCreateRange(100, 102));
        solver.eq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}, {A: 101, B: 101}]);
      });

      it('should work with a simple unsolved vars that reject', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 101));
        solver.decl('B', specDomainCreateRange(200, 201));
        solver.eq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
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
        solver.decl('B', specDomainCreateRange(100, 101));
        solver.neq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}]);
      });

      it('should work with a simple unsolved vars', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 101));
        solver.decl('B', specDomainCreateRange(100, 101));
        solver.neq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}, {A: 101, B: 100}]);
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
        solver.decl('B', specDomainCreateRange(100, 101));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}]);
      });

      it('should work when A >= B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 101));
        solver.decl('B', specDomainCreateRange(100, 100));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      it('should work when A <= B <= A', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 102));
        solver.decl('B', specDomainCreateRange(101, 101));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}]);
      });

      it('should work when B <= A <= B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(101, 101));
        solver.decl('B', specDomainCreateRange(100, 102));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 102}]);
      });

      it('should work A > B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(101, 101));
        solver.decl('B', specDomainCreateRange(100, 100));
        solver.lt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
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
        solver.decl('B', specDomainCreateRange(100, 101));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}, {A: 100, B: 101}]);
      });

      it('should work when A >= B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 101));
        solver.decl('B', specDomainCreateRange(100, 100));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}]);
      });

      it('should work when A <= B <= A', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 102));
        solver.decl('B', specDomainCreateRange(101, 101));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 101}, {A: 101, B: 101}]);
      });

      it('should work when B <= A <= B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(101, 101));
        solver.decl('B', specDomainCreateRange(100, 102));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 101}, {A: 101, B: 102}]);
      });

      it('should work A > B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(101, 101));
        solver.decl('B', specDomainCreateRange(100, 100));
        solver.lte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
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
        solver.decl('B', specDomainCreateRange(100, 101));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      it('should work when A >= B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 101));
        solver.decl('B', specDomainCreateRange(100, 100));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}]);
      });

      it('should work when A <= B <= A', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 102));
        solver.decl('B', specDomainCreateRange(101, 101));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 102, B: 101}]);
      });

      it('should work when B <= A <= B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(101, 101));
        solver.decl('B', specDomainCreateRange(100, 102));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}]);
      });

      it('should work A > B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(101, 101));
        solver.decl('B', specDomainCreateRange(100, 100));
        solver.gt('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}]);
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
        solver.decl('B', specDomainCreateRange(100, 101));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}]);
      });

      it('should work when A >= B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 101));
        solver.decl('B', specDomainCreateRange(100, 100));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 100}, {A: 101, B: 100}]);
      });

      it('should work when A <= B <= A', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 102));
        solver.decl('B', specDomainCreateRange(101, 101));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 101}, {A: 102, B: 101}]);
      });

      it('should work when B <= A <= B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(101, 101));
        solver.decl('B', specDomainCreateRange(100, 102));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}, {A: 101, B: 101}]);
      });

      it('should work A > B', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(101, 101));
        solver.decl('B', specDomainCreateRange(100, 100));
        solver.gte('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 101, B: 100}]);
      });
    });

    describe('callback', function() {

      it('should be able to fail everything', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 105));
        solver.callback(['A'], function() { return false; });
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      it('should be able to fail uneven choices', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 105));
        solver.callback(['A'], function(space, vars) {
          if (space.vardoms[vars[0]][0] === space.vardoms[vars[0]][1] && (space.vardoms[vars[0]][0] % 2) === 0) {
            return false;
          }
          return true;
        });
        let solution = solver.solve({max: 10});

        expect(solution).to.eql([{A: 101}, {A: 103}, {A: 105}]);
      });

      it('should be able to fail even choices', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 105));
        solver.callback(['A'], function(space, vars) {
          if (space.vardoms[vars[0]][0] === space.vardoms[vars[0]][1] && (space.vardoms[vars[0]][0] % 2) === 1) {
            return false;
          }
          return true;
        });
        let solution = solver.solve({max: 10});

        expect(solution).to.eql([{A: 100}, {A: 102}, {A: 104}]);
      });
    });

    describe('plus', function() {

      it('should work with simple case', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 101);
        solver.decl('C', specDomainCreateRange(150, 250));
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

      testABC(specDomainCreateRange(100, 110), specDomainCreateRange(50, 60), specDomainCreateRange(150, 151), [
        {A: 100, B: 50, C: 150},
        {A: 100, B: 51, C: 151},
        {A: 101, B: 50, C: 151},
      ]);

      it('should work without C', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 102));
        solver.decl('B', specDomainCreateRange(50, 52));
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
        solver.decl('A', specDomainCreateRange(100, 150));
        solver.decl('B', specDomainCreateRange(SUB, 50));
        solver.decl('C', 200);
        solver.plus('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 150, B: 50, C: 200}]);
      });
    });

    describe('minus', function() {

      it('should work with simple case', function() {
        let solver = new Solver();
        solver.decl('A', 500);
        solver.decl('B', 100);
        solver.decl('C', 400);
        solver.min('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 500, B: 100, C: 400}]);
      });

      it('should reject if result is negative', function() {
        let solver = new Solver();
        solver.decl('A', 100);
        solver.decl('B', 101);
        solver.decl('C', EMPTY);
        solver.min('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([]);
      });

      function testABC(A, B, C, solves) {
        it(`should work with A=${A} B=${B} C=${C} -> ${solves}`, function() {
          let solver = new Solver();
          solver.decl('A', A);
          solver.decl('B', B);
          solver.decl('C', C);
          solver.min('A', 'B', 'C');
          let solution = solver.solve({});

          expect(solution).to.eql(solves);
        });
      }

      testABC(0, 1, 1, []);
      testABC(1, 0, 1, [{A: 1, B: 0, C: 1}]);
      testABC(0, 0, 0, [{A: 0, B: 0, C: 0}]);
      testABC(1, 1, 0, [{A: 1, B: 1, C: 0}]);

      testABC(specDomainCreateRange(100, 110), specDomainCreateRange(50, 60), specDomainCreateRange(150, 151), []);
      testABC(specDomainCreateRange(100, 110), specDomainCreateRange(50, 60), specDomainCreateRange(59, 100), [
        // Note: order irrelevant to test
        {A: 109, B: 50, C: 59},
        {A: 110, B: 50, C: 60},
        {A: 110, B: 51, C: 59},
      ]);

      it('should work without C', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(100, 102));
        solver.decl('B', specDomainCreateRange(50, 52));
        solver.min('A', 'B');
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
        solver.decl('A', specDomainCreateRange(100, 150));
        solver.decl('B', specDomainCreateRange(50, SUP));
        solver.decl('C', 100);
        solver.min('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 150, B: 50, C: 100}]);
      });
    });

    describe('ring-mul', function() {

      it('should work with simple case', function() {
        let solver = new Solver();
        solver.decl('A', 50);
        solver.decl('B', 10);
        solver.decl('C', 500);
        solver.times('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 50, B: 10, C: 500}]);
      });

      function testABC(A, B, C, solves) {
        it(`should work with A=${A} B=${B} C=${C} -> ${solves}`, function() {
          let solver = new Solver();
          solver.decl('A', A);
          solver.decl('B', B);
          solver.decl('C', C);
          solver.times('A', 'B', 'C');
          let solution = solver.solve({});

          expect(solution).to.eql(solves);
        });
      }

      testABC(1, 1, 1, [{A: 1, B: 1, C: 1}]);
      testABC(specDomainCreateRange(100, 110), specDomainCreateRange(50, 60), specDomainCreateRange(150, 151), []);

      it('should work without C', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(50, 52));
        solver.decl('B', specDomainCreateRange(70, 72));
        solver.times('A', 'B');
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
        solver.decl('A', specDomainCreateRange(100, 150));
        solver.decl('B', specDomainCreateRange(10, SUP));
        solver.decl('C', 1000);
        solver.times('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 10, C: 1000}]);
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
    //  testABC(specDomainCreateRange(100, 110), specDomainCreateRange(5, 10, true), specDomainCreateRange(1, 2, true), []);
    //  testABC(specDomainCreateRange(100, 110), specDomainCreateRange(5, 10, true), specDomainCreateRange(10, 20, true), [
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
    //    solver.decl('B', specDomainCreateRange(5, 10, true));
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
      testABC(specDomainCreateRange(100, 110), specDomainCreateRange(50, 60), specDomainCreateRange(150, 151), []);

      it('should work without C', function() {
        let solver = new Solver();
        solver.decl('A', specDomainCreateRange(70, 72));
        solver.decl('B', specDomainCreateRange(50, 52));
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
        solver.decl('A', specDomainCreateRange(100, 150));
        solver.decl('B', specDomainCreateRange(10, SUP));
        solver.decl('C', 1000);
        solver.mul('A', 'B', 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 100, B: 10, C: 1000}]);
      });

      it('should solve this old test case', function() {
        let solver = new Solver({});

        solver.addVar('A', [0, 10]);
        solver.addVar('B', [0, 10]);
        solver.addVar('MIN', [19, 19]);
        solver.addVar('MAX', [21, 21]);
        solver.addVar('S', [0, 100]);

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
      testABC(specDomainCreateRange(100, 101), specDomainCreateRange(50, 51), specDomainCreateRange(150, 151), specDomainCreateRange(300, 321), [
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
        solver.decl('A', specDomainCreateRange(70, 72));
        solver.decl('B', specDomainCreateRange(50, 52));
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
        solver.decl('A', specDomainCreateRange(100, 150));
        solver.decl('B', specDomainCreateRange(99, SUP));
        solver.decl('C', 200);
        solver.sum(['A', 'B'], 'C');
        let solution = solver.solve({});

        expect(solution).to.eql([
          {A: 100, B: 100, C: 200},
          {A: 101, B: 99, C: 200},
        ]);
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
      testABC(specDomainCreateRange(100, 101), specDomainCreateRange(50, 51), specDomainCreateRange(150, 151), specDomainCreateRange(750000, 777801), [
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
        solver.decl('A', specDomainCreateRange(70, 72));
        solver.decl('B', specDomainCreateRange(50, 52));
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
        solver.decl('A', specDomainCreateRange(100, 150));
        solver.decl('B', specDomainCreateRange(99, SUP));
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
      test(specDomainCreateRange(4, 7, true), 5, 6, [
        {A: 4, B: 5, C: 6},
        {A: 7, B: 5, C: 6},
      ]);
      test(specDomainCreateRanges([4, 5], [100, 101]), specDomainCreateRange(4, 5, true), specDomainCreateRange(100, 101), [
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
        solver.addVar({
          id: 'A',
          domain: specDomainCreateRange(0, 0, true),
          distributeOptions: {
            distributor_name: 'markov',
            legend: [0],
            matrix: [
              {vector: [1]},
            ],
          },
        });

        let solution = solver.solve({});
        expect(solution).to.eql([{A: 0}]);
      });

      it('should reject if solved value is not in legend', function() {
        let solver = new Solver();
        solver.addVar({
          id: 'A',
          domain: specDomainCreateRange(0, 0, true),
          distributeOptions: {
            distributor_name: 'markov',
            legend: [1],
            matrix: [
              {vector: [1]},
            ],
          },
        });

        let solution = solver.solve({});
        expect(solution).to.eql([]); // no value in legend appears in domain so it rejects
      });

      describe('matrix with one row', function() {

        it('should reject if solved value does not have prob>0', function() {
          let solver = new Solver();
          solver.addVar({
            id: 'A',
            domain: specDomainCreateRange(0, 0, true),
            distributeOptions: {
              distributor_name: 'markov',
              legend: [0],
              matrix: [
                {vector: [0]},
              ],
            },
          });

          let solution = solver.solve({});
          expect(solution).to.eql([]); // solved to 0 but the only zero in legend has prob 0 and cannot be picked
        });

        it('should pass if solved value does has prob>0', function() {
          let solver = new Solver();
          solver.addVar({
            id: 'A',
            domain: specDomainCreateRange(0, 0, true),
            distributeOptions: {
              distributor_name: 'markov',
              legend: [0],
              matrix: [
                {vector: [1]},
              ],
            },
          });

          let solution = solver.solve({});
          expect(solution).to.eql([{A: 0}]); // solved value has prob>0 in legend so can be picked
        });
      });

      describe('multi layer matrix', function() {

        it('should pass if second row gives value prob>0', function() {
          let solver = new Solver();
          solver.addVar({
            id: 'A',
            domain: specDomainCreateRange(0, 0, true),
            distributeOptions: {
              distributor_name: 'markov',
              legend: [0],
              matrix: [{
                vector: [0],
                boolean: solver.num(0),
              }, {
                vector: [1],
              }],
            },
          });

          let solution = solver.solve({});
          expect(stripAnonVarsFromArrays(solution)).to.eql([{A: 0}]);
        });

        it('should reject if second row gives value prob=0', function() {

          let solver = new Solver();
          solver.addVar({
            id: 'A',
            domain: specDomainCreateRange(0, 0, true),
            distributeOptions: {
              distributor_name: 'markov',
              legend: [0],
              matrix: [{
                vector: [1],
                boolean: solver.num(0),
              }, {
                vector: [0],
              }],
            },
          });

          let solution = solver.solve({});
          expect(solution).to.eql([]);
        });
      });
    });
  });
});
