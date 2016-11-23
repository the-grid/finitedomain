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

let unitTests = [
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
    s => s.declRange('A', 0, 1),
    `
      : A [0 1]
    `,
  ],
  [
    'simple var decl with range one pair',
    s => s.declRange('foobar', 0, 1),
    `
      : foobar [0 1]
    `,
  ],
  [
    'simple var decl with range one pair',
    s => s.declRange('anything@goes', 0, 1),
    `
      : anything@goes [0 1]
    `,
  ],
  [
    'simple var decl with range one pair',
    s => s.declRange('even_weird!@##$%&^&chars', 0, 1),
    `
      : even_weird!@##$%&^&chars [0 1]
    `,
  ],
  [
    'simple var decl with range one pair',
    s => s.declRange('andnum63r50987654321aswell', 0, 1),
    `
      : andnum63r50987654321aswell [0 1]
    `,
  ],

  '  - quoted idents',
  [
    'simple quoted ident',
    s => s.declRange('A', 0, 1),
    `
      : 'A' [0 1]
    `,
  ],
  [
    'quoted ident otherwise illegal',
    s => s.declRange('[({#=]})', 0, 1),
    `
      : '[({#=]})' [0 1]
    `,
  ],
  [
    'quoted ident in constraint', // make sure constraints are parsed properly too...
    s => {
      s.declRange('[({#=]})', 0, 1);
      s.eq('[({#=]})', 0);
    },
    `
      : '[({#=]})' [0 1]
      '[({#=]})' == 0
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
    : A *
    |--
    : A  *
    |--
    : A * \t
    `,
  ],
  [
    'literal domains',
    s => s.declRange('A', SUB, SUP),
    `
    : A 15
    |--
    : A  1000
    |--
    : A 0 \t
    |--
    : A 100000000 \t
    `,
  ],
  [
    'empty domain',
    s => s.declRange('A', SUB, SUP),
    `
    : A []
    |--
    : A [ ]
    `,
  ],

  //'  - alias',
  //[
  //  'single alias',
  //  // TODO: unable to test this as finitedomain currently doesn't really support this
  //  // for now just check that the parser doesnt blow up
  //  s => true,
  //  `
  //  : A [0 1] alias(foo)
  //  |--
  //  : A [0 1] alias(hello#world)
  //  |--
  //  : A [0 1] alias(foo=bar)
  //  |--
  //  : A [0 1] alias(@markov)
  //  |--
  //  : A [0 1]    alias(foo)
  //  `,
  //],

  '  - list',
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
    `,
  ],

  '  - markov',
  [
    '  - var with markov distribution with normal matrix and legend in any order',
    s => s.decl('A', [0, 10], {valtype: 'markov', matrix: [{vector: [1, 0]}], legend: [1, 0]}),
    `
    : A [0 10] @markov matrix([{vector: [10, 1]}]) legend(1, 0)
    |--
    : A [0 10] @markov matrix([{vector: [10, 1]}]) legend(1 0)
    |--
    : A [0 10] @markov legend(1, 0) matrix([{vector: [10, 1]}])
    |--
    : A [0 10] @markov legend(1 0) matrix([{vector: [10, 1]}])
    `,
  ],
  [
    '  - var with markov distribution with matrix and expand in any order',
    s => s.decl('A', [0, 10], {valtype: 'markov', matrix: [{vector: [1, 0]}], expandVectorsWith: 1}),
    `
    : A [0 10] @markov matrix([{vector: [10, 1]}]) expand(1)
    |--
    : A [0 10] @markov expand(1) matrix([{vector: [10, 1]}])
    `,
  ],
  [
    '  - var with markov distribution with matrix, legend, and expand in any order',
    s => s.decl('A', [0, 10], {valtype: 'markov', matrix: [{vector: [1, 0]}], legend: [1], expandVectorsWith: 1}),
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
    `,
  ],

  '- constraint',

  '  - distinct',
  [
    'simple distincts',
    s => {
      s.declRange('A', 0, 10);
      s.declRange('B', 0, 10);
      s.declRange('C', 0, 10);
      s.distinct(['A', 'B', 'C']);
    },
    `
    : A [0 10]
    : B [0 10]
    : C [0 10]
    distinct(A B C)
    |--
    : A [0 10]
    : B [0 10]
    : C [0 10]
    distinct( A, B C)
    `,
  ],
  [
    'distinct with one constant',
    s => {
      s.declRange('A', 0, 10);
      s.declRange('B', 0, 10);
      s.distinct(['A', 5, 'B']);
    },
    `
    : A [0 10]
    : B [0 10]
    distinct(A 5 B)
    |--
    : A [0 10]
    : B [0 10]
    distinct( A, 5 B)
    `,
  ],
  [
    'distinct with two constants',
    s => {
      s.declRange('A', 0, 10);
      s.distinct([3, 'A', 8]);
    },
    `
    : A [0 10]
    distinct( 3 A 8)
    |--
    : A [0 10]
    distinct( 3, A 8 )
    `,
  ],
  [
    'distinct with one var',
    s => {
      s.declRange('A', 0, 10);
      s.distinct(['A']);
    },
    `
    : A [0 10]
    distinct(A)
    `,
  ],
  [
    'distinct with two vars',
    s => {
      s.declRange('A', 0, 10);
      s.declRange('B', 0, 10);
      s.distinct(['A', 'B']);
    },
    `
    : A [0 10]
    : B [0 10]
    distinct(A B)
    |--
    : A [0 10]
    : B [0 10]
    distinct(A ,B)
    `,
  ],

  '  - simply cops',
  ...[
    ['==', 'eq'],
    ['!=', 'neq'],
    ['<', 'lt'],
    ['<=', 'lte'],
    ['>', 'gt'],
    ['>=', 'gte'],
  ].reduce((arr, [opSymbol, methodName]) => {
    arr.push(
      '    - method=' + methodName,
      [
        'simple var args',
        s => {
          s.declRange('A', 0, 1);
          s.declRange('B', 0, 1);
          s[methodName]('A', 'B');
        },
        `
        : A [0 1]
        : B [0 1]
        A ${opSymbol} B
        `,
      ],
      [
        'var and constant args',
        s => {
          s.declRange('A', 0, 1);
          s[methodName]('A', 5);
        },
        `
        : A [0 1]
        A ${opSymbol} 5
        `,
      ],
      [
        'constant and var args',
        s => {
          s.declRange('B', 0, 1);
          s[methodName](5, 'B');
        },
        `
        : B [0 1]
        5 ${opSymbol} B
        `,
      ],
      [
        'two constants',
        s => {
          s[methodName](5, 5);
        },
        `
        5 ${opSymbol} 5
        `,
      ],
      [
        'domain literal left',
        s => {
          s.declRange('A', 1, 10);
          s[methodName](s.declRange(undefined, 0, 1), 'A');
        },
        `
        : A [1 10]
        [0 1] ${opSymbol} A
        `,
      ],
      [
        'domain literal right',
        s => {
          s.declRange('A', 1, 10);
          s[methodName]('A', s.declRange(undefined, 0, 1));
        },
        `
        : A [1 10]
        A ${opSymbol} [0 1]
        `,
      ]
    );
    return arr;
  }, []),

  '  - simple assignments',
  ...[
    ['==?', 'isEq'],
    ['!=?', 'isNeq'],
    ['<?', 'isLt'],
    ['<=?', 'isLte'],
    ['>?', 'isGt'],
    ['>=?', 'isGte'],
  ].reduce((arr, [opSymbol, methodName]) => {
    arr.push(
      [
        'assignment with vars',
        s => {
          s.declRange('A', 0, 1);
          s.declRange('B', 0, 1);
          s.declRange('C', 0, 1);
          s[methodName]('A', 'B', 'C');
        },
        `
        : A [0 1]
        : B [0 1]
        : C [0 1]
        C = A ${opSymbol} B
        `,
      ],
      [
        'assignment where A is a constant',
        s => {
          s.declRange('B', 0, 1);
          s.declRange('C', 0, 1);
          s[methodName](5, 'B', 'C');
        },
        `
        : B [0 1]
        : C [0 1]
        C = 5 ${opSymbol} B
        `,
      ],
      [
        'assignment where B is a constant',
        s => {
          s.declRange('A', 0, 1);
          s.declRange('C', 0, 1);
          s[methodName]('A', 5, 'C');
        },
        `
        : A [0 1]
        : C [0 1]
        C = A ${opSymbol} 5
        `,
      ],
      [
        'assignment where C is a constant',
        s => {
          s.declRange('A', 0, 1);
          s.declRange('B', 0, 1);
          s[methodName]('A', 'B', 1);
        },
        `
        : A [0 1]
        : B [0 1]
        1 = A ${opSymbol} B
        `,
      ],
      [
        'assignment where A and B are constants',
        s => {
          s.declRange('C', 0, 1);
          s[methodName](5, 8, 'C');
        },
        `
        : C [0 1]
        C = 5 ${opSymbol} 8
        `,
      ],
      [
        'assignment where B and C are constants',
        s => {
          s.declRange('A', 0, 1);
          s[methodName]('A', 8, 1);
        },
        `
        : A [0 1]
        1 = A ${opSymbol} 8
        `,
      ],
      [
        'assignment where A and C are constants',
        s => {
          s.declRange('B', 0, 1);
          s[methodName](4, 'B', 1);
        },
        `
        : B [0 1]
        1 = 4 ${opSymbol} B
        `,
      ],
      [
        'assignment with only constants',
        s => {
          s[methodName](4, 4, 1);
        },
        `
        1 = 4 ${opSymbol} 4
        `,
      ],
      [
        'assignment where C explicit',
        s => {
          s.declRange('A', 0, 1);
          s.declRange('B', 0, 1);
          s.declRange('C', 0, 1);
          s.eq(s[methodName]('A', 'B', 'C'), s.decl(undefined, [0, 1]));
        },
        `
        : A [0 1]
        : B [0 1]
        C = A ${opSymbol} B
        C == [0 1]
        `,
      ],
      [
        'assignment where C implicit',
        s => {
          s.declRange('A', 0, 1);
          s.declRange('B', 0, 1);
          s.eq(s[methodName]('A', 'B'), s.decl(undefined, [0, 1]));
        },
        `
        : A [0 1]
        : B [0 1]
        C = A ${opSymbol} B
        C == [0 1]
        `,
      ]
    );
    return arr;
  }, []),

  '  - groups',
  ...[
    ['==?', 'isEq'],
    ['!=?', 'isNeq'],
    ['<?', 'isLt'],
    ['<=?', 'isLte'],
    ['>?', 'isGt'],
    ['>=?', 'isGte'],
  ].reduce((arr, [opSymbol, methodName]) => {
    arr.push(
      [
        '    - unnecessary group',
        s => {
          s.declRange('A', 0, 1);
          s.declRange('B', 0, 10);
          s.declRange('C', 0, 10);
          s[methodName]('B', 'C', 'A');
        },
        `
        : A [0 1]
        : B [0 10]
        : C [0 10]
        (A) = B ${opSymbol} C
        |--
        : A [0 1]
        : B [0 10]
        : C [0 10]
        A = (B) ${opSymbol} C
        |--
        : A [0 1]
        : B [0 10]
        : C [0 10]
        A = B ${opSymbol} (C)
        `,
      ],
      [
        '    - nested reifier left',
        s => {
          s.declRange('A', 0, 1);
          s.declRange('B', 0, 10);
          s.declRange('C', 0, 10);
          s.declRange('D', 0, 10);
          s[methodName](s[methodName]('B', 'C'), 'D', 'A');
        },
        `
        : A [0 1]
        : B [0 10]
        : C [0 10]
        : D [0 10]
        A = (B ${opSymbol} C) ${opSymbol} D
        `,
      ],
      [
        '    - nested reifier right',
        s => {
          s.declRange('A', 0, 1);
          s.declRange('B', 0, 3);
          s.declRange('C', 0, 3);
          s.declRange('D', 0, 3);
          s[methodName]('B', s[methodName]('C', 'D'), 'A');
        },
        `
        : A [0 1]
        : B [0 3]
        : C [0 3]
        : D [0 3]
        A = B ${opSymbol} (C ${opSymbol} D)
        |--
        : A [0 1]
        : B [0 3]
        : C [0 3]
        : D [0 3]
        A = (B ${opSymbol} (C ${opSymbol} D))
        `,
      ],
      [
        '    - nested reifier result',
        s => {
          s.declRange('A', 0, 3);
          s.declRange('B', 0, 3);
          s.declRange('C', 0, 3);
          s.declRange('D', 0, 3);
          s[methodName]('C', 'D', s[methodName]('A', 'B'));
        },
        `
        : A [0 3]
        : B [0 3]
        : C [0 3]
        : D [0 3]
        (A ${opSymbol} B) = (C ${opSymbol} D)
        |--
        : A [0 3]
        : B [0 3]
        : C [0 3]
        : D [0 3]
        (A ${opSymbol} B) = C ${opSymbol} D
        `,
      ],
      [
        '    - not to be confused with eq',
        s => {
          s.declRange('A', 0, 3);
          s.declRange('B', 0, 3);
          s.declRange('C', 0, 3);
          s.declRange('D', 0, 3);
          s.eq(s[methodName]('A', 'B'), s[methodName]('C', 'D'));
        },
        `
        : A [0 3]
        : B [0 3]
        : C [0 3]
        : D [0 3]
        (A ${opSymbol} B) == (C ${opSymbol} D)
        `,
      ]
    );
    return arr;
  }, []),

  ...['product', 'sum'].reduce((arr, op) => {
    arr.push(
      '  - ' + op,
      [
        'one arg',
        s => {
          s.declRange('A', 0, 10);
          s.declRange('S', 0, 100);
          s[op](['A'], 'S');
        },
        `
        : A [0 10]
        : S [0 100]
        S = ${op}(A)
        `,
      ],
      [
        'two args',
        s => {
          s.declRange('A', 0, 10);
          s.declRange('B', 0, 10);
          s.declRange('S', 0, 100);
          s[op](['A', 'B'], 'S');
        },
        `
        : A [0 10]
        : B [0 10]
        : S [0 100]
        S = ${op}(A B)
        `,
      ],
      [
        'three args',
        s => {
          s.declRange('A', 0, 10);
          s.declRange('B', 0, 10);
          s.declRange('C', 0, 10);
          s.declRange('S', 0, 100);
          s[op](['A', 'B', 'C'], 'S');
        },
        `
        : A [0 10]
        : B [0 10]
        : C [0 10]
        : S [0 100]
        S = ${op}(A B C)
        `,
      ],
      [
        'with a constant',
        s => {
          s.declRange('A', 0, 10);
          s.declRange('C', 0, 10);
          s.declRange('S', 0, 100);
          s[op](['A', 5, 'C'], 'S');
        },
        `
        : A [0 10]
        : C [0 10]
        : S [0 100]
        S = ${op}(A 5 C)
        `,
      ],
      [
        'only constants',
        s => {
          s.declRange('S', 0, 100);
          s[op]([1, 2, 3], 'S');
        },
        `
        : S [0 100]
        S = ${op}( 1 2 3)
        `,
      ],
      [
        'op=op with constants without result',
        s => {
          s.eq(s[op]([1, 2, 3]), s[op]([1, 2, 3]));
        },
        `
        ${op}(1 2 3) = ${op}( 1 2 3)
        `,
      ],
      [
        'op=op with vars',
        s => {
          s.declRange('A', 0, 10);
          s.declRange('B', 0, 10);
          s.declRange('C', 0, 10);
          s.declRange('D', 0, 10);
          s.declRange('E', 0, 10);
          s.declRange('F', 0, 10);
          s.eq(s[op](['A', 'B', 'C']), s[op](['D', 'E', 'F']));
        },
        `
        : A [0 10]
        : B [0 10]
        : C [0 10]
        : D [0 10]
        : E [0 10]
        : F [0 10]
        ${op}(A B C) = ${op}(D E F)
        `,
      ]
    );
    return arr;
  }, []),

  '- @rules',

  [
    'var-strat',
    s => {},
    `
    @custom var-strat {}
    |--
    @custom var-strat = {}
    `,
  ],
  [
    'val-strat',
    s => {},
    `
    @custom val-strat max
    |--
    @custom val-strat = max
    `,
  ],
  [
    'targets',
    s => {},
    `
    @targets all
    |--
    @targets = all
    `,
  ],
  [
    'targets',
    s => {},
    `
    @targets (A B C)
    |--
    @targets = (A B C)
    `,
  ],
  [
    'constraints mode',
    s => {},
    `
    @mode constraints
    : A [0 1]
    : B [0 1]
    C = A + B
    |--
    @mode = constraints
    : A [0 1]
    : B [0 1]
    C = A + B
    `,
  ],
  [
    'propagators mode',
    s => {},
    `
    @mode propagators
    : A [0 1]
    : B [0 1]
    C = A + B
    |--
    @mode = propagators
    : A [0 1]
    : B [0 1]
    C = A + B
    `,
  ],
];

