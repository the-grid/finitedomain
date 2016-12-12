import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

describe('src/runner.spec', function() {

  describe('problems without any branching', function() {

    describe('eq', function() {

      it('should solve a solved case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 1
          : B = 1
          A == B
        `);

        expect(solution).to.eql({A: 1, B: 1});
      });

      it('should reject a bad case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 8
          : B = 10
          A == B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [11 20]
          : B = [12 18]
          : C = 15
          A == B
          B == C
        `);

        expect(solution).to.eql({A: 15, B: 15, C: 15});
      });
    });

    describe('neq', function() {

      it('should solve a solved case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 8
          : B = 10
          A != B
        `);

        expect(solution).to.eql({A: 8, B: 10});
      });

      it('should reject a bad case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 1
          : B = 1
          A != B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [11 12]
          : B = [12 13]
          : C = 13
          A != B
          B != C
        `);

        expect(solution).to.eql({A: 11, B: 12, C: 13});
      });
    });

    describe('lt', function() {

      it('should solve a solved case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 8
          : B = 10
          A < B
        `);

        expect(solution).to.eql({A: 8, B: 10});
      });

      it('should reject a bad case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 1
          : B = 1
          A < B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [11 12]
          : B = [12 13]
          : C = 13
          A < B
          B < C
        `);

        expect(solution).to.eql({A: 11, B: 12, C: 13});
      });
    });

    describe('lte', function() {

      it('should solve a < case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 8
          : B = 10
          A <= B
        `);

        expect(solution).to.eql({A: 8, B: 10});
      });

      it('should solve a == case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 1
          : B = 1
          A <= B
        `);

        expect(solution).to.eql({A: 1, B: 1});
      });

      it('should reject a bad case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 2
          : B = 1
          A <= B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [11 12]
          : B = [11 12]
          : C = 11
          A <= B
          B <= C
        `);

        expect(solution).to.eql({A: 11, B: 11, C: 11});
      });
    });

    describe('gt', function() {

      it('should solve a solved case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 21
          : B = 15
          A > B
        `);

        expect(solution).to.eql({A: 21, B: 15});
      });

      it('should reject a bad case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 1
          : B = 1
          A > B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [11 12]
          : B = [10 11]
          : C = 10
          A > B
          B > C
        `);

        expect(solution).to.eql({A: 12, B: 11, C: 10});
      });
    });

    describe('gte', function() {

      it('should solve a > case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 5
          : B = 3
          A >= B
        `);

        expect(solution).to.eql({A: 5, B: 3});
      });

      it('should solve a == case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 10
          : B = 10
          A >= B
        `);

        expect(solution).to.eql({A: 10, B: 10});
      });

      it('should reject a bad case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 0
          : B = 1
          A >= B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [11 12]
          : B = [11 12]
          : C = 12
          A >= B
          B >= C
        `);

        expect(solution).to.eql({A: 12, B: 12, C: 12});
      });
    });

    describe('distinct', function() {

      it('should solve a solved case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 5
          : B = 3
          distinct(A B)
        `);

        expect(solution).to.eql({A: 5, B: 3});
      });

      it('should reject a failed case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 10
          : B = 10
          distinct(A B)
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [11 12]
          : B = [11 12]
          : C = 12
          distinct(A B)
          distinct(B C)
        `);

        expect(solution).to.eql({A: 12, B: 11, C: 12});
      });
    });

    describe('plus', function() {

      it('should solve a solved case cci', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 50
          : B = 80
          C = A + B
        `);

        expect(solution).to.eql({A: 50, B: 80, C: 130});
      });

      it('should solve a solved case ccu', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 5
          : B = 3
          : C = [0 10]
          C = A + B
        `);

        expect(solution).to.eql({A: 5, B: 3, C: 8});
      });

      it('should solve a solved case cuc', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 5
          : B = [0 10]
          : C = 15
          C = A + B
        `);

        expect(solution).to.eql({A: 5, B: 10, C: 15});
      });

      it('should solve a solved case ucc', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [20 25]
          : B = 8
          : C = 29
          C = A + B
        `);

        expect(solution).to.eql({A: 21, B: 8, C: 29});
      });

      it('should reject a failed case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 10
          : B = 20
          : C = 4
          C = A + B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [5 8]
          : B = 8
          : C = [15, 100]
          : D = 8
          : E = 23
          C = A + B # force A to C-B=7 (after C is set to 15 below)
          E = C + D # force C to E-D=15
        `);

        expect(solution).to.eql({A: 7, B: 8, C: 15, D: 8, E: 23});
      });
    });

    describe('minus', function() {

      it('should solve a solved case cci', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 80
          : B = 50
          C = A - B
        `);

        expect(solution).to.eql({A: 80, B: 50, C: 30});
      });

      it('should solve a solved case ccu', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 5
          : B = 3
          : C = [0 10]
          C = A - B
        `);

        expect(solution).to.eql({A: 5, B: 3, C: 2});
      });

      it('should solve a solved case cuc', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 5
          : B = [0 10]
          : C = 15
          C = A + B
        `);

        expect(solution).to.eql({A: 5, B: 10, C: 15});
      });

      it('should solve a solved case ucc', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [20 25]
          : B = 8
          : C = 14
          C = A - B
        `);

        expect(solution).to.eql({A: 22, B: 8, C: 14});
      });

      it('should reject a failed case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 10
          : B = 20
          : C = 4
          C = A - B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [15 18] # 18
          : B = 8
          : C = [5, 100] # 10
          : D = 8
          : E = 2
          C = A - B # force A to A=B+C=18 (after C is set to 10 below)
          E = C - D # force C to C=D+E=10
        `);

        expect(solution).to.eql({A: 18, B: 8, C: 10, D: 8, E: 2});
      });
    });

    describe('mul', function() {

      it('should solve a solved case cci', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 50
          : B = 80
          C = A * B
        `);

        expect(solution).to.eql({A: 50, B: 80, C: 4000});
      });

      it('should solve a solved case ccu', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 5
          : B = 3
          : C = [0 20]
          C = A * B
        `);

        expect(solution).to.eql({A: 5, B: 3, C: 15});
      });

      it('should solve a solved case cuc', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 5
          : B = [0 10]
          : C = 45
          C = A * B
        `);

        expect(solution).to.eql({A: 5, B: 9, C: 45});
      });

      it('should solve a solved case ucc', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [0 25]
          : B = 8
          : C = 32
          C = A * B
        `);

        expect(solution).to.eql({A: 4, B: 8, C: 32});
      });

      it('should reject a failed case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 10
          : B = 20
          : C = 4
          C = A * B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [5 8] # 5
          : B = 10
          : C = [0, 100] # 50
          : D = 60
          : E = 3000
          C = A * B # force A to C/B=5 (after C is set to 50 below)
          E = C * D # force C to E/D=50
        `);

        expect(solution).to.eql({A: 5, B: 10, C: 50, D: 60, E: 3000});
      });

      it('should work with all zeroes', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 0
          : B = 0
          : C = 0
          C = A * B
        `);

        expect(solution).to.eql({A: 0, B: 0, C: 0});
      });
    });

    describe('div', function() {

      it('should solve a solved case cci', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 50
          : B = 10
          C = A / B
        `);

        expect(solution).to.eql({A: 50, B: 10, C: 5});
      });

      it('should solve a solved case ccu', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 8
          : B = 4
          : C = [0 20]
          C = A / B
        `);

        expect(solution).to.eql({A: 8, B: 4, C: 2});
      });

      it('should solve a solved case cuc', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 28
          : B = [0 10]
          : C = 4
          C = A / B
        `);

        expect(solution).to.eql({A: 28, B: 7, C: 4});
      });

      it('should solve a solved case ucc', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [0 144]
          : B = 7
          : C = 18
          C = A / B
        `);

        expect(solution).to.eql({A: 126, B: 7, C: 18});
      });

      it('should reject a failed case', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 10
          : B = 20
          : C = 4
          C = A / B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve transitivity', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = [0 1000000] # 173745
          : B = 33
          : C = [0, 10000] # 5265
          : D = 27
          : E = 195
          C = A / B # force A to C/B=173745 (after C is set to 5265 below)
          E = C / D # force C to E*D=5265
        `);

        expect(solution).to.eql({A: 173745, B: 33, C: 5265, D: 27, E: 195});
      });

      it('should work with all zeroes', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A = 0
          : B = 0
          : C = 0
          C = A / B
        `);

        expect(solution).to.eql({A: 0, B: 0, C: 0});
      });
    });

    describe('iseq', function() {

      it('should solve C if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B 5
          C = A ==? B
        `);

        expect(solution).to.eql({A: 5, B: 5, C: 1});
      });

      it('should solve C if A!=B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B 6
          C = A ==? B
        `);

        expect(solution).to.eql({A: 5, B: 6, C: 0});
      });

      it('should accept C=1 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B 5
          : C 1
          C = A ==? B
        `);

        expect(solution).to.eql({A: 5, B: 5, C: 1});
      });

      it('should accept C=0 if A!=B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B 6
          : C 0
          C = A ==? B
        `);

        expect(solution).to.eql({A: 5, B: 6, C: 0});
      });

      it('should reject C=0 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B 5
          : C 0
          C = A ==? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=1 if A!=B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B 6
          : C 1
          C = A ==? B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve B with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B [0 10]
          : C 1
          C = A ==? B
        `);

        expect(solution).to.eql({A: 5, B: 5, C: 1});
      });

      it('should solve B with C=0', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [80 81]
          : C 0
          C = A ==? B
        `);

        expect(solution).to.eql({A: 80, B: 81, C: 0});
      });

      it('should solve A with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 10]
          : B 5
          : C 1
          C = A ==? B
        `);

        expect(solution).to.eql({A: 5, B: 5, C: 1});
      });

      it('should solve A with C=0', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [80 81]
          : B 80
          : C 0
          C = A ==? B
        `);

        expect(solution).to.eql({A: 81, B: 80, C: 0});
      });

      it('should solve transitively', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 1] # 0
          : B 1
          : C [0 1] # 0
          : D 0
          : E 1
          C = A ==? B        # [0 1] = [0 1] ==? 1  -> 0 = [0 1] ==? 1  -> 0 = 0 ==? 1
          E = C ==? D        # 1 = [0 1] ==? 0      -> 1 = 0 ==? 0
        `);

        expect(solution).to.eql({A: 0, B: 1, C: 0, D: 0, E: 1});
      });
    });

    describe('isneq', function() {

      it('should solve C if A!=B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 56
          : B 77
          C = A !=? B
        `);

        expect(solution).to.eql({A: 56, B: 77, C: 1});
      });

      it('should solve C if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 65
          : B 65
          C = A !=? B
        `);

        expect(solution).to.eql({A: 65, B: 65, C: 0});
      });

      it('should accept C=1 if A!=B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 571
          : B 18
          : C 1
          C = A !=? B
        `);

        expect(solution).to.eql({A: 571, B: 18, C: 1});
      });

      it('should accept C=0 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B 5
          : C 0
          C = A !=? B
        `);

        expect(solution).to.eql({A: 5, B: 5, C: 0});
      });

      it('should reject C=0 if A!=B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 38
          : B 404
          : C 0
          C = A !=? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=1 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 20
          : B 20
          : C 1
          C = A !=? B
        `);

        expect(solution).to.equal(false);
      });

      it('should solve B with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B [5 6]
          : C 1
          C = A !=? B
        `);

        expect(solution).to.eql({A: 5, B: 6, C: 1});
      });

      it('should solve B with C=0', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [0 100]
          : C 0
          C = A !=? B
        `);

        expect(solution).to.eql({A: 80, B: 80, C: 0});
      });

      it('should solve A with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [10 11]
          : B 10
          : C 1
          C = A !=? B
        `);

        expect(solution).to.eql({A: 11, B: 10, C: 1});
      });

      it('should solve A with C=0', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 100]
          : B 80
          : C 0
          C = A !=? B
        `);

        expect(solution).to.eql({A: 80, B: 80, C: 0});
      });

      it('should solve transitively', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 1] # 0
          : B 1
          : C [0 1] # 1
          : D 0
          : E 1
          C = A !=? B        # [0 1] = [0 1] !=? 1  -> 1 = [0 1] !=? 1  -> 0 = 1 !=? 1
          E = C !=? D        # 1 = [0 1] !=? 0      -> 1 = 1 !=? 0
        `);

        expect(solution).to.eql({A: 0, B: 1, C: 1, D: 0, E: 1});
      });
    });

    describe('islt', function() {

      it('should solve C if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 64
          : B 65
          C = A <? B
        `);

        expect(solution).to.eql({A: 64, B: 65, C: 1});
      });

      it('should solve C if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 65
          : B 65
          C = A <? B
        `);

        expect(solution).to.eql({A: 65, B: 65, C: 0});
      });

      it('should solve C if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 66
          : B 65
          C = A <? B
        `);

        expect(solution).to.eql({A: 66, B: 65, C: 0});
      });

      it('should accept C=1 if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 18
          : B 571
          : C 1
          C = A <? B
        `);

        expect(solution).to.eql({A: 18, B: 571, C: 1});
      });

      it('should reject C=1 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 50
          : C 1
          C = A <? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=1 if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 51
          : B 50
          : C 1
          C = A <? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=0 if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 51
          : C 0
          C = A <? B
        `);

        expect(solution).to.equal(false);
      });

      it('should accept C=0 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 50
          : C 0
          C = A <? B
        `);

        expect(solution).to.eql({A: 50, B: 50, C: 0});
      });

      it('should accept C=0 if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 51
          : B 50
          : C 0
          C = A <? B
        `);

        expect(solution).to.eql({A: 51, B: 50, C: 0});
      });

      it('should solve B with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B [5 6]
          : C 1
          C = A <? B
        `);

        expect(solution).to.eql({A: 5, B: 6, C: 1});
      });

      it('should solve B with C=0 (=)', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [80 81]
          : C 0
          C = A <? B
        `);

        expect(solution).to.eql({A: 80, B: 80, C: 0});
      });

      it('should solve B with C=0 (>)', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [79 79 81 81]
          : C 0
          C = A <? B
        `);

        expect(solution).to.eql({A: 80, B: 79, C: 0});
      });

      it('should solve A with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [10 11]
          : B 11
          : C 1
          C = A <? B
        `);

        expect(solution).to.eql({A: 10, B: 11, C: 1});
      });

      it('should solve A with C=0', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 80]
          : B 80
          : C 0
          C = A <? B
        `);

        expect(solution).to.eql({A: 80, B: 80, C: 0});
      });

      it('should solve transitively', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 1] # 0
          : B 1
          : C [0 1] # 1
          : D 1
          : E 0
          C = A <? B        # [0 1] = [0 1] <? 1  -> 1 = [0 1] <? 1  -> 0 = 1 <? 1
          E = C <? D        # 0 = [0 1] <? 1      -> 0 = 1 <? 1
        `);

        expect(solution).to.eql({A: 0, B: 1, C: 1, D: 1, E: 0});
      });
    });

    describe('islte', function() {

      it('should solve C if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 64
          : B 65
          C = A <=? B
        `);

        expect(solution).to.eql({A: 64, B: 65, C: 1});
      });

      it('should solve C if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 65
          : B 65
          C = A <=? B
        `);

        expect(solution).to.eql({A: 65, B: 65, C: 1});
      });

      it('should solve C if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 66
          : B 65
          C = A <=? B
        `);

        expect(solution).to.eql({A: 66, B: 65, C: 0});
      });

      it('should accept C=1 if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 18
          : B 571
          : C 1
          C = A <=? B
        `);

        expect(solution).to.eql({A: 18, B: 571, C: 1});
      });

      it('should accept C=1 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 50
          : C 1
          C = A <=? B
        `);

        expect(solution).to.eql({A: 50, B: 50, C: 1});
      });

      it('should reject C=1 if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 51
          : B 50
          : C 1
          C = A <=? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=0 if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 51
          : C 0
          C = A <=? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=0 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 50
          : C 0
          C = A <=? B
        `);

        expect(solution).to.equal(false);
      });

      it('should accept C=0 if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 51
          : B 50
          : C 0
          C = A <=? B
        `);

        expect(solution).to.eql({A: 51, B: 50, C: 0});
      });

      it('should solve B with C=1 (=)', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B [4 5]
          : C 1
          C = A <=? B
        `);

        expect(solution).to.eql({A: 5, B: 5, C: 1});
      });

      it('should solve B with C=1 (>)', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B [4 4 6 6]
          : C 1
          C = A <=? B
        `);

        expect(solution).to.eql({A: 5, B: 6, C: 1});
      });

      it('should solve B with C=0', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [79 81]
          : C 0
          C = A <=? B
        `);

        expect(solution).to.eql({A: 80, B: 79, C: 0});
      });

      it('should solve B with C=0 (>)', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [79 79 81 81]
          : C 0
          C = A <=? B
        `);

        expect(solution).to.eql({A: 80, B: 79, C: 0});
      });

      it('should solve A with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [9 9 12 12]
          : B 11
          : C 1
          C = A <=? B
        `);

        expect(solution).to.eql({A: 9, B: 11, C: 1});
      });

      it('should solve A with C=0', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 81]
          : B 80
          : C 0
          C = A <=? B
        `);

        expect(solution).to.eql({A: 81, B: 80, C: 0});
      });

      it('should solve transitively', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 1] # 0
          : B 0
          : C [0 1] # 1
          : D 0
          : E 0
          C = A <=? B        # [0 1] = [0 1] <=? 0  ->  1 = [0 1] <=? 0  ->  1 = 0 <=? 0
          E = C <=? D        # 0 = [0 1] <=? 0  ->  0 = 1 <=? 0
        `);

        expect(solution).to.eql({A: 0, B: 0, C: 1, D: 0, E: 0});
      });
    });

    describe('isgt', function() {

      it('should solve C if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 65
          : B 64
          C = A >? B
        `);

        expect(solution).to.eql({A: 65, B: 64, C: 1});
      });

      it('should solve C if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 65
          : B 65
          C = A >? B
        `);

        expect(solution).to.eql({A: 65, B: 65, C: 0});
      });

      it('should solve C if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 65
          : B 66
          C = A >? B
        `);

        expect(solution).to.eql({A: 65, B: 66, C: 0});
      });

      it('should accept C=1 if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 571
          : B 18
          : C 1
          C = A >? B
        `);

        expect(solution).to.eql({A: 571, B: 18, C: 1});
      });

      it('should reject C=1 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 50
          : C 1
          C = A >? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=1 if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 51
          : C 1
          C = A >? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=0 if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 51
          : B 50
          : C 0
          C = A >? B
        `);

        expect(solution).to.equal(false);
      });

      it('should accept C=0 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 50
          : C 0
          C = A >? B
        `);

        expect(solution).to.eql({A: 50, B: 50, C: 0});
      });

      it('should accept C=0 if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 51
          : C 0
          C = A >? B
        `);

        expect(solution).to.eql({A: 50, B: 51, C: 0});
      });

      it('should solve B with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B [4 6]
          : C 1
          C = A >? B
        `);

        expect(solution).to.eql({A: 5, B: 4, C: 1});
      });

      it('should solve B with C=0 (=)', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [79 80]
          : C 0
          C = A >? B
        `);

        expect(solution).to.eql({A: 80, B: 80, C: 0});
      });

      it('should solve B with C=0 (>)', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [79 79 81 81]
          : C 0
          C = A >? B
        `);

        expect(solution).to.eql({A: 80, B: 81, C: 0});
      });

      it('should solve A with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [10 12]
          : B 11
          : C 1
          C = A >? B
        `);

        expect(solution).to.eql({A: 12, B: 11, C: 1});
      });

      it('should solve A with C=0', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [80 100]
          : B 80
          : C 0
          C = A >? B
        `);

        expect(solution).to.eql({A: 80, B: 80, C: 0});
      });

      it('should solve transitively', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 1] # 1
          : B 0
          : C [0 1] # 1
          : D 0
          : E 1
          C = A >? B        # [0 1] = [0 1] >? 0  -> 1 = [0 1] >? 0  -> 0 = 1 >? 0
          E = C >? D        # 1 = [0 1] >? 0      -> 1 = 1 >? 0
        `);

        expect(solution).to.eql({A: 1, B: 0, C: 1, D: 0, E: 1});
      });
    });

    describe('isgte', function() {

      it('should solve C if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 65
          : B 64
          C = A >=? B
        `);

        expect(solution).to.eql({A: 65, B: 64, C: 1});
      });

      it('should solve C if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 65
          : B 65
          C = A >=? B
        `);

        expect(solution).to.eql({A: 65, B: 65, C: 1});
      });

      it('should solve C if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 65
          : B 66
          C = A >=? B
        `);

        expect(solution).to.eql({A: 65, B: 66, C: 0});
      });

      it('should accept C=1 if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 571
          : B 18
          : C 1
          C = A >=? B
        `);

        expect(solution).to.eql({A: 571, B: 18, C: 1});
      });

      it('should accept C=1 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 50
          : C 1
          C = A >=? B
        `);

        expect(solution).to.eql({A: 50, B: 50, C: 1});
      });

      it('should reject C=1 if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 51
          : C 1
          C = A >=? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=0 if A>B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 51
          : B 50
          : C 0
          C = A >=? B
        `);

        expect(solution).to.equal(false);
      });

      it('should reject C=0 if A==B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 50
          : C 0
          C = A >=? B
        `);

        expect(solution).to.equal(false);
      });

      it('should accept C=0 if A<B', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 50
          : B 51
          : C 0
          C = A >=? B
        `);

        expect(solution).to.eql({A: 50, B: 51, C: 0});
      });

      it('should solve B with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 5
          : B [4 4 6 6]
          : C 1
          C = A >=? B
        `);

        expect(solution).to.eql({A: 5, B: 4, C: 1});
      });

      it('should solve B with C=0 (=)', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [79 81]
          : C 0
          C = A >=? B
        `);

        expect(solution).to.eql({A: 80, B: 81, C: 0});
      });

      it('should solve B with C=0 (>)', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A 80
          : B [79 79 81 81]
          : C 0
          C = A >=? B
        `);

        expect(solution).to.eql({A: 80, B: 81, C: 0});
      });

      it('should solve A with C=1', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [10 10 12 12]
          : B 11
          : C 1
          C = A >=? B
        `);

        expect(solution).to.eql({A: 12, B: 11, C: 1});
      });

      it('should solve A with C=0', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [79 100]
          : B 80
          : C 0
          C = A >=? B
        `);

        expect(solution).to.eql({A: 79, B: 80, C: 0});
      });

      it('should solve transitively', function() {
        let solution = solverSolver(`
          @custom var-strat throw
          : A [0 1] # 1
          : B 1
          : C [0 1] # 1
          : D 1
          : E 1
          C = A >=? B        # [0 1] = [0 1] >=? 1  -> 1 = [0 1] >=? 1  -> 0 = 1 >=? 1
          E = C >=? D        # 1 = [0 1] >=? 1      -> 1 = 1 >=? 1
        `);

        expect(solution).to.eql({A: 1, B: 1, C: 1, D: 1, E: 1});
      });
    });

    describe('sum', function() {

      it('should solve a simple sum with 1 var', function() {
        let solution = solverSolver(`
          : A 1
          R = sum(A)
        `);

        expect(solution).to.eql({A: 1, R: 1});
      });

      it('should solve a simple sum with 2 vars', function() {
        let solution = solverSolver(`
          : A 1
          : B 10
          R = sum(A B)
        `);

        expect(solution).to.eql({A: 1, B: 10, R: 11});
      });

      it('should solve a simple sum with 3 vars', function() {
        let solution = solverSolver(`
          : A 1
          : B 10
          : C 7
          R = sum(A B C)
        `);

        expect(solution).to.eql({A: 1, B: 10, C: 7, R: 18});
      });

      it('should solve a simple sum with 4 vars', function() {
        let solution = solverSolver(`
          : A 1
          : B 10
          : C 7
          : D 4
          R = sum(A B C D)
        `);

        expect(solution).to.eql({A: 1, B: 10, C: 7, D: 4, R: 22});
      });

      it('should solve when B is unsolved but R is', function() {
        let solution = solverSolver(`
          : A 1
          : B [5 10]
          : C 7
          : R 18
          R = sum(A B C)
        `);

        expect(solution).to.eql({A: 1, B: 10, C: 7, R: 18});
      });

      it('should solve when B is unsolved and forced by other constraint with 2 vars', function() {
        let solution = solverSolver(`
          : A 1
          : B [5 10]
          : X = 10
          R = sum(A B)
          B == X
        `);

        expect(solution).to.eql({A: 1, B: 10, R: 11, X: 10, __1: 1}); // TODO: eliminate that temp var from showing up
      });

      it('should solve when B is unsolved and forced by other constraint with 3 vars', function() {
        let solution = solverSolver(`
          : A 1
          : B [5 10]
          : C 7
          : X = 10
          R = sum(A B C)
          B == X
        `);

        expect(solution).to.eql({A: 1, B: 10, C: 7, R: 18, X: 10, __1: 8}); // TODO: eliminate that temp var from showing up
      });

      it('should solve when B is unsolved and forced by other constraint with 4 vars', function() {
        let solution = solverSolver(`
          : A 1
          : B [5 10]
          : C 7
          : D 11
          : X = 10
          R = sum(A B C D)
          B == X
        `);

        expect(solution).to.eql({A: 1, B: 10, C: 7, D: 11, R: 29, X: 10, __1: 19}); // TODO: eliminate that temp var from showing up
      });

      it('should accept one var', function() {
        let solution = solverSolver(`
          : A [0 10]
          : X 10
          R = sum(A)
          A == X
        `);

        expect(solution).to.eql({A: 10, R: 10, X: 10});
      });

      it('should clear args if result is solved to zero immediately', function() {
        let solution = solverSolver(`
          : A 0
          : B [0 10]
          : C [0 80]
          : D [0 11]
          : E 0
          : R 0
          R = sum(A B C D E)
        `);

        expect(solution).to.eql({A: 0, B: 0, C: 0, D: 0, E: 0, R: 0}); // TODO: eliminate that temp var from showing up
      });

      it('should clear args if result is solved to zero transitive', function() {
        let solution = solverSolver(`
          : A 0
          : B [0 10]
          : C [0 80]
          : D [0 11]
          : E 0
          : X 0
          X = sum(A B C D E)
          B == X
        `);

        expect(solution).to.eql({A: 0, B: 0, C: 0, D: 0, E: 0, X: 0}); // TODO: eliminate that temp var from showing up
      });
    });

    describe('product', function() {

      it('should solve a simple product with 1 var', function() {
        let solution = solverSolver(`
          : A 28
          R = product(A)
        `);

        expect(solution).to.eql({A: 28, R: 28});
      });

      it('should solve a simple product with a zero', function() {
        let solution = solverSolver(`
          : A 0
          R = product(A)
        `);

        expect(solution).to.eql({A: 0, R: 0});
      });

      it('should solve a simple product with 2 vars', function() {
        let solution = solverSolver(`
          : A 2
          : B 10
          R = product(A B)
        `);

        expect(solution).to.eql({A: 2, B: 10, R: 20});
      });

      it('should solve a simple product with a zero and non-zero', function() {
        let solution = solverSolver(`
          : A 14
          : B 0
          R = product(A B)
        `);

        expect(solution).to.eql({A: 14, B: 0, R: 0});
      });

      it('should solve a simple product with 3 vars', function() {
        let solution = solverSolver(`
          : A 2
          : B 10
          : C 7
          R = product(A B C)
        `);

        expect(solution).to.eql({A: 2, B: 10, C: 7, R: 140});
      });

      it('should solve a simple product with 4 vars', function() {
        let solution = solverSolver(`
          : A 2
          : B 10
          : C 7
          : D 4
          R = product(A B C D)
        `);

        expect(solution).to.eql({A: 2, B: 10, C: 7, D: 4, R: 560});
      });

      it('should solve when B is unsolved but R is', function() {
        let solution = solverSolver(`
          : A 2
          : B [5 10]
          : C 7
          : R 126
          R = product(A B C)
        `);

        expect(solution).to.eql({A: 2, B: 9, C: 7, R: 126, __1: 14}); // TODO: remove tmp var
      });

      it('should solve when B is unsolved and forced by other constraint with 2 vars', function() {
        let solution = solverSolver(`
          : A 2
          : B [5 10]
          : X = 9
          R = product(A B)
          B == X
        `);

        expect(solution).to.eql({A: 2, B: 9, R: 18, X: 9, __1: 2}); // TODO: eliminate that temp var from showing up
      });

      it('should solve when B is unsolved and forced by other constraint with 3 vars', function() {
        let solution = solverSolver(`
          : A 2
          : B [5 10]
          : C 7
          : X = 5
          R = product(A B C)
          B == X
        `);

        expect(solution).to.eql({A: 2, B: 5, C: 7, R: 70, X: 5, __1: 14}); // TODO: eliminate that temp var from showing up
      });

      it('should solve when B is unsolved and forced by other constraint with 4 vars', function() {
        let solution = solverSolver(`
          : A 2
          : B [5 10]
          : C 7
          : D 11
          : X = 10
          R = product(A B C D)
          B == X
        `);

        expect(solution).to.eql({A: 2, B: 10, C: 7, D: 11, R: 1540, X: 10, __1: 154}); // TODO: eliminate that temp var from showing up
      });

      it('should accept one var', function() {
        let solution = solverSolver(`
          : A [0 10]
          : X 10
          R = product(A)
          A == X
        `);

        expect(solution).to.eql({A: 10, R: 10, X: 10});
      });
    });
  });

  describe('op literals', function() {

    describe('eq', function() {

      it('v8 pass', function() {
        let solution = solverSolver(`
          : A 21
          A == 21
        `);

        expect(solution).to.eql({A: 21});
      });

      it('v8 reject', function() {
        let solution = solverSolver(`
          : A 21
          A == 22
        `);

        expect(solution).to.equal(false);
      });

      it('88 pass', function() {
        let solution = solverSolver(`
          18 == 18
        `);

        expect(solution).to.eql({});
      });

      it('88 reject', function() {
        let solution = solverSolver(`
          18 == 19
        `);

        expect(solution).to.equal(false);
      });


    });

    describe('neq', function() {

      it('v8 pass', function() {
        let solution = solverSolver(`
          : A 21
          A != 22
        `);

        expect(solution).to.eql({A: 21});
      });

      it('v8 reject', function() {
        let solution = solverSolver(`
          : A 21
          A != 21
        `);

        expect(solution).to.equal(false);
      });

      it('88 pass', function() {
        let solution = solverSolver(`
          18 != 19
        `);

        expect(solution).to.eql({});
      });

      it('88 reject', function() {
        let solution = solverSolver(`
          18 != 18
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('lt', function() {

      it('v8 pass', function() {
        let solution = solverSolver(`
          : A 21
          A < 22
        `);

        expect(solution).to.eql({A: 21});
      });

      it('v8 reject', function() {
        let solution = solverSolver(`
          : A 21
          A < 21
        `);

        expect(solution).to.equal(false);
      });

      it('88 pass', function() {
        let solution = solverSolver(`
          18 < 19
        `);

        expect(solution).to.eql({});
      });

      it('88 reject', function() {
        let solution = solverSolver(`
          18 < 18
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('lte', function() {

      it('v8 pass', function() {
        let solution = solverSolver(`
          : A 21
          A <= 22
        `);

        expect(solution).to.eql({A: 21});
      });

      it('v8 reject', function() {
        let solution = solverSolver(`
          : A 22
          A <= 21
        `);

        expect(solution).to.equal(false);
      });

      it('88 pass', function() {
        let solution = solverSolver(`
          18 <= 19
        `);

        expect(solution).to.eql({});
      });

      it('88 reject', function() {
        let solution = solverSolver(`
          19 <= 18
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('gt', function() {

      it('v8 pass', function() {
        let solution = solverSolver(`
          : A 22
          A > 21
        `);

        expect(solution).to.eql({A: 22});
      });

      it('v8 reject', function() {
        let solution = solverSolver(`
          : A 21
          A > 21
        `);

        expect(solution).to.equal(false);
      });

      it('88 pass', function() {
        let solution = solverSolver(`
          19 > 18
        `);

        expect(solution).to.eql({});
      });

      it('88 reject', function() {
        let solution = solverSolver(`
          18 > 18
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('gte', function() {

      it('v8 pass', function() {
        let solution = solverSolver(`
          : A 22
          A >= 21
        `);

        expect(solution).to.eql({A: 22});
      });

      it('v8 reject', function() {
        let solution = solverSolver(`
          : A 21
          A >= 22
        `);

        expect(solution).to.equal(false);
      });

      it('88 pass', function() {
        let solution = solverSolver(`
          19 >= 19
        `);

        expect(solution).to.eql({});
      });

      it('88 reject', function() {
        let solution = solverSolver(`
          18 >= 19
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('iseq', function() {

      it('8vv pass', function() {
        let solution = solverSolver(`
          : B 22
          : R 1
          R = B ==? 22
        `);

        expect(solution).to.eql({B: 22, R: 1});
      });

      it('8vv reject', function() {
        let solution = solverSolver(`
          : B 21
          : R 1
          R = B ==? 22
        `);

        expect(solution).to.equal(false);
      });

      it('v8v pass', function() {
        let solution = solverSolver(`
          : A 22
          : R 1
          R = A ==? 22
        `);

        expect(solution).to.eql({A: 22, R: 1});
      });

      it('v8v reject', function() {
        let solution = solverSolver(`
          : B 21
          : R 1
          R = B ==? 22
        `);

        expect(solution).to.equal(false);
      });

      it('vv8 pass', function() {
        let solution = solverSolver(`
          : A 22
          : B 22
          1 = A ==? A
        `);

        expect(solution).to.eql({A: 22, B: 22});
      });

      it('vv8 reject', function() {
        let solution = solverSolver(`
          : A 22
          : B 21
          1 = A ==? B
        `);

        expect(solution).to.equal(false);
      });

      it('88v pass', function() {
        let solution = solverSolver(`
          : R 1
          R = 22 ==? 22
        `);

        expect(solution).to.eql({R: 1});
      });

      it('88v reject', function() {
        let solution = solverSolver(`
          : R 1
          R = 21 ==? 22
        `);

        expect(solution).to.equal(false);
      });

      it('v88 pass', function() {
        let solution = solverSolver(`
          : A 22
          1 = A ==? 22
        `);

        expect(solution).to.eql({A: 22});
      });

      it('v88 reject', function() {
        let solution = solverSolver(`
          : A 22
          1 = A ==? 21
        `);

        expect(solution).to.equal(false);
      });

      it('8v8 pass', function() {
        let solution = solverSolver(`
          : A 22
          1 = A ==? 22
        `);

        expect(solution).to.eql({A: 22});
      });

      it('8v8 reject', function() {
        let solution = solverSolver(`
          : A 22
          1 = A ==? 21
        `);

        expect(solution).to.equal(false);
      });

      it('888 pass', function() {
        let solution = solverSolver(`
          1 = 22 ==? 22
        `);

        expect(solution).to.eql({});
      });

      it('888 reject', function() {
        let solution = solverSolver(`
          1 = 22 ==? 21
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('isneq', function() {

      it('8vv pass', function() {
        let solution = solverSolver(`
          : B 22
          : R 0
          R = B !=? 22
        `);

        expect(solution).to.eql({B: 22, R: 0});
      });

      it('8vv reject', function() {
        let solution = solverSolver(`
          : B 21
          : R 0
          R = B !=? 22
        `);

        expect(solution).to.equal(false);
      });

      it('v8v pass', function() {
        let solution = solverSolver(`
          : A 22
          : R 0
          R = A !=? 22
        `);

        expect(solution).to.eql({A: 22, R: 0});
      });

      it('v8v reject', function() {
        let solution = solverSolver(`
          : B 21
          : R 0
          R = B !=? 22
        `);

        expect(solution).to.equal(false);
      });

      it('vv8 pass', function() {
        let solution = solverSolver(`
          : A 22
          : B 22
          0 = A !=? A
        `);

        expect(solution).to.eql({A: 22, B: 22});
      });

      it('vv8 reject', function() {
        let solution = solverSolver(`
          : A 22
          : B 21
          0 = A !=? B
        `);

        expect(solution).to.equal(false);
      });

      it('88v pass', function() {
        let solution = solverSolver(`
          : R 0
          R = 22 !=? 22
        `);

        expect(solution).to.eql({R: 0});
      });

      it('88v reject', function() {
        let solution = solverSolver(`
          : R 0
          R = 21 !=? 22
        `);

        expect(solution).to.equal(false);
      });

      it('v88 pass', function() {
        let solution = solverSolver(`
          : A 22
          0 = A !=? 22
        `);

        expect(solution).to.eql({A: 22});
      });

      it('v88 reject', function() {
        let solution = solverSolver(`
          : A 22
          0 = A !=? 21
        `);

        expect(solution).to.equal(false);
      });

      it('8v8 pass', function() {
        let solution = solverSolver(`
          : A 22
          0 = A !=? 22
        `);

        expect(solution).to.eql({A: 22});
      });

      it('8v8 reject', function() {
        let solution = solverSolver(`
          : A 22
          0 = A !=? 21
        `);

        expect(solution).to.equal(false);
      });

      it('888 pass', function() {
        let solution = solverSolver(`
          0 = 22 !=? 22
        `);

        expect(solution).to.eql({});
      });

      it('888 reject', function() {
        let solution = solverSolver(`
          0 = 22 !=? 21
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('islt', function() {

      it('8vv pass', function() {
        let solution = solverSolver(`
          : B 22
          : R 1
          R = 15 <? B
        `);

        expect(solution).to.eql({B: 22, R: 1});
      });

      it('8vv reject', function() {
        let solution = solverSolver(`
          : B 22
          : R 0
          R = 15 <? B
        `);

        expect(solution).to.equal(false);
      });

      it('v8v pass', function() {
        let solution = solverSolver(`
          : A 22
          : R 1
          R = A <? 30
        `);

        expect(solution).to.eql({A: 22, R: 1});
      });

      it('v8v reject', function() {
        let solution = solverSolver(`
          : A 22
          : R 0
          R = A <? 30
        `);

        expect(solution).to.equal(false);
      });

      it('vv8 pass', function() {
        let solution = solverSolver(`
          : A 22
          : B 100
          1 = A <? B
        `);

        expect(solution).to.eql({A: 22, B: 100});
      });

      it('vv8 reject', function() {
        let solution = solverSolver(`
          : A 22
          : B 100
          0 = A <? B
        `);

        expect(solution).to.equal(false);
      });

      it('88v pass', function() {
        let solution = solverSolver(`
          : R 1
          R = 50 <? 100
        `);

        expect(solution).to.eql({R: 1});
      });

      it('88v reject', function() {
        let solution = solverSolver(`
          : R 0
          R = 50 <? 100
        `);

        expect(solution).to.equal(false);
      });

      it('v88 pass', function() {
        let solution = solverSolver(`
          : A 15
          1 = A <? 100
        `);

        expect(solution).to.eql({A: 15});
      });

      it('v88 reject', function() {
        let solution = solverSolver(`
          : A 15
          0 = A <? 100
        `);

        expect(solution).to.equal(false);
      });

      it('8v8 pass', function() {
        let solution = solverSolver(`
          : B 100
          1 = 30 <? B
        `);

        expect(solution).to.eql({B: 100});
      });

      it('8v8 reject', function() {
        let solution = solverSolver(`
          : B 20
          1 = 30 <? B
        `);

        expect(solution).to.equal(false);
      });

      it('888 pass', function() {
        let solution = solverSolver(`
          1 = 30 <? 300
        `);

        expect(solution).to.eql({});
      });

      it('888 reject', function() {
        let solution = solverSolver(`
          0 = 30 <? 150
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('islte', function() {

      it('8vv pass', function() {
        let solution = solverSolver(`
          : B 22
          : R 1
          R = 15 <=? B
        `);

        expect(solution).to.eql({B: 22, R: 1});
      });

      it('8vv reject', function() {
        let solution = solverSolver(`
          : B 22
          : R 0
          R = 15 <=? B
        `);

        expect(solution).to.equal(false);
      });

      it('v8v pass', function() {
        let solution = solverSolver(`
          : A 22
          : R 1
          R = A <=? 30
        `);

        expect(solution).to.eql({A: 22, R: 1});
      });

      it('v8v reject', function() {
        let solution = solverSolver(`
          : A 22
          : R 0
          R = A <=? 30
        `);

        expect(solution).to.equal(false);
      });

      it('vv8 pass', function() {
        let solution = solverSolver(`
          : A 22
          : B 100
          1 = A <=? B
        `);

        expect(solution).to.eql({A: 22, B: 100});
      });

      it('vv8 reject', function() {
        let solution = solverSolver(`
          : A 22
          : B 100
          0 = A <=? B
        `);

        expect(solution).to.equal(false);
      });

      it('88v pass', function() {
        let solution = solverSolver(`
          : R 1
          R = 50 <=? 100
        `);

        expect(solution).to.eql({R: 1});
      });

      it('88v reject', function() {
        let solution = solverSolver(`
          : R 0
          R = 50 <=? 100
        `);

        expect(solution).to.equal(false);
      });

      it('v88 pass', function() {
        let solution = solverSolver(`
          : A 15
          1 = A <=? 100
        `);

        expect(solution).to.eql({A: 15});
      });

      it('v88 reject', function() {
        let solution = solverSolver(`
          : A 15
          0 = A <=? 100
        `);

        expect(solution).to.equal(false);
      });

      it('8v8 pass', function() {
        let solution = solverSolver(`
          : B 100
          1 = 30 <=? B
        `);

        expect(solution).to.eql({B: 100});
      });

      it('8v8 reject', function() {
        let solution = solverSolver(`
          : B 20
          1 = 30 <=? B
        `);

        expect(solution).to.equal(false);
      });

      it('888 pass', function() {
        let solution = solverSolver(`
          1 = 30 <=? 300
        `);

        expect(solution).to.eql({});
      });

      it('888 reject', function() {
        let solution = solverSolver(`
          0 = 30 <=? 150
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('isgt', function() {

      it('8vv pass', function() {
        let solution = solverSolver(`
          : B 2
          : R 1
          R = 15 >? B
        `);

        expect(solution).to.eql({B: 2, R: 1});
      });

      it('8vv reject', function() {
        let solution = solverSolver(`
          : B 2
          : R 0
          R = 15 >? B
        `);

        expect(solution).to.equal(false);
      });

      it('v8v pass', function() {
        let solution = solverSolver(`
          : A 52
          : R 1
          R = A >? 30
        `);

        expect(solution).to.eql({A: 52, R: 1});
      });

      it('v8v reject', function() {
        let solution = solverSolver(`
          : A 122
          : R 0
          R = A >? 30
        `);

        expect(solution).to.equal(false);
      });

      it('vv8 pass', function() {
        let solution = solverSolver(`
          : A 122
          : B 100
          1 = A >? B
        `);

        expect(solution).to.eql({A: 122, B: 100});
      });

      it('vv8 reject', function() {
        let solution = solverSolver(`
          : A 122
          : B 100
          0 = A >? B
        `);

        expect(solution).to.equal(false);
      });

      it('88v pass', function() {
        let solution = solverSolver(`
          : R 1
          R = 150 >? 100
        `);

        expect(solution).to.eql({R: 1});
      });

      it('88v reject', function() {
        let solution = solverSolver(`
          : R 0
          R = 150 >? 100
        `);

        expect(solution).to.equal(false);
      });

      it('v88 pass', function() {
        let solution = solverSolver(`
          : A 115
          1 = A >? 100
        `);

        expect(solution).to.eql({A: 115});
      });

      it('v88 reject', function() {
        let solution = solverSolver(`
          : A 115
          0 = A >? 100
        `);

        expect(solution).to.equal(false);
      });

      it('8v8 pass', function() {
        let solution = solverSolver(`
          : B 100
          1 = 130 >? B
        `);

        expect(solution).to.eql({B: 100});
      });

      it('8v8 reject', function() {
        let solution = solverSolver(`
          : B 120
          1 = 30 >? B
        `);

        expect(solution).to.equal(false);
      });

      it('888 pass', function() {
        let solution = solverSolver(`
          1 = 130 >? 30
        `);

        expect(solution).to.eql({});
      });

      it('888 reject', function() {
        let solution = solverSolver(`
          0 = 130 >? 50
        `);

        expect(solution).to.equal(false);
      });
    });

    describe('isgte', function() {

      it('8vv pass', function() {
        let solution = solverSolver(`
          : B 2
          : R 1
          R = 15 >=? B
        `);

        expect(solution).to.eql({B: 2, R: 1});
      });

      it('8vv reject', function() {
        let solution = solverSolver(`
          : B 2
          : R 0
          R = 15 >=? B
        `);

        expect(solution).to.equal(false);
      });

      it('v8v pass', function() {
        let solution = solverSolver(`
          : A 52
          : R 1
          R = A >=? 30
        `);

        expect(solution).to.eql({A: 52, R: 1});
      });

      it('v8v reject', function() {
        let solution = solverSolver(`
          : A 122
          : R 0
          R = A >=? 30
        `);

        expect(solution).to.equal(false);
      });

      it('vv8 pass', function() {
        let solution = solverSolver(`
          : A 122
          : B 100
          1 = A >=? B
        `);

        expect(solution).to.eql({A: 122, B: 100});
      });

      it('vv8 reject', function() {
        let solution = solverSolver(`
          : A 122
          : B 100
          0 = A >=? B
        `);

        expect(solution).to.equal(false);
      });

      it('88v pass', function() {
        let solution = solverSolver(`
          : R 1
          R = 150 >=? 100
        `);

        expect(solution).to.eql({R: 1});
      });

      it('88v reject', function() {
        let solution = solverSolver(`
          : R 0
          R = 150 >=? 100
        `);

        expect(solution).to.equal(false);
      });

      it('v88 pass', function() {
        let solution = solverSolver(`
          : A 115
          1 = A >=? 100
        `);

        expect(solution).to.eql({A: 115});
      });

      it('v88 reject', function() {
        let solution = solverSolver(`
          : A 115
          0 = A >=? 100
        `);

        expect(solution).to.equal(false);
      });

      it('8v8 pass', function() {
        let solution = solverSolver(`
          : B 100
          1 = 130 >=? B
        `);

        expect(solution).to.eql({B: 100});
      });

      it('8v8 reject', function() {
        let solution = solverSolver(`
          : B 120
          1 = 30 >=? B
        `);

        expect(solution).to.equal(false);
      });

      it('888 pass', function() {
        let solution = solverSolver(`
          1 = 130 >=? 30
        `);

        expect(solution).to.eql({});
      });

      it('888 reject', function() {
        let solution = solverSolver(`
          0 = 130 >=? 50
        `);

        expect(solution).to.equal(false);
      });
    });
  });
});
