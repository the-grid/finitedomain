import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

describe('specs/minimizer.spec', function() {

  describe('AND', function() {

    function test(A, B, r) {
      it(`should work: ${A} & ${B} = ${JSON.stringify(r)}`, function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A & B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 1, B: 1});
    test('0', '[0 1]', false);
    test('[0 1]', '0', false);
    test('1', '[0 1]', {A: 1, B: 1});
    test('[0 1]', '1', {A: 1, B: 1});
    test('0', '0', false);
    test('0', '1', false);
    test('1', '0', false);
    test('1', '1', {A: 1, B: 1});
    test('[5 10]', '1', {A: [5, 10], B: 1});
    test('1', '[5 10]', {A: 1, B: [5, 10]});
    test('[5 10]', '0', false);
    test('0', '[5 10]', false);
    test('[10 20]', '[5 10]', {A: [10, 20], B: [5, 10]});
  });

  describe('OR', function() {

    function test(A, B, r) {
      it(`should work: ${A} | ${B} = ${JSON.stringify(r)}`, function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A | B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 0, B: 1}); // note: it will first force solve A to min(A)=0 so then B must be 1.
    test('0', '[0 1]', {A: 0, B: 1});
    test('[0 1]', '0', {A: 1, B: 0});
    test('1', '[0 1]', {A: 1, B: [0, 1]});
    test('[0 1]', '1', {A: [0, 1], B: 1});
    test('0', '0', false);
    test('0', '1', {A: 0, B: 1});
    test('1', '0', {A: 1, B: 0});
    test('1', '1', {A: 1, B: 1});
    test('[5 10]', '1', {A: [5, 10], B: 1});
    test('1', '[5 10]', {A: 1, B: [5, 10]});
    test('[5 10]', '0', {A: [5, 10], B: 0});
    test('0', '[5 10]', {A: 0, B: [5, 10]});
    test('[10 20]', '[5 10]', {A: [10, 20], B: [5, 10]});
  });

  describe('XOR', function() {

    function test(A, B, r) {
      it(`should work: ${A} ^ ${B} = ${JSON.stringify(r)}`, function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A ^ B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 0, B: 1});
    test('0', '[0 1]', {A: 0, B: 1});
    test('[0 1]', '0', {A: 1, B: 0});
    test('1', '[0 1]', {A: 1, B: 0});
    test('[0 1]', '1', {A: 0, B: 1});
    test('0', '0', false);
    test('0', '1', {A: 0, B: 1});
    test('1', '0', {A: 1, B: 0});
    test('1', '1', false);
    test('[5 10]', '1', false);
    test('1', '[5 10]', false);
    test('[5 10]', '0', {A: [5, 10], B: 0});
    test('0', '[5 10]', {A: 0, B: [5, 10]});
    test('[10 20]', '[5 10]', false);
  });

  describe('NAND', function() {

    function test(A, B, r) {
      it(`should work: ${A} !& ${B} = ${JSON.stringify(r)}`, function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A !& B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 0, B: [0, 1]});
    test('0', '[0 1]', {A: 0, B: [0, 1]});
    test('[0 1]', '0', {A: [0, 1], B: 0});
    test('1', '[0 1]', {A: 1, B: 0});
    test('[0 1]', '1', {A: 0, B: 1});
    test('0', '0', {A: 0, B: 0});
    test('0', '1', {A: 0, B: 1});
    test('1', '0', {A: 1, B: 0});
    test('1', '1', false);
    test('[5 10]', '1', false);
    test('1', '[5 10]', false);
    test('[5 10]', '0', {A: [5, 10], B: 0});
    test('0', '[5 10]', {A: 0, B: [5, 10]});
    test('[10 20]', '[5 10]', false);
  });

  describe('XNOR', function() {

    function test(A, B, r) {
      it(`should work: ${A} !^ ${B} = ${JSON.stringify(r)}`, function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A ${A}
          : B ${B}
          A !^ B
        `);

        expect(solution).to.eql(r);
      });
    }

    test('[0 1]', '[0 1]', {A: 0, B: 0});
    test('0', '[0 1]', {A: 0, B: 0});
    test('[0 1]', '0', {A: 0, B: 0});
    test('1', '[0 1]', {A: 1, B: 1});
    test('[0 1]', '1', {A: 1, B: 1});
    test('0', '0', {A: 0, B: 0});
    test('0', '1', false);
    test('1', '0', false);
    test('1', '1', {A: 1, B: 1});
    test('[5 10]', '1', {A: [5, 10], B: 1});
    test('1', '[5 10]', {A: 1, B: [5, 10]});
    test('[5 10]', '0', false);
    test('0', '[5 10]', false);
    test('[10 20]', '[5 10]', {A: [10, 20], B: [5, 10]});
  });

  it('should parse literals in the math ops', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [0 1]
      : B [0 1]
      : C [0 1]

      A = B + C
      1 = B + C
      A = 1 + C
      A = B + 1
      1 = 1 + C
      A = 1 + 1
      1 = B + 1
      1 = 1 + 1

      A = B - C
      1 = B - C
      A = 1 - C
      A = B - 1
      1 = 1 - C
      A = 1 - 1
      1 = B - 1
      1 = 1 - 1

      A = B * C
      1 = B * C
      A = 1 * C
      A = B * 1
      1 = 1 * C
      A = 1 * 1
      1 = B * 1
      1 = 1 * 1

      A = B / C
      1 = B / C
      A = 1 / C
      A = B / 1
      1 = 1 / C
      A = 1 / 1
      1 = B / 1
      1 = 1 / 1
    `);

    expect(solution).to.eql(false);
  });

  describe('regular assignment', function() {

    it('regression; parser was blackholing literal assignments', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : C [1 2]
        A = 0
        C = 2
      `);

      expect(solution).to.eql({A: 0, C: 2});
    });

    it('regression; parser was blackholing regular assignments', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 10]
        : C 2
        A = C
      `);

      expect(solution).to.eql({A: 2, C: 2});
    });

    it('should not ignore unsolvable sum assignment', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 10]
        A = sum(1 2 3 20)
      `);

      expect(solution).to.eql(false);
    });

    it('should not ignore solvable sum assignment', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 50]
        A = sum(1 2 3 20)
      `);

      expect(solution).to.eql({A: 26, __1: 1, __2: 2, __3: 3, __4: 20});
    });
  });

  describe('all nall', function() {

    it('should support nall', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        nall(A B C)
      `)).to.throw(/debug: 3 vars, 1 constraints, current domain state: 0:A:0,1: 1:B:0,1: 2:C:0,1 ops: nall/); // if this fails check if its just the message
    });

    it('should support isall', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        D = all?(A B C)
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: [0, 1], D: 0});
    });

    it('should support isnall', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        D = nall?(A B C)
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: [0, 1], D: 1});
    });
  });
});
