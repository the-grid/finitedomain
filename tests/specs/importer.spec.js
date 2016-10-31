let problems = [`






## constraint problem export

@var strat = {"_class":"$var_strat_config","type":"naive","inverted":false}

@val strat = min

: v0 = [5 5] alias(STATE)
: v1 = [0 100] alias(V1) @markov legend(10,100) matrix([{vector:[1,0],_boolVarIndex:2},{vector:[0,1]}])
: v2 = [0 1]
: v3 = [5 5]
: v4 = [0 100] alias(V2) @markov legend(10,100) matrix([{vector:[1,0],_boolVarIndex:5},{vector:[0,1]}])
: v5 = [0 1]
: v6 = [100 100]

v2 = v0 ==? v3                 # initial: [0 1] ?= [5 5] == [5 5]
markov(v1)                     # initial: markov([0 100])
v5 = v0 ==? v6                 # initial: [0 1] ?= [5 5] == [100 100]
markov(v4)                     # initial: markov([0 100])

@targets = all

## end of export
`,`
: v0 = [1 1]
: v1 = [1 1] alias(_ROOT_BRANCH_)
: v2 = [1 1] alias(SECTION)
: v3 = [2 2]
: v4 = [3 3]
: v5 = [5 5]
: v6 = [6 6]
: v7 = [[1 3] [5 6]] alias(VERSE_INDEX)
: v8 = [4 4]
: v9 = [1 5] alias(ITEM_INDEX)
: v10 = [7 7]
: v11 = [8 8]
: v12 = [[1 1] [3 8]] alias(width) @list prio(3 1 2 4 5 6 7 8)
: v13 = [1 2] alias(color)
: v14 = [1 2] alias(post_type)
: v15 = [1 2] alias(state)
: v16 = [1 1] alias(SECTION&n=1)
: v17 = [1 6] alias(VERSE_INDEX&n=1)
: v18 = [1 6] alias(ITEM_INDEX&n=1)
: v19 = [[1 1] [3 8]] alias(width&n=1) @list prio(3 1 2 4 5 6 7 8)
`];

import expect from '../fixtures/mocha_proxy.fixt';
import Solver from '../../src/solver';
import importer from '../../src/importer';
import {
  SUB,
  SUP,
} from '../../src/helpers';

// each test is an array [desc:string, result:Solver, tests:string]
//
// the solver should be configured to the result of the tests. a deep
// comparison will be made with the result and this solver.
//
// the tests string is preprocessed to remove anything up to and
// including the first newline and anything after and including the
// last newline, If a line is only whitespace plus |-- then the
// while line (including surrounded newlines) is stripped. This way
// you can declare multiple whitespace test cases for the same
// output with backticks.

