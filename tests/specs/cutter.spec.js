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

  it('should iseq 888', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B 11
      : C *
      C = A ==? B
      A > 10
    `);

    expect(solution).to.eql({A: 11, B: 11, C: 1});
  });

  it('should iseq v8v', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A [0 2]
      : C [0 1]
      C = A ==? 2
    `);

    expect(solution).to.eql({A: 0, C: 0});
  });

  it('should isneq', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B 11
      : C *
      C = A !=? B
      A > 10
    `);

    expect(solution).to.eql({A: 11, B: 11, C: 0});
  });

  it('should islt', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B 11
      : C *
      C = A <? B
      A != B
    `);

    expect(solution).to.eql({A: 0, B: 11, C: 1});
  });

  it('should islte', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B 11
      : C *
      C = A <=? B
      A != B
    `);

    expect(solution).to.eql({A: 0, B: 11, C: 1});
  });

  describe('sum', function() {

    it('should remove simple bool case', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 3]
        R = sum(A B C)
      `);

      // should solve because R doesnt actually restrict its sum args (the result of any combination is in R)
      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 0});
    });

    it('should remove simple bool and constant case', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [4 7]
        R = sum(A 4 B C)
      `);

      // should solve because R doesnt actually restrict its sum args (the result of any combination is in R)
      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 4, __1: 4});
    });

    it('should remove if R wraps whole range', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 0 2 2]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        : R [0 5]
        R = sum(A B C D)
      `);

      // should solve because R doesnt actually restrict its sum args (the result of any combination is in R)
      expect(solution).to.eql({A: 0, B: 0, C: 0, D: 0, R: 0});
    });

    it('should rewrite a leaf isnall to nall', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        : R [0 3] # n-1
        R = sum(A B C D)
      `)).to.throw(/strat=throw; .*, 1 constraints, .* ops: nall/);
    });

    it('should detect trivial isall patterns', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        R = sum(A B C)
        S = R ==? 3
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 0, S: 0}); // implicit choices through the solveStack wont bother with 11131
    });

    it('should detect reverse trivial isall patterns', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        S = R ==? 3
        R = sum(A B C)
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 0, S: 0}); // implicit choices through the solveStack wont bother with 11131
    });
  });

  describe('plus', function() {

    it('should rewrite combined isAll to a leaf var', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        R = A + B
        S = R ==? 2
      `);

      expect(solution).to.eql({A: 0, B: 0, R: 0, S: 0}); // implicit choices through the solveStack wont bother with 1121
    });

    it('should isall leaf case be reversable', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        S = R ==? 2
        R = A + B
      `);

      expect(solution).to.eql({A: 0, B: 0, R: 0, S: 0}); // implicit choices through the solveStack wont bother with 1121
    });
  });

  it.skip('should reduce double isnall as nall', function() {
    let solution = solverSolver(`
        @custom var-strat throw
        : a, b, c, d, e, f [0 1]
        A = all?(a b c)
        B = all?(d e f)
        nall(A B)
        # -> nall(a b c d e f)
      `);

    expect(solution).to.eql({});
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
