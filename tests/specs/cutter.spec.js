import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

describe('specs/cutter.spec', function() {

  it('should eq', function() {
    // note that this test doesnt even reach the cutter... eq makes A and alias of B and then removes the eq
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B *
      A == B
      A > 10
    `);

    expect(solution).to.eql({A: 11, B: 11}); // a choice has to be made so min(B)=0, A=B.
  });

  it('should neq', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B *
      A != B
      A > 10
    `);

    expect(solution).to.eql({A: [11, 100000000], B: 0});
  });

  it('should lt', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B *
      A < B
      A > 10
    `);

    expect(solution).to.eql({A: 11, B: 12});
  });

  it('should lte', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B *
      A <= B
      A > 10
    `);

    expect(solution).to.eql({A: 11, B: 11});
  });
/*

  describe('plus', function(){

    it('should work A forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B *
        : C *
        C = A + B
        A > 10
      `);

      expect(solution).to.eql({A: 11, B: 0, C: 11});
    });

    it('should work A forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [5 10]
        C = A + B
      `);

      expect(solution).to.eql({A: 5, B: 1, C: 6});
    });

    it('should work B forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B *
        : C *
        C = A + B
        A > 10
        C >= A
      `);

      expect(solution).to.eql({A: 11, B: 0, C: 11});
    });

    it('should work B forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [5 10]
        C = A + B

        A != C
      `);

      expect(solution).to.eql({A: 5, B: 1, C: 6});
    });

    it('should work C forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B *
        : C *
        C = A + B
        A > 10
        A != B
      `);

      expect(solution).to.eql({A: 11, B: 0, C: 11});
    });

    it('should work C forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [1 10]
        C = A + B

        A != B
      `);

      expect(solution).to.eql({A: 5, B: 1, C: 6});
    });
  });

  describe('minus', function(){

    it('should work A forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B *
        : C *
        C = A - B
        A > 10
      `);

      expect(solution).to.eql({A: 11, B: 11, C: 0});
    });

    it('should work A forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [5 10]
        C = A - B
      `);

      expect(solution).to.eql({A: 6, B: 1, C: 5});
    });

    it('should still maintain proper distance between B and C', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [0 10]
        C = A - B
      `);

      expect(solution).to.eql({A: 6, B: 1, C: 5});
    });

    it('should work B forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B *
        : C *
        C = A - B
        A > 10
        C >= A
      `);

      expect(solution).to.eql({A: 11, B: 11, C: 0});
    });

    it('should work B forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [5 10]
        C = A - B

        A != C
      `);

      expect(solution).to.eql({A: 6, B: 1, C: 5});
    });

    it('should work C forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B *
        : C *
        C = A - B
        A > 10
        A != B
      `);

      expect(solution).to.eql({A: 11, B: 11, C: 0});
    });

    it('should work C forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [1 10]
        C = A - B

        A != B
      `);

      expect(solution).to.eql({A: 5, B: 1, C: 4});
    });
  });

  describe('mul', function(){

    it('should work A forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B *
        : C *
        C = A * B
        A > 10
      `);

      expect(solution).to.eql({A: 11, B: 0, C: 0});
    });

    it('should work A forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [5 10]
        C = A - B
      `);

      expect(solution).to.eql({A: 6, B: 1, C: 5});
    });

    it('should work B forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B *
        : C *
        C = A * B
        A > 10
        A != C
      `);

      expect(solution).to.eql({A: 11, B: 0, C: 0});
    });

    it('should work B forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [5 10]
        C = A - B

        A != C
      `);

      expect(solution).to.eql({A: 6, B: 1, C: 5});
    });

    it('should work C forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B *
        : C *
        C = A * B
        A > 10
        A != B
      `);

      expect(solution).to.eql({A: 11, B: 0, C: 0});
    });

    it('should work C forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [1 10]
        : C [1 10]
        C = A - B

        A != B
      `);

      expect(solution).to.eql({A: 5, B: 1, C: 4});
    });
  });

  describe('div', function(){

    it('should reject a B=0', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B 0
        : C *
        C = A / B
      `);

      expect(solution).to.eql(false);
    });

    it('should work A forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B [0 1000]
        : C *
        C = A / B
      `);

      expect(solution).to.eql({A: 0, B: [1, 1000], C: 0});
    });

    it('should work A forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [5 10]
        : C [1 10]
        C = A / B
      `);

      expect(solution).to.eql({A: 5, B: 5, C: 1});
    });

    it('should work B forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B [0 1000]
        : C *
        C = A / B
        C >= A
      `);

      expect(solution).to.eql({A: 0, B: [1, 1000], C: 0});
    });

    it('should work B forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [5 10]
        : C [1 10]
        C = A / B

        A != C
      `);

      expect(solution).to.eql({A: 5, B: 5, C: 1});
    });

    it('should work C forced with a zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A *
        : B [0 1000]
        : C *
        C = A / B
        A != B
      `);

      // note: B=1 because the != cut needs to force it, not the div. the div-cut still runs, which is being tested here
      expect(solution).to.eql({A: 0, B: 1, C: 0});
    });

    it('should work C forced with a non-zero', function(){
      let solution = solverSolver(`
        @custom var-strat throw
        : A [5 10]
        : B [5 10]
        : C [1 10]
        C = A / B

        A >= B
      `);

      expect(solution).to.eql({A: 5, B: 5, C: 1});
    });
  });

  it('should isEq', function(){
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B *
      : C *
      C = A ==? B
      A > 10
    `);

    expect(solution).to.eql({A: [11, 100000000], B: 0, C:0});
  });

  it('should isNeq', function(){
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B *
      : C *
      C = A !=? B
      A > 10
    `);

    expect(solution).to.eql({A: [11, 100000000], B: 0, C:1});
  });

  it('should isLt', function(){
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B *
      : C *
      C = A <? B
      A > 10
    `);

    expect(solution).to.eql({A: [1, 100000000], B: 0});
  });

  it('should isLte', function(){
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B *
      : C *
      C = A <=? B
      A > 10
    `);

    expect(solution).to.eql({A: [1, 100000000], B: 0});
  });
*/
});