let units = [
  '- vars',
  [
    'basic whitespace tests',
    s => s.decl('A', [0, 1]),
    `
: A [0 1]
|--
 : A [0 1]
|--
  : A [0 1]
|--

: A [0 1]
|--
: A [0 1]

|--

: A [0 1]

|--
: A [0 1]${' '}
    `,
  ],

  '  - var names',
  [
    'simple var decl with range one pair',
    s => s.declRange('A', 1, 2),
    `
      : A [0 1]
      |--
      : foobar [0 1]
      |--
      : anything@goes [0 1]
      |--
      : even_weird!@##$%&^&chars [0 1]
      |--
      : andnum63r50987654321aswell [0 1]
    `,
  ],

  '  - domain',
  [
    'simple var decl with range one pair',
    s => s.declRange('A', 1, 2),
    `
    : A [1 2]
    |--
    : A [ 1 2]
    |--
    : A [1 2 ]
    |--
    : A [1  2]
    |--
    : A [ 1 2 ]
    |--
     : A [1 2]
    |--
    :  A [1 2]
    |--
    :   A   [ 1 2 ]
    |--
    : A [0 0]
    |--
    : A [100 100]
    `,
  ],
  [
    'simple var decl with range multiple pairs',
    s => s.decl('A', [0, 1, 10, 20, 100, 3000]),
    `
    : A [[0 1] [10 20] [100 3000]]
    |--
    : A [[0 1] [10 20] [100 3000]]
    |--
    : A [ [0 1] [10 20] [100 3000]]
    |--
    : A [[ 0 1] [10 20 ] [ 100 3000]]
    |--
    : A [[ 0 1 ] [ 10 20 ] [ 100 3000]]
    |--
    : A [[ 0 1] [10 20 ] [100 3000]]
    |--
    : A [[ 0 1] [10 20 ] [ 100 3000]]
    `,
  ],
  [
    'wide domain',
    s => s.declRange('A', SUB, SUP),
    `
    : A [*]
    |--
    : A [ *]
    |--
    : A [* ]
    |--
    : A [ * ]
    `,
  ],

  '  - alias',
  [
    'single alias',
    // TODO: unable to test this as finitedomain currently doesn't really support this
    // for now just check that the parser doesnt blow up
    s => true,
    `
    : A [0 1] alias(foo)
    |--
    : A [0 1] alias(hello#world)
    |--
    : A [0 1] alias(foo=bar)
    |--
    : A [0 1] alias(@markov)
    |--
    : A [0 1]    alias(foo)
    `
  ],
  [
    '  - var with priority list',
    s => s.decl('A', [0, 10], {valtype: 'list', list: [5, 8, 10, 1]}),
    `
    : A [0 10] @list prio(5 8 10 1)
    |--
    : A [0 10] @list prio(5  8 10 1)
    |--
    : A [0 10] @list prio(5, 8, 10, 1)
    |--
    : A [0 10] @list prio(5, 8 10, 1)
    |--
    : A [0 10] @list prio( 5, 8 10, 1 )
    |--
    : A [0 10] @list   prio(5 8 10 1)
    `
  ],
  [
    '  - var with markov distribution with normal matrix and legend in any order',
    s => s.decl('A', [0, 10], {valtype: 'markov', matrix: [{vector: [1, 0]}]}),
    `
    : A [0 10] @markov matrix([{vector: [10, 1]}]) legend(1, 0)
    |--
    : A [0 10] @markov matrix([{vector: [10, 1]}]) legend(1 0)
    |--
    : A [0 10] @markov legend(1, 0) matrix([{vector: [10, 1]}])
    |--
    : A [0 10] @markov legend(1 0) matrix([{vector: [10, 1]}])
    `
  ],
  [
    '  - var with markov distribution with matrix and expand in any order',
    s => s.decl('A', [0, 10], {valtype: 'markov', matrix: [{vector: [1, 0]}], expandVectorsWith: 1}),
    `
    : A [0 10] @markov matrix([{vector: [10, 1]}]) expand(1)
    |--
    : A [0 10] @markov expand(1) matrix([{vector: [10, 1]}])
    `
  ],
  [
    '  - var with markov distribution with matrix, legend, and expand in any order',
    s => s.decl('A', [0, 10], {valtype: 'markov', matrix: [{vector: [1, 0]}], expandVectorsWith: 1}),
    `
    : A [0 10] @markov matrix([{vector: [10, 1]}]) legend(1) expand(1)
    |--
    : A [0 10] @markov matrix([{vector: [10, 1]}]) expand(1) legend(1)
    |--
    : A [0 10] @markov legend(1) matrix([{vector: [10, 1]}]) expand(1)
    |--
    : A [0 10] @markov expand(1) matrix([{vector: [10, 1]}]) legend(1)
    |--
    : A [0 10] @markov legend(1) expand(1) matrix([{vector: [10, 1]}])
    |--
    : A [0 10] @markov expand(1) legend(1) matrix([{vector: [10, 1]}])
    `
  ],
];

describe.only('importer', function() {
  let section = '';
  let n = 0;
  units.forEach((test , i) => {
    if (typeof test === 'string') return section = test;
    let desc = test[0];
    let expectFunc = test[1];
    let inputs = test[2];
    let n1 = inputs.indexOf('\n');
    let n2 = inputs.lastIndexOf('\n');
    if (n1 >= 0) inputs = inputs.slice(n1 + 1, n2);
    inputs = inputs.split(/\n\s*?\|\-\-.*?\n/g);

    it('should have proper test layout', function() {
      expect((n1 >= 0) === (n2 >= 0), 'either no newlines or have trimmable bumper lines').to.eql(true);
      expect(inputs.length, 'at least one test').to.be.above(0);
      expect(inputs.filter(x => x.indexOf('|--') >= 0), 'no separators').to.eql([]);
    });

    describe(desc, function() {
      let expectation;
      beforeEach(function() {
        let expectation = new Solver();
        expectFunc(expectation);
      });

      inputs.forEach(input => {
        ++n;
        //if (n !== 46) return;
        it('[test #' + n + '] input=`' + input + '`', function() {
          let output = importer(input);

          expect(output).to.eql(expectation);
        });
      });
    });
  });
});
