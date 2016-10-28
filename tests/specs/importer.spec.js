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


let units = [
  '- vars',
  ['basic test', s -> s.decl(A, [0, 1]), [': A [0 1]']],

  '  - var names',
  [
    'simple var decl with range one pair',
    s -> s.declRange('A', 1, 2),
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
|--
    `,
  ],

  '  - domain',
  [
    'simple var decl with range one pair',
    s -> s.declRange('A', 1, 2),
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
    s -> s.decl('A', [0, 1, 10, 20, 100, 3000]),
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
    s -> s.declRange('A', SUB, SUP),
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
    s -> true, // TODO: unable to test this as finitedomain currently doesn't really support this
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
];
