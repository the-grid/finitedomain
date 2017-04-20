import expect from '../../fixtures/mocha_proxy.fixt';
import Solver from '../../../src/solver';
import {
  SUP,
} from '../../../src/helpers';

describe('specs/cutter.spec', function() {

  describe('eq', function() {

    it('should eq', function() {
      // note that this test doesnt even reach the cutter... eq makes A and alias of B and then removes the eq
      let solution = Solver.pre(`
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
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B *
        A != B
        A > 10
        @custom noleaf B
      `);

      // two solutions possible; one where A is solved and one where B is solved
      //expect(solution).to.eql({A: [11, SUP], B: 0});
      expect(solution).to.eql({A: 11, B: [0, 10, 12, SUP]});
    });

    it('should cut AB neq without bad ops', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        A != B
        A <= C
        @custom noleaf B C D E
      `)).to.throw(/ops: or #/);
    });

    it('should not cut AB neq with bad ops', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        A != B
        A <= C
        A = D + E
        @custom noleaf B C D E
      `)).to.throw(/ops: lte,neq,plus #/);
    });

    it('should cut BA neq without bad ops', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : B, A, C, D, E [0 1]
        B != A
        A <= C
        @custom noleaf B C D E
      `)).to.throw(/ops: or #/);
    });

    it('should not cut BA neq with bad ops', function() {
      expect(_ => Solver.pre(`
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

    it('should AB lt', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B *
        A < B
        A > 10
        @custom noleaf B
      `);

      expect(solution).to.eql({A: 11, B: [12, SUP]});
    });

    it('should BA lt', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B, A *
        B < A
        A > 10
        @custom noleaf B
      `);

      expect(solution).to.eql({A: [11, SUP], B: [0, 10]});
    });
  });

  describe('lte', function() {

    it('should AB lte', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B *
        A <= B
        A > 10
        @custom noleaf B
      `);

      expect(solution).to.eql({A: 11, B: [11, SUP]});
    });

    it('should BA lte', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B, A *
        B <= A
        A > 10
        @custom noleaf B
      `);

      expect(solution).to.eql({A: [11, SUP], B: [0, 11]});
    });
  });

  describe('iseq', function() {

    it('should iseq', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A *
        : B 11
        : C [0 1]
        C = A ==? B
        A > 10
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 11, B: 11, C: 1});
      //expect(solution).to.eql({A: [11, SUP], B: 11, C: 0});
    });

    it('should iseq with constant A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B [0 2]
        : C [0 1]
        C = 2 ==? B
        @custom noleaf B
      `);

      //expect(solution).to.eql({B: 0, C: 0});
      expect(solution).to.eql({B: 2, C: 1});
    });

    it('should iseq with constant B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 2]
        : C [0 1]
        C = A ==? 2
        @custom noleaf A
      `);

      //expect(solution).to.eql({A: 0, C: 0});
      expect(solution).to.eql({A: 2, C: 1});
    });

    it('should iseq with constant C', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 2]
        : B [0 1]
        2 = A ==? B
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 0, B: 0});
    });

    it('should AB iseq with leaf A v1', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 2]
        : B 2
        : C [0 1]
        C = A ==? B
        @custom noleaf C B
      `);

      //expect(solution).to.eql({A: [0, 1], B: 2, C: 0});
      expect(solution).to.eql({A: 2, B: 2, C: 1});
    });

    it('should AB iseq with leaf A v2', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        : C [1 10]
        C = A ==? B
        @custom noleaf C B
      `);

      expect(solution).to.eql({A: 0, B: 0, C: [1, 10]});
    });

    it('should AB iseq with leaf A v3', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        : C [0 0]
        C = A ==? B
        @custom noleaf C B
      `);

      expect(solution).to.eql({A: [1, 10], B: 0, C: 0});
    });

    it('should AB iseq with leaf A v4', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        : C [0 10]
        C = A ==? B
        @custom noleaf C B
      `)).to.throw(/ops: iseq #/);
    });

    it('should AB iseq with leaf A v5', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B 2
        : C [0 10]
        C = A ==? B
        @custom noleaf C B
      `);

      //expect(solution).to.eql({A: [0, 1, 3, 10], B: 2, C: 0});
      expect(solution).to.eql({A: 2, B: 2, C: [1, 10]});
    });

    it('should AB iseq with leaf A v6', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B 2
        : C [1 10]
        C = A ==? B
        @custom noleaf C B
      `);

      expect(solution).to.eql({A: 2, B: 2, C: [1, 10]});
    });

    it('should AB iseq with leaf A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 4 6 10]
        : B 5
        : C [0 10]
        C = A ==? B
        @custom noleaf C B
      `);

      expect(solution).to.eql({A: [0, 4, 6, 10], B: 5, C: 0});
    });

    it('should AB iseq with leaf B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A 2
        : B [0 2]
        : C [0 1]
        C = A ==? B
        @custom noleaf C A
      `);

      expect(solution).to.eql({A: 2, B: 2, C: 1});
    });

    it('shouldnt AB iseq with unsolved leaf B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : B [0 2]
        : C [0 1]
        C = A ==? B
        @custom noleaf C A
      `);

      //expect(solution).to.eql({A: 0, B: [1, 2], C: 0});
      expect(solution).to.eql({A: 0, B: 0, C: 1});
    });

    it('shouldnt blabla trying to proc a certain code branch v1', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : B [0 0 2 2]
        : C [0 1]
        C = A ==? B
        @custom noleaf C A
      `)).to.throw(/ops: iseq #/);
    });

    it('should BA iseq with leaf A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B 2
        : A [0 2]
        : C [0 1]
        C = B ==? A
        @custom noleaf C B
      `);

      //expect(solution).to.eql({A: [0, 1], B: 2, C: 0});
      expect(solution).to.eql({A: 2, B: 2, C: 1});
    });

    it('should BA iseq with leaf B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B [0 2]
        : A 2
        : C [0 1]
        C = B ==? A
        @custom noleaf C A
      `);

      //expect(solution).to.eql({A: 2, B: [0, 1], C: 0});
      expect(solution).to.eql({A: 2, B: 2, C: 1});
    });
  });

  describe('isneq', function() {

    it('should AB isneq base case', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A *
        : B 11
        : C *
        C = A !=? B
        A > 10
        @custom noleaf A B
      `);

      //expect(solution).to.eql({A: 11, B: 11, C: 0});
      expect(solution).to.eql({A: [12, SUP], B: 11, C: [1, SUP]});
    });

    it('should BA isneq base case', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B 11
        : A *
        : C *
        C = B !=? A
        A > 10
        @custom noleaf A B
      `);

      //expect(solution).to.eql({A: 11, B: 11, C: 0});
      expect(solution).to.eql({A: [12, SUP], B: 11, C: [1, SUP]});
    });

    it('should solve constant B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [1 2]
        : R [0 1]
        R = A !=? 1
        @custom noleaf R
      `);

      //expect(solution).to.eql({A: 1, R: 0});
      expect(solution).to.eql({A: 2, R: 1});
    });

    it('should solve constant A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B [1 2]
        : R [0 1]
        R = 1 !=? B
        @custom noleaf R
      `);

      //expect(solution).to.eql({B: 1, R: 0});
      expect(solution).to.eql({B: 2, R: 1});
    });

    it('should solve constant R', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [1 2]
        : B [0 1]
        0 = A !=? B
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 1, B: 1});
    });
  });

  describe('islt', function() {

    it('should AB islt', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 5]
        : B [0 5]
        : C [0 1]
        C = A <? B
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: [0, 5], B: 0, C: 0});
    });

    it('should BA islt', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B [0 5]
        : A [0 5]
        : C [0 1]
        C = B <? A
        @custom noleaf A B
      `);

      //expect(solution).to.eql({A: 0, B: 0, C: 0});
      expect(solution).to.eql({A: 0, B: [0, 5], C: 0});
    });

    it('should islt with constant A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B [0 5]
        : C [0 1]
        C = 2 <? B
        @custom noleaf C
      `);

      //expect(solution).to.eql({B: [2, 5], C: 0});
      expect(solution).to.eql({B: [3, 5], C: 1});
    });

    it('should islt with constant B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 5]
        : C [0 1]
        C = A <? 2
        @custom noleaf C
      `);

      //expect(solution).to.eql({A: [2, 5], C: 0});
      expect(solution).to.eql({A: [0, 1], C: 1});
    });

    it('should islt with constant C', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [1 2]
        : B [0 2]
        2 = A <? B
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 1, B: 2});
    });
  });

  describe('islte', function() {

    it('should AB islte', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 5]
        : B [0 5]
        : C [0 1]
        C = A <=? B
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 1});
    });

    it('should BA islte', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B [0 5]
        : A [0 5]
        : C [0 1]
        C = B <=? A
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 1});
    });

    it('should islte with constant A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B [0 5]
        : C [0 1]
        C = 2 <=? B
        @custom noleaf C
      `);

      //expect(solution).to.eql({B: [0, 1], C: 0});
      expect(solution).to.eql({B: [2, 5], C: 1});
    });

    it('should islte with constant B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 5]
        : C [0 1]
        C = A <=? 2
        @custom noleaf C
      `);

      //expect(solution).to.eql({A: [3, 5], C: 0});
      expect(solution).to.eql({A: [0, 2], C: 1});
    });

    it('should islte with constant C', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : B [2 3]
        2 = A <=? B
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: [0, 1], B: [2, 3]});
    });
  });

  describe('sum', function() {

    it('should remove simple bool case', function() {
      let solution = Solver.pre(`
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
      let solution = Solver.pre(`
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
      let solution = Solver.pre(`
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
      let solution = Solver.pre(`
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
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : R [0 3] # n-1
        R = sum(A B C D)
        @custom noleaf A B C D
      `)).to.throw(/ops: nall #/);
    });

    it('should detect trivial isall patterns', function() {
      let solution = Solver.pre(`
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
      let solution = Solver.pre(`
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
      expect(_ => Solver.pre(`
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

    it('should cut leaf R from AB plus', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        : R *
        R = A + B
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 0, B: 0, R: 0});
    });

    it('should cut leaf R from BA plus', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B [0 10]
        : A [0 10]
        : R *
        R = B + A
        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 0, B: 0, R: 0});
    });

    it('should not cut leaf A from AB plus', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        : R *
        R = A + B
        @custom noleaf R A
      `)).to.throw(/ops: plus #/);
    });

    it('should not cut leaf B from BA plus', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : B [0 10]
        : A [0 10]
        : R *
        R = B + A
        @custom noleaf R B
      `)).to.throw(/ops: plus #/);
    });

    it('should plus with a constant A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B [0 10]
        : R *
        R = 5 + B
        @custom noleaf R
      `);

      expect(solution).to.eql({B: 0, R: 5});
    });

    it('should plus with a constant B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : R *
        R = A + 5
        @custom noleaf R
      `);

      expect(solution).to.eql({A: 0, R: 5});
    });

    it('should plus with a constant R', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        5 = A + B
        @custom noleaf A B
      `)).to.throw(/ops: plus #/);
    });

    it('should rewrite a specific or case', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : R [1 2]
        R = A + B
        @custom noleaf A B
      `)).to.throw(/ops: or #/);
    });

    it('should rewrite a specific nand case', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : R [0 1]
        R = A + B
        @custom noleaf A B
      `)).to.throw(/ops: nand #/);
    });
  });

  describe('or', function() {

    it('should or AB', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A | B
        @custom noleaf A B
      `)).to.throw(/ops: or #/);
    });

    it('should or A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A | B
        @custom noleaf B
      `);

      expect(solution).to.eql({A: [1, 10], B: [0, 10]});
    });

    it('should or B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A | B
        @custom noleaf A
      `);

      expect(solution).to.eql({A: [0, 10], B: [1, 10]});
    });
  });

  describe('xor', function() {

    it('should xor AB', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A ^ B
        @custom noleaf A B
      `)).to.throw(/ops: xor #/);
    });

    it('should xor A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A ^ B
        @custom noleaf B
      `);

      expect(solution).to.eql({A: [1, 10], B: 0});
    });

    it('should xor B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A ^ B
        @custom noleaf A
      `);

      expect(solution).to.eql({A: [1, 10], B: 0});
    });
  });

  describe('nand', function() {

    it('should nand AB', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A !& B
        @custom noleaf A B
      `)).to.throw(/ops: nand #/);
    });

    it('should nand A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A !& B
        @custom noleaf B
      `);

      expect(solution).to.eql({A: 0, B: [0, 10]});
    });

    it('should nand B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A !& B
        @custom noleaf A
      `);

      expect(solution).to.eql({A: 0, B: [0, 10]});
    });
  });

  describe('xnor', function() {

    it('should xnor AB', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A !^ B
        @custom noleaf A B
      `)).to.throw(/ops: xnor #/);
    });

    it('should xnor A', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A !^ B
        @custom noleaf B
      `);

      expect(solution).to.eql({A: [1, 10], B: [1, 10]});
    });

    it('should xnor B', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 10]
        A !^ B
        @custom noleaf A
      `);

      expect(solution).to.eql({A: [1, 10], B: [1, 10]});
    });
  });

  describe('trick xnor booly', function() {

    it('should solve the base case', function() {
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 8
        A !^ C
        @custom noleaf A B C
      `)).to.throw(/debug: .* ops: iseq,xnor #/);
    });

    it('should keep B if its not a booly', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 0 5 5]
        : C [0 1]
        : X, Y [0 10]
        A | Y
        A !^ C
        X = C + Y
        @custom noleaf C X Y
      `)).to.throw(/ops: or,plus #/);
    });
  });

  describe('trick lte_rhs+isall_r', function() {

    it('should morph the basic case', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, R [0 1]
        R = all?(A B)
        C <= R
        # -->  C <= A, C <= B
        @custom noleaf A B C
        @custom free 0
      `)).to.throw(/ops: lte,lte #/);
    });

    it('should morph the swapped basic case', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, R [0 1]
        C <= R
        R = all?(A B)
        # -->  C <= A, C <= B
        @custom noleaf A B C
        @custom free 0
      `)).to.throw(/ops: lte,lte #/);
    });

    it('should not morph if there is no space', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : a, b, c, d, e, f [0 1]
        : L, R [0 1]
        L <= R
        R = all?(L a b c d e f)
        @custom noleaf L a b c d e f
        @custom free 0
      `)).to.throw(/ops: isall,lte #/);
    });

    it('should not morph if there isnt enough space', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : a, b, c, d, e, f [0 1]
        : L, R [0 1]
        L <= R
        R = all?(L a b c d e f)
        @custom noleaf L a b c d e f
        @custom free 10
      `)).to.throw(/ops: isall,lte #/);
    });

    it('should work when isall args arent bool because thats fine too', function() {
      expect(_ => Solver.pre(`
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
      let solution = Solver.pre(`
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
      let solution = Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E, F, X [0 1]
        X = all?(A B C E F)
        D <= X
        # -->  D <= A, D <= B, D <= C, D <= E, D <= F
        @custom noleaf A B C D E F
        @custom free 100
      `)).to.throw(/ops: lte,lte,lte,lte,lte #/);
    });

    it('should work when R=0', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C [0 1]
        : R 0
        C <= R
        R = all?(A B)
        # -->  C <= A, C <= B
        @custom noleaf A B C
        @custom free 0
      `)).to.throw(/ops: nand #/); // by some other optims
    });

    describe('should morph the basic case as long as max(C) <= A,B,R', function() {

      function test(bools, nonbools) {
        it('bools: ' + bools + ', nonbools: ' + nonbools, function() {
          expect(_ => Solver.pre(`
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
          expect(_ => Solver.pre(`
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
          expect(_ => Solver.pre(`
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
          expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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

    it('should eliminate base case of an lte and nand AC', function() {
      let solution = Solver.pre(`
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
      let solution = Solver.pre(`
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

    it('should eliminate base case of an lte and nand CA', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : C [0 1]
        : A [0 1]
        : B [0 1]
        A <= B
        C !& A
        # -> A is leaf var
        @custom noleaf B C
      `);

      expect(solution).to.eql({A: 0, B: 0, C: 0});
    });

    it('should not do lte+neq trick for rhs of lte', function() {
      expect(_ => Solver.pre(`
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
      let solution = Solver.pre(`
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
      let solution = Solver.pre(`
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

    it('should do lte+neq trick if A has no zero and C is zero', function() {
      // nand is eliminated by minimizer and cutter only sees countsA==1..
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [1 10]
        : B [0 10]
        : C 0
        A <= B
        A !& C
        # -> A !& C
        @custom noleaf B C
      `);

      //expect(solution).to.eql({A: 1, B: 1, C: 0});
      expect(solution).to.eql({A: 1, B: [1, 10], C: 0});
    });

    it('should do the trick if there arent too many nands', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : B, C, D [0 1]

        A | B
        A <= C
        A !& D

        : x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15 [0 1]
        # : x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30 [0 1]
        A !& x1
        A !& x2
        A !& x3
        A !& x4
        A !& x5
        A !& x6
        A !& x7
        A !& x8
        A !& x9
        A !& x10
        A !& x11
        A !& x12
        A !& x13
        A !& x14
        A !& x15
        #A !& x16
        #A !& x17
        #A !& x18
        #A !& x19
        #A !& x20
        #A !& x21
        #A !& x22
        #A !& x23
        #A !& x24
        #A !& x25
        #A !& x26
        #A !& x27
        #A !& x28
        #A !& x29
        #A !& x30

        @custom noleaf B C D
        @custom noleaf x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15
        # @custom noleaf x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30
        @custom free 1000
      `)).to.throw(/ops: lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,or #/);
    });

    it('should skip the trick if there are too many nands', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : B, C, D [0 1]

        A | B
        A <= C
        A !& D

        : x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15 [0 1]
        : x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30 [0 1]
        A !& x1
        A !& x2
        A !& x3
        A !& x4
        A !& x5
        A !& x6
        A !& x7
        A !& x8
        A !& x9
        A !& x10
        A !& x11
        A !& x12
        A !& x13
        A !& x14
        A !& x15
        A !& x16
        A !& x17
        A !& x18
        A !& x19
        A !& x20
        A !& x21
        A !& x22
        A !& x23
        A !& x24
        A !& x25
        A !& x26
        A !& x27
        A !& x28
        A !& x29
        A !& x30

        @custom noleaf B C D
        @custom noleaf x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15
        @custom noleaf x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30
        @custom free 1000
      `)).to.throw(/ops: lte,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,or #/);
    });
  });

  describe.skip('trick lte_lhs+isall_r', function() {

    it('should eliminate base case of an lte-lhs and isall-r', function() {
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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

    it('should rewrite base case v1 of an swapped isall2 and nall to a nand', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        nall(A B D)
        A = all?(B C)
        # -> A = all?(B C), A !& D
        # when A is 1, B and C are 1, so D must be 0 (for the nall)
        # when A is 0, B or C is 0, so the nall is resolved
        # when D is 1, A can't be 1 because then B is also one and the nall would break
        @custom noleaf B C D
        # dont exclude A or the trick won't trigger (even when it's B that disappears)
      `)).to.throw(/ops: nall #/); // isall2+nand becomes nall by another trick
    });

    describe('R in isall2 + nall arg check', function() {

      // note: args are ordered by index and indexes are assigned in order of appearance so declarations must be changed as well
      it('should rewrite isall2 nall arg 1', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : D [0 1]
          : A [0 1]
          : B [0 1]
          : C [0 1]
          A = all?(B C)
          nall(A B D)
          @custom noleaf B C D
        `)).to.throw(/ops: nall #/); // isall2+nand becomes nall by other trick
      });

      it('should rewrite isall2 nall arg 2', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : D [0 1]
          : B [0 1]
          : A [0 1]
          : C [0 1]
          A = all?(B C)
          nall(B A D)
          @custom noleaf B C D
        `)).to.throw(/ops: nall #/); // isall2+nand becomes nall by other trick
      });

      it('should rewrite isall2 nall arg 3', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : D [0 1]
          : B [0 1]
          : C [0 1]
          : A [0 1]
          A = all?(B C)
          nall(B D A)
          @custom noleaf B C D
        `)).to.throw(/ops: nall #/); // isall2+nand becomes nall by other trick
      });
    });

    it('should rewrite when argcount > 2 (arg 1)', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        nall(A B D)
        A = all?(B C E)
        @custom noleaf B C D E
      `)).to.throw(/ops: nall #/); // isall+nand becomes nall by other trick
    });

    describe('nall args that share isall arg per index', function() {

      // note: args are ordered by index and indexes are assigned in order of appearance so declarations must be changed as well
      it('should nall 1 with isall A==C', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C [0 1]
          : D [0 1]
          A = all?(B C)
          nall(A B D)
          @custom noleaf B C D
        `)).to.throw(/ops: nall #/); // isall2+nand becomes nall by other trick
      });

      // note: args are ordered by index and indexes are assigned in order of appearance so declarations must be changed as well
      it('should nall 1 with isall A==D', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : D [0 1]
          : A [0 1]
          : B [0 1]
          : C [0 1]
          A = all?(B C)
          nall(D A B)
          @custom noleaf B C D
        `)).to.throw(/ops: nall #/); // isall2+nand becomes nall by other trick
      });

      // note: args are ordered by index and indexes are assigned in order of appearance so declarations must be changed as well
      it('should nall 2 with isall B==C', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : B [0 1]
          : A [0 1]
          : C [0 1]
          : D [0 1]
          A = all?(B C)
          nall(A C D)
          @custom noleaf B C D
        `)).to.throw(/ops: nall #/); // isall2+nand becomes nall by other trick
      });

      // note: args are ordered by index and indexes are assigned in order of appearance so declarations must be changed as well
      it('should nall 2 with isall B==D', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : D [0 1]
          : C [0 1]
          A = all?(B C)
          nall(A D C)
          @custom noleaf B C D
        `)).to.throw(/ops: nall #/); // isall2+nand becomes nall by other trick
      });

      it('should nall 2 with isall none shared', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : A [0 1]
          : B [0 1]
          : C [0 1]
          : D [0 1]
          : E [0 1]
          A = all?(B C)
          nall(A D E)
          @custom noleaf B C D
        `)).to.throw(/ops: isall2,nall #/); // isall2+nand becomes nall by other trick
      });
    });

    it('should rewrite when argcount > 2 (arg 2)', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        A = all?(B C E)
        nall(A B D)
        @custom noleaf B C D E
      `)).to.throw(/ops: nall #/); // isall+nand becomes nall by other trick
    });

    it('should rewrite when argcount > 2 (arg 3)', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        A = all?(D C E)
        nall(A B D)
        @custom noleaf B C D E
      `)).to.throw(/ops: nall #/); // isall+nand becomes nall by other trick
    });

    it('should not rewrite when argcount > 2 but none shared', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E, F [0 1]
        A = all?(D C E)
        nall(A B F)
        @custom noleaf B C D E F
      `)).to.throw(/ops: isall,nall #/);
    });

    // cant test this on isnall2 because it only takes 2 arg (doh)
    it('should also rewrite when isall has 3+ args', function() {
      expect(_ => Solver.pre(`
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
      `)).to.throw(/ops: nall #/); // isall+nand becomes nall by other trick
    });

    it('trying to improve coverage :)', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : R [0 1]
        : X [0 1]
        R = all?(A B C D)
        nall(R B X)
        @custom noleaf A B C D X
      `)).to.throw(/ops: nall #/); // isall+nand becomes nall by other trick
    });


    it('should bail if nall has more than 3 args', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : R [0 1]
        : X [0 1]
        : z [0 1]
        R = all?(A B C D)
        nall(R B X z)
        @custom noleaf A B C D X
      `)).to.throw(/ops: isall,nall #/);
    });

    describe('all variations of nall arg order', function() {

      function test(v1, v2, v3) {
        it('nall(' + v1 + ',' + v2 + ',' + v3 + ')', function() {
          expect(_ => Solver.pre(`
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

  describe('trick isall_r+nand', function() {

    it('should eliminate base case of an isall and nand', function() {
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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

    it('should not rewrite if R is part of too many nands', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        : x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15, x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30 [0 1]
        : R [0 1]
        C !& R
        D !& R
        R !& x1
        R !& x2
        R !& x3
        R !& x4
        R !& x5
        R !& x6
        R !& x7
        R !& x8
        R !& x9
        R !& x10
        R !& x11
        R !& x12
        R !& x13
        R !& x14
        R !& x15
        R !& x16
        R !& x17
        R !& x18
        R !& x19
        R !& x20
        R !& x21
        R !& x22
        R !& x23
        R !& x24
        R !& x25
        R !& x26
        R !& x27
        R !& x28
        R !& x29
        R !& x30
        R = all?(A B E)
        @custom noleaf A B C D x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15, x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30
        @custom free 1000
      `)).to.throw(/ops: isall,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand #/);
    });

    it('should not rewrite if there are two isall2s', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : R [0 1]
        C !& R
        D !& R
        R = all?(A B)
        R = all?(A C)
        # -> same because there is no space for the rewrite
        @custom noleaf A B C D
        @custom free 0                 # redundant but for illustration
      `)).to.throw(/ops: isall2,isall2,nand,nand #/);
    });

    it('should not rewrite if there are two isalls', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        : R [0 1]
        C !& R
        D !& R
        R = all?(A B E)
        R = all?(A C E)
        # -> same because there is no space for the rewrite
        @custom noleaf A B C D E
        @custom free 0                 # redundant but for illustration
      `)).to.throw(/ops: isall,isall,nand,nand #/);
    });

    it('should two isall case mixed v1', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        : R [0 1]
        C !& R
        D !& R
        R = all?(A B E)
        R = all?(A C)
        # -> same because there is no space for the rewrite
        @custom noleaf A B C D E
        @custom free 0                 # redundant but for illustration
      `)).to.throw(/ops: isall,isall2,nand,nand #/);
    });

    it('should two isall case mixed v2', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D, E [0 1]
        : R [0 1]
        C !& R
        D !& R
        R = all?(A C)
        R = all?(A B E)
        # -> same because there is no space for the rewrite
        @custom noleaf A B C D E
        @custom free 0                 # redundant but for illustration
      `)).to.throw(/ops: isall,isall2,nand,nand #/);
    });

    it('should consider R a leaf after the rewrite', function() {
      expect(_ => Solver.pre(`
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
      let solution = Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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

    it('should eliminate base case of an isall with multiple args and two nands', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : a, b, c, d, e [0 1]
        : X, Y [0 1]
        : R [0 1]
        R = all?(a b c d e)
        R !& X
        R !& Y
        # -> nall(a b c d e)

        @custom noleaf a b c d e X
        @custom free 50
      `)).to.throw(/ops: nall,nall #/);
    });
  });

  describe('trick 2xlte_lhs', function() {

    it('should eliminate base case a double lte', function() {
      let solution = Solver.pre(`
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
      let solution = Solver.pre(`
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

    it('should work with semi-overlapping ranges', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [5 10]
        : B [0 8]
        : C [8 11]
        A <= C
        A <= B
        # -> A is a leaf var, eliminate the constraints
        @custom noleaf B C
      `);

      //expect(solution).to.eql({A: 5, B: 5, C: [8, 11]});
      expect(solution).to.eql({A: 5, B: [5, 8], C: [8, 11]});
    });

    it('should work with swapped semi-overlapping ranges', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [5 10]
        : B [0 8]
        : C [8 11]
        A <= B
        A <= C
        # -> A is a leaf var, eliminate the constraints
        @custom noleaf B C
      `);

      //expect(solution).to.eql({A: 5, B: 5, C: [8, 11]});
      expect(solution).to.eql({A: 5, B: [5, 8], C: [8, 11]});
    });

    it('trying to proc code paths v1', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [3 4]
        : B [0 5]
        : C [0 5]
        A <= C
        A <= B
        # -> A is a leaf var, eliminate the constraints
        @custom noleaf B C
      `);

      expect(solution).to.eql({A: 3, B: 3, C: 3});
    });
  });

  describe('trick lte_lhs+neq', function() {

    it('should eliminate base case an lte_lhs and AB neq', function() {
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        D <= A
        A <= C
        A != B
        # -> B | C, B !& D, A is leaf

        @custom noleaf B C D
      `)).to.throw(/ops: nand,or #/);
    });

    it('should do the trick if there arent too many nands', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        D <= A
        A <= C
        A != B

        : x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15 [0 1]
        # : x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30 [0 1]
        A <= x1
        A <= x2
        A <= x3
        A <= x4
        A <= x5
        A <= x6
        A <= x7
        A <= x8
        A <= x9
        A <= x10
        A <= x11
        A <= x12
        A <= x13
        A <= x14
        A <= x15
        #A <= x16
        #A <= x17
        #A <= x18
        #A <= x19
        #A <= x20
        #A <= x21
        #A <= x22
        #A <= x23
        #A <= x24
        #A <= x25
        #A <= x26
        #A <= x27
        #A <= x28
        #A <= x29
        #A <= x30

        @custom noleaf B C D x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15
        # @custom noleaf x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30
        @custom free 1000
      `)).to.throw(/ops: nand,or,or,or,or,or,or,or,or,or,or,or,or,or,or,or,or #/);
    });

    it('should skip the trick if there are too many nands', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        D <= A
        A <= C
        A != B

        : x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15 [0 1]
        : x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30 [0 1]
        A <= x1
        A <= x2
        A <= x3
        A <= x4
        A <= x5
        A <= x6
        A <= x7
        A <= x8
        A <= x9
        A <= x10
        A <= x11
        A <= x12
        A <= x13
        A <= x14
        A <= x15
        A <= x16
        A <= x17
        A <= x18
        A <= x19
        A <= x20
        A <= x21
        A <= x22
        A <= x23
        A <= x24
        A <= x25
        A <= x26
        A <= x27
        A <= x28
        A <= x29
        A <= x30

        @custom noleaf B C D x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15
        @custom noleaf x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30
        @custom free 1000
      `)).to.throw(/ops: lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,lte,neq #/);
    });

    it('should not do the trick if an lte arg is non-bool', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, D [0 1]
        : C [0 10]
        A <= C
        A != B
        D <= A
        @custom noleaf B C D
      `)).to.throw(/ops: lte,lte,neq #/);
    });

    it('should not do the trick with two neqs', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        A <= C
        A != B
        A != C
        D <= A
        @custom noleaf B C D
      `)).to.throw(/ops: lte,lte,neq,neq #/);
    });
  });

  describe('trick neq+lte++', function() {

    it('should morph AB neq, lte, lte with perfect fit', function() {
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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

    it('should morph AB neq, AB nand', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C [0 1]
        A != B
        A !& C
        # -> C <= B, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });

    it('should morph BA neq, AB nand', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : B, A, C [0 1]
        B != A
        A !& C
        # -> C <= B, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });

    it('should morph AB neq, BA nand', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : C, A, B [0 1]
        A != B
        C !& A
        # -> C <= B, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });

    it('should not morph if nand arg isnt bool', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : C [0 10]
        : A, B [0 1]
        A != B
        C !& A
        @custom noleaf B C
      `)).to.throw(/ops: nand,neq #/);
    });
  });

  describe('trick neq+or', function() {

    it('should morph AB neq, AB or', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C [0 1]
        A != B
        A | C
        # -> B <= C, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });

    it('should morph BA neq, AB or', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : B, A, C [0 1]
        B != A
        A | C
        # -> B <= C, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });

    it('should morph AB neq, BA or', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : B, C, A [0 1]
        A != B
        C | A
        # -> B <= C, A leaf

        @custom noleaf B C
      `)).to.throw(/ops: lte #/);
    });

    it('should not do anything if the or arg isnt bool', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : C [0 10]
        : B, A [0 1]
        A != B
        C | A
        @custom noleaf B C
      `)).to.throw(/ops: neq,or #/);
    });
  });

  describe('trick nands only', function() {

    it('should eliminate a var that is only used in nands AB', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B, C [0 1]
        A !& B
        A !& C
        # -> A leaf, solved

        @custom noleaf B C
      `);

      expect(solution).to.eql({A: [0, 1], B: 0, C: 0});
    });

    it('should eliminate a var that is only used in nands BA', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B, C, A [0 1]
        B !& A
        C !& A
        # -> A leaf, solved

        @custom noleaf B C
      `);

      expect(solution).to.eql({A: [0, 1], B: 0, C: 0});
    });

    it('should do the trick if there arent too many nands', function() {
      expect(Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15 [0 1]
        # : x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30 [0 1]
        A !& x1
        A !& x2
        A !& x3
        A !& x4
        A !& x5
        A !& x6
        A !& x7
        A !& x8
        A !& x9
        A !& x10
        A !& x11
        A !& x12
        A !& x13
        A !& x14
        A !& x15
        #A !& x16
        #A !& x17
        #A !& x18
        #A !& x19
        #A !& x20
        #A !& x21
        #A !& x22
        #A !& x23
        #A !& x24
        #A !& x25
        #A !& x26
        #A !& x27
        #A !& x28
        #A !& x29
        #A !& x30

        @custom noleaf x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15
        # @custom noleaf x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30
        @custom free 1000
      `)).to.eql({
        A: [0, 1],
        x1: 0,
        x2: 0,
        x3: 0,
        x4: 0,
        x5: 0,
        x6: 0,
        x7: 0,
        x8: 0,
        x9: 0,
        x10: 0,
        x11: 0,
        x12: 0,
        x13: 0,
        x14: 0,
        x15: 0,
      });
    });

    it('should skip the trick if there are too many nands', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15 [0 1]
        : x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30 [0 1]
        A !& x1
        A !& x2
        A !& x3
        A !& x4
        A !& x5
        A !& x6
        A !& x7
        A !& x8
        A !& x9
        A !& x10
        A !& x11
        A !& x12
        A !& x13
        A !& x14
        A !& x15
        A !& x16
        A !& x17
        A !& x18
        A !& x19
        A !& x20
        A !& x21
        A !& x22
        A !& x23
        A !& x24
        A !& x25
        A !& x26
        A !& x27
        A !& x28
        A !& x29
        A !& x30

        @custom noleaf x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15
        @custom noleaf x16, x17, x18, x19, x20, x21, x22, x23, x24, x25, x26, x27, x28, x29, x30
        @custom free 1000
      `)).to.throw(/ops: nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand,nand #/);
    });
  });

  describe('trick nand+lte+or', function() {

    it('should morph nand, lte, or', function() {
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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

    it('should not do trick when there are two ors', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, X [0 1]
        A !& X
        X <= B
        X | C
        X | B
        @custom noleaf A B C
      `)).to.throw(/ops: lte,nand,or,or #/);
    });

    it('should not do trick when there are two ltes', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, X [0 1]
        A !& X
        X <= B
        X <= C
        X | C
        @custom noleaf A B C
      `)).to.throw(/ops: lte,lte,nand,or #/);
    });
  });

  describe('trick lte+lte+or+nand', function() {

    it('should morph base case of lte_lhs, lte_rhs, or, nand', function() {
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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

    it('should not do trick with double lte_rhs', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        A <= X
        B <= X
        B | X
        C !& X
        X <= D
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,lte,lte,nand,or #/);
    });

    it('should not do trick with double lte_lhs', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        A <= X
        X <= B
        B | X
        C !& X
        X <= D
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,lte,lte,nand,or #/);
    });

    it('should not do trick with double or', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        A <= X
        B | X
        C | X
        C !& X
        X <= D
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,lte,nand,or,or #/);
    });

    it('should not do trick with double nand', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        A <= X
        B | X
        C !& X
        D !& X
        X <= D
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,lte,nand,nand,or #/);
    });

    it('should not accept the fourth op being another lte_rhs', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        A <= X
        B <= X
        B | X
        C !& X
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,lte,nand,or #/);
    });

    it('should not accept the fourth op being another lte_rlhs', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        X <= B
        B | X
        C !& X
        X <= D
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,lte,nand,or #/);
    });

    it('should not accept the fourth op being another or (1)', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        B | X
        C | X
        C !& X
        X <= D
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,nand,or,or #/);
    });

    it('should not accept the fourth op being another or (2)', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        A <= X
        B | X
        C | X
        C !& X
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,nand,or,or #/);
    });

    it('should not accept the fourth op being another nand (1)', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D [0 1]
        : X [0 1]
        A <= X
        B | X
        C !& X
        D !& X
        @custom noleaf A B C D
      `)).to.throw(/ops: lte,nand,nand,or #/);
    });

    it('should not accept the fourth op being another nand (2)', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B, C, D,E [0 1]
        : X [0 1]
        B | X
        C !& X
        E !& X
        X <= D
        @custom noleaf A B C D E
      `)).to.throw(/ops: lte,lte,or #/); // different trick does apply :)
    });
  });

  describe('trick lte_lhs+isall with two shared vars', function() {

    it('should remove lte if isall AB subsumes it', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B, C [0 1]
        : X [0 1]

        X <= A
        X = all?(A B)
        # -> remove X <= A, it is subsumed by the isall
        # (if B=0 then X=0, which is always <=A. if B=1, if A=1 then X=1, <= holds. if A=0 then X=0, <= holds.)

        @custom noleaf A B C
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: [0, 1], X: 0});
    });

    it('should remove lte if isall BA subsumes it', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : B, A, C [0 1]
        : X [0 1]

        X <= A
        X = all?(B A)
        # -> remove X <= A, it is subsumed by the isall
        # (if B=0 then X=0, which is always <=A. if B=1, if A=1 then X=1, <= holds. if A=0 then X=0, <= holds.)

        @custom noleaf A B C
      `);

      expect(solution).to.eql({A: [0, 1], B: 0, C: [0, 1], X: 0});
    });

    it('should take the isall 1 path', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B, C [0 1]
        : X [0 1]

        X <= A
        X = all?(A B C)
        # -> remove X <= A, it is subsumed by the isall
        # (if B=0 then X=0, which is always <=A. if B=1, if A=1 then X=1, <= holds. if A=0 then X=0, <= holds.)

        @custom noleaf A B C
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: [0, 1], X: 0});
    });

    it('should take the isall 1 ABC path', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B, C [0 1]
        : X [0 1]

        X <= A
        X = all?(B A C)
        # -> remove X <= A, it is subsumed by the isall
        # (if B=0 then X=0, which is always <=A. if B=1, if A=1 then X=1, <= holds. if A=0 then X=0, <= holds.)

        @custom noleaf A B C
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: [0, 1], X: 0});
    });

    it('should take the isall 1 BAC path', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B, C [0 1]
        : X [0 1]

        X <= A
        X = all?(B A C)
        # -> remove X <= A, it is subsumed by the isall
        # (if B=0 then X=0, which is always <=A. if B=1, if A=1 then X=1, <= holds. if A=0 then X=0, <= holds.)

        @custom noleaf A B C
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: [0, 1], X: 0});
    });

    it('should take the isall 1 BCA path', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B, C [0 1]
        : X [0 1]

        X <= A
        X = all?(B C A)
        # -> remove X <= A, it is subsumed by the isall
        # (if B=0 then X=0, which is always <=A. if B=1, if A=1 then X=1, <= holds. if A=0 then X=0, <= holds.)

        @custom noleaf A B C
      `);

      expect(solution).to.eql({A: 0, B: [0, 1], C: [0, 1], X: 0});
    });

    it('should not cut if shared var isnt a bool', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B [0 5]
        : X [0 2]

        X <= A
        X = all?(A B)
        # -> remove X <= A, it is subsumed by the isall
        # (if B=0 then X=0, which is always <=A. if B=1, if A=1 then X=1, <= holds. if A=0 then X=0, <= holds.)

        @custom noleaf A B
      `);

      expect(solution).to.eql({A: 0, B: [0, 5], X: 0});
    });

    it('should cut even if shared var isnt booly', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A, B [1 5]
        : X [0 2]

        X <= A
        X = all?(A B)

        @custom noleaf A B
      `);

      //expect(solution).to.eql({A: 1, B: [1, 5], X: 1});
      expect(solution).to.eql({A: [1, 5], B: [1, 5], X: 1});
    });

    it('should cut if shared var isnt booly', function() {
      let solution = Solver.pre(`
        @custom var-strat throw
        : A [1 5]
        : B 0
        : X [0 2]

        X <= A
        X = all?(A B)

        @custom noleaf A
      `);

      expect(solution).to.eql({A: [1, 5], B: 0, X: 0});
    });
  });

  describe('trick isall+plus', function() {

    it('should rewrite combined isAll to a leaf var', function() {
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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

  describe('trick plus+iseq', function() {

    it('should isall base case', function() {
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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
      expect(_ => Solver.pre(`
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

    it('should not do anything if isall args arent solved', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : B, A [0 1]
        : C [0 2]
        : R [0 1]
        C = B + A
        R = C ==? 2
        @custom noleaf A B R
      `)).to.throw(/ops: isall2 #/);
    });

    it('should not do trick if D isnt solved', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : B, A [0 1]
        : C [0 2]
        : R [0 1]
        : D [0 10]
        C = B + A
        R = C ==? D
        @custom noleaf A B R D
      `)).to.throw(/ops: iseq,plus #/);
    });

    it('should not do trick if A isnt bool', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 10]
        : B [0 1]
        : C [0 2]
        : R [0 1]
        : D [0 10]
        C = B + A
        R = C ==? D
        @custom noleaf A B R D
      `)).to.throw(/ops: iseq,plus #/);
    });

    it('should not do trick if B isnt bool', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A [0 1]
        : B [0 10]
        : C [0 2]
        : R [0 1]
        : D [0 10]
        C = B + A
        R = C ==? D
        @custom noleaf A B R D
      `)).to.throw(/ops: iseq,plus #/);
    });

    it('should ignore isxor pattern for now', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : B, A [0 1]
        : C [0 2]
        : R [0 1]
        C = B + A
        R = C ==? 1
        @custom noleaf A B R
      `)).to.throw(/ops: iseq,plus #/);
    });

    it('should bail if isnone case has no space', function() {
      expect(_ => Solver.pre(`
        @custom var-strat throw
        : A, B [0 1]
        : C [0 2]
        : R [0 1]
        C = A + B
        R = C ==? 0
        @custom noleaf A B R
        @custom free 0
      `)).to.throw(/ops: iseq,plus #/);
    });
  });

  describe('trick sum+iseq', function() {

    describe('to isall', function() {

      it('should isall base case AB', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : A, B, C, D, E [0 1]
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 5
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isall #/);
      });

      it('should isall base case BA', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : A, B, C, D, E [0 1]
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 5
          @custom noleaf A B C D E S
        `)).to.throw(/ops: isall #/);
      });

      it('should bail if iseq args arent solved', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : A, B, C, D, E, F [0 1]
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? F
          @custom noleaf A B C D E F S
        `)).to.throw(/ops: iseq,sum #/);
      });

      it('should bail if isall const isnt zero nor argcount (1)', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : A, B, C, D, E [0 1]
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 4
          @custom noleaf A B C D E S
        `)).to.throw(/ops: iseq,sum #/);
      });

      it('should bail if isall const isnt zero nor argcount (2)', function() {
        expect(Solver.pre(`
          @custom var-strat throw
          : A, B, C, D, E [0 1]
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 100 # way out of range. solves before cutter
          @custom noleaf A B C D E S
        `)).to.eql({A: 0, B: 0, C: 0, D: 0, E: 0, R: 0, S: 0});
      });

      it('should bail if a sum arg isnt bool', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : A, B, D, E [0 1]
          : C [0 10]
          : R [0 5]
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 5
          @custom noleaf A B C D E S
        `)).to.throw(/ops: iseq,sum #/);
      });

      it('should isall base case BA', function() {
        expect(_ => Solver.pre(`
          @custom var-strat throw
          : A, B, C, D, E [0 1]
          : R [0 3 5 5] # will contain the required 5, but misses 4, so range check should fail
          : S [0 1]
          R = sum(A B C D E)
          S = R ==? 5
          @custom noleaf A B C D E S
        `)).to.throw(/ops: iseq,sum #/);
      });

      it('should isall base reverse case', function() {
        expect(_ => Solver.pre(`
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
        expect(_ => Solver.pre(`
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
        expect(_ => Solver.pre(`
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
        expect(Solver.pre(`
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
        expect(Solver.pre(`
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
        expect(Solver.pre(`
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
        expect(Solver.pre(`
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
        expect(_ => Solver.pre(`
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
        expect(_ => Solver.pre(`
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
        expect(_ => Solver.pre(`
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
        expect(_ => Solver.pre(`
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

  describe('regressions', function() {

    //it('adding all the vars except A fixes this', function() {
    //  let solution = Solver.pre(`
    //    @custom var-strat throw
    //    : A, B, C, D, E *
    //    A != B
    //    A <= C
    //    @custom noleaf B
    //  `);
    //
    //  expect(solution).to.eql({A: [11, SUP], B: 0});
    //});
  });
});
