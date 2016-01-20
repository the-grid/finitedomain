if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_range
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain


describe "pathsolver.spec", ->

  {
    PathSolver
  } = FD.PathSolver

  it 'should exist', ->

    expect(typeof PathSolver).to.eql 'function'

  describe 'searchPriority', ->

    # (this was once dumped from a MultiverseJSON object, then cleaned up)
    TREE_DATA =
      rawtree:
        paths: ['_ROOT_PATH_']
        branchName: '_ROOT_BRANCH_'
        branchId: '_ROOT_BRANCH_'
        path:
          _ROOT_PATH_:
            children: [
              branchName: 'B_NAME'
              branchId: 'B_NAME'
              paths: ['0', '1', '2']
              path:
                0: data: $class: ['first']
                1: data: $class: ['mid']
                2: data: $class: ['last']
            ]

    it "first solution w/o search priority", ->

      path_solver = new PathSolver TREE_DATA
      solutions = path_solver.solve
        distribute: 'naive'
        max: 1
        log: 1

      expect(solutions.length).to.equal 1
      expect(solutions[0].B_NAME).to.equal 1

      solution = solutions[0].B_NAME
      bvar = path_solver.vars.byName.B_NAME[0]
      path_name = bvar.pathNameByValue[solution]

      expect(bvar.pathMeta[path_name].data).to.eql $class: ['first']
      expect(path_name).to.equal '0'

    it "first solution by search priority", ->

      path_solver = new PathSolver TREE_DATA
      path_solver.vars.byId.B_NAME.distribute = "list"
      path_solver.vars.byId.B_NAME.distributeOptions =
        list: [3, 2, 1]
      solutions = path_solver.solve
        distribute: 'naive'
        max: 1
        log: 1

      # value is same - pathname indices are remapped
      solution = solutions[0].B_NAME
      expect(solution).to.equal 3

      bvar = path_solver.vars.byName.B_NAME[0]
      pathName = bvar.pathNameByValue[solution]
      expect(bvar.pathMeta[pathName].data).to.eql $class: ['last']

  describe 'ex) 1 level, 36 possible', ->

    # (this was once dumped from a MultiverseJSON object, then cleaned up)
    TREE_DATA =
      rawtree:
        paths: ["_ROOT_PATH_"]
        branchName: "_ROOT_BRANCH_"
        branchId: "_ROOT_BRANCH_"
        path:
          _ROOT_PATH_:
            children: [
              {
                branchName: "align"
                branchId: "align"
                paths: ["0", "1"]
                path:
                  0: data: $class: ["left"]
                  1: data: $class: ["right"]
              }, {
                branchName: "text_align",
                branchId: "text_align",
                paths: ["0", "1", "2"]
              }, {
                branchName: "size",
                branchId: "size",
                paths: ["0", "1", "2"]
              }, {
                branchName: "cols"
                branchId: "cols"
                paths: ["0", "1"]
              }
            ]

    it "solver w/o rules", ->

      path_solver = new PathSolver TREE_DATA
      solutions = path_solver.solve
        distribute: 'naive'
        log: 1

      expect(solutions.length, 'solution count').to.equal 36

    it "solver w/ rules: var ~= var ", ->

      path_solver = new PathSolver TREE_DATA

      vars = path_solver.vars.byName
      path_solver['~='] vars['align'][0], path_solver.num 1
      path_solver['!='] vars['text_align'][0], path_solver.num 1
      path_solver['!='] vars['size'][0], path_solver.num 1
      path_solver['~='] vars['cols'][0], path_solver.num 1

      solutions = path_solver.solve log: 1
      expect(solutions.length, 'solution count').to.equal 4

    it "solver w/ rules: vars ~= var", ->

      path_solver = new PathSolver TREE_DATA

      vars = path_solver.vars.byName
      path_solver['~='] vars['align'].concat(vars['cols']), path_solver.num 1
      path_solver['!='] vars['text_align'].concat(vars['size']), path_solver.num 1

      solutions = path_solver.solve()
      expect(solutions.length, 'solution count').to.equal 4

    it "sampler.sample() w/ rules: vars ~= vars", ->

      path_solver = new PathSolver TREE_DATA

      vars = path_solver.vars.byName
      path_solver['~='] vars['align'].concat(vars['cols']), path_solver.num 1
      path_solver['!='] vars['text_align'], path_solver.num 1
      path_solver['=='] vars['size'], vars['text_align']

      solutions = path_solver.solve()
      expect(solutions.length, 'solution count').to.equal 2

  describe 'ex) multi-level', ->

    # (this was once dumped from a MultiverseJSON object, then cleaned up)
    TREE_DATA =
      rawtree:
        paths: ["_ROOT_PATH_"]
        branchName: "_ROOT_BRANCH_"
        branchId: "_ROOT_BRANCH_"
        path:
          _ROOT_PATH_:
            children: [
              branchName: "rootBranch"
              branchId: "rootBranch"
              paths: ["rootPath"]
              path:
                rootPath:
                  children: [
                    {
                      branchName: "A"
                      branchId: "A"
                      paths: ["0", "1", "2"]
                      path:
                        0: data: $class: ["A0"]
                        1:
                          data: $class: ["A1"]
                          children: [
                            branchName: "B"
                            branchId: "B"
                            paths: ["0", "1", "2"]
                            path:
                              0: data: $class: ["B0"]
                              1: data: $class: ["B1"]
                              2: data: $class: ["B2"]
                          ]
                        2: data: $class: ["A2"]
                    }, {
                      branchName: "A"
                      branchId: "A&n=1"
                      paths: ["0", "1", "2"]
                      path:
                        0: data: $class: ["A0"]
                        1:
                          data: $class: ["A1"]
                          children: [
                            branchName: "B"
                            branchId: "B&n=1"
                            paths: ["0", "1", "2"]
                            path:
                              0: data: $class: ["B0"]
                              1: data: $class: ["B1"]
                              2: data: $class: ["B2"]
                          ]
                        2: data: $class: ["A2"]
                    }, {
                      branchName: "A"
                      branchId: "A&n=2"
                      paths: ["0", "1", "2"]
                      path:
                        0: data: $class: ["A0"]
                        1:
                          data: $class: ["A1"]
                          children: [
                            branchName: "B"
                            branchId: "B&n=2"
                            paths: ["0", "1", "2"]
                            path:
                              0: data: $class: ["B0"]
                              1: data: $class: ["B1"]
                              2: data: $class: ["B2"]
                          ]
                        2: data: $class: ["A2"]
                    }
                  ]
            ]

    it "ex) 0", ->

      path_solver = new PathSolver TREE_DATA
      solutions = path_solver.solve log: 1

      expect(solutions.length, 'solution count').to.equal 125

    it "ex) 1", ->

      path_solver = new PathSolver TREE_DATA
      path_solver['=='] path_solver.vars.byName['B'], path_solver.num 1

      solutions = path_solver.solve()
      expect(solutions.length, 'solution count').to.equal 1

    it "ex) 1.b", ->

      path_solver = new PathSolver TREE_DATA

      path_solver.lookDown path_solver.vars.root, (v) ->
        for pathName, meta of v.pathMeta
          data = meta.data
          if data?.$class
            if 'B1' in data.$class
              path_solver['=='] v, meta.constant

      solutions = path_solver.solve log: 1
      expect(solutions.length, 'solution count').to.equal 1

    it "ex) 2.a", ->

      path_solver = new PathSolver TREE_DATA

      vars = path_solver.vars.byName
      path_solver['~='] vars['A'], path_solver.constant(2)
      path_solver.space.decl 'BBinder', spec_d_create_range(0, 3)
      path_solver['~='] vars['B'], 'BBinder'

      solutions = path_solver.solve()
      expect(solutions.length, 'solution count').to.equal 3

    it "ex) 2.b", ->

      path_solver = new PathSolver TREE_DATA

      vars = path_solver.vars.byName
      path_solver['~='] vars['A'], path_solver.constant(2)
      path_solver['{}~='] vars['B']

      solutions = path_solver.solve log: 1
      expect(solutions.length, 'solution count').to.equal 3

    it "ex) 3", ->

      path_solver = new PathSolver TREE_DATA

      vars = path_solver.vars.byName
      path_solver['!='] vars['A'], path_solver.constant(2)
      path_solver['{}~='] vars['B']

      solutions = path_solver.solve()
      expect(solutions.length, 'solution count').to.equal 8

    it "ex) 4", ->

      path_solver = new PathSolver TREE_DATA

      vars = path_solver.vars.byName
      path_solver.space.decl 'BBinder', spec_d_create_range(0, 3)
      A = path_solver['==?'] 'BBinder', path_solver.num 0
      B = path_solver['==?'] path_solver['sum'](vars['B']), path_solver.num 0
      path_solver['=='] A, B
      for v in vars['B']
        A = path_solver['==?'] v, 'BBinder'
        B = path_solver['==?'] v.parent, path_solver.constant v.parentValue
        path_solver['>='] A, B

      solutions = path_solver.solve()
      expect(solutions.length, 'solution count').to.equal 65

    it "ex) 4.b", ->

      path_solver = new PathSolver TREE_DATA

      path_solver['{}~='] path_solver.vars.byName['B']

      solutions = path_solver.solve log: 1
      expect(solutions.length, 'solution count').to.equal 65

    it "ex) 5", ->

      path_solver = new PathSolver TREE_DATA

      vars = path_solver.vars.byName
      path_solver['{}~='] vars['B']
      path_solver['{}~='] vars['A']

      solutions = path_solver.solve log: 1
      expect(solutions.length, 'solution count').to.equal 5
