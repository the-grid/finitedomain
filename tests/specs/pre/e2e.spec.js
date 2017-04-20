import expect from '../../fixtures/mocha_proxy.fixt';
import Solver from '../../../src/solver';

class MockSolver {
  imp() { return this; }
  solve() {
    return this.solutions;
  }
}
function poison() {
  throw new Error('fail; not expecting to defer to solver');
}

describe('specs/e2e.spec', function() {

  describe('simple case', function() {

    it('should work without hashing the var names in the dsl', function() {
      let dsl = `
        : A [0 10]
        : B [0 10]
        : C [0 10]
        A != B
        A != C
        B != C
        C = A + B
      `;

      let expecting = {
        A: 1,
        B: 2,
        C: 3,
      };

      // this hack means we cant run concurrent solves. i think that's fine.
      MockSolver.prototype.solutions = [expecting];
      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      expect(solution).to.eql(expecting);
      expect(solution).to.not.equal(expecting); // not by ref
    });

    it('should work when hashing the var names in the dsl', function() {
      let dsl = `
        : A [0 10]
        : B [0 10]
        : C [0 10]
        A != B
        A != C
        B != C
        C = A + B
      `;

      // this hack means we cant run concurrent solves. i think that's fine.
      MockSolver.prototype.solutions = [{
        $0$: 1,
        $1$: 2,
        $2$: 3,
      }];
      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: true});

      expect(solution).to.eql({
        A: 1,
        B: 2,
        C: 3,
      });
    });
  });

  describe('sum', function() {

    it('should solve a sum that mimics a isnall', function() {
      let dsl = `
        : A [0 1]
        : B [0 1]
        : C [0 1]
        : D [0 1]
        : R [0 3] # n-1
        R = sum(A B C D)
        @custom noleaf A B C D
      `;

      MockSolver.prototype.solutions = [{A: 0, B: 1, C: 1, D: 0}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: 0, B: 1, C: 1, D: 0, R: 2});
    });
  });

  describe('xnor', function() {

    it('should solve a sum that mimics a isnall with A=booly', function() {
      let dsl = `
        : A [0 0 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 5
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `;

      MockSolver.prototype.solutions = [{A: 0, B: 1, C: 1}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: 0, B: 1, C: 0});
    });

    it('should solve a sum that mimics a isnall with A>0', function() {
      let dsl = `
        : A [1 1 5 5]
        : B [0 10]
        : C [0 1]
        C = B ==? 5
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `;

      MockSolver.prototype.solutions = [{A: 0, B: 1, C: 1}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: [1, 1, 5, 5], B: 5, C: 1});
    });

    it('should solve a sum that mimics a isnall with C>0', function() {
      let dsl = `
        : A [0 0 5 5]
        : B [0 10]
        : C [1 1]
        C = B ==? 5
        C !^ A
        # -> should remove the !^
        @custom noleaf A B
      `;

      MockSolver.prototype.solutions = [{A: 0, B: 1, C: 1}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: 5, B: 5, C: 1});
    });

    it('should solve an xnor with different outcomes v1', function() {
      let dsl = `
        : A, B [0 10]
        B !^ A
        @custom noleaf A B
      `;

      MockSolver.prototype.solutions = [{A: 2, B: 5}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      // in particular this asserts that the post solving alias code doesnt
      // enforce a strict alias (instead of the "xnor" alias we expect)
      expect(solution).to.eql({A: 2, B: 5});
    });

    it('should solve an xnor with different outcomes v2', function() {
      let dsl = `
        : A, B [0 10]
        : C [0 10]
        B !^ A                      # this line should end up a pseudo alias. if one 0, both 0. else both any non-zero.
        nall(A B C)                 # this should cause the mock solver to be hit
        @custom noleaf C
      `;

      MockSolver.prototype.solutions = [{A: 1, B: 5, C: 0}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      // in particular this asserts that the post solving alias code doesnt
      // enforce a strict alias (instead of the "xnor" alias we expect)
      expect(solution).to.eql({A: 0, B: 0, C: [0, 10]});
    });

    it('should solve an xnor with different outcomes v3', function() {
      let dsl = `
        : A, B [0 10]
        : C 0
        B !^ A                      # this line should end up a pseudo alias. if one 0, both 0. else both any non-zero.
        nall(A B C)                 # this should cause the mock solver to be hit
        @custom noleaf C
      `;

      let solution = Solver.pre(dsl, {Solver: poison, singleCycle: false, hashNames: false});

      // in particular this asserts that the post solving alias code doesnt
      // enforce a strict alias (instead of the "xnor" alias we expect)
      expect(solution).to.eql({A: [1, 10], B: [1, 10], C: 0});
    });

    it('should trip up on the poison', function() {
      let dsl = `
        : A, B [0 10]
        : C 0
        B !^ A
        @custom noleaf A B
      `;

      // test the poison trap used above
      expect(_ => Solver.pre(dsl, {Solver: poison, singleCycle: false, hashNames: false})).to.throw('not expecting to defer to solver');
    });

    it('should solve an xnor with different outcomes v4; should listen to solver result', function() {
      let dsl = `
        : A, B [0 10]
        : C, D [0 10]
        B !^ A                      # this line should end up a pseudo alias. if one 0, both 0. else both any non-zero.
        nall(A B C D)               # this should cause the mock solver to be hit
        @custom noleaf C
      `;

      MockSolver.prototype.solutions = [{A: 3, C: 0, D: 7}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      // in particular this asserts that the post solving alias code doesnt
      // enforce a strict alias (instead of the "xnor" alias we expect)
      expect(solution).to.eql({A: 3, B: [1, 10], C: 0, D: 7});
    });

    it('should solve an xnor with different outcomes v5; should not force alias', function() {
      let dsl = `
        : A [0 10]
        : B [0 5 7 10]
        : C, D [0 10]
        B !^ A                      # this line should end up a pseudo alias. if one 0, both 0. else both any non-zero.
        nall(A B C D)               # this should cause the mock solver to be hit
        @custom noleaf C D
      `;

      MockSolver.prototype.solutions = [{A: 6, C: 0, D: 7}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      // in particular this asserts that the post solving alias code doesnt
      // enforce a strict alias (instead of the "xnor" alias we expect)
      // REGARDLESS: B CANNOT BE 6! the domain did not start with a 6
      expect(solution).to.eql({A: 6, B: [1, 5, 7, 10], C: 0, D: 7});
    });
  });

  describe('deduper', function() {

    it('should properly alias a deduped reifier R=0', function() {

      let dsl = `
        : A, B [0 10]
        : R, S [0 1]
        R = A ==? B
        S = A ==? B
        # make sure R == S
        @custom noleaf A B R S
      `;

      MockSolver.prototype.solutions = [{A: 1, B: 9, R: 0}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: 1, B: 9, R: 0, S: 0});
    });

    it('should properly alias a deduped reifier with R=1', function() {

      let dsl = `
        : A, B [0 10]
        : R, S [0 1]
        R = A ==? B
        S = A ==? B
        # make sure R == S
        @custom noleaf A B R S
      `;

      MockSolver.prototype.solutions = [{A: 1, B: 1, R: 1}]; // naive/min strat would solve S to 0 but we set R to 1 so S should also become 1

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: 1, B: 1, R: 1, S: 1});
    });
  });

  describe('targets', function() {

    it('should only return results asked for', function() {
      let dsl = `
        : A [0 0 2 2 5 5]
        : B [0 10]
        : C [0 1]
        A = B + C
        @custom targets(B)
      `;

      MockSolver.prototype.solutions = [{A: 2, B: 1, C: 1}];

      let solution = Solver.pre(dsl, {Solver: MockSolver, singleCycle: false, hashNames: false});

      expect(solution).to.eql({B: 1});
    });
  });

  describe('einstein', function() {

    it('the problem', function() {
      const blue = 0;
      const green = 1;
      const red = 2;
      const white = 3;
      const yellow = 4;

      const dane = 0;
      const english = 1;
      const german = 2;
      const swede = 3;
      const norwegian = 4;

      const bier = 0;
      const coffee = 1;
      const milk = 2;
      const tea = 3;
      const water = 4;

      const blend = 0;
      const bluemaster = 1;
      const dunhill = 2;
      const pallmall = 3;
      const prince = 4;

      const birds = 0;
      const cats = 1;
      const dogs = 2;
      const fish = 3;
      const horses = 4;

      let dsl = `
        # https://web.stanford.edu/~laurik/fsmbook/examples/Einstein'sPuzzle.html
        #
        # Let us assume that there are five houses of different colors next to each
        # other on the same road. In each house lives a man of a different nationality.
        # Every man has his favorite drink, his favorite brand of cigarettes, and
        # keeps pets of a particular kind:
        #
        #  1 The Englishman lives in the red house.
        #  2 The Swede keeps dogs.
        #  3 The Dane drinks tea.
        #  4 The green house is just to the left of the white one.
        #  5 The owner of the green house drinks coffee.
        #  6 The Pall Mall smoker keeps birds.
        #  7 The owner of the yellow house smokes Dunhills.
        #  8 The man in the center house drinks milk.
        #  9 The Norwegian lives in the first house.
        # 10 The Blend smoker has a neighbor who keeps cats.
        # 11 The man who smokes Blue Masters drinks bier.
        # 12 The man who keeps horses lives next to the Dunhill smoker.
        # 13 The German smokes Prince.
        # 14 The Norwegian lives next to the blue house.
        # 15 The Blend smoker has a neighbor who drinks water.
        #
        # The question to be answered is: Who keeps fish?

        # constants
        : blue ${blue}
        : green ${green}
        : red ${red}
        : white ${white}
        : yellow ${yellow}

        : dane ${dane}
        : english ${english}
        : german ${german}
        : swede ${swede}
        : norwegian ${norwegian}

        : bier ${bier}
        : coffee ${coffee}
        : milk ${milk}
        : tea ${tea}
        : water ${water}

        : blend ${blend}
        : bluemaster ${bluemaster}
        : dunhill ${dunhill}
        : pallmall ${pallmall}
        : prince ${prince}

        : birds ${birds}
        : cats ${cats}
        : dogs ${dogs}
        : fish ${fish}
        : horses ${horses}

        # which house is assigned which option?
        # C=color, N=nationality, D=drink, S=smokes, P=pet
        : C0, C1, C2, C3, C4 [0 4] # house color of each house
        : N0, N1, N2, N3, N4 [0 4] # nationality of each house
        : D0, D1, D2, D3, D4 [0 4] # drink of each house
        : S0, S1, S2, S3, S4 [0 4] # smoke brand of each house
        : P0, P1, P2, P3, P4 [0 4] # pet of each house

        # distribution must be unique (each color is only applied to one house, etc)
        # this implicitly also ensures every option will be used
        distinct(C0 C1 C2 C3 C4)
        distinct(N0 N1 N2 N3 N4)
        distinct(D0 D1 D2 D3 D4)
        distinct(S0 S1 S2 S3 S4)
        distinct(P0 P1 P2 P3 P4)

        # now follow the encoding for each condition
        # it's a bit repetitive because most of the time
        # each house must get the same condition ("for all
        # x; if color of house x is red then the pet of
        # house x is cat", which would still apply to only
        # one since the colors (and pets) of all houses
        # are distinct from one another)

        # 1: The Englishman lives in the red house
        # "(Nx == english) <=> (Cx == red)"
        (N0 ==? english) == (C0 ==? red)
        (N1 ==? english) == (C1 ==? red)
        (N2 ==? english) == (C2 ==? red)
        (N3 ==? english) == (C3 ==? red)
        (N4 ==? english) == (C4 ==? red)

        # 2: The Swede keeps dogs
        # similar to above
        (N0 ==? swede) == (P0 ==? dogs)
        (N1 ==? swede) == (P1 ==? dogs)
        (N2 ==? swede) == (P2 ==? dogs)
        (N3 ==? swede) == (P3 ==? dogs)
        (N4 ==? swede) == (P4 ==? dogs)

        # 3: The Dane drinks tea
        (N0 ==? dane) == (D0 ==? tea)
        (N1 ==? dane) == (D1 ==? tea)
        (N2 ==? dane) == (D2 ==? tea)
        (N3 ==? dane) == (D3 ==? tea)
        (N4 ==? dane) == (D4 ==? tea)

        # 4: the green house is just to the left of the white one
        C0 != white
        (C0 ==? green) == (C1 ==? white)
        (C1 ==? green) == (C2 ==? white)
        (C2 ==? green) == (C3 ==? white)
        (C3 ==? green) == (C4 ==? white)
        C4 != green

        # 5: the owner of the green house drinks coffee
        (C0 ==? green) == (D0 ==? coffee)
        (C1 ==? green) == (D1 ==? coffee)
        (C2 ==? green) == (D2 ==? coffee)
        (C3 ==? green) == (D3 ==? coffee)
        (C4 ==? green) == (D4 ==? coffee)

        # 6: the pallmall smoker keeps birds
        (S0 ==? pallmall) == (P0 ==? birds)
        (S1 ==? pallmall) == (P1 ==? birds)
        (S2 ==? pallmall) == (P2 ==? birds)
        (S3 ==? pallmall) == (P3 ==? birds)
        (S4 ==? pallmall) == (P4 ==? birds)

        # 7: the owner of the yellow house smokes dunhills
        (S0 ==? dunhill) == (C0 ==? yellow)
        (S1 ==? dunhill) == (C1 ==? yellow)
        (S2 ==? dunhill) == (C2 ==? yellow)
        (S3 ==? dunhill) == (C3 ==? yellow)
        (S4 ==? dunhill) == (C4 ==? yellow)

        # 8: the man in the center house drinks milk
        D2 == milk

        # 9: the norwegian lives in the first house
        N0 == norwegian

        # 10: the blend smoker has a neighbor who keeps cats
        # for the middle ones; if this house smokes blend, either the left or the right is cats but not both and not neither.
        # that's why the neq works. we'd need an "or" for this case. exactly one of these five cases will force a Px set to cats.
        (S0 ==? blend) == (P1 ==? cats)
        (S1 ==? blend) <= ((P0 ==? cats) !=? (P2 ==? cats))
        (S2 ==? blend) <= ((P1 ==? cats) !=? (P3 ==? cats))
        (S3 ==? blend) <= ((P2 ==? cats) !=? (P4 ==? cats))
        (S4 ==? blend) == (P3 ==? cats)

        # 11: the man who smokes blue masters drinks bier
        (S0 ==? bluemaster) == (D0 ==? bier)
        (S1 ==? bluemaster) == (D1 ==? bier)
        (S2 ==? bluemaster) == (D2 ==? bier)
        (S3 ==? bluemaster) == (D3 ==? bier)
        (S4 ==? bluemaster) == (D4 ==? bier)

        # 12: the man who keeps horses lives next to the dunhill smoker
        # (see 10)
        (P0 ==? horses) == (S1 ==? dunhill)
        (P1 ==? horses) <= ((S0 ==? dunhill) !=? (S2 ==? dunhill))
        (P2 ==? horses) <= ((S1 ==? dunhill) !=? (S3 ==? dunhill))
        (P3 ==? horses) <= ((S2 ==? dunhill) !=? (S4 ==? dunhill))
        (P4 ==? horses) == (S3 ==? dunhill)

        # 13: the german smokes prince
        (N0 ==? german) == (S0 ==? prince)
        (N1 ==? german) == (S1 ==? prince)
        (N2 ==? german) == (S2 ==? prince)
        (N3 ==? german) == (S3 ==? prince)
        (N4 ==? german) == (S4 ==? prince)

        # 14: the norwegian lives next to the blue house
        # (see 10)
        (N0 ==? norwegian) == (C1 ==? blue)
        (N1 ==? norwegian) <= ((C0 ==? blue) !=? (C2 ==? blue))
        (N2 ==? norwegian) <= ((C1 ==? blue) !=? (C3 ==? blue))
        (N3 ==? norwegian) <= ((C2 ==? blue) !=? (C4 ==? blue))
        (N4 ==? norwegian) == (C3 ==? blue)

        # 15: the blend smoker has a neighbor who drinks water
        # note: this is the same pre-condition as 10. we could use "and" for this kind of case. the dupe should be optimized away.
        (S0 ==? blend) == (D1 ==? water)
        (S1 ==? blend) <= ((D0 ==? water) !=? (D2 ==? water))
        (S2 ==? blend) <= ((D1 ==? water) !=? (D3 ==? water))
        (S3 ==? blend) <= ((D2 ==? water) !=? (D4 ==? water))
        (S4 ==? blend) == (D3 ==? water)
      `;

      expect(_ => Solver.pre(dsl)).not.to.throw();
    });
  });

  describe('regressions', function() {

    it('should not take forever to solve', function() {
      // from finitedomain test case 'with viewport constants hardcoded'
      // (its actually finitedomain itself that takes forever when solving this after being presolved)
      let dsl = `
        # vars:
        : $7$ [1,1,3,3,5,5,9,9,12,12]
        : $a$ [1,5]
        : $e$ [1,8]
        : $j$ [1,3,5,5,9,9,12,12]
        : $k$ [1,6]
        : $l$ [1,8]
        : $q$ [1,3,5,6,9,9,12,12]
        : $r$ [1,7]
        : $s$ [1,8]
        : $y$ [1,3,5,6,9,10,12,12]
        : $z$ [1,8]
        : $10$ [1,8]
        : $15$ [1,3,5,7,9,10,12,12]
        : $16$ [1,9]
        : $17$ [1,8]
        : $1c$ [2,3,5,10,12,12]
        : $1d$ [2,10]
        : $1e$ [1,8]
        : $1k$ [2,3,5,8,10,12]
        : $1l$ [3,11]
        : $1m$ [1,8]
        : $1r$ [2,2,4,8,10,12]
        : $1s$ [4,12]
        : $1t$ [1,8]
        : $1y$ [2,2,4,4,6,8,10,12]
        : $1z$ [5,12]
        : $20$ [1,8]
        : $25$ [2,2,4,4,6,8,10,11]
        : $26$ [6,12]
        : $2c$ [4,4,6,8,10,11]
        : $2d$ [7,12]
        : $2j$ [4,4,7,8,10,11]
        : $2k$ [8,12]
        : $2p$ [0,1]
        : $2r$ [0,1]
        : $2t$ [0,1]
        : $2v$ [0,1]
        : $2x$ [0,1]
        : $2z$ [0,1]
        : $31$ [0,1]
        : $33$ [0,1]
        : $35$ [0,1]
        : $37$ [0,1]
        : $39$ [0,1]
        : $3b$ [0,1]
        : $3d$ [0,1]
        : $3f$ [0,1]
        : $3h$ [0,1]
        : $3j$ [0,1]
        : $3l$ [0,1]
        : $3n$ [0,1]
        : $3p$ [0,1]
        : $3r$ [0,1]
        : $3t$ [0,1]
        : $3v$ [0,1]
        : $3x$ [0,1]
        : $3z$ [0,1]
        : $41$ [0,1]
        : $43$ [0,1]
        : $45$ [0,1]
        : $47$ [0,1]
        : $49$ [0,1]
        : $4b$ [0,1]
        : $4d$ [0,1]
        : $4f$ [0,1]
        : $4h$ [0,1]
        : $4j$ [0,1]
        : $4l$ [0,1]
        : $4n$ [0,1]
        : $4p$ [0,1]
        : $4r$ [0,1]
        : $4t$ [0,1]
        : $4v$ [0,1]
        : $4x$ [0,1]
        : $4z$ [0,1]
        : $51$ [0,1]
        : $53$ [0,1]
        : $55$ [0,1]
        : $57$ [0,1]
        : $59$ [0,1]
        : $5b$ [0,1]
        : $5d$ [0,1]
        : $5f$ [0,1]
        : $5h$ [0,1]
        : $5j$ [0,1]
        : $5l$ [0,1]
        : $5n$ [0,1]
        : $5p$ [0,1]
        : $5r$ [0,1]
        : $5t$ [0,1]
        : $5v$ [0,1]
        : $5x$ [0,1]
        : $5z$ [0,1]
        : $61$ [0,1]
        : $63$ [0,1]
        : $65$ [0,1]
        : $67$ [0,1]
        : $69$ [0,1]
        : $6b$ [0,1]
        : $6d$ [0,1]
        : $6f$ [0,1]
        : $6h$ [0,1]
        : $6j$ [0,1]
        : $6l$ [0,1]
        : $6n$ [0,1]
        : $6p$ [0,1]
        : $6r$ [0,1]
        : $6t$ [0,1]
        : $6v$ [0,1]
        : $6x$ [0,1]
        : $6z$ [0,1]
        : $71$ [0,1]
        : $73$ [0,1]
        : $75$ [0,1]
        : $77$ [0,1]
        : $79$ [0,1]
        : $7b$ [0,1]
        : $7d$ [0,1]
        : $7f$ [0,1]
        : $7h$ [0,1]
        : $7j$ [0,1]
        : $7l$ [0,1]
        : $7m$ [0,1]
        : $7n$ [0,1]
        : $7o$ [0,1]
        : $7p$ [0,1]
        : $7q$ [0,1]
        : $7r$ [0,1]
        : $7s$ [0,1]
        : $7t$ [0,1]
        : $7u$ [0,1]
        : $7v$ [0,1]
        : $7w$ [0,1]
        : $81$ [0,1]
        : $82$ [0,1]
        : $84$ [0,1]
        : $85$ [0,1]
        : $86$ [0,1]
        : $88$ [0,1]
        : $89$ [0,1]
        : $8a$ [0,1]
        : $8c$ [0,1]
        : $8d$ [0,1]
        : $8e$ [0,1]
        : $8g$ [0,1]
        : $8h$ [0,1]
        : $8i$ [0,1]
        : $8k$ [0,1]
        : $8l$ [0,1]
        : $8m$ [0,1]
        : $8o$ [0,1]
        : $8p$ [0,1]
        : $8q$ [0,1]
        : $8s$ [0,1]
        : $8t$ [0,1]
        : $8u$ [0,1]
        : $8w$ [0,1]
        : $8x$ [0,1]
        : $8z$ [0,1]


        # Constraints:
        distinct( $a$ $k$ $r$ $z$ $16$ $1d$ $1l$ $1s$ $1z$ $26$ $2d$ $2k$ )
        $2p$ = $7$ ==? 1
        $2p$ = $a$ ==? 1
        $2r$ = $j$ ==? 1
        $2r$ = $k$ ==? 1
        $2t$ = $q$ ==? 1
        $2t$ = $r$ ==? 1
        $2v$ = $y$ ==? 1
        $2v$ = $z$ ==? 1
        $2x$ = $15$ ==? 1
        $2x$ = $16$ ==? 1
        $2z$ = $7$ ==? 9
        $2z$ = $a$ ==? 2
        $31$ = $j$ ==? 9
        $31$ = $k$ ==? 2
        $33$ = $q$ ==? 9
        $33$ = $r$ ==? 2
        $35$ = $y$ ==? 9
        $35$ = $z$ ==? 2
        $37$ = $15$ ==? 9
        $37$ = $16$ ==? 2
        $39$ = $1c$ ==? 9
        $39$ = $1d$ ==? 2
        $3b$ = $7$ ==? 3
        $3b$ = $a$ ==? 3
        $3d$ = $j$ ==? 3
        $3d$ = $k$ ==? 3
        $3f$ = $q$ ==? 3
        $3f$ = $r$ ==? 3
        $3h$ = $y$ ==? 3
        $3h$ = $z$ ==? 3
        $3j$ = $15$ ==? 3
        $3j$ = $16$ ==? 3
        $3l$ = $1c$ ==? 3
        $3l$ = $1d$ ==? 3
        $3n$ = $1k$ ==? 3
        $3n$ = $1l$ ==? 3
        $3p$ = $7$ ==? 5
        $3p$ = $a$ ==? 4
        $3r$ = $j$ ==? 5
        $3r$ = $k$ ==? 4
        $3t$ = $q$ ==? 5
        $3t$ = $r$ ==? 4
        $3v$ = $y$ ==? 5
        $3v$ = $z$ ==? 4
        $3x$ = $15$ ==? 5
        $3x$ = $16$ ==? 4
        $3z$ = $1c$ ==? 5
        $3z$ = $1d$ ==? 4
        $41$ = $1k$ ==? 5
        $41$ = $1l$ ==? 4
        $43$ = $1r$ ==? 5
        $43$ = $1s$ ==? 4
        $45$ = $7$ ==? 12
        $45$ = $a$ ==? 5
        $47$ = $j$ ==? 12
        $47$ = $k$ ==? 5
        $49$ = $q$ ==? 12
        $49$ = $r$ ==? 5
        $4b$ = $y$ ==? 12
        $4b$ = $z$ ==? 5
        $4d$ = $15$ ==? 12
        $4d$ = $16$ ==? 5
        $4f$ = $1c$ ==? 12
        $4f$ = $1d$ ==? 5
        $4h$ = $1k$ ==? 12
        $4h$ = $1l$ ==? 5
        $4j$ = $1r$ ==? 12
        $4j$ = $1s$ ==? 5
        $4l$ = $1y$ ==? 12
        $4l$ = $1z$ ==? 5
        $4n$ = $j$ ==? 2
        $4n$ = $k$ ==? 6
        $4p$ = $q$ ==? 2
        $4p$ = $r$ ==? 6
        $4r$ = $y$ ==? 2
        $4r$ = $z$ ==? 6
        $4t$ = $15$ ==? 2
        $4t$ = $16$ ==? 6
        $4v$ = $1c$ ==? 2
        $4v$ = $1d$ ==? 6
        $4x$ = $1k$ ==? 2
        $4x$ = $1l$ ==? 6
        $4z$ = $1r$ ==? 2
        $4z$ = $1s$ ==? 6
        $51$ = $1y$ ==? 2
        $51$ = $1z$ ==? 6
        $53$ = $25$ ==? 2
        $53$ = $26$ ==? 6
        $55$ = $q$ ==? 6
        $55$ = $r$ ==? 7
        $57$ = $y$ ==? 6
        $57$ = $z$ ==? 7
        $59$ = $15$ ==? 6
        $59$ = $16$ ==? 7
        $5b$ = $1c$ ==? 6
        $5b$ = $1d$ ==? 7
        $5d$ = $1k$ ==? 6
        $5d$ = $1l$ ==? 7
        $5f$ = $1r$ ==? 6
        $5f$ = $1s$ ==? 7
        $5h$ = $1y$ ==? 6
        $5h$ = $1z$ ==? 7
        $5j$ = $25$ ==? 6
        $5j$ = $26$ ==? 7
        $5l$ = $2c$ ==? 6
        $5l$ = $2d$ ==? 7
        $5n$ = $y$ ==? 10
        $5n$ = $z$ ==? 8
        $5p$ = $15$ ==? 10
        $5p$ = $16$ ==? 8
        $5r$ = $1c$ ==? 10
        $5r$ = $1d$ ==? 8
        $5t$ = $1k$ ==? 10
        $5t$ = $1l$ ==? 8
        $5v$ = $1r$ ==? 10
        $5v$ = $1s$ ==? 8
        $5x$ = $1y$ ==? 10
        $5x$ = $1z$ ==? 8
        $5z$ = $25$ ==? 10
        $5z$ = $26$ ==? 8
        $61$ = $2c$ ==? 10
        $61$ = $2d$ ==? 8
        $63$ = $2j$ ==? 10
        $63$ = $2k$ ==? 8
        $65$ = $15$ ==? 7
        $65$ = $16$ ==? 9
        $67$ = $1c$ ==? 7
        $67$ = $1d$ ==? 9
        $69$ = $1k$ ==? 7
        $69$ = $1l$ ==? 9
        $6b$ = $1r$ ==? 7
        $6b$ = $1s$ ==? 9
        $6d$ = $1y$ ==? 7
        $6d$ = $1z$ ==? 9
        $6f$ = $25$ ==? 7
        $6f$ = $26$ ==? 9
        $6h$ = $2c$ ==? 7
        $6h$ = $2d$ ==? 9
        $6j$ = $2j$ ==? 7
        $6j$ = $2k$ ==? 9
        $6l$ = $1c$ ==? 8
        $6l$ = $1d$ ==? 10
        $6n$ = $1k$ ==? 8
        $6n$ = $1l$ ==? 10
        $6p$ = $1r$ ==? 8
        $6p$ = $1s$ ==? 10
        $6r$ = $1y$ ==? 8
        $6r$ = $1z$ ==? 10
        $6t$ = $25$ ==? 8
        $6t$ = $26$ ==? 10
        $6v$ = $2c$ ==? 8
        $6v$ = $2d$ ==? 10
        $6x$ = $2j$ ==? 8
        $6x$ = $2k$ ==? 10
        $6z$ = $1k$ ==? 11
        $6z$ = $1l$ ==? 11
        $71$ = $1r$ ==? 11
        $71$ = $1s$ ==? 11
        $73$ = $1y$ ==? 11
        $73$ = $1z$ ==? 11
        $75$ = $25$ ==? 11
        $75$ = $26$ ==? 11
        $77$ = $2c$ ==? 11
        $77$ = $2d$ ==? 11
        $79$ = $2j$ ==? 11
        $79$ = $2k$ ==? 11
        $7b$ = $1r$ ==? 4
        $7b$ = $1s$ ==? 12
        $7d$ = $1y$ ==? 4
        $7d$ = $1z$ ==? 12
        $7f$ = $25$ ==? 4
        $7f$ = $26$ ==? 12
        $7h$ = $2c$ ==? 4
        $7h$ = $2d$ ==? 12
        $7j$ = $2j$ ==? 4
        $7j$ = $2k$ ==? 12
        $7l$ = $e$ ==? 3
        $7m$ = $l$ ==? 3
        $7n$ = $s$ ==? 3
        $7o$ = $10$ ==? 3
        $7p$ = $17$ ==? 3
        $7q$ = $1e$ ==? 3
        $7r$ = $1m$ ==? 3
        $7s$ = $1t$ ==? 3
        $7t$ = $20$ ==? 3
        $7l$ != $81$
        $7p$ != $82$
        $84$ = all?( $7m$ $7n$ $7o$ $81$ $82$ )
        $7m$ != $85$
        $7q$ != $86$
        $88$ = all?( $7n$ $7o$ $7p$ $85$ $86$ )
        $7n$ != $89$
        $7r$ != $8a$
        $8c$ = all?( $7o$ $7p$ $7q$ $89$ $8a$ )
        $7o$ != $8d$
        $7s$ != $8e$
        $8g$ = all?( $7p$ $7q$ $7r$ $8d$ $8e$ )
        $7p$ != $8h$
        $7t$ != $8i$
        $8k$ = all?( $7q$ $7r$ $7s$ $8h$ $8i$ )
        $7q$ != $8l$
        $7u$ != $8m$
        $8o$ = all?( $7r$ $7s$ $7t$ $8l$ $8m$ )
        $7r$ != $8p$
        $7v$ != $8q$
        $8s$ = all?( $7s$ $7t$ $7u$ $8p$ $8q$ )
        $7s$ != $8t$
        $7w$ != $8u$
        $8w$ = all?( $7t$ $7u$ $7v$ $8t$ $8u$ )
        $7t$ != $8x$
        $8z$ = all?( $7u$ $7v$ $7w$ $8x$ )
        $84$ = $e$ ==? 2
        $88$ = $l$ ==? 2
        $8c$ = $s$ ==? 2
        $8g$ = $10$ ==? 2
        $8k$ = $17$ ==? 2
        $8o$ = $1e$ ==? 2
        $8s$ = $1m$ ==? 2
        $8w$ = $1t$ ==? 2
        $8z$ = $20$ ==? 2

        # Meta:
        @custom targets( $7$ $a$ $e$ $j$ $k$ $l$ $q$ $r$ $s$ $y$ $z$ $10$ $15$ $16$ $17$ $1c$ $1d$ $1e$ $1k$ $1l$ $1m$ $1r$ $1s$ $1t$ $1y$ $1z$ $20$ $25$ $26$ $2c$ $2d$ $2j$ $2k$ $7l$ $7m$ $7n$ $7o$ $7p$ $7q$ $7r$ $7s$ $7t$ $7u$ $7v$ $7w$ $84$ $88$ $8c$ $8g$ $8k$ $8o$ $8s$ $8w$ $8z$ ) # 54 / 159
      `;

      MockSolver.prototype.solutions = [{}];
      expect(_ => Solver.pre(dsl, {Solver: MockSolver})).not.to.throw();
    });
  });
});
