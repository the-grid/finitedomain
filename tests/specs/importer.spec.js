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
    `,
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
    `,
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
      s.distinct(['A']);
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
          s[methodName]('B', 5);
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
          s.declRange('B', 0, 10);
          s.declRange('C', 0, 10);
          s.declRange('D', 0, 10);
          s[methodName]('B', s[methodName]('C', 'D'), 'A');
        },
        `
        : A [0 1]
        : B [0 10]
        : C [0 10]
        : D [0 10]
        A = B ${opSymbol} (C ${opSymbol} D)
        |--
        : A [0 1]
        : B [0 10]
        : C [0 10]
        : D [0 10]
        A = (B ${opSymbol} (C ${opSymbol} D))
        `,
      ],
      [
        '    - nested reifier result',
        s => {
          s.declRange('A', 0, 10);
          s.declRange('B', 0, 10);
          s.declRange('C', 0, 10);
          s.declRange('D', 0, 10);
          s[methodName]('C', 'D', s[methodName]('A', 'B'));
        },
        `
        : A [0 10]
        : B [0 10]
        : C [0 10]
        : D [0 10]
        (A ${opSymbol} B) = (C ${opSymbol} D)
        |--
        : A [0 10]
        : B [0 10]
        : C [0 10]
        : D [0 10]
        (A ${opSymbol} B) = C ${opSymbol} D
        `,
      ],
      [
        '    - not to be confused with eq',
        s => {
          s.declRange('A', 0, 10);
          s.declRange('B', 0, 10);
          s.declRange('C', 0, 10);
          s.declRange('D', 0, 10);
          s.eq(s[methodName]('A', 'B'), s[methodName]('C', 'D'));
        },
        `
        : A [0 10]
        : B [0 10]
        : C [0 10]
        : D [0 10]
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
];

describe('src/importer.spec', function() {

  // to focus on a specific unit test find the `test #xxx` number from the target test
  // below in the inner forEach, return unless the index isn't that number.
  describe('unit tests', function() {

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
        beforeEach(function() {
          let expectation = new Solver();
          expectFunc(expectation);
        });

        inputs.forEach(input => {
          ++n;
          //if (n !== 192) return;
          it('[test #' + n + '] input=`' + input.replace(/[\n\r]/g, '\u23CE') + '`', function() {
            let output = importer(input);

            expect(output).to.eql(expectation);
          });

          it('[test #' + n + '] with tabs', function() {
            let inputTabbed = input.replace(/ /g, '\t');
            expect(importer(inputTabbed), 'tabbed').to.eql(expectation);
          });

          it('[test #' + n + '] with padded newlines', function() {

            let inputNewlined = '\n\r\n' + input.replace(/([\r\n])/g, '$1\n\r\n') + '\n\r\n';

            expect(importer(inputNewlined), 'newlined').to.eql(expectation);
          });

          it('[test #' + n + '] with comment padding', function() {
            let inputCommented = input.replace(/([\n\r]|$)/g, _ => ' # foo!\n');
            expect(importer(inputCommented), 'padded1').to.eql(expectation);
          });

          it('[test #' + n + '] with whitespace padding', function() {
            let inputPadded = input.replace(/([)+*\/\[\],\-\n\r])/g, ' $1 ');
            expect(importer(inputPadded), 'padded1').to.eql(expectation);

            let x = 0;
            let ip1 = inputPadded.replace(/ /g, _ => ++x % 2 === 0 ? ' ' : '\t');
            expect(importer(ip1), 'padded1').to.eql(expectation);

            let ip2 = inputPadded.replace(/ /g, _ => ++x % 2 === 1 ? ' ' : '\t');
            expect(importer(ip2), 'padded2').to.eql(expectation);
          });
        });
      });
    });
  });
});
