import expect from '../fixtures/mocha_proxy.fixt';
import solverSolver from '../../src/runner';

class MockSolver {
  imp() { return this; }
  solve() {
    return this.solutions;
  }
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
      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

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
      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: true});

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

      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

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

      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

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

      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

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

      let solution = solverSolver(dsl, MockSolver, {singleCycle: false, hashNames: false});

      expect(solution).to.eql({A: 5, B: 5, C: 1});
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

      expect(_ => solverSolver(dsl)).not.to.throw();
    });
  });
});
