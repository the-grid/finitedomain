// https://web.stanford.edu/~laurik/fsmbook/examples/Einstein'sPuzzle.html
/*
Let us assume that there are five houses of different colors next to each
other on the same road. In each house lives a man of a different nationality.
Every man has his favorite drink, his favorite brand of cigarettes, and
keeps pets of a particular kind:

 1 The Englishman lives in the red house.
 2 The Swede keeps dogs.
 3 The Dane drinks tea.
 4 The green house is just to the left of the white one.
 5 The owner of the green house drinks coffee.
 6 The Pall Mall smoker keeps birds.
 7 The owner of the yellow house smokes Dunhills.
 8 The man in the center house drinks milk.
 9 The Norwegian lives in the first house.
10 The Blend smoker has a neighbor who keeps cats.
11 The man who smokes Blue Masters drinks bier.
12 The man who keeps horses lives next to the Dunhill smoker.
13 The German smokes Prince.
14 The Norwegian lives next to the blue house.
15 The Blend smoker has a neighbor who drinks water.

The question to be answered is: Who keeps fish?

Options:

House [1, 2, 3, 4, 5]
Color [blue | green | red | white | yellow]
Nationality [Dane | Englishman | German | Swede | Norwegian]
define Drink [bier | coffee | milk |tea | water]
Cigarette [Blend | BlueMaster | Dunhill | PallMall | Prince]
Pet [birds | cats | dogs | fish | horses]

*/


import expect from '../fixtures/mocha_proxy.fixt';
import Solver from '../../src/solver';
import importer from '../../src/importer';

