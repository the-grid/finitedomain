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

});
