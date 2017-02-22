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

  '  - nall',
  [
    'simple nalls',
    s => {
      s.declRange('A', 0, 10);
      s.declRange('B', 0, 10);
      s.declRange('C', 0, 10);
      s.declRange('R', 0, 0);
      s.product(['A', 'B', 'C'], 'R');
    },
    `
    : A [0 10]
    : B [0 10]
    : C [0 10]
    : R [0 0]
    R = product(A B C)
    |--
    : A [0 10]
    : B [0 10]
    : C [0 10]
    nall(A B C)
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
  describe.skip('unit tests (heavy! dont enable for travis!)', function() {

    let COMPARE_RESULT = false; // this is too heavy so disable it. still good to check every now and then.
    let ONLY_TEST = 0;

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

      if (!ONLY_TEST) {
        it(section + ' | ' + i + ' should have proper test layout', function() {
          expect((n1 >= 0) === (n2 >= 0), 'either no newlines or have trimmable bumper lines').to.eql(true);
          expect(inputs.length, 'at least one test').to.be.above(0);
          expect(inputs.filter(x => x.indexOf('|--') >= 0), 'no separators').to.eql([]);
        });
      }

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

          if (ONLY_TEST && n !== ONLY_TEST) return;

          it('[test #' + n + '] input=`' + input.replace(/[\n\r]/g, '\u23CE') + '`', function() {
            let output = importer(input);
            expect(output).to.be.an('object');
            if (COMPARE_RESULT) expect(output.solve()).to.eql(expectation);
            ok = true;
          });

          if (ONLY_TEST) return;

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

  describe('regressions', function() {

    // skip: too heavy for code coverage :/
    it.skip('should not reduce SECTION to empty', function() {
      let dsl = `
: '_ROOT_BRANCH_' = [1,1]
: 'SECTION' = [1,1]
'SECTION' >= 1                    # [1,1] >= 1
'_ROOT_BRANCH_' == 1                    # ? == 1
: 'VERSE_INDEX' = [3,3]
'VERSE_INDEX' >= 1                    # [3,3] >= 1
'SECTION' == 1                    # ? == 1
: 'ITEM_INDEX' = [1,1]
'ITEM_INDEX' >= 1                    # [1,1] >= 1
'SECTION' == 1                    # ? == 1
: 'CLUSTER' = [1,3]
'CLUSTER' >= 1                    # [1,3] >= 1
'SECTION' == 1                    # ? == 1
: 'CLUSTER_START?' = [0,1]
: 'CLUSTER_END?' = [0,1]
: 'item' = [1,6]
'item' >= 1                    # [1,6] >= 1
'SECTION' == 1                    # ? == 1
: 'SECTION&n=1' = [1,1]
'SECTION&n=1' >= 1                    # [1,1] >= 1
'_ROOT_BRANCH_' == 1                    # ? == 1
: 'VERSE_INDEX&n=1' = [2,2]
'VERSE_INDEX&n=1' >= 1                    # [2,2] >= 1
'SECTION&n=1' == 1                    # ? == 1
: 'ITEM_INDEX&n=1' = [2,2]
'ITEM_INDEX&n=1' >= 1                    # [2,2] >= 1
'SECTION&n=1' == 1                    # ? == 1
: 'CLUSTER&n=1' = [1,3]
'CLUSTER&n=1' >= 1                    # [1,3] >= 1
'SECTION&n=1' == 1                    # ? == 1
: 'CLUSTER_START?&n=1' = [0,1]
: 'CLUSTER_END?&n=1' = [0,1]
: 'item&n=1' = [1,6]
'item&n=1' >= 1                    # [1,6] >= 1
'SECTION&n=1' == 1                    # ? == 1
: 'SECTION&n=2' = [1,1]
'SECTION&n=2' >= 1                    # [1,1] >= 1
'_ROOT_BRANCH_' == 1                    # ? == 1
: 'VERSE_INDEX&n=2' = [6,6]
'VERSE_INDEX&n=2' >= 1                    # [6,6] >= 1
'SECTION&n=2' == 1                    # ? == 1
: 'ITEM_INDEX&n=2' = [3,3]
'ITEM_INDEX&n=2' >= 1                    # [3,3] >= 1
'SECTION&n=2' == 1                    # ? == 1
: 'CLUSTER&n=2' = [1,3]
'CLUSTER&n=2' >= 1                    # [1,3] >= 1
'SECTION&n=2' == 1                    # ? == 1
: 'CLUSTER_START?&n=2' = [0,1]
: 'CLUSTER_END?&n=2' = [0,1]
: 'item&n=2' = [1,6]
'item&n=2' >= 1                    # [1,6] >= 1
'SECTION&n=2' == 1                    # ? == 1
: 'SECTION&n=3' = [1,1]
'SECTION&n=3' >= 1                    # [1,1] >= 1
'_ROOT_BRANCH_' == 1                    # ? == 1
: 'VERSE_INDEX&n=3' = [1,1]
'VERSE_INDEX&n=3' >= 1                    # [1,1] >= 1
'SECTION&n=3' == 1                    # ? == 1
: 'ITEM_INDEX&n=3' = [4,4]
'ITEM_INDEX&n=3' >= 1                    # [4,4] >= 1
'SECTION&n=3' == 1                    # ? == 1
: 'CLUSTER&n=3' = [1,3]
'CLUSTER&n=3' >= 1                    # [1,3] >= 1
'SECTION&n=3' == 1                    # ? == 1
: 'CLUSTER_START?&n=3' = [0,1]
: 'CLUSTER_END?&n=3' = [0,1]
: 'item&n=3' = [1,6]
'item&n=3' >= 1                    # [1,6] >= 1
'SECTION&n=3' == 1                    # ? == 1
: 'SECTION&n=4' = [1,1]
'SECTION&n=4' >= 1                    # [1,1] >= 1
'_ROOT_BRANCH_' == 1                    # ? == 1
: 'VERSE_INDEX&n=4' = [5,5]
'VERSE_INDEX&n=4' >= 1                    # [5,5] >= 1
'SECTION&n=4' == 1                    # ? == 1
: 'ITEM_INDEX&n=4' = [5,5]
'ITEM_INDEX&n=4' >= 1                    # [5,5] >= 1
'SECTION&n=4' == 1                    # ? == 1
: 'CLUSTER&n=4' = [1,3]
'CLUSTER&n=4' >= 1                    # [1,3] >= 1
'SECTION&n=4' == 1                    # ? == 1
: 'CLUSTER_START?&n=4' = [0,1]
: 'CLUSTER_END?&n=4' = [0,1]
: 'item&n=4' = [1,6]
'item&n=4' >= 1                    # [1,6] >= 1
'SECTION&n=4' == 1                    # ? == 1
: 'SECTION&n=5' = [1,1]
'SECTION&n=5' >= 1                    # [1,1] >= 1
'_ROOT_BRANCH_' == 1                    # ? == 1
: 'VERSE_INDEX&n=5' = [4,4]
'VERSE_INDEX&n=5' >= 1                    # [4,4] >= 1
'SECTION&n=5' == 1                    # ? == 1
: 'ITEM_INDEX&n=5' = [6,6]
'ITEM_INDEX&n=5' >= 1                    # [6,6] >= 1
'SECTION&n=5' == 1                    # ? == 1
: 'CLUSTER&n=5' = [1,3]
'CLUSTER&n=5' >= 1                    # [1,3] >= 1
'SECTION&n=5' == 1                    # ? == 1
: 'CLUSTER_START?&n=5' = [0,1]
: 'CLUSTER_END?&n=5' = [0,1]
: 'item&n=5' = [1,6]
'item&n=5' >= 1                    # [1,6] >= 1
'SECTION&n=5' == 1                    # ? == 1
distinct('ITEM_INDEX','ITEM_INDEX&n=1','ITEM_INDEX&n=2','ITEM_INDEX&n=3','ITEM_INDEX&n=4','ITEM_INDEX&n=5')                    # distinct([1,1],[2,2],[3,3],[4,4],[5,5],[6,6])
distinct('item','item&n=1','item&n=2','item&n=3','item&n=4','item&n=5')                    # distinct(?,?,?,?,?,?)
'anon_1' = 'CLUSTER' ==? 1                    # ? = [1,3] ==? 1
'anon_2' = 'CLUSTER&n=1' ==? 1                    # ? = [1,3] ==? 1
'anon_3' = 'CLUSTER&n=2' ==? 1                    # ? = [1,3] ==? 1
'anon_4' = 'CLUSTER&n=3' ==? 1                    # ? = [1,3] ==? 1
'anon_5' = 'CLUSTER&n=4' ==? 1                    # ? = [1,3] ==? 1
'anon_6' = 'CLUSTER&n=5' ==? 1                    # ? = [1,3] ==? 1
'anon_7' = 'CLUSTER' ==? 2                    # ? = [1,3] ==? 2
'anon_8' = 'CLUSTER&n=1' ==? 2                    # ? = [1,3] ==? 2
'anon_9' = 'CLUSTER&n=2' ==? 2                    # ? = [1,3] ==? 2
'anon_10' = 'CLUSTER&n=3' ==? 2                    # ? = [1,3] ==? 2
'anon_11' = 'CLUSTER&n=4' ==? 2                    # ? = [1,3] ==? 2
'anon_12' = 'CLUSTER&n=5' ==? 2                    # ? = [1,3] ==? 2
'anon_13' = 'CLUSTER' ==? 3                    # ? = [1,3] ==? 3
'anon_14' = 'CLUSTER&n=1' ==? 3                    # ? = [1,3] ==? 3
'anon_15' = 'CLUSTER&n=2' ==? 3                    # ? = [1,3] ==? 3
'anon_16' = 'CLUSTER&n=3' ==? 3                    # ? = [1,3] ==? 3
'anon_17' = 'CLUSTER&n=4' ==? 3                    # ? = [1,3] ==? 3
'anon_18' = 'CLUSTER&n=5' ==? 3                    # ? = [1,3] ==? 3
'anon_7' == 1                    # ? == 1
'anon_6' == 0                    # ? == 0
'anon_19' = 'CLUSTER_START?' ==? 1                    # ? = [0,1] ==? 1
'anon_20' = 'CLUSTER_START?&n=1' ==? 1                    # ? = [0,1] ==? 1
'anon_21' = 'CLUSTER_START?&n=2' ==? 1                    # ? = [0,1] ==? 1
'anon_22' = 'CLUSTER_START?&n=3' ==? 1                    # ? = [0,1] ==? 1
'anon_23' = 'CLUSTER_START?&n=4' ==? 1                    # ? = [0,1] ==? 1
'anon_24' = 'CLUSTER_START?&n=5' ==? 1                    # ? = [0,1] ==? 1
'anon_25' = sum('anon_19','anon_1')                    # ? = sum(?,?)
'anon_26' = 'anon_25' ==? 2                    # ? = ? ==? 2
'anon_27' = sum('anon_20','anon_2')                    # ? = sum(?,?)
'anon_28' = 'anon_27' ==? 2                    # ? = ? ==? 2
'anon_29' = sum('anon_21','anon_3')                    # ? = sum(?,?)
'anon_30' = 'anon_29' ==? 2                    # ? = ? ==? 2
'anon_31' = sum('anon_22','anon_4')                    # ? = sum(?,?)
'anon_32' = 'anon_31' ==? 2                    # ? = ? ==? 2
'anon_33' = sum('anon_23','anon_5')                    # ? = sum(?,?)
'anon_34' = 'anon_33' ==? 2                    # ? = ? ==? 2
'anon_35' = sum('anon_24','anon_6')                    # ? = sum(?,?)
'anon_36' = 'anon_35' ==? 2                    # ? = ? ==? 2
'anon_37' = 'CLUSTER_END?' ==? 1                    # ? = [0,1] ==? 1
'anon_38' = 'CLUSTER_END?&n=1' ==? 1                    # ? = [0,1] ==? 1
'anon_39' = 'CLUSTER_END?&n=2' ==? 1                    # ? = [0,1] ==? 1
'anon_40' = 'CLUSTER_END?&n=3' ==? 1                    # ? = [0,1] ==? 1
'anon_41' = 'CLUSTER_END?&n=4' ==? 1                    # ? = [0,1] ==? 1
'anon_42' = 'CLUSTER_END?&n=5' ==? 1                    # ? = [0,1] ==? 1
'anon_43' = 'anon_37' ==? 0                    # ? = ? ==? 0
'anon_44' = 'anon_38' ==? 0                    # ? = ? ==? 0
'anon_45' = 'anon_39' ==? 0                    # ? = ? ==? 0
'anon_46' = 'anon_40' ==? 0                    # ? = ? ==? 0
'anon_47' = 'anon_41' ==? 0                    # ? = ? ==? 0
'anon_48' = 'anon_42' ==? 0                    # ? = ? ==? 0
'anon_49' = sum('anon_1','anon_43')                    # ? = sum(?,?)
'anon_50' = 'anon_49' ==? 2                    # ? = ? ==? 2
'anon_51' = sum('anon_2','anon_44')                    # ? = sum(?,?)
'anon_52' = 'anon_51' ==? 2                    # ? = ? ==? 2
'anon_53' = sum('anon_3','anon_45')                    # ? = sum(?,?)
'anon_54' = 'anon_53' ==? 2                    # ? = ? ==? 2
'anon_55' = sum('anon_4','anon_46')                    # ? = sum(?,?)
'anon_56' = 'anon_55' ==? 2                    # ? = ? ==? 2
'anon_57' = sum('anon_5','anon_47')                    # ? = sum(?,?)
'anon_58' = 'anon_57' ==? 2                    # ? = ? ==? 2
'anon_59' = sum('anon_6','anon_48')                    # ? = sum(?,?)
'anon_60' = 'anon_59' ==? 2                    # ? = ? ==? 2
'anon_61' = sum('anon_37','anon_1')                    # ? = sum(?,?)
'anon_62' = 'anon_61' ==? 2                    # ? = ? ==? 2
'anon_63' = sum('anon_38','anon_2')                    # ? = sum(?,?)
'anon_64' = 'anon_63' ==? 2                    # ? = ? ==? 2
'anon_65' = sum('anon_39','anon_3')                    # ? = sum(?,?)
'anon_66' = 'anon_65' ==? 2                    # ? = ? ==? 2
'anon_67' = sum('anon_40','anon_4')                    # ? = sum(?,?)
'anon_68' = 'anon_67' ==? 2                    # ? = ? ==? 2
'anon_69' = sum('anon_41','anon_5')                    # ? = sum(?,?)
'anon_70' = 'anon_69' ==? 2                    # ? = ? ==? 2
'anon_71' = sum('anon_42','anon_6')                    # ? = sum(?,?)
'anon_72' = 'anon_71' ==? 2                    # ? = ? ==? 2
'anon_73' = sum('anon_19','anon_7')                    # ? = sum(?,?)
'anon_74' = 'anon_73' ==? 2                    # ? = ? ==? 2
'anon_75' = sum('anon_20','anon_8')                    # ? = sum(?,?)
'anon_76' = 'anon_75' ==? 2                    # ? = ? ==? 2
'anon_77' = sum('anon_21','anon_9')                    # ? = sum(?,?)
'anon_78' = 'anon_77' ==? 2                    # ? = ? ==? 2
'anon_79' = sum('anon_22','anon_10')                    # ? = sum(?,?)
'anon_80' = 'anon_79' ==? 2                    # ? = ? ==? 2
'anon_81' = sum('anon_23','anon_11')                    # ? = sum(?,?)
'anon_82' = 'anon_81' ==? 2                    # ? = ? ==? 2
'anon_83' = sum('anon_24','anon_12')                    # ? = sum(?,?)
'anon_84' = 'anon_83' ==? 2                    # ? = ? ==? 2
'anon_85' = sum('anon_7','anon_43')                    # ? = sum(?,?)
'anon_86' = 'anon_85' ==? 2                    # ? = ? ==? 2
'anon_87' = sum('anon_8','anon_44')                    # ? = sum(?,?)
'anon_88' = 'anon_87' ==? 2                    # ? = ? ==? 2
'anon_89' = sum('anon_9','anon_45')                    # ? = sum(?,?)
'anon_90' = 'anon_89' ==? 2                    # ? = ? ==? 2
'anon_91' = sum('anon_10','anon_46')                    # ? = sum(?,?)
'anon_92' = 'anon_91' ==? 2                    # ? = ? ==? 2
'anon_93' = sum('anon_11','anon_47')                    # ? = sum(?,?)
'anon_94' = 'anon_93' ==? 2                    # ? = ? ==? 2
'anon_95' = sum('anon_12','anon_48')                    # ? = sum(?,?)
'anon_96' = 'anon_95' ==? 2                    # ? = ? ==? 2
'anon_97' = sum('anon_37','anon_7')                    # ? = sum(?,?)
'anon_98' = 'anon_97' ==? 2                    # ? = ? ==? 2
'anon_99' = sum('anon_38','anon_8')                    # ? = sum(?,?)
'anon_100' = 'anon_99' ==? 2                    # ? = ? ==? 2
'anon_101' = sum('anon_39','anon_9')                    # ? = sum(?,?)
'anon_102' = 'anon_101' ==? 2                    # ? = ? ==? 2
'anon_103' = sum('anon_40','anon_10')                    # ? = sum(?,?)
'anon_104' = 'anon_103' ==? 2                    # ? = ? ==? 2
'anon_105' = sum('anon_41','anon_11')                    # ? = sum(?,?)
'anon_106' = 'anon_105' ==? 2                    # ? = ? ==? 2
'anon_107' = sum('anon_42','anon_12')                    # ? = sum(?,?)
'anon_108' = 'anon_107' ==? 2                    # ? = ? ==? 2
'anon_109' = 'item' ==? 3                    # ? = [1,6] ==? 3
'anon_110' = 'item&n=1' ==? 3                    # ? = [1,6] ==? 3
'anon_111' = 'item&n=2' ==? 3                    # ? = [1,6] ==? 3
'anon_112' = 'item&n=3' ==? 3                    # ? = [1,6] ==? 3
'anon_113' = 'item&n=4' ==? 3                    # ? = [1,6] ==? 3
'anon_114' = 'item&n=5' ==? 3                    # ? = [1,6] ==? 3
'anon_109' == 'anon_7'                    # ? == ?
'anon_110' == 'anon_8'                    # ? == ?
'anon_111' == 'anon_9'                    # ? == ?
'anon_112' == 'anon_10'                    # ? == ?
'anon_113' == 'anon_11'                    # ? == ?
'anon_114' == 'anon_12'                    # ? == ?
'anon_115' = sum('anon_19','anon_13')                    # ? = sum(?,?)
'anon_116' = 'anon_115' ==? 2                    # ? = ? ==? 2
'anon_117' = sum('anon_20','anon_14')                    # ? = sum(?,?)
'anon_118' = 'anon_117' ==? 2                    # ? = ? ==? 2
'anon_119' = sum('anon_21','anon_15')                    # ? = sum(?,?)
'anon_120' = 'anon_119' ==? 2                    # ? = ? ==? 2
'anon_121' = sum('anon_22','anon_16')                    # ? = sum(?,?)
'anon_122' = 'anon_121' ==? 2                    # ? = ? ==? 2
'anon_123' = sum('anon_23','anon_17')                    # ? = sum(?,?)
'anon_124' = 'anon_123' ==? 2                    # ? = ? ==? 2
'anon_125' = sum('anon_24','anon_18')                    # ? = sum(?,?)
'anon_126' = 'anon_125' ==? 2                    # ? = ? ==? 2
'anon_127' = sum('anon_13','anon_43')                    # ? = sum(?,?)
'anon_128' = 'anon_127' ==? 2                    # ? = ? ==? 2
'anon_129' = sum('anon_14','anon_44')                    # ? = sum(?,?)
'anon_130' = 'anon_129' ==? 2                    # ? = ? ==? 2
'anon_131' = sum('anon_15','anon_45')                    # ? = sum(?,?)
'anon_132' = 'anon_131' ==? 2                    # ? = ? ==? 2
'anon_133' = sum('anon_16','anon_46')                    # ? = sum(?,?)
'anon_134' = 'anon_133' ==? 2                    # ? = ? ==? 2
'anon_135' = sum('anon_17','anon_47')                    # ? = sum(?,?)
'anon_136' = 'anon_135' ==? 2                    # ? = ? ==? 2
'anon_137' = sum('anon_18','anon_48')                    # ? = sum(?,?)
'anon_138' = 'anon_137' ==? 2                    # ? = ? ==? 2
'anon_139' = sum('anon_37','anon_13')                    # ? = sum(?,?)
'anon_140' = 'anon_139' ==? 2                    # ? = ? ==? 2
'anon_141' = sum('anon_38','anon_14')                    # ? = sum(?,?)
'anon_142' = 'anon_141' ==? 2                    # ? = ? ==? 2
'anon_143' = sum('anon_39','anon_15')                    # ? = sum(?,?)
'anon_144' = 'anon_143' ==? 2                    # ? = ? ==? 2
'anon_145' = sum('anon_40','anon_16')                    # ? = sum(?,?)
'anon_146' = 'anon_145' ==? 2                    # ? = ? ==? 2
'anon_147' = sum('anon_41','anon_17')                    # ? = sum(?,?)
'anon_148' = 'anon_147' ==? 2                    # ? = ? ==? 2
'anon_149' = sum('anon_42','anon_18')                    # ? = sum(?,?)
'anon_150' = 'anon_149' ==? 2                    # ? = ? ==? 2
'anon_19' == 1                    # ? == 1
'anon_20' >= 'anon_37'                    # ? >= ?
'anon_21' >= 'anon_38'                    # ? >= ?
'anon_22' >= 'anon_39'                    # ? >= ?
'anon_23' >= 'anon_40'                    # ? >= ?
'anon_24' >= 'anon_41'                    # ? >= ?
'anon_42' == 1                    # ? == 1
: 'verse-val($cluster-size)&col=0&count=0' = [0 1]
'anon_151' = 'CLUSTER' ==? 1                    # ? = ? ==? 1
'anon_152' = 'verse-val($cluster-size)&col=0&count=0' ==? 1                    # ? = ? ==? 1
'anon_151' == 'anon_152'                    # ? == ?
: 'verse-val($cluster-size)&col=0&count=1' = [0 1]
'anon_153' = 'CLUSTER' ==? 2                    # ? = ? ==? 2
'anon_154' = 'verse-val($cluster-size)&col=0&count=1' ==? 1                    # ? = ? ==? 1
'anon_153' == 'anon_154'                    # ? == ?
: 'verse-val($cluster-size)&col=0&count=2' = [0,0,2,2]
'anon_155' = 'CLUSTER' ==? 3                    # ? = ? ==? 3
'anon_156' = 'verse-val($cluster-size)&col=0&count=2' ==? 2                    # ? = ? ==? 2
'anon_155' == 'anon_156'                    # ? == ?
'anon_157' = sum('verse-val($cluster-size)&col=0&count=0','verse-val($cluster-size)&col=0&count=1','verse-val($cluster-size)&col=0&count=2')                    # ? = sum(?,?,?)
: 'verse-val($cluster-size)&col=1&count=0' = [0 1]
'anon_158' = 'CLUSTER&n=1' ==? 1                    # ? = ? ==? 1
'anon_159' = 'verse-val($cluster-size)&col=1&count=0' ==? 1                    # ? = ? ==? 1
'anon_158' == 'anon_159'                    # ? == ?
: 'verse-val($cluster-size)&col=1&count=1' = [0 1]
'anon_160' = 'CLUSTER&n=1' ==? 2                    # ? = ? ==? 2
'anon_161' = 'verse-val($cluster-size)&col=1&count=1' ==? 1                    # ? = ? ==? 1
'anon_160' == 'anon_161'                    # ? == ?
: 'verse-val($cluster-size)&col=1&count=2' = [0,0,2,2]
'anon_162' = 'CLUSTER&n=1' ==? 3                    # ? = ? ==? 3
'anon_163' = 'verse-val($cluster-size)&col=1&count=2' ==? 2                    # ? = ? ==? 2
'anon_162' == 'anon_163'                    # ? == ?
'anon_164' = sum('verse-val($cluster-size)&col=1&count=0','verse-val($cluster-size)&col=1&count=1','verse-val($cluster-size)&col=1&count=2')                    # ? = sum(?,?,?)
: 'verse-val($cluster-size)&col=2&count=0' = [0 1]
'anon_165' = 'CLUSTER&n=2' ==? 1                    # ? = ? ==? 1
'anon_166' = 'verse-val($cluster-size)&col=2&count=0' ==? 1                    # ? = ? ==? 1
'anon_165' == 'anon_166'                    # ? == ?
: 'verse-val($cluster-size)&col=2&count=1' = [0 1]
'anon_167' = 'CLUSTER&n=2' ==? 2                    # ? = ? ==? 2
'anon_168' = 'verse-val($cluster-size)&col=2&count=1' ==? 1                    # ? = ? ==? 1
'anon_167' == 'anon_168'                    # ? == ?
: 'verse-val($cluster-size)&col=2&count=2' = [0,0,2,2]
'anon_169' = 'CLUSTER&n=2' ==? 3                    # ? = ? ==? 3
'anon_170' = 'verse-val($cluster-size)&col=2&count=2' ==? 2                    # ? = ? ==? 2
'anon_169' == 'anon_170'                    # ? == ?
'anon_171' = sum('verse-val($cluster-size)&col=2&count=0','verse-val($cluster-size)&col=2&count=1','verse-val($cluster-size)&col=2&count=2')                    # ? = sum(?,?,?)
: 'verse-val($cluster-size)&col=3&count=0' = [0 1]
'anon_172' = 'CLUSTER&n=3' ==? 1                    # ? = ? ==? 1
'anon_173' = 'verse-val($cluster-size)&col=3&count=0' ==? 1                    # ? = ? ==? 1
'anon_172' == 'anon_173'                    # ? == ?
: 'verse-val($cluster-size)&col=3&count=1' = [0 1]
'anon_174' = 'CLUSTER&n=3' ==? 2                    # ? = ? ==? 2
'anon_175' = 'verse-val($cluster-size)&col=3&count=1' ==? 1                    # ? = ? ==? 1
'anon_174' == 'anon_175'                    # ? == ?
: 'verse-val($cluster-size)&col=3&count=2' = [0,0,2,2]
'anon_176' = 'CLUSTER&n=3' ==? 3                    # ? = ? ==? 3
'anon_177' = 'verse-val($cluster-size)&col=3&count=2' ==? 2                    # ? = ? ==? 2
'anon_176' == 'anon_177'                    # ? == ?
'anon_178' = sum('verse-val($cluster-size)&col=3&count=0','verse-val($cluster-size)&col=3&count=1','verse-val($cluster-size)&col=3&count=2')                    # ? = sum(?,?,?)
: 'verse-val($cluster-size)&col=4&count=0' = [0 1]
'anon_179' = 'CLUSTER&n=4' ==? 1                    # ? = ? ==? 1
'anon_180' = 'verse-val($cluster-size)&col=4&count=0' ==? 1                    # ? = ? ==? 1
'anon_179' == 'anon_180'                    # ? == ?
: 'verse-val($cluster-size)&col=4&count=1' = [0 1]
'anon_181' = 'CLUSTER&n=4' ==? 2                    # ? = ? ==? 2
'anon_182' = 'verse-val($cluster-size)&col=4&count=1' ==? 1                    # ? = ? ==? 1
'anon_181' == 'anon_182'                    # ? == ?
: 'verse-val($cluster-size)&col=4&count=2' = [0,0,2,2]
'anon_183' = 'CLUSTER&n=4' ==? 3                    # ? = ? ==? 3
'anon_184' = 'verse-val($cluster-size)&col=4&count=2' ==? 2                    # ? = ? ==? 2
'anon_183' == 'anon_184'                    # ? == ?
'anon_185' = sum('verse-val($cluster-size)&col=4&count=0','verse-val($cluster-size)&col=4&count=1','verse-val($cluster-size)&col=4&count=2')                    # ? = sum(?,?,?)
: 'verse-val($cluster-size)&col=5&count=0' = [0 1]
'anon_186' = 'CLUSTER&n=5' ==? 1                    # ? = ? ==? 1
'anon_187' = 'verse-val($cluster-size)&col=5&count=0' ==? 1                    # ? = ? ==? 1
'anon_186' == 'anon_187'                    # ? == ?
: 'verse-val($cluster-size)&col=5&count=1' = [0 1]
'anon_188' = 'CLUSTER&n=5' ==? 2                    # ? = ? ==? 2
'anon_189' = 'verse-val($cluster-size)&col=5&count=1' ==? 1                    # ? = ? ==? 1
'anon_188' == 'anon_189'                    # ? == ?
: 'verse-val($cluster-size)&col=5&count=2' = [0,0,2,2]
'anon_190' = 'CLUSTER&n=5' ==? 3                    # ? = ? ==? 3
'anon_191' = 'verse-val($cluster-size)&col=5&count=2' ==? 2                    # ? = ? ==? 2
'anon_190' == 'anon_191'                    # ? == ?
'anon_192' = sum('verse-val($cluster-size)&col=5&count=0','verse-val($cluster-size)&col=5&count=1','verse-val($cluster-size)&col=5&count=2')                    # ? = sum(?,?,?)
'anon_193' = 'anon_19' ==? 0                    # ? = ? ==? 0
'anon_194' = 'anon_20' ==? 0                    # ? = ? ==? 0
'anon_195' = 'anon_21' ==? 0                    # ? = ? ==? 0
'anon_196' = 'anon_22' ==? 0                    # ? = ? ==? 0
'anon_197' = 'anon_23' ==? 0                    # ? = ? ==? 0
'anon_198' = 'anon_24' ==? 0                    # ? = ? ==? 0
'anon_199' = 'anon_157' ==? 1                    # ? = ? ==? 1
'anon_200' = 'anon_164' ==? 1                    # ? = ? ==? 1
'anon_201' = 'anon_171' ==? 1                    # ? = ? ==? 1
'anon_202' = 'anon_178' ==? 1                    # ? = ? ==? 1
'anon_203' = 'anon_185' ==? 1                    # ? = ? ==? 1
'anon_204' = 'anon_192' ==? 1                    # ? = ? ==? 1
'anon_205' = sum('anon_199','anon_19')                    # ? = sum(?,?)
'anon_206' = 'anon_205' ==? 2                    # ? = ? ==? 2
'anon_207' = sum('anon_200','anon_20')                    # ? = sum(?,?)
'anon_208' = 'anon_207' ==? 2                    # ? = ? ==? 2
'anon_209' = sum('anon_201','anon_21')                    # ? = sum(?,?)
'anon_210' = 'anon_209' ==? 2                    # ? = ? ==? 2
'anon_211' = sum('anon_202','anon_22')                    # ? = sum(?,?)
'anon_212' = 'anon_211' ==? 2                    # ? = ? ==? 2
'anon_213' = sum('anon_203','anon_23')                    # ? = sum(?,?)
'anon_214' = 'anon_213' ==? 2                    # ? = ? ==? 2
'anon_215' = sum('anon_204','anon_24')                    # ? = sum(?,?)
'anon_216' = 'anon_215' ==? 2                    # ? = ? ==? 2
'anon_217' = sum('anon_37')                    # ? = sum(?)
'anon_218' = 'anon_217' ==? 1                    # ? = ? ==? 1
'anon_218' >= 'anon_206'                    # ? >= ?
'anon_219' = sum('anon_38')                    # ? = sum(?)
'anon_220' = 'anon_219' ==? 1                    # ? = ? ==? 1
'anon_220' >= 'anon_208'                    # ? >= ?
'anon_221' = sum('anon_39')                    # ? = sum(?)
'anon_222' = 'anon_221' ==? 1                    # ? = ? ==? 1
'anon_222' >= 'anon_210'                    # ? >= ?
'anon_223' = sum('anon_40')                    # ? = sum(?)
'anon_224' = 'anon_223' ==? 1                    # ? = ? ==? 1
'anon_224' >= 'anon_212'                    # ? >= ?
'anon_225' = sum('anon_41')                    # ? = sum(?)
'anon_226' = 'anon_225' ==? 1                    # ? = ? ==? 1
'anon_226' >= 'anon_214'                    # ? >= ?
'anon_227' = sum('anon_42')                    # ? = sum(?)
'anon_228' = 'anon_227' ==? 1                    # ? = ? ==? 1
'anon_228' >= 'anon_216'                    # ? >= ?
'anon_229' = 'anon_157' ==? 2                    # ? = ? ==? 2
'anon_230' = 'anon_164' ==? 2                    # ? = ? ==? 2
'anon_231' = 'anon_171' ==? 2                    # ? = ? ==? 2
'anon_232' = 'anon_178' ==? 2                    # ? = ? ==? 2
'anon_233' = 'anon_185' ==? 2                    # ? = ? ==? 2
'anon_234' = 'anon_192' ==? 2                    # ? = ? ==? 2
'anon_235' = sum('anon_229','anon_19')                    # ? = sum(?,?)
'anon_236' = 'anon_235' ==? 2                    # ? = ? ==? 2
'anon_237' = sum('anon_230','anon_20')                    # ? = sum(?,?)
'anon_238' = 'anon_237' ==? 2                    # ? = ? ==? 2
'anon_239' = sum('anon_231','anon_21')                    # ? = sum(?,?)
'anon_240' = 'anon_239' ==? 2                    # ? = ? ==? 2
'anon_241' = sum('anon_232','anon_22')                    # ? = sum(?,?)
'anon_242' = 'anon_241' ==? 2                    # ? = ? ==? 2
'anon_243' = sum('anon_233','anon_23')                    # ? = sum(?,?)
'anon_244' = 'anon_243' ==? 2                    # ? = ? ==? 2
'anon_245' = sum('anon_234','anon_24')                    # ? = sum(?,?)
'anon_246' = 'anon_245' ==? 2                    # ? = ? ==? 2
'anon_247' = sum('anon_43','anon_38')                    # ? = sum(?,?)
'anon_248' = 'anon_247' ==? 2                    # ? = ? ==? 2
'anon_249' = sum('anon_44','anon_39')                    # ? = sum(?,?)
'anon_250' = 'anon_249' ==? 2                    # ? = ? ==? 2
'anon_251' = sum('anon_45','anon_40')                    # ? = sum(?,?)
'anon_252' = 'anon_251' ==? 2                    # ? = ? ==? 2
'anon_253' = sum('anon_46','anon_41')                    # ? = sum(?,?)
'anon_254' = 'anon_253' ==? 2                    # ? = ? ==? 2
'anon_255' = sum('anon_47','anon_42')                    # ? = sum(?,?)
'anon_256' = 'anon_255' ==? 2                    # ? = ? ==? 2
'anon_257' = sum('anon_248')                    # ? = sum(?)
'anon_258' = 'anon_257' ==? 1                    # ? = ? ==? 1
'anon_258' >= 'anon_236'                    # ? >= ?
'anon_259' = sum('anon_250')                    # ? = sum(?)
'anon_260' = 'anon_259' ==? 1                    # ? = ? ==? 1
'anon_260' >= 'anon_238'                    # ? >= ?
'anon_261' = sum('anon_252')                    # ? = sum(?)
'anon_262' = 'anon_261' ==? 1                    # ? = ? ==? 1
'anon_262' >= 'anon_240'                    # ? >= ?
'anon_263' = sum('anon_254')                    # ? = sum(?)
'anon_264' = 'anon_263' ==? 1                    # ? = ? ==? 1
'anon_264' >= 'anon_242'                    # ? >= ?
'anon_265' = sum('anon_256')                    # ? = sum(?)
'anon_266' = 'anon_265' ==? 1                    # ? = ? ==? 1
'anon_266' >= 'anon_244'                    # ? >= ?
'anon_267' = sum(0)                    # ? = sum(0)
'anon_268' = 'anon_267' ==? 1                    # ? = ? ==? 1
'anon_268' >= 'anon_246'                    # ? >= ?
'anon_269' = sum('anon_19','anon_194')                    # ? = sum(?,?)
'anon_270' = 'anon_269' ==? 2                    # ? = ? ==? 2
'anon_271' = sum('anon_20','anon_195')                    # ? = sum(?,?)
'anon_272' = 'anon_271' ==? 2                    # ? = ? ==? 2
'anon_273' = sum('anon_21','anon_196')                    # ? = sum(?,?)
'anon_274' = 'anon_273' ==? 2                    # ? = ? ==? 2
'anon_275' = sum('anon_22','anon_197')                    # ? = sum(?,?)
'anon_276' = 'anon_275' ==? 2                    # ? = ? ==? 2
'anon_277' = sum('anon_23','anon_198')                    # ? = sum(?,?)
'anon_278' = 'anon_277' ==? 2                    # ? = ? ==? 2
'anon_279' = sum('anon_270')                    # ? = sum(?)
'anon_280' = 'anon_279' ==? 1                    # ? = ? ==? 1
'anon_280' >= 'anon_236'                    # ? >= ?
'anon_281' = sum('anon_272')                    # ? = sum(?)
'anon_282' = 'anon_281' ==? 1                    # ? = ? ==? 1
'anon_282' >= 'anon_238'                    # ? >= ?
'anon_283' = sum('anon_274')                    # ? = sum(?)
'anon_284' = 'anon_283' ==? 1                    # ? = ? ==? 1
'anon_284' >= 'anon_240'                    # ? >= ?
'anon_285' = sum('anon_276')                    # ? = sum(?)
'anon_286' = 'anon_285' ==? 1                    # ? = ? ==? 1
'anon_286' >= 'anon_242'                    # ? >= ?
'anon_287' = sum('anon_278')                    # ? = sum(?)
'anon_288' = 'anon_287' ==? 1                    # ? = ? ==? 1
'anon_288' >= 'anon_244'                    # ? >= ?
'anon_289' = sum(0)                    # ? = sum(0)
'anon_290' = 'anon_289' ==? 1                    # ? = ? ==? 1
'anon_290' >= 'anon_246'                    # ? >= ?
'anon_291' = 'CLUSTER' ==? 'CLUSTER&n=1'                    # ? = ? ==? ?
'anon_292' = 'CLUSTER&n=1' ==? 'CLUSTER&n=2'                    # ? = ? ==? ?
'anon_293' = 'CLUSTER&n=2' ==? 'CLUSTER&n=3'                    # ? = ? ==? ?
'anon_294' = 'CLUSTER&n=3' ==? 'CLUSTER&n=4'                    # ? = ? ==? ?
'anon_295' = 'CLUSTER&n=4' ==? 'CLUSTER&n=5'                    # ? = ? ==? ?
'anon_296' = sum('anon_291')                    # ? = sum(?)
'anon_297' = 'anon_296' ==? 1                    # ? = ? ==? 1
'anon_297' >= 'anon_43'                    # ? >= ?
'anon_298' = sum('anon_292')                    # ? = sum(?)
'anon_299' = 'anon_298' ==? 1                    # ? = ? ==? 1
'anon_299' >= 'anon_44'                    # ? >= ?
'anon_300' = sum('anon_293')                    # ? = sum(?)
'anon_301' = 'anon_300' ==? 1                    # ? = ? ==? 1
'anon_301' >= 'anon_45'                    # ? >= ?
'anon_302' = sum('anon_294')                    # ? = sum(?)
'anon_303' = 'anon_302' ==? 1                    # ? = ? ==? 1
'anon_303' >= 'anon_46'                    # ? >= ?
'anon_304' = sum('anon_295')                    # ? = sum(?)
'anon_305' = 'anon_304' ==? 1                    # ? = ? ==? 1
'anon_305' >= 'anon_47'                    # ? >= ?
'anon_306' = sum(0)                    # ? = sum(0)
'anon_307' = 'anon_306' ==? 1                    # ? = ? ==? 1
'anon_307' >= 'anon_48'                    # ? >= ?
@custom set-valdist 'CLUSTER' {"valtype":"list","list":[2,1,3]}
@custom set-valdist 'CLUSTER_START?' {"valtype":"list","list":[1,0]}
@custom set-valdist 'CLUSTER_END?' {"valtype":"list","list":[1,0]}
@custom set-valdist 'item' {"valtype":"list","list":[3,1,2,4,5,6]}
@custom set-valdist 'CLUSTER&n=1' {"valtype":"list","list":[2,1,3]}
@custom set-valdist 'CLUSTER_START?&n=1' {"valtype":"list","list":[1,0]}
@custom set-valdist 'CLUSTER_END?&n=1' {"valtype":"list","list":[1,0]}
@custom set-valdist 'item&n=1' {"valtype":"list","list":[3,1,2,4,5,6]}
@custom set-valdist 'CLUSTER&n=2' {"valtype":"list","list":[2,1,3]}
@custom set-valdist 'CLUSTER_START?&n=2' {"valtype":"list","list":[1,0]}
@custom set-valdist 'CLUSTER_END?&n=2' {"valtype":"list","list":[1,0]}
@custom set-valdist 'item&n=2' {"valtype":"list","list":[3,1,2,4,5,6]}
@custom set-valdist 'CLUSTER&n=3' {"valtype":"list","list":[2,1,3]}
@custom set-valdist 'CLUSTER_START?&n=3' {"valtype":"list","list":[1,0]}
@custom set-valdist 'CLUSTER_END?&n=3' {"valtype":"list","list":[1,0]}
@custom set-valdist 'item&n=3' {"valtype":"list","list":[3,1,2,4,5,6]}
@custom set-valdist 'CLUSTER&n=4' {"valtype":"list","list":[2,1,3]}
@custom set-valdist 'CLUSTER_START?&n=4' {"valtype":"list","list":[1,0]}
@custom set-valdist 'CLUSTER_END?&n=4' {"valtype":"list","list":[1,0]}
@custom set-valdist 'item&n=4' {"valtype":"list","list":[3,1,2,4,5,6]}
@custom set-valdist 'CLUSTER&n=5' {"valtype":"list","list":[2,1,3]}
@custom set-valdist 'CLUSTER_START?&n=5' {"valtype":"list","list":[1,0]}
@custom set-valdist 'CLUSTER_END?&n=5' {"valtype":"list","list":[1,0]}
@custom set-valdist 'item&n=5' {"valtype":"list","list":[3,1,2,4,5,6]}
    `;

      let solver = new Solver().imp(dsl);
      solver.solve({max: 361});

      // i dont know the 360, but if you dont properly optimize reifiers then the solve count goes over a 1000 and other tests will break.
      // if this test blocks you check if mv is still relevant, the test may not be relevant anymore.
      // mv test: Harmonics - Clusterer | basics | rendering
      expect(solver.solutions.length).to.equal(360);
    });
  });
});