describe('src/einstein.spec', function() {

  function solutionFor(solution, varNames) {
    let result = {};
    for (let i = 0; i < varNames.length; i++) {
      let varName = varNames[i];
      result[varName] = solution[varName];
    }
    return result;
  }

  it('puzzle with api', function() {
    let solver = new Solver();

    let H = [0, 1, 2, 3, 4];

    let blue = solver.decl('blue', 0);
    let green = solver.decl('green', 1);
    let red = solver.decl('red', 2);
    let white = solver.decl('white', 3);
    let yellow = solver.decl('yellow', 4);
    let C = [blue, green, red, white, yellow];

    let Dane = solver.decl('danish', 0);
    let Englishman = solver.decl('english', 1);
    let German = solver.decl('german', 2);
    let Swede = solver.decl('swedish', 3);
    let Norwegian = solver.decl('norwegian', 4);
    let N = [Dane, Englishman, German, Swede, Norwegian];

    let bier = solver.decl('bier', 0);
    let coffee = solver.decl('coffee', 1);
    let milk = solver.decl('milk', 2);
    let tea = solver.decl('tea', 3);
    let water = solver.decl('water', 4);
    let D = [bier, coffee, milk, tea, water];

    let Blend = solver.decl('blend', 0);
    let BlueMaster = solver.decl('bluemaster', 1);
    let Dunhill = solver.decl('dunhill', 2);
    let PallMall = solver.decl('pallmall', 3);
    let Prince = solver.decl('prince', 4);
    let S = [Blend, BlueMaster, Dunhill, PallMall, Prince];

    let birds = solver.decl('birds', 0);
    let cats = solver.decl('cats', 1);
    let dogs = solver.decl('dogs', 2);
    let fish = solver.decl('fish', 3);
    let horses = solver.decl('horses', 4);
    let P = [birds, cats, dogs, fish, horses];

    let hash = {};
    H.forEach(x => hash[x] = 'H');
    C.forEach(x => hash[x] = 'C');
    N.forEach(x => hash[x] = 'N');
    D.forEach(x => hash[x] = 'D');
    S.forEach(x => hash[x] = 'S');
    P.forEach(x => hash[x] = 'P');

    H.forEach(i => ['C', 'N', 'S', 'D', 'P'].forEach(type => solver.decl(type + i, [0, 4])));

    let Cn = ['C0', 'C1', 'C2', 'C3', 'C4'];
    let Nn = ['N0', 'N1', 'N2', 'N3', 'N4'];
    let Dn = ['D0', 'D1', 'D2', 'D3', 'D4'];
    let Sn = ['S0', 'S1', 'S2', 'S3', 'S4'];
    let Pn = ['P0', 'P1', 'P2', 'P3', 'P4'];
    solver.distinct(Cn);
    solver.distinct(Nn);
    solver.distinct(Dn);
    solver.distinct(Sn);
    solver.distinct(Pn);

    H.forEach(i => {
      // some logic helper functions
      // they're closures over solver and i so stuff looks cleaner. not very efficient but that's irrelevant here.

      // "iif house=x then house=y"
      let ifThen = (a, b) => ifThenHouse(a, b, i);
      // "iif house[i]=x then house[i]=y"
      let ifThenHouse = (a, b, houseNumber) => _iif(hash[a] + houseNumber, a, hash[b] + houseNumber, b);
      // "iif A=v1 then B=v2"
      let _iif = (ha, va, hb, vb) => solver.eq(solver.isEq(ha, va), solver.isEq(hb, vb));
      // "iif house=x then house+=delta=y" (+1 or -1 for either neighbor)
      let ifThenNeighbor = (a, b, delta) => _iif(hash[a] + i, a, hash[b] + (i + delta), b);
      // "iif house=x then either neighbor=y (not both)"
      let ifThenEitherNeighbor = (a, b) => {
        if (i === 0) ifThenNeighbor(a, b, 1);
        else if (i === 4) ifThenNeighbor(a, b, -1);
        else ifThenXor(hash[a] + i, a, hash[b] + (i - 1), hash[b] + (i + 1), b);
      };
      // "iif a=n then either b=m or c=m" (but not both b=m c=m)
      let ifThenXor = (a, n, b, c, m) => solver.lte(solver.isEq(a, n), solver.isNeq(solver.isEq(b, m), solver.isEq(c, m)));

      // number behind each constraint refers to constraint number outlined above

      ifThen(Englishman, red);                             // 1
      ifThen(Swede, dogs);                                 // 2
      ifThen(Dane, tea);                                   // 3
      if (i === 0) {
        solver.neq('C0', white);                           // 4; if left-most house is white it cannot be to the right of a green house
        ifThenNeighbor(green, white, +1);                  // 4
      } else if (i < 4) {
        ifThenNeighbor(green, white, +1);                  // 4
      } else {
        solver.neq('C4', green);                           // 4: if right-most house is green then it cannot be to the left of a white house
      }
      ifThen(green, coffee);                               // 5
      ifThen(PallMall, birds);                             // 6
      ifThen(yellow, Dunhill);                             // 7
      if (i === 2) solver.eq('D2', milk);                  // 8
      if (i === 0) solver.eq('N0', Norwegian);             // 9
      ifThenEitherNeighbor(Blend, cats);                   // 10
      ifThen(BlueMaster, bier);                            // 11
      ifThenEitherNeighbor(horses, Dunhill);               // 12
      ifThen(German, Prince);                              // 13
      ifThenEitherNeighbor(Norwegian, blue);               // 14
      ifThenEitherNeighbor(Blend, water);                  // 15
    });

    // we only care about solving the assignments of each property for each house (C0, P0, etc)
    solver.solve({_debug: 0, log: 1, max: 2, vars: [].concat(Cn, Nn, Dn, Sn, Pn)});
    expect(solver.solutions.length, 'solution count').to.eql(1); // only has one solution

    /*
    from the website:
      In the yellow house the Norwegian drinks water, smokes Dunhills, and keeps cats.
      In the blue house the Dane drinks tea, smokes Blends, and keeps horses.
      In the red house the Englishman drinks milk, smokes PallMalls, and keeps birds.
      In the green house the German drinks coffee, smokes Princes, and keeps fish.
      In the white house the Swede drinks bier, smokes BlueMasters, and keeps dogs.
    */

    let s = solver.solutions[0];
    expect(solutionFor(s, [].concat(Cn, Nn, Dn, Sn, Pn))).to.eql({
      C0: s[yellow],
      D0: s[water],
      N0: s[Norwegian],
      P0: s[cats],
      S0: s[Dunhill],

      C1: s[blue],
      D1: s[tea],
      N1: s[Dane],
      P1: s[horses],
      S1: s[Blend],

      C2: s[red],
      D2: s[milk],
      N2: s[Englishman],
      P2: s[birds],
      S2: s[PallMall],

      C3: s[green],
      D3: s[coffee],
      N3: s[German],
      P3: s[fish], // <-- ! :)
      S3: s[Prince],

      C4: s[white],
      D4: s[bier],
      N4: s[Swede],
      P4: s[dogs],
      S4: s[BlueMaster],
    });
  });

  it('puzzle with dsl', function() {

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
      # constants
      : blue [${blue} ${blue}]
      : green [${green} ${green}]
      : red [${red} ${red}]
      : white [${white} ${white}]
      : yellow [${yellow} ${yellow}]

      : dane [${dane} ${dane}]
      : english [${english} ${english}]
      : german [${german} ${german}]
      : swede [${swede} ${swede}]
      : norwegian [${norwegian} ${norwegian}]

      : bier [${bier} ${bier}]
      : coffee [${coffee} ${coffee}]
      : milk [${milk} ${milk}]
      : tea [${tea} ${tea}]
      : water [${water} ${water}]

      : blend [${blend} ${blend}]
      : bluemaster [${bluemaster} ${bluemaster}]
      : dunhill [${dunhill} ${dunhill}]
      : pallmall [${pallmall} ${pallmall}]
      : prince [${prince} ${prince}]

      : birds [${birds} ${birds}]
      : cats [${cats} ${cats}]
      : dogs [${dogs} ${dogs}]
      : fish [${fish} ${fish}]
      : horses [${horses} ${horses}]

      # which house is assigned which option?
      # C=color, N=nationality, D=drink, S=smokes, P=pet
      : C0 [0 4] alias(house_color_of_first_house)
      : C1 [0 4]
      : C2 [0 4]
      : C3 [0 4]
      : C4 [0 4]
      : N0 [0 4] alias(nationality_of_first_house)
      : N1 [0 4]
      : N2 [0 4]
      : N3 [0 4]
      : N4 [0 4]
      : D0 [0 4] alias(drink_of_first_house)
      : D1 [0 4]
      : D2 [0 4]
      : D3 [0 4]
      : D4 [0 4]
      : S0 [0 4] alias(smoke_brand_of_first_house)
      : S1 [0 4]
      : S2 [0 4]
      : S3 [0 4]
      : S4 [0 4]
      : P0 [0 4] alias(pet_of_first_house)
      : P1 [0 4]
      : P2 [0 4]
      : P3 [0 4]
      : P4 [0 4]

      # distribution must be unique (one color per house, etc)
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

    let solver = importer(dsl);

    let outputVars = ['C0', 'C1', 'C2', 'C3', 'C4', 'N0', 'N1', 'N2', 'N3', 'N4', 'D0', 'D1', 'D2', 'D3', 'D4', 'S0', 'S1', 'S2', 'S3', 'S4', 'P0', 'P1', 'P2', 'P3', 'P4'];
    solver.solve({log: 1, max: 2, vars: outputVars});

    expect(solver.solutions.length, 'solution count').to.eql(1);

    let s = solver.solutions[0];
    expect(solutionFor(s, outputVars)).to.eql({
      C0: yellow,
      D0: water,
      N0: norwegian,
      P0: cats,
      S0: dunhill,

      C1: blue,
      D1: tea,
      N1: dane,
      P1: horses,
      S1: blend,

      C2: red,
      D2: milk,
      N2: english,
      P2: birds,
      S2: pallmall,

      C3: green,
      D3: coffee,
      N3: german,
      P3: fish, // <-- ! :)
      S3: prince,

      C4: white,
      D4: bier,
      N4: swede,
      P4: dogs,
      S4: bluemaster,
    });
  });
});
