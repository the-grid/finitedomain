import expect from '../fixtures/mocha_proxy.fixt';
import preSolver from '../../src/runner';
import {
  SUP,
} from '../../src/helpers';

describe('specs/cutter.spec', function() {

  describe('eq', function() {

    it('should eq', function() {
      // note that this test doesnt even reach the cutter... eq makes A and alias of B and then removes the eq
      let solution = preSolver(`
        @custom var-strat throw
        : A, B *
        A == B
        A > 10
        @custom noleaf B
      `);

      expect(solution).to.eql({A: 11, B: 11}); // a choice has to be made so min(B)=0, A=B.
    });
  });

  describe('neq', function() {

    it('should neq', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B *
        A != B
        A > 10
        @custom noleaf B
      `);

      expect(solution).to.eql({A: [11, 100000000], B: 0});
    });

    it('should cut AB neq without bad ops', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        A != B
        A <= C
        @custom noleaf B C D E
      `)).to.throw(/ops: or #/);
    });

    it('should not cut AB neq with bad ops', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        A != B
        A <= C
        A = D + E
        @custom noleaf B C D E
      `)).to.throw(/ops: lte,neq,plus #/);
    });

    it('should cut BA neq without bad ops', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : B, A, C, D, E [0 1]
        B != A
        A <= C
        @custom noleaf B C D E
      `)).to.throw(/ops: or #/);
    });

    it('should not cut BA neq with bad ops', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : B, A, C, D, E [0 1]
        B != A
        A <= C
        A = D + E
        @custom noleaf B C D E
      `)).to.throw(/ops: lte,neq,plus #/);
    });
  });

  describe('lt', function() {

    it('should lt', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B *
        A < B
        A > 10
        @custom noleaf B
      `);

      expect(solution).to.eql({A: 11, B: 12});
    });
  });

  describe('lte', function() {

    it('should lte', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B *
        A <= B
        A > 10
        @custom noleaf B
      `);

      expect(solution).to.eql({A: 11, B: 11});
    });
  });

  describe('iseq', function() {

    it('should iseq vvv', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A *
        : B 11
        : C [0 1]
        C = A ==? B
        A > 10
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 11, B: 11, C: 1});
    });

    it('should iseq v8v', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 2]
        : C [0 1]
        C = A ==? 2
        @custom noleaf A
      `);

      expect(solution).to.eql({A: 0, C: 0});
    });
  });

  describe('isneq', function() {

    it('should isneq base case', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, C *
        : B 11
        C = A !=? B
        A > 10
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 11, B: 11, C: 0});
    });

    it('should solve constant case', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 2]
        : R [0 1]
        R = A !=? 1
        @custom noleaf R
      `);

      expect(solution).to.eql({A: 2, R: 0});
    });
  });

  describe('islt', function() {

    it('should islt', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, C *
        : B 11
        C = A <? B
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 0, B: 11, C: [1, SUP]});
    });
  });

  describe('islte', function() {

    it('should islte', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, C *
        : B 11
        C = A <=? B
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 0, B: 11, C: [1, SUP]});
    });
  });

  describe('sum', function() {

    it('should remove simple bool case', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : R [0 3]
        R = sum(A B C)
        @custom noleaf A B C
      `);

      // should solve because R doesnt actually restrict its sum args (the result of any combination is in R)
      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 0});
    });

    it('should remove simple bool and constant case', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : R [4 7]
        R = sum(A 4 B C)
        @custom noleaf A B C
      `);

      // should solve because R doesnt actually restrict its sum args (the result of any combination is in R)
      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 4});
    });

    it('should order sum args', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : R *
        R = sum(C A B)
        @custom noleaf A B C
      `);

      // should solve because R doesnt actually restrict its sum args (the result of any combination is in R)
      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 0});
    });

    it('should remove if R wraps whole range', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 0 2 2]
        : B, C, D [0 1]
        : R [0 5]
        R = sum(A B C D)
        @custom noleaf A B C D
      `);

      // should solve because R doesnt actually restrict its sum args (the result of any combination is in R)
      expect(solution).to.eql({A: 0, B: 0, C: 0, D: 0, R: 0});
    });

    it('should rewrite a leaf isnall to nall', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : R [0 3] # n-1
        R = sum(A B C D)
        @custom noleaf A B C D
      `)).to.throw(/ops: nall #/);
    });

    it('should detect trivial isall patterns', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : R *
        : S [0 1]
        R = sum(A B C)
        S = R ==? 3
        @custom noleaf A B C
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 0, S: 0}); // implicit choices through the solveStack wont bother with 11131
    });

    it('should detect reverse trivial isall patterns', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : R *
        : S [0 1]
        S = R ==? 3
        R = sum(A B C)
        @custom noleaf A B C
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 0, S: 0}); // implicit choices through the solveStack wont bother with 11131
    });

    it('should not derail on this input (regression)', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 10]
        : E, F *
        E = sum(A B C D)
        F = sum(A B C D)
        @custom noleaf A B C D E F
      `)).to.throw(/ops: sum #/); // E==F
    });
  });

  describe('plus', function() {

    it('should rewrite combined isAll to a leaf var', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : R *
        : S [0 1]
        R = A + B
        S = R ==? 2
        @custom noleaf A B S
      `)).to.throw(/ops: isall2 #/);
    });

    it('should isall leaf case be reversable', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : R *
        : S [0 1]
        S = R ==? 2
        R = A + B
        @custom noleaf A B S
      `)).to.throw(/ops: isall2 #/);
    });
  });

  describe('trick xnor booly', function() {

    it('should solve the base case', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C
        @custom noleaf A B
      `)).to.throw(/ops: iseq #/);
    });

    it('should eliminate xnor when the arg is booly', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C
        @custom noleaf A B
      `)).to.throw(/debug: .* ops: iseq #/);
      // note: this may change/improve but the relevant part is that the xnor is gone!
    });

    it('should eliminate xnor when the other arg is booly', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        C !^ A
        @custom noleaf A B
      `)).to.throw(/ops: iseq #/);
      // note: this may change/improve but the relevant part is that the xnor is gone!
    });

    it('should eliminate xnor when both args are booly 8', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `)).to.throw(/ops: iseq #/);
    });

    it('should eliminate xnor when both args are booly 5', function() {
      //why solve if iseq 8 but not when iseq 5?
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 5
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `)).to.throw(/ops: iseq #/);
    });

    it('should not apply trick to non-boolys', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C
        @custom noleaf A B C
      `)).to.throw(/debug: .* ops: iseq,xnor #/);
    });
  });

  describe('trick lte_rhs+isall_r', function() {

    it('should morph the basic case', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D, R [0 1]
        R = all?(A B)
        C <= R
        # -->  C <= A, C <= B
        @custom noleaf A B C
        @custom free 0
      `)).to.throw(/ops: lte,lte #/);
    });

    it('should work when isall args arent bool because thats fine too', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 10]
        : C, R [0 1]
        R = all?(A B)
        C <= R
        # -->  C <= A, C <= B
        @custom noleaf A B C
        @custom free 0
      `)).to.throw(/ops: lte,lte #/);
    });

    it('should solve this and not try to rewrite it because that leads to rejection', function() {
      // pseudo-regression case
      let solution = preSolver(`
        @custom var-strat throw
        : A, B = 1
        : C = 100
        : R = 100
        R = all?(A B)
        C <= R
        # -->  C <= A, C <= B
        @custom noleaf A B C
        @custom free 0
      `);

      // note: all?(A B) is truthy because A and B are 1. that means R is > 0, and it is because it is 100
      // that in turn satisfies C<=R, being 100<=100
      // if they were rewritten they would compare C <= A and C <= B so 100<=10 and that would reject
      // this is why it only works when C or R is strictly boolean bound, usually both though
      expect(solution).to.eql({A: 1, B: 1, C: 100, R: 100});
    });

    it('should is this lossy?', function() {
      // pseudo-regression case
      let solution = preSolver(`
        @custom var-strat throw
        : A, B = [0 0 10 10]
        : C = [0 0 100 100]
        : R = 100
        R = all?(A B)
        C <= R
        # -->  C <= A, C <= B
        # what if we want the solution: {A: 10, B: 10, C: 100, R: 100}
        @custom noleaf A B C
        @custom free 0
        # @custom varstrat R 100
      `);
      // TODO: force the solution of C to 100 through special var strat

      // without morphs there are a few solutions:
      // A: 0 | 10, B: 0, C: 0, R: 0
      // A: 0, B: 0 | 10, C: 0, R: 0
      // A: 10, B: 10, C: 0 | 100, R: 100

      // with morph these are possible (C<=A, C<=B)
      // A: 0 | 10, B: 0, C: 0, R: 0
      // A: 0, B: 0 | 10, C: 0, R: 0
      // A: 10, B: 10, C: 0, R: 100

      // so indirectly it would make a choice that gives C fewer outcomes.
      expect(solution).to.eql({A: 10, B: 10, C: [0, 0, 100, 100], R: 100});
    });

    it('should morph three args if there is enough space', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D, X [0 1]
        : M = 1
        X = all?(A B C)
        D <= X
        # -->  D <= A, D <= B, D <= C
        @custom noleaf A B C D
        @custom free 100
      `)).to.throw(/ops: lte,lte,lte #/);
    });

    it('should morph four args if there is enough space', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D, E, X [0 1]
        X = all?(A B C E)
        D <= X
        # -->  D <= A, D <= B, D <= C, D <= E
        @custom noleaf A B C D E
        @custom free 100
      `)).to.throw(/ops: lte,lte,lte,lte #/);
    });

    it('should morph five args if there is enough space', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D, E, F, X [0 1]
        X = all?(A B C E F)
        D <= X
        # -->  D <= A, D <= B, D <= C, D <= E, D <= F
        @custom noleaf A B C D E F
        @custom free 100
      `)).to.throw(/ops: lte,lte,lte,lte,lte #/);
    });

    describe('should morph the basic case as long as max(C) <= A,B,R', function() {

      function test(bools, nonbools) {
        it('bools: ' + bools + ', nonbools: ' + nonbools, function() {
          expect(_ => preSolver(`
            @custom var-strat throw
            : ${bools} [0 1]
            : ${nonbools} [0 10]
            R = all?(A B)
            C <= R

            @custom noleaf A B C
          `)).to.throw(/ops: lte,lte #/);
        });
      }

      test('B,R,C', 'A');
      test('A,R,C', 'B');
      test('C,R', 'A,B');
    });

    describe('should not morph the basic case when max(C) > A,B,R', function() {

      function test(bools, nonbools) {
        it('bools: ' + bools + ', nonbools: ' + nonbools, function() {
          expect(_ => preSolver(`
            @custom var-strat throw
            : ${bools} [0 1]
            : ${nonbools} [0 10]
            R = all?(A B)
            C <= R

            @custom noleaf A B C
          `)).to.throw(/ops: isall2,lte #/);
        });
      }

      test('B', 'A,C,R');
      test('A', 'B,C,R');
      test('A,B', 'C,R');
    });

    describe('should morph the multi-isall case if all isall args are >= max(C)', function() {

      function test(bools, nonbools) {
        it('bools: ' + bools + ', nonbools: ' + nonbools, function() {
          expect(_ => preSolver(`
            @custom var-strat throw
            : ${bools} [0 1]
            : ${nonbools} [0 10]
            R = all?(A B C)
            D <= R
            @custom noleaf A B C D
            @custom free 20
          `)).to.throw(/ops: lte,lte,lte #/);
        });
      }

      test('D,B,C,R', 'A');
      test('D,A,C,R', 'B');
      test('D,A,B,R', 'C');
      test('D,C,R', 'A,B');
      test('D,B,R', 'A,C');
      test('D,R', 'A,B,C');
    });

    describe('should not morph the multi-isall case if any isall args is < max(C)', function() {

      function test(bools, nonbools) {
        it('bools: ' + bools + ', nonbools: ' + nonbools, function() {
          expect(_ => preSolver(`
            @custom var-strat throw
            : ${bools} [0 1]
            : ${nonbools} [0 10]
            R = all?(A B C)
            D <= R
            @custom noleaf A B C D
            @custom free 20
          `)).to.throw(/ops: isall,lte #/);
        });
      }

      test('B,C', 'A,D,R');
      test('A,C', 'B,D,R');
      test('A,B', 'C,D,R');
      test('C', 'A,B,D,R');
      test('B', 'A,C,D,R');
    });
  });

  describe('trick lte_rhs+neq', function() {

    it('should rewrite base case of an lte and neq to a nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= B
        B != C
        # -> A !& C
        @custom noleaf A C
      `)).to.throw(/ops: nand #/);
    });

    it('should rewrite swapped base case of an lte and neq to a nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        B != C
        A <= B
        # -> A !& C
        @custom noleaf A C
      `)).to.throw(/ops: nand #/);
    });

    it('should not do lte+neq trick for non bools', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 2]
        : C [0 1]
        A <= B
        B != C
        # -> A !& C
        @custom noleaf A C
      `)).to.throw(/ops: lte,neq #/);
    });
  });

  describe('trick lte_lhs+nand', function() {

    it('should eliminate base case of an lte and nand', function() {
      let solution = preSolver(`
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
      let solution = preSolver(`
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
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A !& C
        B <= A
        @custom noleaf B C
      `)).to.throw(/ops: lte,nand #/);
    });

    it('should not do lte+neq trick if A has no value lower than min(B)', function() {
      // (this never even reaches the cutter because A<=B cant hold and minimizer will reject over that
      let solution = preSolver(`
        @custom var-strat throw
        : A [11 11]
        : B [5 10]
        : C [0 0] # already satisfies nand
        A <= B
        A !& C
        # -> A !& C
        @custom noleaf B C
      `);

      expect(solution).to.eql(false);
    });

    it('should not do lte+neq trick if A has no zero and C isnt zero', function() {
      // wont even get to the cutter because the nand wont hold and minimizer will reject over that
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 1]
        : B [0 10]
        : C [1 1] # should force A to 0
        A <= B
        A !& C
        # -> A !& C
        @custom noleaf B C
      `);

      expect(solution).to.eql(false);
    });
  });

  describe.skip('trick lte_lhs+isall_r', function() {

    it('should eliminate base case of an lte-lhs and isall-r', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        A <= B
        A = all?(C D)
        # -> nall(B C D)
        @custom noleaf B C D
      `)).to.throw(/ops: nall #/);
    });

    it('should eliminate swapped base case of an lte-lhs and isall-r', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        A = all?(C D)
        A <= B
        # -> nall(B C D)
        @custom noleaf B C D
      `)).to.throw(/ops: nall #/);
    });

    it('should not do lte-lhs + isall-r trick for rhs of lte', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        A = all?(C D)
        B <= A
        @custom noleaf B C D
      `)).to.throw(/ops: lte,lte #/);
    });

    it('should not do lte_lhs+neq trick for non bools', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 2]
        : C [0 1]
        : D [0 1]
        A <= B
        A = all?(C D)
        @custom noleaf B C D
      `)).to.throw(/ops: isall,lte #/);
    });

    it('should work with more than two args to isall', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C, D, E, F [0 1]
        A <= B
        A = all?(C D E F)
        # -> nall(B C D E F)
        @custom noleaf B C D E F
      `)).to.throw(/ops: nall #/);
    });
  });

  describe('trick isall_r+nall', function() {

    it('should rewrite base case v1 of an isall2 and nall to a nand', function() {
      expect(_ => preSolver(`
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
        # dont exclude A or the trick won't trigger (even when it's B that disappears)
      `)).to.throw(/ops: nall #/); // isall2+nand becomes nall by another trick
    });

    it('should not rewrite when isall has 3+ args', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : X [0 1]
        : R [0 1]
        R = all?(A B C)
        nall(R B X)
        # -> X = all?(A B C), R !& X
        # when R is 1, A, B, and C are 1, so X must be 0 (for the nall)
        # when A is 0, A, B, or C is 0, so the nall is resolved (because R=0)
        # when X is 1, A can't be 1 because then B is also one and the nall would break
        @custom noleaf A B C X
        # dont exclude R or the trick won't trigger (even when it's B that disappears from nall)
      `)).to.throw(/ops: isall,nall #/); // isall+nand becomes nall by another trick
    });

    describe('all variations of nall arg order', function() {

      function test(v1, v2, v3) {
        it('nall(' + v1 + ',' + v2 + ',' + v3 + ')', function() {
          expect(_ => preSolver(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C [0 1]
          : D [0 1]
          A = all?(B C)
          nall(${v1} ${v2} ${v3})
          # note: this is rewritten to A=all?(BC), A!&D

          @custom noleaf B C D
        `)).to.throw(/ops: nall #/); // isall+nand becomes nall by another trick
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

  describe('trick isall+nand', function() {

    it('should eliminate base case of an isall and nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 1]
        R = all?(A B)
        R !& C
        # -> nall(A B C)

        @custom noleaf A B C
        @custom free 50
      `)).to.throw(/ops: nall #/);
    });

    it('should eliminate base case of an isall and reversed nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 1]
        R = all?(A B)
        C !& R
        # -> nall(A B C)

        @custom noleaf A B C
        @custom free 50
      `)).to.throw(/ops: nall #/);
    });

    it('should eliminate swapped base case of an isall and nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : R [0 1]
        R !& C
        R = all?(A B)
        # -> nall(A B C)
        @custom noleaf A B C
        @custom free 50
      `)).to.throw(/ops: nall #/);
    });

    it('should eliminate swapped base case of an isall and reversed nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : R [0 1]
        C !& R
        R = all?(A B)
        # -> nall(A B C)
        @custom noleaf A B C
        @custom free 50
      `)).to.throw(/ops: nall #/);
    });

    it('should rewrite isall nand nand to nall nall', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : R [0 1]
        C !& R
        D !& R
        R = all?(A B)
        # -> nall(A B C), nall(A B D), R = all?(A B)
        @custom noleaf A B C D
        @custom free 100
      `)).to.throw(/ops: nall,nall #/);
    });

    it('should not rewrite if there is no space', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : R [0 1]
        C !& R
        D !& R
        R = all?(A B)
        # -> same because there is no space for the rewrite
        @custom noleaf A B C D
        @custom free 0                 # redundant but for illustration
      `)).to.throw(/ops: isall2,nand,nand #/);
    });

    it('should consider R a leaf after the rewrite', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : R [0 1]
        C !& R
        R = all?(A B)
        # -> nall(A B C), R = all?(A B)
        @custom noleaf A B C
        @custom free 100
      `)).to.throw(/ops: nall #/);
    });

    it('should still solve R wrt isall even after eliminating it', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : R [0 1]
        C !& R
        R = all?(A B)

        # if A&B then R=1
        : X *
        X = R + R
        # its tricky because this problem may never even reach the nand+isall trick. difficult to test.
        A == 1
        B == 1

        @custom noleaf A B C X
        @custom free 50
      `);

      expect(solution).to.eql({A: 1, B: 1, C: 0, R: 1, X: 2});
    });

    it('should skip the trick if there are too many nands', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, R [0 1]
        : a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z [0 1] # the count needs to overflow the number of offsets tracked by bounty...
        R = all?(A B)
        R !& C
        R !& a
        R !& b
        R !& c
        R !& d
        R !& e
        R !& f
        R !& g
        R !& h
        R !& i
        R !& j
        R !& k
        R !& l
        R !& m
        R !& n
        R !& o
        R !& p
        R !& q
        R !& r
        R !& s
        R !& t
        R !& u
        R !& v
        R !& w
        R !& x
        R !& y
        R !& z
        # -> nall(A B C)

        @custom noleaf A B C a b c d e f g h i j k l m n o p q r s t u v w x y z
        @custom free 1000
      `)).to.throw(/ops: isall2,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand #/);
    });

    it('should skip the trick if another constraint was burried between too many nands', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, R [0 1]
        : a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z [0 1] # the count needs to overflow the number of offsets tracked by bounty...
        R = all?(A B)
        R !& C
        R !& a
        R !& b
        R !& c
        R !& d
        R !& e
        R !& f
        R !& g
        R !& h
        R !& i
        R !& j
        R !& k
        R !& l
        R !& m
        R !& n
        R !& o
        R !& p
        R !& q
        R !& r
        R !& s
        R !& t
        R !& u
        R !& v
        R !& w
        R !& x
        R !& y
        R <= z
        # -> nall(A B C)

        @custom noleaf A B C a b c d e f g h i j k l m n o p q r s t u v w x y z
        @custom free 1000
      `)).to.throw(/ops: isall2,lte,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand #/);
    });
  });

  describe('trick 2xlte', function() {

    it('should eliminate base case a double lte', function() {
      let solution = preSolver(`
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
      let solution = preSolver(`
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

  describe('trick lte_lhs+neq', function() {

    it('should eliminate base case an lte_lhs and AB neq', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A <= B
        A != C
        # -> B | C, A is a leaf
        @custom noleaf B C
      `)).to.throw(/ops: or #/);
    });

    it('should eliminate swapped base case an lte_lhs and AB neq', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        A != C
        A <= B
        # -> B | C, A is a leaf
        @custom noleaf B C
      `)).to.throw(/ops: or #/);
    });

    it('should eliminate base case an lte_lhs and BA neq', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : C [0 1]
        : A [0 1]
        : B [0 1]
        A <= B
        C != A
        # -> B | C, A is a leaf
        @custom noleaf B C
      `)).to.throw(/ops: or #/);
    });

    it('should eliminate swapped base case an lte_lhs and BA neq', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : B [0 1]
        : C [0 1]
        : A [0 1]
        C != A
        A <= B
        # -> B | C, A is a leaf
        @custom noleaf B C
      `)).to.throw(/ops: or #/);
    });
  });

  describe('trick nand+neq+lte_lhs', function() {

    it('should eliminate base case a nand, neq, lte', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A !& B
        A != C
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or #/);
    });

    it('should eliminate base case a reverse nand, neq, lte', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        B !& A
        A != C
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or #/);
    });

    it('should eliminate base case a nand, reverse neq, lte', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A !& B
        C != A
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or #/);
    });

    it('should eliminate base case a reverse nand, reverse neq, lte', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        B !& A
        C != A
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or #/);
    });

    it('should eliminate swapped base case a neq, nand, lte', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A != C
        A !& B
        A <= D
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or #/);
    });

    it('should eliminate swapped base case a neq, lte, nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A != C
        A <= D
        A !& B
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or #/);
    });

    it('should eliminate swapped base case a lte, neq, nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A <= D
        A != C
        A !& B
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or #/);
    });

    it('should eliminate swapped base case a lte, nand, neq', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A <= D
        A !& B
        A != C
        # -> B <= C, D | C, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: lte,or #/);
    });
  });

  describe('trick neq+lte_lhs+lte_rhs', function() {

    it('should eliminate base case neq, lte, lte', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A != B
        A <= C
        D <= A
        # -> B | C, B !& D, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: nand,or #/);
    });

    it('should eliminate base case reversed neq, lte, lte', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        B != A
        A <= C
        D <= A
        # -> B | C, B !& D, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: nand,or #/);
    });

    it('should eliminate base case lte, neq, lte', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A <= C
        A != B
        D <= A
        # -> B | C, B !& D, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: nand,or #/);
    });

    it('should eliminate base case lte, lte, neq', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        D <= A
        A <= C
        A != B
        # -> B | C, B !& D, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: nand,or #/);
    });
  });

  describe('trick neq+lte++', function() {

    it('should morph AB neq, lte, lte with perfect fit', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : X, Y [0 1]
        A <= X
        B <= X
        Y != X
        # -> Y = none?(A B)  and X a leaf

        @custom noleaf A B Y
      `)).to.throw(/ops: nand,nand #/);
    });

    it('should morph AB neq, lte, lte with room to spare', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : X, Y [0 1]
        A <= X
        B <= X
        Y != X
        # -> Y = none?(A B)  and X a leaf

        @custom noleaf A B Y
      `)).to.throw(/ops: nand,nand #/);
    });

    it('should morph BA neq, lte, lte with perfect fit', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : Y, X [0 1]
        A <= X
        B <= X
        X != Y
        # -> Y = none?(A B)  and X a leaf

        @custom noleaf A B Y
      `)).to.throw(/ops: nand,nand #/);
    });

    it('should morph BA neq, lte, lte with room to spare', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : Y, X [0 1]
        A <= X
        B <= X
        X != Y
        # -> Y = none?(A B)  and X a leaf

        @custom noleaf A B Y
      `)).to.throw(/ops: nand,nand #/);
    });
  });

  describe('trick neq+nand', function() {

    it('should morph AB neq, nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        A != B
        A !& C
        # -> C <= B, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });

    it('should morph BA neq, nand', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : B, A, C [0 1]
        B != A
        A !& C
        # -> C <= B, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });
  });

  describe('trick neq+or', function() {

    it('should morph AB neq, or', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        A != B
        A | C
        # -> B <= C, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });

    it('should morph BA neq, or', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : B, A, C [0 1]
        B != A
        A | C
        # -> B <= C, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });
  });

  describe('trick nands only', function() {

    it('should eliminate a var that is only used in nands', function() {
      let solution = preSolver(`
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

  describe('trick nand+lte+or', function() {

    it('should morph nand, lte, or', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, X [0 1]
        A !& X
        X <= B
        X | C
        # -> B | C, A <= C, with X a leaf. should work for any inpute lte that has x as lhs
        # (because if X is 1, A is 0, C can be any. if X = 0, A can be either but C must be 1. so A <= C.

        @custom noleaf A B C
      `)).to.throw(/ops: lte,or #/);
    });

    it('should morph nands, lte, or', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D, E, X [0 1]
        A !& X
        X <= B
        X | C
        D !& X
        E !& X
        # -> B | C, A <= C, D <= C, E <= C, with X a leaf

        @custom noleaf A B C D E
      `)).to.throw(/ops: lte,lte,lte,or #/);
    });
  });

  describe('trick lte+lte+or+nand', function() {

    it('should morph base case of lte_lhs, lte_rhs, or, nand', function() {
      expect(_ => preSolver(`
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
      `)).to.throw(/ops: lte,lte,nand,or #/);
    });

    it('should morph base case of lte_lhs, lte_lhs, lte_rhs, or, nand', function() {
      expect(_ => preSolver(`
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
      `)).to.throw(/ops: lte,lte,nand,or #/);
    });
  });

  describe('trick lte_lhs+isall with two shared vars', function() {

    it('should remove lte if isall subsumes it', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C [0 1]
        : X [0 1]

        X <= A
        X = all?(A B)
        # -> remove X <= A, it is subsumed by the isall
        # (if B=0 then X=0, which is always <=A. if B=1, if A=1 then X=1, <= holds. if A=0 then X=0, <= holds.)

        @custom noleaf A B C
      `)).to.throw(/ops: isall2 #/);
    });
  });

  describe('trick plus+iseq', function() {

    it('should isall base case', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : C [0 2]
        : R [0 1]
        C = A + B
        R = C ==? 2
        @custom noleaf A B R
      `)).to.throw(/ops: isall2 #/);
    });

    it('should isall base reverse case', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : C [0 2]
        : R [0 1]
        R = C ==? 2
        C = A + B
        @custom noleaf A B R
      `)).to.throw(/ops: isall2 #/);
    });

    it('should isnone base case', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B [0 1]
        : C [0 2]
        : R [0 1]
        C = A + B
        R = C ==? 0
        @custom noleaf A B R
        @custom free 100
      `)).to.throw(/ops: isnone #/);
    });
  });

  describe('trick sum+iseq', function() {

    describe('to isall', function() {

      it('should isall base case', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C, D, E [0 1]
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 5
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isall #/);
      });

      it('should isall base reverse case', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C, D, E [0 1]
          : R [0 5]
          : S [0 1]
          S = R ==? 5
          R = sum(A B C D E)
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isall #/);
      });

      it('should isall with a constant 1', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C, E [0 1]
          : D 1
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 5
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isall #/);
      });

      it('should isall with swapped a constant 1', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C, E [0 1]
          : D 1
          : R [0 5]
          : S [0 1]
          S = R ==? 5
          R = sum(A B C D E)
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isall #/);
      });

      it('should isall with a constant 0', function() {
        expect(preSolver(`
          @custom var-strat throw
          : A, B, C, E [0 1]
          : D 0
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 5
          @custom noleaf A B C D E S
        `)).to.eql({A: 0, B: 0, C: 0, D: 0, E: 0, R: 0, S: 0});
      });

      it('should isall with swapped a constant 0', function() {
        expect(preSolver(`
          @custom var-strat throw
          : A, B, C, E [0 1]
          : D 0
          : R [0 5]
          : S [0 1]
          S = R ==? 5
          R = sum(A B C D E)
          @custom noleaf A B C D E S
        `)).to.eql({A: 0, B: 0, C: 0, D: 0, E: 0, R: 0, S: 0});
      });

      it('should isall with a constant 0 and 1', function() {
        expect(preSolver(`
          @custom var-strat throw
          : A, C, E [0 1]
          : B 1
          : D 0
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 5
          @custom noleaf A B C D E S
        `)).to.eql({A: 0, B: 1, C: 0, D: 0, E: 0, R: 1, S: 0});
      });

      it('should isall with swapped a constant 0 and 1', function() {
        expect(preSolver(`
          @custom var-strat throw
          : A, C, E [0 1]
          : B 1
          : D 0
          : R [0 5]
          : S [0 1]
          S = R ==? 5
          R = sum(A B C D E)
          @custom noleaf A B C D E S
        `)).to.eql({A: 0, B: 1, C: 0, D: 0, E: 0, R: 1, S: 0});
      });
    });

    describe('to isnone', function() {

      it('should isnone base case', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C, D, E [0 1]
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 0
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isnone #/);
      });

      it('should isnone reverse base case', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C, D, E [0 1]
          : R [0 5]
          : S [0 1]
          S = R ==? 0
          R = sum(A B C D E)
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isnone #/);
      });

      it('should isnone with a constant 0', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C, E [0 1]
          : D 0
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 0
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isnone #/);
      });

      it('should isnone with swapped a constant 0', function() {
        expect(_ => preSolver(`
          @custom var-strat throw
          : A, B, C, E [0 1]
          : D 0
          : R [0 5]
          : S [0 1]
          S = R ==? 0
          R = sum(A B C D E)
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isnone #/);
      });
    });
  });
});
