import expect from '../fixtures/mocha_proxy.fixt';
import preSolver from '../../src/runner';
import {
  SUP,
} from '../../src/helpers';

describe('specs/minimizer.spec', function() {

  describe('bool iseq', function() {

    it('should rewrite 01=01==?0 to A!=R', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : R [0 1]
        R = A ==? 0
      `);

      expect(solution).to.eql({A: 1, R: 0});
    });

    it('should rewrite 01=01==?1 to A==R', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : R [0 1]
        R = A ==? 1
      `);

      expect(solution).to.eql({A: 0, R: 0});
    });

    it('should rewrite 01=1==?01 to A==R', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : R [0 1]
        R = 1 ==? A
        @custom noleaf A R
      `);

      expect(solution).to.eql({A: 0, R: 0});
    });

    it('should rewrite 01=02==?0 to A!=R', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 0 2 2]
        : R [0 1]
        R = A ==? 0
      `);

      // R is leaf, constraint cut away, R's reflection is deferred, A becomes free, so it solves
      expect(solution).to.eql({A: 0, R: 1});
    });

    it('should rewrite [01]=[00xx]==?x to XNOR', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 0 2 2]
        : R [0 1]
        R = A ==? 2
      `);

      expect(solution).to.eql({A: 2, R: 1});
    });

    it('should rewrite [01]=[00xx]==?x to XNOR', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 0 2000 2000]
        : B = 2000
        : R [0 1]
        R = A ==? B
      `);

      expect(solution).to.eql({A: 2000, B: 2000, R: 1});
    });

    it('should rewrite [01]=[00xx]==?x to XNOR', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A = 2000
        : B [0 0 2000 2000]
        : R [0 1]
        R = A ==? B
      `);

      expect(solution).to.eql({A: 2000, B: 2000, R: 1});
    });

    it('should not even consider weird domain values sans 1', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A = [0 1]
        : B [0 0 2000 2000]
        : R [0 1]
        R = A ==? B
      `);

      expect(solution).to.eql({A: 0, B: 0, R: 1});
    });

    it('should not even consider weird domain values lt 1', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A = [0 1]
        : B [2 2000]
        : R [0 1]
        R = A ==? B
      `);

      expect(solution).to.eql({A: [0, 1], B: [2, 2000], R: 0});
    });

    it('should not even consider weird domain values sans 0', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A = [0 1]
        : B [1 2000]
        : R [0 1]
        R = A ==? B
      `);

      expect(solution).to.eql({A: 0, B: 1, R: 0});
    });

    it('should not even consider weird domain values bool', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A = [0 1]
        : B [0 2000]
        : R [0 1]
        R = A ==? B
      `);

      expect(solution).to.eql({A: 0, B: 0, R: 1});
    });

    it('should not rewrite to div because of this case', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 5]
        : C [0 1]
        C = A ==? 5
        A = 4
      `);

      expect(solution).to.eql({A: 4, C: 0});
    });
  });

  describe('plus', function() {

    it('should rewrite 12=01+01 to OR', function() {
      // if A and B are max 1 and C is 12 then one must be one but both may be on
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : R [1 2]
        R = A + B
      `);

      expect(solution).to.eql({A: 1, B: 0, R: 1});
    });

    it('should not rewrite [01]=[12]+1 to LT', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : C [1 2]
        C = A + 1
      `);

      expect(solution).to.eql({A: 0, C: 1});
    });

    it('should not rewrite [0055]=[1166]+1 to LT lr', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : C [1 1 6 6]
        C = A + 1
      `);

      expect(solution).to.eql({A: 0, C: 1});
    });

    it('should not rewrite [0055]=[1166]+1 to LT rl', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : C [1 1 6 6]
        C = 1 + A
      `);

      expect(solution).to.eql({A: 0, C: 1});
    });

    it('should not fall into this trap for [01]=[12]+1', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : C [1 2]
        C = A + 1
        # 0 < 2 but wont satisfy A < C
        A = 0
        C = 2
      `);

      expect(solution).to.eql(false);
    });

    it('should not fall into this trap for [01]=1+[12]', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : C [1 2]
        C = 1 + A
        # 0 < 2 but wont satisfy A < C
        A = 0
        C = 2
      `);

      expect(solution).to.eql(false);
    });

    it('should not fall into this trap for [0055]=[1166]+1', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 0 5 5]
        : C [1 1 6 6]
        C = A + 1
        # 0 < 6 but wont satisfy A < C
        A = 0
        C = 6
      `);

      expect(solution).to.eql(false);
    });
  });

  describe('neq', function() {

    it('should fail contradictions', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        A != A
      `);

      expect(solution).to.eql(false);
    });
  });

  describe('islte', function() {

    it('should solve boolean constant case v1 (no cutter)', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A [0 1]
        : R [0 1]
        R = A <=? 0
        @custom noleaf A R
      `)).to.throw(/ops: neq #/); // islte gets morphed to neq
    });

    it('should solve boolean constant case v1 (with cutter)', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : R [0 1]
        R = A <=? 0
        @custom noleaf R
      `);

      expect(solution).to.eql({A: 1, R: 0});
    });

    it('should solve boolean constant case v2', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 1]
        : R [0 1]
        R = A <=? 1
        @custom noleaf A R
      `);

      expect(solution).to.eql({A: [0, 1], R: 1});
    });

    it('should solve boolean constant case v3', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : B [0 1]
        : R [0 1]
        R = 0 <=? B
        @custom noleaf B R
      `);

      expect(solution).to.eql({B: [0, 1], R: 1});
    });

    it('should solve boolean constant case v4', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : B [0 1]
        : R [0 1]
        R = 1 <=? B
        @custom noleaf B R
      `);

      expect(solution).to.eql({B: 0, R: 0});
    });
  });

  describe('isall', function() {

    it('should solve if all args are non-zero', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 6]
        : B [5 8 10 42]
        : C [20 20]
        : R [0 1]
        R = all?(A B C)
      `);

      expect(solution).to.eql({A: [1, 6], B: [5, 8, 10, 42], C: 20, R: 1});
    });

    it('should solve if at least one arg is zero', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 6]
        : B [5 8 10 42]
        : C [0 0]
        : R *
        R = all?(A B C)
      `);

      expect(solution).to.eql({A: [1, 6], B: [5, 8, 10, 42], C: 0, R: 0});
    });

    it('should solve by defer if unsolved immediately R=[01]', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 6]
        : B [5 8 10 42]
        : C [0 10] # this prevents solving because R can still go either way
        : R [0 1]
        R = all?(A B C)
      `);

      expect(solution).to.eql({A: 1, B: 5, C: 0, R: 0});
    });

    it('should solve by defer if unsolved immediately R=*', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 6]
        : B [5 8 10 42]
        : C [0 10] # this prevents solving because R can still go either way
        : R *
        R = all?(A B C)
      `);

      expect(solution).to.eql({A: 1, B: 5, C: 0, R: 0});
    });
  });

  describe('isnall', function() {

    it('should solve if all args are non-zero', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 6]
        : B [5 8 10 42]
        : C [20 20]
        : R [0 1]
        R = nall?(A B C)
      `);

      expect(solution).to.eql({A: [1, 6], B: [5, 8, 10, 42], C: 20, R: 0});
    });

    it('should solve if at least one arg is zero', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 6]
        : B [5 8 10 42]
        : C [0 0]
        : R [0 1]
        R = nall?(A B C)
      `);

      expect(solution).to.eql({A: [1, 6], B: [5, 8, 10, 42], C: 0, R: 1});
    });

    it('should solve by defer if unsolved immediately R=[01]', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 6]
        : B [5 8 10 42]
        : C [0 10] # this prevents solving because R can still go either way
        : R [0 1]
        R = nall?(A B C)
      `);

      expect(solution).to.eql({A: 1, B: 5, C: 0, R: 1});
    });

    it('should solve by defer if unsolved immediately R=*', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 6]
        : B [5 8 10 42]
        : C [0 10] # this prevents solving because R can still go either way
        : R *
        R = nall?(A B C)
      `);

      expect(solution).to.eql({A: 1, B: 5, C: 0, R: [1, SUP]});
    });
  });

  describe('nall', function() {

    it('should remove dupes', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 6]
        : B [5 8 10 42]
        nall(A A B)
      `);

      expect(solution).to.eql({A: 0, B: [5, 8, 10, 42]});
    });

    it('should resolve a nall with only a dupe', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 6]
        nall(A A)
      `);

      expect(solution).to.eql({A: 0});
    });

    it('should dedupe three dupes', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 6]
        nall(A A A)
      `);

      expect(solution).to.eql({A: 0});
    });

    it('should accept three dupes of zero', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 0]
        nall(A A A)
      `);

      expect(solution).to.eql({A: 0});
    });

    it('should reject three dupes of non-zero', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [5 5]
        nall(A A A)
      `);

      expect(solution).to.eql(false);
    });

    it('should properly remove resolved vars', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, C, D [0 5]
        : B 10
        nall(A B C D)

        @custom noleaf A B C D
      `)).to.throw(/ops: nall #/);
    });
  });

  describe('nand', function() {

    it('should solve reflective nand to zero', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 10]
        A !& A
      `);

      expect(solution).to.eql({A: 0});
    });

    it('should reject reflective nand if it has no zero', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [1 10]
        A !& A
      `);

      expect(solution).to.eql(false);
    });

    it('should reject reflective nand if it must be non-zero', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A [0 10]
        A !& A
        A > 0
      `);

      expect(solution).to.eql(false);
    });
  });

  describe('sum', function() {

    // (missing basic tests)

    it('should work with constants', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, C, E [0 10]
        : B 5
        : D 8
        : R *
        R = sum(A B C D E)
        @custom noleaf A B C D E R
      `)).to.throw(/ops: sum #/);
    });

    it('should not trip up when R=0 already', function() {

      let solution = preSolver(`
        @custom var-strat throw
        : A, B, C, D, E [0 10]
        : R [0 0]
        R = sum(A B C D E)
        @custom noleaf A B C D E R
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0, D: 0, E: 0, R: 0});
    });

    it('should not trip up with same var arg twice becoming solved', function() {

      let solution = preSolver(`
        @custom var-strat throw
        : A, B, C [0 10]
        : R [0 0]
        R = sum(A B B C)
        @custom noleaf A B R
      `);

      // ok the regression being tested is when the minifier applies the R
      // value, 0, it sets A and B to zero in the same loop. however, B is
      // counted twice. In this same loop the number of constants and their
      // sum was increased. This caused the second occurence of the same
      // var to be considered an already seen constant, and ignored. So now
      // it just counts again and this test ensures that's okay.

      expect(solution).to.eql({A: 0, B: 0, C: 0, R: 0});
    });
  });

  describe('product', function() {

    // (missing basic tests)

    it('should rewrite a product with R=0 to a nall', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D, E [0 10]
        : R 0
        R = product(A B C D E)
        @custom noleaf A B C D E R
      `)).to.throw(/ops: nall #/);
    });

    it('should rewrite a product with a zero constants to let other args free', function() {
      let solution = preSolver(`
        @custom var-strat throw
        : A, C, D, E [0 10]
        : B 0
        : R *
        R = product(A B C D E)
        @custom noleaf A B C D E R
      `);

      expect(solution).to.eql({A: [0, 10], B: 0, C: [0, 10], D: [0, 10], E: [0, 10], R: 0});
    });

    it('should work with constants', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, C, E [1 10]
        : B 5
        : D 8
        : R *
        R = product(A B C D E)
        @custom noleaf A B C D E R
      `)).to.throw(/ops: product #/);
    });

    it('should solve at least one arg to zero to force result to zero', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C [0 10]
        : D 0
        D = product(A B C)
        @custom noleaf A B C
      `)).to.throw(/ops: nall #/); // note: nall is correct because it enforces at least one arg to be zero, which is all that product need when the result is zero
    });
  });

  describe('distinct', function() {

    it('should work', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, C, D, E [0 10]
        distinct(A B C D E)
        @custom noleaf A B C D E
      `)).to.throw(/ops: distinct #/);
    });

    it('should prune constants', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, D, E [0 10]
        distinct(A B 5 D E)
        @custom noleaf A B D E
      `)).to.throw(/ops: distinct #/);
    });

    it('should prune a var that becomes constant', function() {
      expect(_ => preSolver(`
        @custom var-strat throw
        : A, B, D, E [0 10]
        : C [0 10]
        distinct(A B C D E)
        C < 1
        @custom noleaf A B C D E
      `)).to.throw(/ops: distinct #/);
    });
  });

  describe('regressions', function() {

    it('the extra math made it not solve', function() {
      // (the inverses of div were messed up)
      let solution = preSolver(`
        @custom var-strat throw
        : A, B = [0 0 10 10]
        : C = [0 0 100 100]
        : R = 100
        R = all?(A B)
        C <= R
        # -->  C <= A, C <= B
        # we want the solution: {A: 10, B: 10, C: 100, R: 100}


        # with R being >0, A and B must be >0, so they become 10
        # C can still be 0 or 100 so the math tries to indirectly force that
        # R/2=50, a+a=100. but it seems to break somewhere
        : a *
        a = R / 2
        C = a + a

        @custom noleaf A B C
        @custom free 0
      `);

      expect(solution).to.eql({A: 10, B: 10, C: 100, R: 100, a: 50});
    });

  });
});