describe('src/importer.spec', function() {

  // to focus on a specific unit test find the `test #xxx` number from the target test
  // below in the inner forEach, return unless the index isn't that number.
  describe('unit tests', function() {

    let COMPARE_RESULT = false; // this is too heavy so disable it. still good to check every now and then.

    let section = '';
    let n = 0;
    unitTests.forEach((test, i) => {
      if (typeof test === 'string') return section = test;
      let desc = test[0];
      let expectFunc = test[1];
      let inputs = test[2];
      let n1 = inputs.indexOf('\n');
      let n2 = inputs.lastIndexOf('\n');
      if (n1 >= 0) inputs = inputs.slice(n1 + 1, n2);
      inputs = inputs.split(/\n\s*?\|\-\-.*?\n/g);

      it(section + ' | ' + i + ' should have proper test layout', function() {
        expect((n1 >= 0) === (n2 >= 0), 'either no newlines or have trimmable bumper lines').to.eql(true);
        expect(inputs.length, 'at least one test').to.be.above(0);
        expect(inputs.filter(x => x.indexOf('|--') >= 0), 'no separators').to.eql([]);
      });

      describe(section + ' | ' + desc, function() {
        let expectation;
        before(function() {
          expectation = new Solver();
          expectFunc(expectation);
          if (COMPARE_RESULT) expectation = expectation.solve();
        });

        inputs.forEach(input => {
          let ok = false;
          ++n;
          if (n !== 230) return;
          it('[test #' + n + '] input=`' + input.replace(/[\n\r]/g, '\u23CE') + '`', function() {
            let output = importer(input);
            expect(output).to.be.an('object');
            if (COMPARE_RESULT) expect(output.solve()).to.eql(expectation);
            ok = true;
          });

          it('[test #' + n + '] with tabs', function() {
            if (!ok) return;
            let inputTabbed = input.replace(/ /g, '\t');
            let solver = importer(inputTabbed);
            expect(solver).to.be.an('object');
            if (COMPARE_RESULT) expect(solver.solve(), 'tabbed').to.eql(expectation);
          });

          it('[test #' + n + '] with padded newlines', function() {
            if (!ok) return;
            let inputNewlined = '\n\r\n' + input.replace(/([\r\n])/g, '$1\n\r\n') + '\n\r\n';
            let solver = importer(inputNewlined);
            expect(solver).to.be.an('object');
            if (COMPARE_RESULT) expect(solver.solve(), 'newlined').to.eql(expectation);
          });

          it('[test #' + n + '] with comment padding', function() {
            if (!ok) return;
            let inputCommented = input.replace(/([\n\r]|$)/g, _ => ' # foo!\n');
            let solver = importer(inputCommented);
            expect(solver).to.be.an('object');
            if (COMPARE_RESULT) expect(solver.solve(), 'padded1').to.eql(expectation);
          });

          it('[test #' + n + '] with whitespace padding', function() {
            if (!ok) return;
            let inputPadded = input.replace(/([)+*\/\[\],\n\r])/g, ' $1 ');
            let s = importer(inputPadded);
            expect(s).to.be.an('object');
            if (COMPARE_RESULT) expect(s.solve(), 'padded1').to.eql(expectation);

            let x = 0;
            let ip1 = inputPadded.replace(/ /g, _ => ++x % 2 === 0 ? ' ' : '\t');
            let s1 = importer(ip1);
            expect(s1).to.be.an('object');
            if (COMPARE_RESULT) expect(s1.solve(), 'padded1').to.eql(expectation);

            let ip2 = inputPadded.replace(/ /g, _ => ++x % 2 === 1 ? ' ' : '\t');
            let s2 = importer(ip2);
            expect(s2).to.be.an('object');
            if (COMPARE_RESULT) expect(s2.solve(), 'padded2').to.eql(expectation);
          });
        });
      });
    });
  });
});
