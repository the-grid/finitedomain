import setup from '../fixtures/helpers.spec';
import {
  spec_d_create_bool
  spec_d_create_range
  spec_d_create_ranges
  strip_anon_vars_a,
} from '../fixtures/domain.spec';
import finitedomain from '../../src/index';
import {
  expect,
  assert,
} from 'chai';

const {
  Solver
} = finitedomain;

describe("solver.spec", function() {

  it('finitedomain.Solver?', () => expect(typeof Solver).to.be.equal('function'));

  describe('API integration tests', function () {

    it('4 branch 2 level example w/ string vars (binary)', function () {

      /*
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
      */

      let solver = new Solver({defaultDomain: spec_d_create_bool()});

      // branch vars
      solver.addVars(['A', 'C', 'B', 'D']);

      // path vars
      let Avars = ['A1', 'A2', 'A3'];
      let Bvars = ['B1', 'B2', 'B3'];
      let Cvars = ['C1', 'C2', 'C3'];
      let Dvars = ['D1', 'D2', 'D3'];
      solver.addVars([].concat(Avars, Bvars, Cvars, Dvars));

      // path to branch binding
      solver['∑'](Avars, 'A');
      solver['∑'](Bvars, 'B');
      solver['∑'](Cvars, 'C');
      solver['∑'](Dvars, 'D');

      // root branches must be on
      solver['==']('A', solver.constant(1));
      solver['==']('C', solver.constant(1));

      // child-parent binding
      solver['==']('B', 'A2');
      solver['==']('D', 'C2');

      // D & B counterpoint
      solver['==?']('B', 'D', solver.addVar('BsyncD'));

      let BD1 = solver['==?']('B1', 'D1');
      solver['>='](BD1, 'BsyncD');
      let BD2 = solver['==?']('B2', 'D2');
      solver['>='](BD2, 'BsyncD');
      let BD3 = solver['==?']('B3', 'D3');
      solver['>='](BD3, 'BsyncD');

      expect(solver.solve().length).to.equal(19);
    });

    it('4 branch 2 level example w/ var objs (binary)', function () {

      /*
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
       */

      let solver = new Solver({defaultDomain: spec_d_create_bool()});

      let branches = {A: 3, B: 3, C: 3, D: 3};

      for (let branchId in branches) {
        let pathCount = branches[branchId];
        let branchVar = {id: branchId};
        solver.addVar(branchVar);
        let pathVars = [];
        let iterable = __range__(1, pathCount, true);
        for (let j = 0; j < iterable.length; j++) {
          let i = iterable[j];
          pathVars.push({id: branchId + i});
        }
        solver.addVars(pathVars);
        // path to branch binding
        solver['∑'](pathVars, branchVar);
      }

      // root branches must be on
      solver['==']('A', solver.constant(1));
      solver['==']('C', solver.constant(1));

      // child-parent binding
      solver['==']('B', 'A2');
      solver['==']('D', 'C2');

      // D & B counterpoint
      //S['==?'] 'B', 'D', S.addVar('BsyncD')

      let BD = solver['==?']('B', 'D');
      solver['<='](BD, solver['==?']('B1', 'D1'));
      solver['<='](BD, solver['==?']('B2', 'D2'));
      solver['<='](BD, solver['==?']('B3', 'D3'));

      let solutions = solver.solve();

      expect(solutions.length, 'solution count').to.equal(19);
    });

    it('4 branch 2 level example w/ var objs (non-binary)', function () {

      /*
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
       */

      let solver = new Solver({defaultDomain: spec_d_create_bool()});

      solver.addVar('A', spec_d_create_range(0, 3));
      solver.addVar('B', spec_d_create_range(0, 3));
      solver.addVar('C', spec_d_create_range(0, 3));
      solver.addVar('D', spec_d_create_range(0, 3));

      // root branches must be on
      solver['>=']('A', solver.constant(1));
      solver['>=']('C', solver.constant(1));

      // child-parent binding
      let A = solver['==?']('A', solver.constant(2));
      let B = solver['>?']('B', solver.constant(0));
      solver['=='](A, B);
      let C = solver['==?']('C', solver.constant(2));
      let D = solver['>?']('D', solver.constant(0));
      solver['=='](C, D);

      // Synchronize D & B if possible
      // if B > 0 and D > 0, then B == D
      solver['>='](
        solver['==?']('B', 'D'),
        solver['==?'](
          solver['>?']('B', solver.constant(0)),
          solver['>?']('D', solver.constant(0))
        )
      );

      let solutions = solver.solve();

      expect(solutions.length).to.equal(19);
    });
  });

  describe('plain tests', function () {

    it('should solve a sparse domain', function () {
      let solver = new Solver({});

      solver.decl('item1', spec_d_create_range(1, 5));
      solver.decl('item2', spec_d_create_ranges([2, 2], [4, 5]));
      solver.decl('item3', spec_d_create_range(1, 5));
      solver.decl('item4', spec_d_create_range(4, 4));
      solver.decl('item5', spec_d_create_range(1, 5));

      solver['<']('item1', 'item2');
      solver['<']('item2', 'item3');
      solver['<']('item3', 'item4');
      solver['<']('item4', 'item5');

      let solutions = solver.solve();

      expect(solutions.length, 'solution count').to.equal(1);
      expect(solutions[0].item1, 'item1').to.equal(1);
      expect(solutions[0].item2, 'item2').to.equal(2);
    });

    it("should reject a simple > test (regression)", function () {
      // regression: x>y was wrongfully mapped to y<=x
      let solver = new Solver({});

      solver.decl('item5', spec_d_create_range(1, 5));
      solver.decl('item4', spec_d_create_ranges([2, 2], [3, 5]));
      solver.decl('item3', spec_d_create_range(1, 5));
      solver.decl('item2', spec_d_create_range(4, 4));
      solver.decl('item1', spec_d_create_range(1, 5));

      solver['==']('item5', solver.constant(5));
      solver['>']('item1', 'item2');
      solver['>']('item2', 'item3');
      solver['>']('item3', 'item4');
      solver['>']('item4', 'item5');

      // there is no solution since item 5 must be 5 and item 2 must be 4
      let solutions = solver.solve();

      expect(solutions.length, 'solution count').to.equal(0);
    });

    it("should solve a simple >= test", function () {
      let solver = new Solver({});

      solver.decl('item5', spec_d_create_range(1, 5));
      solver.decl('item4', spec_d_create_ranges([2, 2], [3, 5]));
      solver.decl('item3', spec_d_create_range(1, 5));
      solver.decl('item2', spec_d_create_range(4, 5));
      solver.decl('item1', spec_d_create_range(1, 5));

      solver['==']('item5', solver.constant(5));
      solver['>=']('item1', 'item2');
      solver['>=']('item2', 'item3');
      solver['>=']('item3', 'item4');
      solver['>=']('item4', 'item5');

      let solutions = solver.solve();

      // only solution is where everything is `5`
      expect(solutions.length, 'solution count').to.equal(1);
    });

    it("should solve a simple < test", function () {
      let solver = new Solver({});

      solver.decl('item5', spec_d_create_range(1, 5));
      solver.decl('item4', spec_d_create_range(4, 4));
      solver.decl('item3', spec_d_create_range(1, 5));
      solver.decl('item2', spec_d_create_ranges([2, 2], [3, 5]));
      solver.decl('item1', spec_d_create_range(1, 5));

      solver['==']('item5', solver.constant(5));
      solver['<']('item1', 'item2');
      solver['<']('item2', 'item3');
      solver['<']('item3', 'item4');
      solver['<']('item4', 'item5');

      let solutions = solver.solve();

      // only solution is where each var is prev+1, 1 2 3 4 5
      expect(solutions.length, 'solution count').to.equal(1);
    });

    it("should solve a simple / test", function () {
      let solver = new Solver({});

      solver.addVar('A', spec_d_create_range(50, 100));
      solver.addVar('B', spec_d_create_range(5, 10));
      solver.addVar('C', spec_d_create_range(0, 100));

      solver.div('A', 'B', 'C');
      solver.eq('C', 15);

      let solutions = solver.solve();

      // there are two integer solutions (75/5 and 90/6) and
      // 9 fractional solutions whose floor result in 15
      expect(solutions.length, 'solution count').to.equal(11);

      // there are two cases where A/B=15 with input ranges:
      expect(strip_anon_vars_a(solutions)).to.eql([{
        A: 75,
        B: 5,
        C: 15
      }, {
        A: 76,
        B: 5,
        C: 15 // floored
      }, {
        A: 77,
        B: 5,
        C: 15 // floored
      }, {
        A: 78,
        B: 5,
        C: 15 // floored
      }, {
        A: 79,
        B: 5,
        C: 15 // floored
      }, {
        A: 90,
        B: 6,
        C: 15
      }, {
        A: 91,
        B: 6,
        C: 15 // floored
      }, {
        A: 92,
        B: 6,
        C: 15 // floored
      }, {
        A: 93,
        B: 6,
        C: 15 // floored
      }, {
        A: 94,
        B: 6,
        C: 15 // floored
      }, {
        A: 95,
        B: 6,
        C: 15 // floored
      }]);
    });

    it('should solve another simple / test', function () {
      let solver = new Solver({});

      solver.addVar('A', spec_d_create_range(3, 5));
      solver.addVar('B', spec_d_create_range(2, 2));
      solver.addVar('C', spec_d_create_range(0, 100));

      solver.div('A', 'B', 'C');
      solver.eq('C', 2);

      let solutions = solver.solve();

      // expecting two solutions; one integer division and one floored fractional division
      expect(solutions.length, 'solution count').to.equal(2);

      // there is only one case where 3~5 / 2 equals 2 and that is when A is 4.
      // but when flooring results, 5/2=2.5 -> 2, so there are two answers
      expect(strip_anon_vars_a(solutions)).to.eql([{
        A: 4,
        B: 2,
        C: 2
      }, {
        A: 5,
        B: 2,
        C: 2 // floored
      }]);
    });

    it('should solve a simple * test', function () {
      let solver = new Solver({});

      solver.addVar('A', spec_d_create_range(3, 8));
      solver.addVar('B', spec_d_create_range(2, 10));
      solver.addVar('C', spec_d_create_range(0, 100));

      solver.mul('A', 'B', 'C');
      solver.eq('C', 30);

      let solutions = solver.solve();

      expect(solutions.length, 'solution count').to.equal(3);

      // 3*10=30
      // 5*6=30
      // 6*5=30
      expect(strip_anon_vars_a(solutions)).to.eql([{
        A: 3,
        B: 10,
        C: 30
      }, {
        A: 5,
        B: 6,
        C: 30
      }, {
        A: 6,
        B: 5,
        C: 30
      }]);
    });

    it('should solve a simple - test', function () {
      let solver = new Solver({});
      solver.addVar('A', 400);
      solver.addVar('B', 50);
      solver.addVar('C', spec_d_create_range(0, 10000));

      solver.min('A', 'B', 'C');

      let solutions = solver.solve();

      expect(solutions).to.eql([{
        A: 400,
        B: 50,
        C: 350
      }]);
    });
  });

  describe('brute force entire space', function () {

    it('should solve a single unconstrainted var', function () {
      let solver = new Solver({});
      solver.addVar('A', [1, 2]);

      expect(solver.solve().length, 'solution count').to.eql(2);
    });

    it('should combine multiple unconstrained vars', function () {
      let solver = new Solver({});

      solver.addVar('2', [1, 1]);
      solver.addVar('3', [0, 0]);
      solver.addVar('_ROOT_BRANCH_', [0, 1]);
      solver.addVar('SECTION', [1, 1]);
      solver.addVar('VERSE_INDEX', [2, 2, 4, 4, 9, 9]);
      solver.addVar('ITEM_INDEX', [1, 2]);
      solver.addVar('align', [1, 2]);
      solver.addVar('text_align', [1, 2]);
      solver.addVar('SECTION&n=1', [1, 1]);
      solver.addVar('VERSE_INDEX&n=1', [5, 6, 8, 8]);
      solver.addVar('ITEM_INDEX&n=1', [2, 2]);
      solver.addVar('align&n=1', [1, 2]);
      solver.addVar('text_align&n=1', [1, 2]);
      solver.addVar('SECTION&n=2', [1, 1]);
      solver.addVar('VERSE_INDEX&n=2', [1, 1, 3, 3, 7, 7]);
      solver.addVar('ITEM_INDEX&n=2', [3, 3]);
      solver.addVar('align&n=2', [1, 2]);
      solver.addVar('text_align&n=2', [1, 2]);

      // 2×3×2×2×2×3×2×2×3×2×2 (size of each domain multiplied)
      // there are no constraints so it's just all combinations
      expect(solver.solve({max: 10000}).length, 'solution count').to.eql(6912);
    });

    it('should constrain one var to be equal to another', function () {
      let solver = new Solver({});

      solver.addVar('2', [1, 1]);
      solver.addVar('3', [0, 0]);
      solver.addVar('_ROOT_BRANCH_', [0, 1]);
      solver.addVar('SECTION', [1, 1]);
      solver.addVar('VERSE_INDEX', [2, 2, 4, 4, 9, 9]);
      solver.addVar('ITEM_INDEX', [1, 2]);
      solver.addVar('align', [1, 2]);
      solver.addVar('text_align', [1, 2]);
      solver.addVar('SECTION&n=1', [1, 1]);
      solver.addVar('VERSE_INDEX&n=1', [5, 6, 8, 8]);
      solver.addVar('ITEM_INDEX&n=1', [2, 2]);
      solver.addVar('align&n=1', [1, 2]);
      solver.addVar('text_align&n=1', [1, 2]);
      solver.addVar('SECTION&n=2', [1, 1]);
      solver.addVar('VERSE_INDEX&n=2', [1, 1, 3, 3, 7, 7]);
      solver.addVar('ITEM_INDEX&n=2', [3, 3]);
      solver.addVar('align&n=2', [1, 2]);
      solver.addVar('text_align&n=2', [1, 2]);

      solver.eq('_ROOT_BRANCH_', 'SECTION');

      // same as 'combine multiple unconstrained vars' but one var has one instead of two options, so /2
      expect(solver.solve({max: 10000}).length, 'solution count').to.eql(6912 / 2);
    });

    it('should allow useless constraints', function () {
      let solver = new Solver({});

      solver.addVar('2', [1, 1]);
      solver.addVar('3', [0, 0]);
      solver.addVar('_ROOT_BRANCH_', [0, 1]); // becomes 1
      solver.addVar('SECTION', [1, 1]);
      solver.addVar('VERSE_INDEX', [2, 2, 4, 4, 9, 9]);
      solver.addVar('ITEM_INDEX', [1, 2]); // becomes 2
      solver.addVar('align', [1, 2]);
      solver.addVar('text_align', [1, 2]);
      solver.addVar('SECTION&n=1', [1, 1]);
      solver.addVar('VERSE_INDEX&n=1', [5, 6, 8, 8]);
      solver.addVar('ITEM_INDEX&n=1', [2, 2]);
      solver.addVar('align&n=1', [1, 2]);
      solver.addVar('text_align&n=1', [1, 2]);
      solver.addVar('SECTION&n=2', [1, 1]);
      solver.addVar('VERSE_INDEX&n=2', [1, 1, 3, 3, 7, 7]);
      solver.addVar('ITEM_INDEX&n=2', [3, 3]);
      solver.addVar('align&n=2', [1, 2]);
      solver.addVar('text_align&n=2', [1, 2]);

      solver.eq('_ROOT_BRANCH_', 'SECTION'); // root branch can only be 1 because section only has 1

      // these are meaningless since '2' is [0,1] and all the rhs have no zeroes
      solver.lte('2', 'SECTION');
      solver.lte('2', 'VERSE_INDEX');
      solver.lte('2', 'ITEM_INDEX');
      solver.lte('2', 'align');
      solver.lte('2', 'text_align');
      solver.lte('2', 'SECTION&n=1');
      solver.lte('2', 'VERSE_INDEX&n=1');
      solver.lte('2', 'ITEM_INDEX&n=1');
      solver.lte('2', 'align&n=1');
      solver.lte('2', 'text_align&n=1');
      solver.lte('2', 'SECTION&n=2');
      solver.lte('2', 'VERSE_INDEX&n=2');
      solver.lte('2', 'ITEM_INDEX&n=2');
      solver.lte('2', 'align&n=2');
      solver.lte('2', 'text_align&n=2');

      solver.neq('ITEM_INDEX&n=1', 'ITEM_INDEX'); // the lhs is [2,2] and rhs is [1,2] so rhs must be [2,2]
      solver.neq('ITEM_INDEX&n=2', 'ITEM_INDEX'); // lhs is [3,3] and rhs [1,2] so this is a noop
      solver.neq('ITEM_INDEX&n=2', 'ITEM_INDEX&n=1'); // [2,2] and [3,3] so noop

      // only two conditions are relevant and cuts the space by 2x2, so we get 6912/4
      expect(solver.solve({max: 10000}).length).to.eql(6912 / 4);
    });

    // there was a "sensible reason" why this test doesnt work but I forgot about it right now... :)
    it.skip('should resolve a simple sum with times case', function () {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [25, 25]);
      solver.addVar('MUL', [0, 100]);

      solver.mul('A', 'B', 'MUL');
      solver.lt('MUL', 'MAX');

      // There are 11x11=121 combinations (inc dupes)
      // There's a restriction that the product of
      // A and B must be lower than 25 so only a couple
      // of combinations are valid:
      // a*b<25
      // 0x0 0x1 0x2 0x3 0x4 0x5 0x6 0x7 0x8 0x9 0x10
      // 1x0 1x1 1x2 1x3 1x4 1x5 1x6 1x7 1x8 1x9 1x10
      // 2x0 2x1 2x2 2x3 2x4 2x5 2x6 2x7 2x8 2x9 2x10
      // 3x0 3x1 3x2 3x3 3x4 3x5 3x6 3x7 3x8 <| 3x9 3x10
      // 4x0 4x1 4x2 4x3 4x4 4x5 4x6 <| 4x7 4x8 4x9 4x10
      // 5x0 5x1 5x2 5x3 5x4 <| 5x5 5x6 5x7 5x8 5x9 5x10
      // 6x0 6x1 6x2 6x3 6x4 <| 6x5 6x6 6x7 6x8 6x9 6x10
      // 7x0 7x1 7x2 7x3 <| 7x4 7x5 7x6 7x7 7x8 7x9 7x10
      // 8x0 8x1 8x2 8x3 <| 8x4 8x5 8x6 8x7 8x8 8x9 8x10
      // 9x0 9x1 9x2 <| 9x3 9x4 9x5 9x6 9x7 9x8 9x9 9x10
      // 10x0 10x1 10x2 <| 10x3 10x4 10x5 10x6 10x7 10x8 10x9 10x10
      // Counting everything to the left of <| you
      // get 73 combos of A and B that result in A*B<25

      expect(solver.solve({max: 10000, vars: ['A', 'B', 'MUL']}).length).to.eql(73);
    });

    it('should solve a simplified case from old PathBinarySolver tests', function () {
      let solver = new Solver({});

      solver.addVar('2', [1, 1]);
      solver.addVar('3', [0, 0]);
      solver.addVar('4', [2, 2]);
      solver.addVar('5', [4, 4]);
      solver.addVar('6', [9, 9]);
      solver.addVar('7', [5, 5]);
      solver.addVar('8', [6, 6]);
      solver.addVar('9', [8, 8]);
      solver.addVar('10', [3, 3]);
      solver.addVar('11', [7, 7]);
      solver.addVar('12', [0, 1]); // -> 1
      solver.addVar('13', [0, 1]); // -> 0
      solver.addVar('14', [0, 1]); // -> 0
      solver.addVar('_ROOT_BRANCH_', [0, 1]); // -> 1
      solver.addVar('SECTION', [1, 1]);
      solver.addVar('VERSE_INDEX', [2, 2, 4, 4, 9, 9]); // -> 4
      solver.addVar('ITEM_INDEX', [1, 1]);
      solver.addVar('align', [1, 2]);
      solver.addVar('text_align', [1, 2]);
      solver.addVar('SECTION&n=1', [1, 1]);
      solver.addVar('VERSE_INDEX&n=1', [5, 6, 8, 8]); // -> 5 or 8
      solver.addVar('ITEM_INDEX&n=1', [2, 2]);
      solver.addVar('align&n=1', [1, 2]);
      solver.addVar('text_align&n=1', [1, 2]);
      solver.addVar('SECTION&n=2', [1, 1]);
      solver.addVar('VERSE_INDEX&n=2', [1, 1, 3, 3, 7, 7]); // -> 3 or 7
      solver.addVar('ITEM_INDEX&n=2', [3, 3]);
      solver.addVar('align&n=2', [1, 2]);
      solver.addVar('text_align&n=2', [1, 2]);

      solver.eq('_ROOT_BRANCH_', '2'); // root must be 1
      // these are meaningless
      solver.lte('2', 'SECTION');
      solver.lte('2', 'VERSE_INDEX');
      solver.lte('2', 'ITEM_INDEX');
      solver.lte('2', 'align');
      solver.lte('2', 'text_align');
      solver.lte('2', 'SECTION&n=1');
      solver.lte('2', 'VERSE_INDEX&n=1');
      solver.lte('2', 'ITEM_INDEX&n=1');
      solver.lte('2', 'align&n=1');
      solver.lte('2', 'text_align&n=1');
      solver.lte('2', 'SECTION&n=2');
      solver.lte('2', 'VERSE_INDEX&n=2');
      solver.lte('2', 'ITEM_INDEX&n=2');
      solver.lte('2', 'align&n=2');
      solver.lte('2', 'text_align&n=2');
      // item_index is 1 so the others cannot be 1
      solver.neq('ITEM_INDEX&n=1', 'ITEM_INDEX'); // 2 (noop)
      solver.neq('ITEM_INDEX&n=2', 'ITEM_INDEX'); // 3 (noop)
      solver.neq('ITEM_INDEX&n=2', 'ITEM_INDEX&n=1'); // 2!=3 (noop)
      // constraints are enforced with an eq below. the first must be on, the second/third must be off.
      solver._cacheReified('eq', 'VERSE_INDEX', '5', '12');
      solver._cacheReified('eq', 'VERSE_INDEX&n=1', '8', '13');
      solver._cacheReified('eq', 'VERSE_INDEX&n=2', '2', '14');
      solver.eq('12', '2'); // so vi must be 4 (it can be)
      solver.eq('13', '3'); // so vi1 must not be 6 (so 5 or 8)
      solver.eq('14', '3'); // so vi2 must not be 1 (so 3 or 7)

      // 2×2×2×2×2×2×2×2=256
      expect(solver.solve({
          max: 10000,
          vars: [
            '_ROOT_BRANCH_',
            'SECTION',
            'VERSE_INDEX',
            'ITEM_INDEX',
            'align',
            'text_align',
            'SECTION&n=1',
            'VERSE_INDEX&n=1',
            'ITEM_INDEX&n=1',
            'align&n=1',
            'text_align&n=1',
            'SECTION&n=2',
            'VERSE_INDEX&n=2',
            'ITEM_INDEX&n=2',
            'align&n=2',
            'text_align&n=2'
          ]
        }
      ).length).to.eql(256);
    });

    it('should solve 4 branch 2 level example (binary)', function () {

      /*
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
       */

      let branchVars = ['A', 'C', 'B', 'D'];
      // path vars
      let Avars = ['A1', 'A2', 'A3'];
      let Bvars = ['B1', 'B2', 'B3'];
      let Cvars = ['C1', 'C2', 'C3'];
      let Dvars = ['D1', 'D2', 'D3'];
      let pathVars = [].concat(Avars, Bvars, Cvars, Dvars);

      let solver = new Solver({defaultDomain: [0, 1]});
      solver.addVars(branchVars);
      solver.addVars(pathVars);

      // path to branch binding
      solver.sum(Avars, 'A');
      solver.sum(Bvars, 'B');
      solver.sum(Cvars, 'C');
      solver.sum(Dvars, 'D');

      // root branches must be on
      solver.eq('A', 1);
      solver.eq('C', 1);

      // child-parent binding
      solver.eq('B', 'A2');
      solver.eq('D', 'C2');

      // D & B counterpoint
      solver.addVar('BsyncD');
      solver['==?']('B', 'D', 'BsyncD');
      solver['>='](solver['==?']('B1', 'D1'), 'BsyncD');
      solver['>='](solver['==?']('B2', 'D2'), 'BsyncD');
      solver['>='](solver['==?']('B3', 'D3'), 'BsyncD');

      solver.solve({
        distribute: 'fail_first',
        vars: pathVars
      });

      expect(solver.solutions.length, 'solution count').to.equal(19);
    });
  });

  describe('reifiers', function () {

    it('should resolve a simple reified eq case', function () {
      let solver = new Solver({});

      solver.addVar('ONE', [1, 1]);
      solver.addVar('FOUR', [4, 4]);
      solver.addVar('LIST', [2, 2, 4, 4, 9, 9]); // becomes 4
      solver.addVar('IS_LIST_FOUR', [0, 1]); // becomes 1

      solver._cacheReified('eq', 'LIST', 'FOUR', 'IS_LIST_FOUR');
      solver.eq('IS_LIST_FOUR', 'ONE');

      // list can be one of three elements.
      // there is a bool var that checks whether list is resolved to 4
      // there is a constraint that requires the above bool to be 1
      // ergo; list must be 4 to satisfy all constraints
      // ergo; there is 1 possible solution

      expect(solver.solve({max: 10000}).length).to.eql(1);
    });

    it('should resolve a simple reified !eq case', function () {
      let solver = new Solver({});

      solver.addVar('ZERO', [0, 0]);
      solver.addVar('FOUR', [4, 4]);
      solver.addVar('LIST', [2, 2, 4, 4, 9, 9]); // becomes 4
      solver.addVar('IS_LIST_FOUR', [0, 1]); // becomes 1

      solver._cacheReified('eq', 'LIST', 'FOUR', 'IS_LIST_FOUR');
      solver.eq('IS_LIST_FOUR', 'ZERO');

      // list can be one of three elements.
      // there is a bool var that checks whether list is resolved to 4
      // there is a constraint that requires the above bool to be 0
      // ergo; list must be 2 or 9 to satisfy all constraints
      // ergo; there are 2 possible solutions

      expect(solver.solve({max: 10000}).length).to.eql(2);
    });

    it('should resolve a simple reified neq case', function () {
      let solver = new Solver({});

      solver.addVar('ONE', [1, 1]);
      solver.addVar('FOUR', [4, 4]);
      solver.addVar('LIST', [2, 2, 4, 4, 9, 9]); // becomes 2 or 9
      solver.addVar('IS_LIST_FOUR', [0, 1]); // becomes 1

      solver._cacheReified('neq', 'LIST', 'FOUR', 'IS_LIST_FOUR');
      solver.eq('IS_LIST_FOUR', 'ONE');

      // list can be one of three elements.
      // there is a bool var that checks whether list is resolved to 4
      // there is a constraint that requires the above bool to be 1
      // ergo; list must be 2 or 9 to satisfy all constraints
      // ergo; there are 2 possible solutions

      expect(solver.solve({max: 10000}).length).to.eql(2);
    });

    it('should resolve a simple reified !neq case', function () {
      let solver = new Solver({});

      solver.addVar('ZERO', [0, 0]);
      solver.addVar('FOUR', [4, 4]);
      solver.addVar('LIST', [2, 2, 4, 4, 9, 9]); // becomes 4
      solver.addVar('IS_LIST_FOUR', [0, 1]); // becomes 0

      solver._cacheReified('neq', 'LIST', 'FOUR', 'IS_LIST_FOUR');
      solver.eq('IS_LIST_FOUR', 'ZERO');

      // list can be one of three elements.
      // there is a bool var that checks whether list is resolved to 4
      // there is a constraint that requires the above bool to be 0
      // ergo; list must be 4 to satisfy all constraints
      // ergo; there is 1 possible solution

      expect(solver.solve({max: 10000}).length).to.eql(1);
    });

    it('should resolve a simple reified lt case', function () {
      let solver = new Solver({});

      solver.addVar('STATE', [1, 1]);
      solver.addVar('ONE_TWO_THREE', [1, 3]); // 1 2 or 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3 4 or 5
      solver.addVar('IS_LT', [0, 1]); // becomes 1

      solver._cacheReified('lt', 'ONE_TWO_THREE', 'THREE_FOUR_FIVE', 'IS_LT');
      solver.eq('IS_LT', 'STATE');

      // two lists, 123 and 345
      // reified checks whether 123<345 which is only the case when
      // the 3 is dropped from at least one side
      // IS_LT is required to have one outcome
      // 3 + 3 + 2 = 8  ->  1:3 1:4 1:5 2:3 2:4 2:5 3:4 3:5

      expect(solver.solve({max: 10000}).length).to.eql(8);
    });

    it('should resolve a simple reified !lt case', function () {
      let solver = new Solver({});

      solver.addVar('STATE', [0, 0]);
      solver.addVar('ONE_TWO_THREE', [1, 3]); // 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3
      solver.addVar('IS_LT', [0, 1]); // 0

      solver._cacheReified('lt', 'ONE_TWO_THREE', 'THREE_FOUR_FIVE', 'IS_LT');
      solver.eq('IS_LT', 'STATE');

      // two lists, 123 and 345
      // reified checks whether 123<345 which is only the case when
      // the 3 is dropped from at least one side
      // IS_LT is required to have one outcome
      // since it must be 0, that is only when both lists are 3
      // ergo; one solution

      expect(solver.solve({max: 10000}).length).to.eql(1);
    });

    it('should resolve a simple reified lte case', function () {
      let solver = new Solver({});

      solver.addVar('STATE', [1, 1]);
      solver.addVar('ONE_TWO_THREE_FOUR', [1, 4]); // 1 2 or 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3 4 or 5
      solver.addVar('IS_LTE', [0, 1]); // becomes 1

      solver._cacheReified('lte', 'ONE_TWO_THREE_FOUR', 'THREE_FOUR_FIVE', 'IS_LTE');
      solver.eq('IS_LTE', 'STATE');

      // two lists, 123 and 345
      // reified checks whether 1234<=345 which is only the case when
      // the 4 is dropped from at least one side
      // IS_LTE is required to have one outcome
      // 3 + 3 + 3 + 2 = 11  ->  1:3 1:4 1:5 2:3 2:4 2:5 3:3 3:4 3:5 4:4 4:5

      expect(solver.solve({max: 10000}).length).to.eql(11);
    });

    it('should resolve a simple reified !lte case', function () {
      let solver = new Solver({});

      solver.addVar('STATE', [0, 0]);
      solver.addVar('ONE_TWO_THREE_FOUR', [1, 4]); // 4
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3
      solver.addVar('IS_LTE', [0, 1]); // 0

      solver._cacheReified('lte', 'ONE_TWO_THREE_FOUR', 'THREE_FOUR_FIVE', 'IS_LTE');
      solver.eq('IS_LTE', 'STATE');

      // two lists, 123 and 345
      // reified checks whether 1234<=345 which is only the case when
      // the 4 is dropped from at least one side
      // IS_LTE is required to have one outcome
      // since it must be 0, that is only when left is 4 and right is 3
      // ergo; one solution

      expect(solver.solve({max: 10000}).length).to.eql(1);
    });

    it('should resolve a simple reified gt case', function () {
      let solver = new Solver({});

      solver.addVar('STATE', [1, 1]);
      solver.addVar('ONE_TWO_THREE', [1, 3]); // 1 2 or 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3 4 or 5
      solver.addVar('IS_GT', [0, 1]); // becomes 1

      solver._cacheReified('gt', 'THREE_FOUR_FIVE', 'ONE_TWO_THREE', 'IS_GT');
      solver.eq('IS_GT', 'STATE');

      // two lists, 123 and 345
      // reified checks whether 345>123 which is only the case when
      // the 3 is dropped from at least one side
      // IS_GT is required to have one outcome
      // 3 + 3 + 2 = 8  ->  3:1 4:1 5:1 3:2 4:2 5:2 3:1 3:2

      expect(solver.solve({max: 10000}).length).to.eql(8);
    });

    it('should resolve a simple reified !gt case', function () {
      let solver = new Solver({});

      solver.addVar('STATE', [0, 0]);
      solver.addVar('ONE_TWO_THREE', [1, 3]); // 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3
      solver.addVar('IS_GT', [0, 1]); // 0

      solver._cacheReified('gt', 'THREE_FOUR_FIVE', 'ONE_TWO_THREE', 'IS_GT');
      solver.eq('IS_GT', 'STATE');

      // two lists, 123 and 345
      // reified checks whether 123<345 which is only the case when
      // the 3 is dropped from at least one side
      // IS_GT is required to have one outcome
      // since it must be 0, that is only when both lists are 3
      // ergo; one solution

      expect(solver.solve({max: 10000}).length).to.eql(1);
    });

    it('should resolve a simple reified gte case', function () {
      let solver = new Solver({});

      solver.addVar('STATE', [1, 1]);
      solver.addVar('ONE_TWO_THREE_FOUR', [1, 4]); // 1 2 or 3
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3 4 or 5
      solver.addVar('IS_GTE', [0, 1]); // becomes 1

      solver._cacheReified('gte', 'THREE_FOUR_FIVE', 'ONE_TWO_THREE_FOUR', 'IS_GTE');
      solver.eq('IS_GTE', 'STATE');

      // two lists, 123 and 345
      // reified checks whether 345>=1234 which is only the case when
      // left is not 3 or right is not 4
      // IS_GTE is required to have one outcome
      // 3 + 3 + 3 + 2 = 11  ->  3:1 4:1 5:1 3:2 4:2 5:2 3:3 4:4 5:4

      expect(solver.solve({max: 10000}).length).to.eql(11);
    });

    it('should resolve a simple reified !gte case', function () {
      let solver = new Solver({});

      solver.addVar('STATE', [0, 0]);
      solver.addVar('ONE_TWO_THREE_FOUR', [1, 4]); // 4
      solver.addVar('THREE_FOUR_FIVE', [3, 5]); // 3
      solver.addVar('IS_GTE', [0, 1]); // 0

      solver._cacheReified('gte', 'THREE_FOUR_FIVE', 'ONE_TWO_THREE_FOUR', 'IS_GTE');
      solver.eq('IS_GTE', 'STATE');

      // two lists, 123 and 345
      // reified checks whether 1234<=345 which is only the case when
      // the 4 is dropped from at least one side
      // IS_LTE is required to have one outcome
      // since it must be 0, that is only when left is 3 and right is 4
      // ergo; one solution

      expect(solver.solve({max: 10000}).length).to.eql(1);
    });

    it('should resolve a simple sum with lte case', function () {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [5, 5]);
      solver.addVar('SUM', [0, 100]);

      solver.sum(['A', 'B'], 'SUM');
      solver.lte('SUM', 'MAX');

      // a+b<=5
      // so that's the case for: 0+0, 0+1, 0+2, 0+3,
      // 0+4, 0+5, 1+0, 1+1, 1+2, 1+3, 1+4, 2+0, 2+1,
      // 2+2, 2+3, 3+0, 3+1, 3+2, 4+0, 4+1, and 5+0
      // ergo: 21 solutions

      expect(solver.solve({max: 10000}).length).to.eql(21);
    });

    it('should resolve a simple sum with lt case', function () {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [5, 5]);
      solver.addVar('SUM', [0, 100]);

      solver.sum(['A', 'B'], 'SUM');
      solver.lt('SUM', 'MAX');

      // a+b<5
      // so that's the case for: 0+0, 0+1, 0+2,
      // 0+3, 0+4, 1+0, 1+1, 1+2, 1+3, 2+0, 2+1,
      // 2+2, 3+0, 3+1, and 4+0
      // ergo: 16 solutions

      expect(solver.solve({max: 10000}).length).to.eql(15);
    });

    it('should resolve a simple sum with gt case', function () {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [5, 5]);
      solver.addVar('SUM', [0, 100]);

      solver.sum(['A', 'B'], 'SUM');
      solver.gt('SUM', 'MAX');

      // a+b>5
      // there are 11x11=121 cases. a+b<=5 is 21 cases
      // (see other test) so there must be 100 results.

      expect(solver.solve({max: 10000}).length).to.eql(100);
    });

    it('should resolve a simple sum with gte case', function () {
      let solver = new Solver({});

      solver.addVar('A', [0, 10]);
      solver.addVar('B', [0, 10]);
      solver.addVar('MAX', [5, 5]);
      solver.addVar('SUM', [0, 100]);

      solver.sum(['A', 'B'], 'SUM');
      solver.gte('SUM', 'MAX');

      // a+b>=5
      // there are 11x11=121 cases. a+b<5 is 15 cases
      // (see other test) so there must be 106 results.

      expect(solver.solve({max: 10000}).length).to.eql(106);
    });
  });

  describe('gss poc', function () {

    it('with everything in finitedomain', function () {

      /*

      // assuming
      // ::window[width] is 1200
      // ::window[height] is 800

      #box1 {
        width:== 100;
        height:== 100;
      }
      #box2 {
        width: == 100;
        height: == 100;
      }

      #box1[right] == :window[center-x] - 10;
      #box2[left] == :window[center-x] + 10;

      #box1[center-y] == #box2[center-y] == ::window[center-y];

      */

      let solver = new Solver({defaultDomain: spec_d_create_range(0, 10000)});
      solver.addVar({
        id: 'VIEWPORT_WIDTH',
        domain: 1200
      });
      solver.addVar({
        id: 'VIEWPORT_HEIGHT',
        domain: 800
      });
      solver.addVars([
        // box1
        '#box1[x]',
        '#box1[width]',
        '#box1[y]',
        '#box1[height]',
        // box2
        '#box2[x]',
        '#box2[width]',
        '#box2[y]',
        '#box2[height]',
        // middle of the viewport, to be computed later
        'VIEWPORT_MIDDLE_HEIGHT',
        'VIEWPORT_MIDDLE_WIDTH'
      ]);

      // simple constraints
      // #box1 { width:== 100; height:== 100; } #box2 { width: == 100; height: == 100; }
      solver.eq('#box1[width]', 100);
      solver.eq('#box1[height]', 100);
      solver.eq('#box2[width]', 100);
      solver.eq('#box2[height]', 100);
      // make sure boxes are within viewport

      solver.lt('#box1[x]', solver.minus('VIEWPORT_WIDTH', '#box1[width]'));
      solver.lt('#box1[y]', solver.minus('VIEWPORT_HEIGHT', '#box1[height]'));
      solver.lt('#box2[x]', solver.minus('VIEWPORT_WIDTH', '#box2[width]'));
      solver.lt('#box2[y]', solver.minus('VIEWPORT_HEIGHT', '#box2[height]'));

      // VIEWPORT_WIDTH / 2
      solver.div('VIEWPORT_WIDTH', 2, 'VIEWPORT_MIDDLE_WIDTH');

      // #box1[right] == :window[center-x] - 10;
      // so: #box1[x] + #box[width] + 10 == VIEWPORT_MIDDLE_WIDTH
      solver.eq(solver.plus(solver.plus('#box1[x]', '#box1[width]'), 10), 'VIEWPORT_MIDDLE_WIDTH');

      // similar for #box2[left] == :window[center-x] + 10;
      solver.eq(solver.min('#box2[x]', 10), 'VIEWPORT_MIDDLE_WIDTH');

      // #box1[center-y] == #box2[center-y] == ::window[center-y];
      // center-y = height/2 -> y=(height/2)-(box_height/2)
      solver.div('VIEWPORT_HEIGHT', 2, 'VIEWPORT_MIDDLE_HEIGHT');
      solver.minus('VIEWPORT_MIDDLE_HEIGHT', solver.div('#box1[height]', 2), '#box1[y]');
      solver.minus('VIEWPORT_MIDDLE_HEIGHT', solver.div('#box2[height]', 2), '#box2[y]');

      let solutions = solver.solve({max: 3});

      // viewport is 1200 x 800
      // boxes are 100x100
      // box1 is 10 left to center so box1.x = 1200/2-110=490
      // box2 is 10 right of center so box2.x = 1200/2+10=610
      // box1 and box2 are vertically centered, same height so same y: (800/2)-(100/2)=350

      expect(strip_anon_vars_a(solutions)).to.eql([{
        '#box1[x]': 490, // 490+100+10=600=1200/2
        '#box1[width]': 100,
        '#box1[y]': 350,
        '#box1[height]': 100,
        '#box2[x]': 610,
        '#box2[width]': 100,
        '#box2[y]': 350,
        '#box2[height]': 100,

        "VIEWPORT_WIDTH": 1200,
        "VIEWPORT_HEIGHT": 800,
        "VIEWPORT_MIDDLE_WIDTH": 600,
        "VIEWPORT_MIDDLE_HEIGHT": 400
      }]);

      expect(solutions.length).to.equal(1);
    });

    it('with viewport constants hardcoded', function () {

      /*

      // assuming
      // ::window[width] is 1200
      // ::window[height] is 800

      #box1 {
        width:== 100;
        height:== 100;
      }
      #box2 {
        width: == 100;
        height: == 100;
      }

      #box1[right] == :window[center-x] - 10;
      #box2[left] == :window[center-x] + 10;

      #box1[center-y] == #box2[center-y] == ::window[center-y];

      */

      let FLOOR = Math.floor;
      let VIEWPORT_WIDTH = 1200;
      let VIEWPORT_HEIGHT = 800;

      let solver = new Solver({defaultDomain: spec_d_create_range(0, 10000)});
      solver.addVars([
        // box1
        '#box1[x]',
        '#box1[width]',
        '#box1[y]',
        '#box1[height]',
        // box2
        '#box2[x]',
        '#box2[width]',
        '#box2[y]',
        '#box2[height]'
      ]);

      // simple constraints
      // #box1 { width:== 100; height:== 100; } #box2 { width: == 100; height: == 100; }
      solver.eq('#box1[width]', 100);
      solver.eq('#box1[height]', 100);
      solver.eq('#box2[width]', 100);
      solver.eq('#box2[height]', 100);
      // make sure boxes are within viewport

      solver.lt('#box1[x]', solver.minus(VIEWPORT_WIDTH, '#box1[width]'));
      solver.lt('#box1[y]', solver.minus(VIEWPORT_HEIGHT, '#box1[height]'));
      solver.lt('#box2[x]', solver.minus(VIEWPORT_WIDTH, '#box2[width]'));
      solver.lt('#box2[y]', solver.minus(VIEWPORT_HEIGHT, '#box2[height]'));

      // VIEWPORT_WIDTH / 2
      let VIEWPORT_MIDDLE_WIDTH = FLOOR(VIEWPORT_WIDTH / 2);

      // #box1[right] == :window[center-x] - 10;
      // so: #box1[x] + #box[width] + 10 == VIEWPORT_MIDDLE_WIDTH
      solver.eq(solver.plus('#box1[x]', '#box1[width]'), VIEWPORT_MIDDLE_WIDTH - 10);

      // similar for #box2[left] == :window[center-x] + 10;
      solver.eq(VIEWPORT_MIDDLE_WIDTH + 10, '#box2[x]');

      // #box1[center-y] == #box2[center-y] == ::window[center-y];
      // center-y = height/2 -> y=(height/2)-(box_height/2)
      let VIEWPORT_MIDDLE_HEIGHT = FLOOR(VIEWPORT_HEIGHT / 2);
      solver.minus(VIEWPORT_MIDDLE_HEIGHT, solver.div('#box1[height]', 2), '#box1[y]');
      solver.minus(VIEWPORT_MIDDLE_HEIGHT, solver.div('#box2[height]', 2), '#box2[y]');

      let solutions = solver.solve({max: 3});

      // viewport is 1200 x 800
      // boxes are 100x100
      // box1 is 10 left to center so box1.x = 1200/2-110=490
      // box2 is 10 right of center so box2.x = 1200/2+10=610
      // box1 and box2 are vertically centered, same height so same y: (800/2)-(100/2)=350

      expect(strip_anon_vars_a(solutions)).to.eql([{
        '#box1[x]': 490, // 490+100+10=600=1200/2
        '#box1[width]': 100,
        '#box1[y]': 350,
        '#box1[height]': 100,
        '#box2[x]': 610,
        '#box2[width]': 100,
        '#box2[y]': 350,
        '#box2[height]': 100
      }]);

      expect(solutions.length).to.equal(1);
    });
  });

  describe('continue solved space', function() {

    it('should be able to continue a solution with extra vars', function () {
      let solver = new Solver({});

      solver.addVar('A', spec_d_create_range(2, 5));
      solver.addVar('B', spec_d_create_ranges([2, 2], [4, 5]));
      solver.addVar('C', spec_d_create_range(1, 5));
      solver['<']('A', 'B');

      // should find a solution (there are three or four or whatever)
      solver.solve({
        vars: ['A', 'B'],
        max: 1
      });
      expect(solver.solutions.length, 'solve count 1').to.eql(1);
      // should not solve C yet because only A and B were targeted
      expect(solver.solutions[0].C).to.eql([1, 5]);

      let solver2 = solver.branch_from_current_solution();
      // add a new constraint to the space and solve it
      solver2['<']('C', 'A');

      // C could be either 1 or 2 to pass all the constraints
      solver2.solve({
        vars: ['A', 'B', 'C'],
        max: 1
      });
      expect(solver2.solutions.length, 'solve count 1').to.eql(1);
      expect(solver2.solutions[0].C < solver2.solutions[0].B).to.equal(true);
    })
  });
});
