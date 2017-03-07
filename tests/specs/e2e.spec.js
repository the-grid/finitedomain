import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

class MockSolver {
  imp() { return this; }
  solve() {
    return this.solutions;
  }
}

describe('specs/cutter.spec', function() {

  describe('simple case', function() {

    it('should work without hashing the var names in the dsl', function() {
      let dsl = `
        : A [0 10]
        : B [0 10]
        : C [0 10]
        A != B
        A != C
        B != C
        C = A + B
      `;

      let expecting = {
        A: 1,
        B: 2,
        C: 3,
      };

      // this hack means we cant run concurrent solves. i think that's fine.
      MockSolver.prototype.solutions = [expecting];
      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

      expect(solution).to.eql(expecting);
      expect(solution).to.not.equal(expecting); // not by ref
    });

    it('should work when hashing the var names in the dsl', function() {
      let dsl = `
        : A [0 10]
        : B [0 10]
        : C [0 10]
        A != B
        A != C
        B != C
        C = A + B
      `;

      // this hack means we cant run concurrent solves. i think that's fine.
      MockSolver.prototype.solutions = [{
        $0$: 1,
        $1$: 2,
        $2$: 3,
      }];
      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: true});

      expect(solution).to.eql({
        A: 1,
        B: 2,
        C: 3,
      });
    });
  });

  describe('sum', function() {

    it('should solve a sum that mimics a isnall', function() {
      let dsl = `
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        : R [0 3] # n-1
        R = sum(A B C D)
        @custom noleaf A B C D
      `;

      MockSolver.prototype.solutions = [{A: 0, B: 1, C: 1, D: 0}];

      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: 0, B: 1, C: 1, D: 0, R: 2});
    });
  });

  describe('xnor', function() {

    it('should solve a sum that mimics a isnall with A=booly', function() {
      let dsl = `
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 5
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `;

      MockSolver.prototype.solutions = [{A: 0, B: 1, C: 1, D: 0}];

      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: 0, B: 1, C: 0});
    });

    it('should solve a sum that mimics a isnall with A>0', function() {
      let dsl = `
        : A [1 1 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 5
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `;

      MockSolver.prototype.solutions = [{A: 0, B: 1, C: 1, D: 0}];

      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: [1, 1, 5, 5], B: 5, C: 1});
    });

    it('should solve a sum that mimics a isnall with C>0', function() {
      let dsl = `
        : A [0 0 5 5]
        : B [0 10]
        : C [1 1]
        C = B ==? 5
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `;

      MockSolver.prototype.solutions = [{A: 0, B: 1, C: 1, D: 0}];

      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: 5, B: 5, C: 1});
    });
  });
});
