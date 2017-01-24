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

  describe('xnor booly', function() {

    it('should solve the base case', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C

        # prevent trivial elimination
        X = A + B
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0, X: 0});
    });

    it('should eliminate xnor when the arg is booly', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C

        # prevent trivial elimination
        A != B
      `)).to.throw(/debug: .* ops: iseq,neq/);
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

        # prevent trivial elimination
        A != B
      `)).to.throw(/debug: .* ops: iseq,neq/);
      // note: this may change/improve but the relevant part is that the xnor is gone!
    });

    it('should eliminate xnor when both args are booly', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        C !^ A

        # prevent trivial elimination
        nall(A C)
      `)).to.throw(/debug: .* ops: nand/);
      // note: this may change/improve but the relevant part is that the xnor is gone!
    });

    it('should not apply trick to non-boolys', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C

        # prevent trivial elimination
        distinct(A  B  C)
      `)).to.throw(/debug: .* ops: iseq,xnor,distinct/);
    });
  });

  describe('lte_rhs+isall_r trick', function() {

    it('should morph the basic case', function() {
      let solution = solverSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        C = all?(A B)
        D <= C
        # -->  D <= A, D <= B
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: 0, D: 0});
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
        A = B + D   # prevent abd from being leafs
      `)).to.throw(/ops: lte,lte,lte,plus /);
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

        A = A + C # prevent trivial defer of the vars
      `)).to.throw(/ops: nand,plus /);
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

        A = A + C # prevent trivial defer of the vars
      `)).to.throw(/ops: nand,plus /);
    });

    it('should not do lte+neq trick for lhs of lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        B <= A
        B != C
        # -> A !& C

        A = A + C # prevent trivial defer of the vars
      `)).to.throw(/ops: or,plus /); // tackled by different trick
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

        A = A + C # prevent trivial defer of the vars
      `)).to.throw(/ops: lte,neq,plus /);
    });
  });

  describe('lte_lhs+nand trick', function() {

    it('should eliminate base case of an lte and nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= B
        A !& C
        # -> A is leaf var

        B = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: plus /);
    });

    it('should eliminate swapped base case of an lte and nand', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A !& C
        A <= B
        # -> A is leaf var

        B = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: plus /);
    });

    it('should not do lte+neq trick for rhs of lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A !& C
        B <= A

        B = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: nand,lte,plus /);
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

        B = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: lte,nand,plus /);
    });
  });

  describe('lte_lhs+isall_r trick', function() {

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

        B = C + D # prevent trivial defer of the vars
      `)).to.throw(/ops: nall,plus /);
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

        B = C + D # prevent trivial defer of the vars
      `)).to.throw(/ops: nall,plus /);
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
        # will apply the lte-rhs + isall-r trick instead (B <= C, B <= D)

        B = C + D # prevent trivial defer of the vars
      `)).to.throw(/ops: lte,lte,plus /);
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

        B = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: lte,isall,plus /);
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

        B = sum(C D E F) # prevent trivial defer of the vars
      `)).to.throw(/ops: nall,sum /);
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

        B = C + D # prevent trivial defer of the vars
      `)).to.throw(/ops: isall,nand,plus /);
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

          B = C + D # prevent trivial defer of the vars
        `)).to.throw(/ops: isall,nand,plus /);
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

    it('should eliminate base case of an lte-lhs and isall-r', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 1]
        R = all?(A B)
        R !& C
        # -> nall(A B C)

        A = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: nall,plus /);
    });

    it('should eliminate swapped base case of an lte-lhs and isall-r', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 1]
        R !& C
        R = all?(A B)
        # -> nall(A B C)

        A = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: nall,plus /);
    });
  });

  describe('2xlte trick', function() {

    it('should eliminate base case a double lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= B
        A <= C
        # -> A is a leaf var, eliminate the constraints

        B = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: plus /);
    });

    it('should eliminate swapped base case a double lte', function() {
      expect(_ => solverSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= C
        A <= B
        # -> A is a leaf var, eliminate the constraints

        B = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: plus /);
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

        B = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: or,plus /);
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

        B = B + C # prevent trivial defer of the vars
      `)).to.throw(/ops: or,plus /);
    });
  });
});
