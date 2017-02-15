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

  it('should iseq vvv', function() {
    let solution = solverSolver(`
      @custom var-strat throw
      : A *
      : B 11
      : C [0 1]
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
      @custom noleaf A B
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
      @custom noleaf A
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
        @custom noleaf A B C
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
        @custom noleaf A B C
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
        @custom noleaf A B C D
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
        @custom noleaf A B C D
      `)).to.throw(/ops: nall /);
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

  describe('xnor booly', function() {

    it('should solve the base case', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C
        @custom noleaf A B
      `)).to.throw(/ops: iseq /);
    });

    it('should eliminate xnor when the arg is booly', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C
        @custom noleaf A B
      `)).to.throw(/debug: .* ops: iseq /);
      // note: this may change/improve but the relevant part is that the xnor is gone!
    });

    it('should eliminate xnor when the other arg is booly', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        C !^ A
        @custom noleaf A B
      `)).to.throw(/debug: .* ops: iseq /);
      // note: this may change/improve but the relevant part is that the xnor is gone!
    });

    it('should eliminate xnor when both args are booly 8', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `)).to.throw(/ops: iseq /);
    });

    it('should eliminate xnor when both args are booly 5', function() {
      //why solve if iseq 8 but not when iseq 5?
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 5
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `)).to.throw(/ops: iseq /);
    });

    it('should not apply trick to non-boolys', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C
        @custom noleaf A B C
      `)).to.throw(/debug: .* ops: iseq,xnor /);
    });
  });

  describe('lte_rhs+isall_r trick', function() {

    it('should morph the basic case', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        R = all?(A B)
        C <= R
        # -->  C <= A, C <= B
        @custom noleaf A B C
      `)).to.throw(/ops: lte,lte /);
    });

    it('should morph three args if there is enough space', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D, X [0 1]
        : M = 1
        X = all?(A B C)
        D <= X
        # -->  D <= A, D <= B, D <= C
        M == M      # recycle-able space after eliminating the tautology
        M == M      # recycle-able space after eliminating the tautology
        M == M      # recycle-able space after eliminating the tautology
        M == M      # recycle-able space after eliminating the tautology
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,lte,lte /);
    });

    describe('should not morph the basic case if isall args are not boolean', function() {

      function test(bools, nonbools) {
        it('bools: ' + bools + ', nonbools: ' + nonbools, function() {
          expect(_ => solverSolver(`
            @custom var-strat throw
            : ${bools} [0 1]
            : ${nonbools} [0 10]
            R = all?(A B)
            C <= R

            @custom noleaf A B C
          `)).to.throw(/ops: isall,lte /);
        });
      }

      test('B,R,C', 'A');
      test('A,R,C', 'B');
      test('C,R', 'A,B');
    });

    describe('should not morph the multi-isall case if not boolean', function() {

      function test(bools, nonbools) {
        it('bools: ' + bools + ', nonbools: ' + nonbools, function() {
          expect(_ => solverSolver(`
            @custom var-strat throw
            : ${bools} [0 1]
            : ${nonbools} [0 10]
            : M = 1
            X = all?(A B C)
            D <= X
            M == M      # recycle-able space after eliminating the tautology
            M == M      # recycle-able space after eliminating the tautology
            M == M      # recycle-able space after eliminating the tautology
            M == M      # recycle-able space after eliminating the tautology
            @custom noleaf A B C D
          `)).to.throw(/ops: isall,lte /);
        });
      }

      test('B,C,D,R', 'A');
      test('A,C,D,R', 'B');
      test('A,B,D,R', 'C');
      test('C,D,R', 'A,B');
      test('B,D,R', 'A,C');
      test('D,R', 'A,B,C');
    });
  });

  describe('lte_rhs+neq trick', function() {

    it('should rewrite base case of an lte and neq to a nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= B
        B != C
        # -> A !& C
        @custom noleaf A C
      `)).to.throw(/ops: nand /);
    });

    it('should rewrite swapped base case of an lte and neq to a nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        B != C
        A <= B
        # -> A !& C
        @custom noleaf A C
      `)).to.throw(/ops: nand /);
    });

    it('should not do lte+neq trick for non bools', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 2]
        : C [0 1]
        A <= B
        B != C
        # -> A !& C
        @custom noleaf A C
      `)).to.throw(/ops: lte,neq /);
    });
  });

  describe('lte_lhs+nand trick', function() {

    it('should eliminate base case of an lte and nand', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= B
        A !& C
        # -> A is leaf var
        @custom noleaf B C
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0});
    });

    it('should eliminate swapped base case of an lte and nand', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A !& C
        A <= B
        # -> A is leaf var
        @custom noleaf B C
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0});
    });

    it('should not do lte+neq trick for rhs of lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A !& C
        B <= A
        @custom noleaf B C
      `)).to.throw(/ops: lte,nand /);
    });

    it('should not do lte+neq trick for non bools', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 2]
        : C [0 1]
        A <= B
        A !& C
        # -> A !& C
        @custom noleaf B C
      `)).to.throw(/ops: lte,nand /);
    });
  });

  describe.skip('lte_lhs+isall_r trick', function() {

    it('should eliminate base case of an lte-lhs and isall-r', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        A <= B
        A = all?(C D)
        # -> nall(B C D)
        @custom noleaf B C D
      `)).to.throw(/ops: nall /);
    });

    it('should eliminate swapped base case of an lte-lhs and isall-r', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        A = all?(C D)
        A <= B
        # -> nall(B C D)
        @custom noleaf B C D
      `)).to.throw(/ops: nall /);
    });

    it('should not do lte-lhs + isall-r trick for rhs of lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        A = all?(C D)
        B <= A
        @custom noleaf B C D
      `)).to.throw(/ops: lte,lte /);
    });

    it('should not do lte_lhs+neq trick for non bools', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 2]
        : C [0 1]
        : D [0 1]
        A <= B
        A = all?(C D)
        @custom noleaf B C D
      `)).to.throw(/ops: isall,lte /);
    });

    it('should work with more than two args to isall', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C, D, E, F [0 1]
        A <= B
        A = all?(C D E F)
        # -> nall(B C D E F)
        @custom noleaf B C D E F
      `)).to.throw(/ops: nall /);
    });
  });

  describe('isall_r+nall trick', function() {

    it('should rewrite base case v1 of an isall and nall to a nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        A = all?(B C)
        nall(A B D)
        # -> A = all?(B C), A !& D
        # when A is 1, B and C are 1, so D must be 0 (for the nall)
        # when A is 0, B or C is 0, so the nall is resolved
        # when D is 1, A can't be 1 because then B is also one and the nall would break
        @custom noleaf B C D
      `)).to.throw(/ops: isall,nand /);
    });

    describe('all variations of nall arg order', function() {

      function test(A, B, C) {
        it('nall(' + A + ',' + B + ',' + C + ')', function() {
          expect(_ => solverSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C [0 1]
          : D [0 1]
          A = all?(B C)
          nall(${A} ${B} ${C})

          @custom noleaf B C D
        `)).to.throw(/ops: isall,nand /);
        });
      }

      test('A', 'B', 'D');
      test('A', 'D', 'B');
      test('B', 'A', 'D');
      test('B', 'D', 'A');
      test('D', 'A', 'B');
      test('D', 'B', 'A');
    });
  });

  describe('isall+nand trick', function() {

    it('should eliminate base case of an lte-lhs and nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 1]
        R = all?(A B)
        R !& C
        # -> nall(A B C)

        @custom noleaf A B C
      `)).to.throw(/ops: nall /);
    });

    it('should eliminate base case of an lte-lhs and reversed nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 1]
        R = all?(A B)
        C !& R
        # -> nall(A B C)

        @custom noleaf A B C
      `)).to.throw(/ops: nall /);
    });

    it('should eliminate swapped base case of an lte-lhs and nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 1]
        R !& C
        R = all?(A B)
        # -> nall(A B C)
        @custom noleaf A B C
      `)).to.throw(/ops: nall /);
    });

    it('should eliminate swapped base case of an lte-lhs and reversed nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 1]
        C !& R
        R = all?(A B)
        # -> nall(A B C)
        @custom noleaf A B C
      `)).to.throw(/ops: nall /);
    });
  });

  describe('2xlte trick', function() {

    it('should eliminate base case a double lte', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= B
        A <= C
        # -> A is a leaf var, eliminate the constraints
        @custom noleaf B C
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0});
    });

    it('should eliminate swapped base case a double lte', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= C
        A <= B
        # -> A is a leaf var, eliminate the constraints
        @custom noleaf B C
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0});
    });
  });

  describe('lte_lhs+neq trick', function() {

    it('should eliminate base case an lte_lhs and neq', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= B
        A != C
        # -> B | C, A is a leaf
        @custom noleaf B C
      `)).to.throw(/ops: or /);
    });

    it('should eliminate swapped base case an lte_lhs and neq', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A != C
        A <= B
        # -> B | C, A is a leaf
        @custom noleaf B C
      `)).to.throw(/ops: or /);
    });
  });

  describe('nand+neq+lte_lhs trick', function() {

    it('should eliminate base case a nand, neq, lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A !& B
        A != C
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or /);
    });

    it('should eliminate base case a reverse nand, neq, lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        B !& A
        A != C
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or /);
    });

    it('should eliminate base case a nand, reverse neq, lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A !& B
        C != A
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or /);
    });

    it('should eliminate base case a reverse nand, reverse neq, lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        B !& A
        C != A
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or /);
    });

    it('should eliminate swapped base case a neq, nand, lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A != C
        A !& B
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or /);
    });

    it('should eliminate swapped base case a neq, lte, nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A != C
        A <= D
        A !& B
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or /);
    });

    it('should eliminate swapped base case a lte, neq, nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A <= D
        A != C
        A !& B
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or /);
    });

    it('should eliminate swapped base case a lte, nand, neq', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A <= D
        A !& B
        A != C
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or /);
    });
  });

  describe('neq+lte_lhs+lte_rhs trick', function() {

    it('should eliminate base case neq, lte, lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A != B
        A <= C
        D <= A
        # -> B | C, B !& D, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: nand,or /);
    });

    it('should eliminate base case reversed neq, lte, lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        B != A
        A <= C
        D <= A
        # -> B | C, B !& D, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: nand,or /);
    });

    it('should eliminate base case lte, neq, lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A <= C
        A != B
        D <= A
        # -> B | C, B !& D, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: nand,or /);
    });

    it('should eliminate base case lte, lte, neq', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        D <= A
        A <= C
        A != B
        # -> B | C, B !& D, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: nand,or /);
    });
  });

  describe('neq+lte++ trick', function() {

    it('should morph neq, lte, lte with perfect fit', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : X, Y [0 1]
        A <= X
        B <= X
        Y != X
        # -> Y = none?(A B)  and X a leaf

        @custom noleaf A B Y
      `)).to.throw(/ops: nand,nand /);
    });

    it('should morph neq, lte, lte with room to spare', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : X, Y [0 1]
        A <= X
        B <= X
        Y != X
        # -> Y = none?(A B)  and X a leaf

        @custom noleaf A B Y
      `)).to.throw(/ops: nand,nand /);
    });
  });

  describe('neq+nand trick', function() {

    it('should morph neq, nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        A != B
        A !& C
        # -> C <= B, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte /);
    });
  });

  describe('neq+or trick', function() {

    it('should morph neq, or', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        A != B
        A | C
        # -> B <= C, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte /);
    });
  });

  describe('nands only trick', function() {

    it('should eliminate a var that is only used in nands', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        A !& B
        A !& C
        # -> A leaf, solved

        @custom noleaf B C
      `);

      expect(solution).to.eql({A: [0, 1], B: 0, C: 0});
    });
  });

  describe('nand+lte+or trick', function() {

    it('should morph nand, lte, or', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, X [0 1]
        A !& X
        X <= B
        X | C
        # -> B | C, A <= C, with X a leaf. should work for any inpute lte that has x as lhs
        # (because if X is 1, A is 0, C can be any. if X = 0, A can be either but C must be 1. so A <= C.

        @custom noleaf A B C
      `)).to.throw(/ops: lte,or /);
    });

    it('should morph nands, lte, or', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D, E, X [0 1]
        A !& X
        X <= B
        X | C
        D !& X
        E !& X
        # -> B | C, A <= C, D <= C, E <= C, with X a leaf

        @custom noleaf A B C D E
      `)).to.throw(/ops: lte,lte,lte,or /);
    });
  });

  describe('trick lte+lte+or+nand', function() {

    it('should morph base case of lte_lhs, lte_rhs, or, nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        A <= X
        B | X
        C !& X
        X <= D
        # A <= X, B | X, !(C & X), X <= D
        # ->   A !& C, B | D, A <= D, C <= B, X leaf

        # A !& C, A <= D
        # <->   (!A)|(C<D)  or  (!A->(C<D))  which we cant model properly in one constraint

        @custom noleaf A B C D
      `)).to.throw(/ops: lte,lte,nand,or /);
    });

    it('should morph base case of lte_lhs, lte_lhs, lte_rhs, or, nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        : X [0 1]
        A <= X
        E <= X
        B | X
        C !& X
        X <= D
        # A <= X, E <= X, B | X, !(C & X), X <= D
        # ->   A !& C, E !& C, B | D, A <= D, E <= D, C <= B, X leaf

        # A !& C, A <= D
        # <->   (!A)|(C<D)  or  (!A->(C<D))  which we cant model properly in one constraint

        @custom noleaf A B C D
      `)).to.throw(/ops: lte,lte,nand,or /);
    });
  });

  describe('trick lte_lhs+isall with two shared vars', function() {

    it('should remove lte if isall subsumes it', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : X [0 1]

        X <= A
        X = all?(A B)
        # -> remove X <= A, it is subsumed by the isall
        # (if B=0 then X=0, which is always <=A. if B=1, if A=1 then X=1, <= holds. if A=0 then X=0, <= holds.)

        @custom noleaf A B C X
      `)).to.throw(/ops: isall /);
    });
  });
});
