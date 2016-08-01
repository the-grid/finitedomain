import expect from '../../fixtures/mocha_proxy.fixt';

import Solver from '../../../src/solver';
import {
  config_clone,
} from '../../../src/config';

import case20160611 from './2016-06-11';
import case20160613 from './2016-06-13';
import case20160618 from './2016-06-18';
import case20160618_slim from './2016-06-18.slim';
import case20160618_slim2 from './2016-06-18.slim2';

describe('exports/export.cases.spec', function() {

  this.timeout(60000); // takes long under istanbul / even longer under travis

  it('should solve 2016-06-11 twice', function() {
    var solver = new Solver({config: config_clone(case20160611)});

    console.log('run 1:');
    solver.solve({log: 1, max: 1});
    console.log('run 2:');
    solver.solve({log: 1, max: 1});
  });

  it('should proceed past prepare for 2016-06-13', function() {
    var solver = new Solver({config: config_clone(case20160613)});

    solver.solve({log: 1, max: 1});
  });

  describe('2016-06-18', function() {

    it('should not take infinite time', function() {
      var solver = new Solver({config: config_clone(case20160618)});

      solver.solve({log: 1, max: 1});
    });
  });

  describe('2016-06-18.slim', function() {
    // drilled down the test case and fixed a bug related to what was left.
    // unfortunately it was not the actual bug.

    it('should not take infinite time', function() {
      var solver = new Solver({config: config_clone(case20160618_slim)});

      solver.solve({log: 1, max: 1});
    });

    it('trimmed down version', function() {
      var solver = new Solver();
      solver.addVar({
        id: 'x12',
        domain: [ 1, 8 ],
        distributionOptions: {
          distributionName: 'list',
          list: [4, 3, 2, 1, 5, 6, 7, 8],
        },
      });
      solver.addVar({
        id: 'x19',
        domain: [ 1, 8 ],
        distributionOptions: {
          distributionName: 'list',
          list: [4, 3, 2, 1, 5, 6, 7, 8],
        },
      });
      solver.addVar({
        id: 'x26',
        domain: [ 1, 8 ],
        distributionOptions: {
          distributionName: 'list',
          list: [4, 3, 2, 1, 5, 6, 7, 8],
        },
      });
      solver.decl('x152', [ 0, 1 ]);
      solver.decl('x164', [ 0, 1 ]);
      solver.decl('x165', [ 0, 1 ]);
      solver.decl('x166', [ 0, 1 ]);
      solver.decl('x171', [ 0, 100000000 ]);
      solver.decl('x172', [ 0, 1 ]);
      solver.decl('x207', [ 0, 100000000 ]);
      solver.decl('x208', [ 0, 1 ]);
      solver.decl('x209', [ 0, 100000000 ]);
      solver.decl('x210', [ 0, 100000000 ]);
      solver.decl('x211', [ 0, 1 ]);
      solver.decl('x214', [ 0, 100000000 ]);
      solver.decl('x215', [ 0, 1 ]);

      solver.isEq('x12', 4, 'x164');
      solver.isEq('x19', 4, 'x165');
      solver.isEq('x26', 4, 'x166');
      solver.sum(['x164', 'x165', 'x166'], 'x171');
      solver.isEq('x171', 3, 'x172');
      solver.sum(['x172'], 'x210');
      solver.sum(['x152'], 'x209');
      solver.isEq('x209', 'x210', 'x211');
      solver.isGte('x207', 1, 'x208');
      solver.plus('x209', 1, 'x214');
      solver.isEq('x210', 'x214', 'x215');
      solver.neq('x211', 'x215');

      solver.solve({log: 1, max: 1});
    });

    it('empty array version', function() {
      // this version took a long time because fd didnt reject immediately
      // when encountering the empty domain (you'll need some large open
      // domains for the effect to show)

      let config = {
        _class: '$config',
        nextVarStrat: 'naive',
        valueStratName: 'min',
        targetedVars: 'all',
        var_dist_options: {},
        timeout_callback: undefined,
        all_var_names: [
          '0',
          '_ROOT_BRANCH_',
          'SECTION',
          '3',
          '4',
          '5',
          '6',
          'VERSE_INDEX',
          '8',
          'ITEM_INDEX',
          '10',
          '11',
          'width',
          'color',
          'post_type',
          'state',
          'SECTION&n=1',
          'VERSE_INDEX&n=1',
          'ITEM_INDEX&n=1',
          'width&n=1',
          'color&n=1',
          'post_type&n=1',
          'state&n=1',
          'SECTION&n=2',
          'VERSE_INDEX&n=2',
          'ITEM_INDEX&n=2',
          'width&n=2',
          'color&n=2',
          'post_type&n=2',
          'state&n=2',
          'SECTION&n=3',
          'VERSE_INDEX&n=3',
          'ITEM_INDEX&n=3',
          'width&n=3',
          'color&n=3',
          'post_type&n=3',
          'state&n=3',
          'SECTION&n=4',
          'VERSE_INDEX&n=4',
          'ITEM_INDEX&n=4',
          'width&n=4',
          'color&n=4',
          'post_type&n=4',
          'state&n=4',
          'SECTION&n=5',
          'VERSE_INDEX&n=5',
          'ITEM_INDEX&n=5',
          'width&n=5',
          'color&n=5',
          'post_type&n=5',
          'state&n=5',
          'SECTION&n=6',
          'VERSE_INDEX&n=6',
          'ITEM_INDEX&n=6',
          'width&n=6',
          'color&n=6',
          'post_type&n=6',
          'state&n=6',
          '58',
          '59',
          '60',
          '61',
          '62',
          '63',
          '64',
          '65',
          '66',
          '67',
          '68',
          '69',
          '70',
          '71',
          '72',
          '73',
          '74',
          '75',
          '76',
          '77',
          '78',
          '79',
          '80',
          '81',
          '82',
          '83',
          '84',
          '85',
          '86',
          '87',
          '88',
          '89',
          '90',
          '91',
          '92',
          '93',
          '94',
          '95',
          '96',
          '97',
          '98',
          '99',
          '100',
          '101',
          '102',
          '103',
          '104',
          '105',
          '106',
          '107',
          '108',
          '109',
          '110',
          '111',
          '112',
          '113',
          '114',
          '115',
          '116',
          '117',
          '118',
          '119',
          '120',
          '121',
          '122',
          '123',
          '124',
          '125',
          '126',
          '127',
          '128',
          '129',
          '130',
          '131',
          '132',
          '133',
          '134',
          '135',
          '136',
          '137',
          '138',
          '139',
          '140',
          '141',
          '142',
          '143',
          '144',
          '145',
          '146',
          '147',
          '148',
          '149',
          '150',
          '151',
          '152',
          '153',
          '154',
          '155',
          '156',
          '157',
          '158',
          '159',
          '160',
          '161',
          '162',
          '163',
          '164',
          '165',
          '166',
          '167',
          '168',
          '169',
          '170',
          '171',
          '172',
          '173',
          '174',
          '175',
          '176',
          '177',
          '178',
          '179',
          '180',
          '181',
          '182',
          '183',
          '184',
          '185',
          '186',
          '187',
          '188',
          '189',
          '190',
          '191',
          '192',
          '193',
          '194',
          '195',
          '196',
          '197',
          '198',
          '199',
          '200',
          '201',
          '202',
          '203',
          '204',
          '205',
          '206',
          '207',
          '208',
          '209',
          '210',
          '211',
          '212',
          '213',
          '214',
          '215',
          '216',
          '217',
          '218',
          '219',
          '220',
          '221',
          '222',
          '223',
          '224',
          '225',
          '226',
          '227',
          '228',
          '229',
          '230',
          '231',
          '232',
          '233',
          '234',
          '235',
          '236',
          '237',
          '238',
          '239',
          '240',
          '241',
          '242',
          '243',
          '244',
          '245',
          '246',
          '247',
          '248',
          '249',
          '250',
          '251',
          '252',
          '253',
          '254',
          '255',
          '256',
          '257',
          '258',
          '259',
          '260',
          '261',
          '262',
          '263',
          '264',
          '265',
          '266',
          '267',
          '268',
          '269',
          '270',
          '271',
          '272',
          '273',
          '274'],
        all_constraints: [
          {_class: '$constraint', name: 'reifier', varIndexes: [0, 1, 2], param: 'eq'},
        ],
        constant_cache: {},
        initial_domains: [
          [3, 3], // 8
          [4, 4], // 4
          [0, 1], // 0
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [1, 8], // 12
          [],
          [],
          [],
          [],
          [],
          [],
          [1, 8], // 21
          [],
          [],
          [],
          [],
          [],
          [],
          [1, 8],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [0, 1], // 152
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [0, 1], // 165
          [0, 1],
          [0, 1],
          [],
          [],
          [],
          [],
          [0, 3], // 171
          [0, 1],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [0, 100000000], // 207
          [0, 1],
          [0, 100000000], // 209
          [0, 100000000], // 210
          [0, 1],
          [0, 100000000], // 212
          [0, 100000000],
          [0, 100000000], // 214
          [0, 1], // 215
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
        ],
      };

      let solver = new Solver({config: config_clone(config)});
      solver.solve({log: 1, max: 1});
    });

    it('show that a sum for one var is an eq', function() {
      let solver = new Solver();
      solver.decl('A', [0, 1]);
      solver.decl('B', [0, 100000000]);
      solver.sum(['A'], 'B');

      let solutionSum = solver.solve({log: 1, max: 3});
      expect(solutionSum, 'sum').to.eql([{A: 0, B: 0}, {A: 1, B: 1}]);

      let solver2 = new Solver();
      solver2.decl('A', [0, 1]);
      solver2.decl('B', [0, 100000000]);
      solver2.eq('A', 'B');

      let solutionEq = solver2.solve({log: 1, max: 3});
      expect(solutionEq, 'eq').to.eql([{A: 0, B: 0}, {A: 1, B: 1}]);

      // so...
      expect(solutionEq, 'eq=sum').to.eql(solutionSum);
    });

    it('show that a sum for two vars is a plus', function() {
      let solver = new Solver();
      solver.decl('A', [0, 1]);
      solver.decl('B', [0, 1]);
      solver.decl('C', [0, 1]);
      solver.sum(['A', 'B'], 'C');

      let solutionSum = solver.solve({log: 1, max: 3});
      expect(solutionSum, 'sum').to.eql([{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 1}, {A: 1, B: 0, C: 1}]);

      let solver2 = new Solver();
      solver2.decl('A', [0, 1]);
      solver2.decl('B', [0, 1]);
      solver2.decl('C', [0, 1]);
      solver2.plus('A', 'B', 'C');

      let solutionPlus = solver2.solve({log: 1, max: 3});
      expect(solutionPlus, 'eq').to.eql([{A: 0, B: 0, C: 0}, {A: 0, B: 1, C: 1}, {A: 1, B: 0, C: 1}]);

      // so...
      expect(solutionPlus, 'eq=sum').to.eql(solutionSum);
    });

    describe('unconstrained vars were still requiring a solve, exploding the runtime', function() {

      it('unconstrained AB should not appear in spaces unsolved vars list', function() {
        let solver = new Solver();
        solver.decl('A', [19, 20]);
        solver.decl('B', [20, 21]);
        let solution = solver.solve();

        expect(solution).to.eql([{A: [19, 20], B: [20, 21]}]); // return all valid values that still satisfy all constraints (->none)
        expect(solver._space.unsolvedVarIndexes).to.eql([]); // should not target A or B because they are unconstrained
      });
      it('constrained AB should appear in spaces unsolved vars list', function() {
        let solver = new Solver();
        solver.decl('A', [19, 20]);
        solver.decl('B', [21, 22]);
        solver.neq('A', 'B');
        let solution = solver.solve({});

        expect(solution).to.eql([{A: 19, B: 21}, {A: 19, B: 22}, {A: 20, B: 21}, {A: 20, B: 22}]); // now it must solve. note: result will be different when we optimize neq to "solve" properly
        expect(solver._space.unsolvedVarIndexes).to.eql([0, 1]); // should A and B because they are under neq
      });
    });
  });

  describe('2016-06-18.slim2', function() {

    it('should not take infinite time', function() {
      var solver = new Solver({config: config_clone(case20160618_slim2)});

      solver.solve({log: 1, max: 1});
    });

    describe('sum seems to be broken', function() {

      it('sum seems to be broken', function() {
        let solver = new Solver();
        solver.decl('A', [0, 1]);
        solver.decl('B', [0, 1]);
        solver.decl('S', [2, 2]);
        solver.sum(['A', 'B'], 'S');
        let solution = solver.solve({log: 1});
        expect(solution).to.eql([{A: 1, B: 1, S: 2}]);
      });

      it('sum seems to be broken', function() {
        let solver = new Solver();
        solver.decl('A', [0, 1]);
        solver.decl('B', [0, 1]);
        solver.decl('S', [2, 2]);
        solver.plus('A', 'B', 'S');
        let solution = solver.solve({log: 1});
        expect(solution).to.eql([{A: 1, B: 1, S: 2}]);
      });
    });

    it('same but as a fresh solver', function() {
      let solver = new Solver();
      solver.decl('x0', 1);
      solver.decl('x3', 2);
      solver.decl('x8', 3);
      solver.decl('x160', [0, 1]);
      solver.decl('x168', [0, 1]);
      solver.decl('x169', [0, 1]);
      solver.decl('x170', [0, 1]);
      solver.decl('x173', [0, 100000000]);
      solver.decl('x174', [0, 1]);
      solver.decl('x179', [0, 100000000]);
      solver.decl('x180', [0, 1]);
      solver.decl('x203', [0, 100000000]);
      solver.decl('x204', [0, 1]);
      solver.decl('x261', [0, 1]);

      solver.isEq('x173', 'x8', 'x174');
      solver.sum(['x168', 'x169', 'x170'], 'x179');
      solver.isEq('x179', 'x8', 'x180');
      solver.sum(['x160', 'x180'], 'x203');
      solver.isGte('x203', 1, 'x204');
      solver.sum(['x261', 'x204'], 'x3');

      solver.solve({log: 1, max: 1});
    });


    it('reified should solve immediately', function() {
      let solver = new Solver();
      solver.decl('x0', 1);
      solver.decl('x203', [0, 100000000]);
      solver.decl('x204', [0, 1]);
      solver.isGte('x203', 1, 'x204');

      solver.solve({log: 1, max: 1});
    });
  });
});
