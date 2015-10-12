if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_range
  } = require '../fixtures/domain'

{expect, assert} = chai
FD = finitedomain

PathSolver = FD.PathSolver

describe "PathSolver", ->

  describe 'searchPriority', ->
    json =
      Y_branch: [
          $class:['first']
        ,
          $class:['mid']
        ,
          $class:['last']
      ]

    searchList = [3,2,1]

    pathAccumulationKeys = ['$class']

    m = null

#    it "creates multiverse", ->
#      m = new Multiverse json, {pathAccumulationKeys}
#      expect(m).to.be.ok

    # TOFIX: change these tests to be context free. this was a multiverse structure
    m = {rawtree: {"paths":["_ROOT_PATH_"],"branchName":"_ROOT_BRANCH_","branchId":"_ROOT_BRANCH_","path":{"_ROOT_PATH_":{"children":[{"branchName":"branch","branchId":"branch","paths":["0","1","2"],"path":{"0":{"data":{"$class":["first"]}},"1":{"data":{"$class":["mid"]}},"2":{"data":{"$class":["last"]}}}}]}},"countByNames":{"branch":1},"branchesById":{"branch":{"branchName":"branch","branchId":"branch","paths":["0","1","2"],"path":{"0":{"data":{"$class":["first"]}},"1":{"data":{"$class":["mid"]}},"2":{"data":{"$class":["last"]}}}}},"branchNames":["branch"]}}

    it "first solution w/o search priority", ->
      S = new PathSolver m
      expect(S).to.be.ok
      solutions = S.solve({distribute:'naive',max:1,log:1})
      expect(solutions.length).to.equal 1
      expect(solutions[0].branch).to.equal 0 + 1
      pathName = S.vars.byName['branch'][0].pathNameByValue[solutions[0]['branch']]
      expect(S.vars.byName['branch'][0].pathMeta[pathName].data).to.eql $class:['first']
      expect(pathName).to.equal '0'

    it "first solution by search priority", ->
      S = new PathSolver m
      S.vars.byId['branch'].distribute = "list"
      S.vars.byId['branch'].distributeOptions = {list:searchList}
      expect(S).to.be.ok
      solutions = S.solve({distribute:'naive',max:1,log:1})
      # value is same - pathname indices are remapped
      expect(solutions[0].branch).to.equal 2 + 1
      pathName = S.vars.byName['branch'][0].pathNameByValue[solutions[0]['branch']]
      expect(S.vars.byName['branch'][0].pathMeta[pathName].data).to.eql $class:['last']

  describe 'ex) 1 level, 36 possible', ->

    json =
      Y_align: [
          $class:['left']
        ,
          $class:['right']
      ]
      text_align: Y_text_align: [
          'left'
        ,
          'center'
        ,
          'right'
      ]
      size: Y_size: [
          'small'
        ,
          'medium'
        ,
          'big'
      ]
      cols: Y_cols: [
          2
        ,
          1
      ]

    branchRules =

      align: 0 # always 0

      text_align:
        exclude: [0]

      size: (path) -> # computed
        if 'left' in path._data.$class
          return 1
        else
          return 2

      cols: (path) ->
        return path.align

    pathAccumulationKeys = ['$class']

    m = null
    solver = null
    samples = null

#    it "creates multiverse", ->
#      m = new Multiverse json, {pathAccumulationKeys}
#      expect(m).to.be.ok

    # TOFIX: change these tests to be context free. this was a multiverse structure
    m = {rawtree: {"paths":["_ROOT_PATH_"],"branchName":"_ROOT_BRANCH_","branchId":"_ROOT_BRANCH_","path":{"_ROOT_PATH_":{"children":[{"branchName":"align","branchId":"align","paths":["0","1"],"path":{"0":{"data":{"$class":["left"]}},"1":{"data":{"$class":["right"]}}}},{"branchName":"text_align","branchId":"text_align","paths":["0","1","2"]},{"branchName":"size","branchId":"size","paths":["0","1","2"]},{"branchName":"cols","branchId":"cols","paths":["0","1"]}]}},"countByNames":{"align":1,"text_align":1,"size":1,"cols":1},"branchesById":{"align":{"branchName":"align","branchId":"align","paths":["0","1"],"path":{"0":{"data":{"$class":["left"]}},"1":{"data":{"$class":["right"]}}}},"text_align":{"branchName":"text_align","branchId":"text_align","paths":["0","1","2"]},"size":{"branchName":"size","branchId":"size","paths":["0","1","2"]},"cols":{"branchName":"cols","branchId":"cols","paths":["0","1"]}},"branchNames":["align","text_align","size","cols"]}}

    it "solver w/o rules", ->
      S = new PathSolver m
      expect(S).to.be.ok
      #S['=='](S.branchesByName['align'][0], S.constant(2))
      samples = S.solve({distribute:'naive',log:1})

      expect(samples.length).to.equal 36
      #console.log JSON.stringify sampler,1,1

    it "solver w/ rules: var ~= var ", ->
      S = new PathSolver m
      # .align:p(0) ~= on;
      # .text-align:p(0) == off;
      # .size:p(0) == off;
      # .cols:p(0) ~= on;

      S['~='] S.vars.byName['align'][0], S.one
      S['!='] S.vars.byName['text_align'][0], S.one
      S['!='] S.vars.byName['size'][0], S.one
      S['~='] S.vars.byName['cols'][0], S.one

      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 4

    it "solver w/ rules: vars ~= var", ->
      S = new PathSolver m
      # .align:p(0) ~= on;
      # .text-align:p(0) == off;
      # .size:p(0) == .text-align:p(0);
      # .cols:p(0) ~= .align:p(0);

      S['~='] S.vars.byName['align'].concat(S.vars.byName['cols']), S.one
      S['!='] S.vars.byName['text_align'].concat(S.vars.byName['size']), S.one
      #S['=='] size_0_paths, text_align_0_paths
      #S['~='] align_0_paths, cols_0_paths
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 4

    it "sampler.sample() w/ rules: vars ~= vars", ->
      S = new PathSolver m
      vars = S.vars.byName
      S['~='] vars['align'].concat(vars['cols']), S.one
      S['!='] vars['text_align'], S.one
      S['=='] vars['size'], vars['text_align']
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 2

  describe 'ex) multi-level', ->

    AB =
      Y_A: [
          $class:['A0']
        ,
          $class:['A1']
          Y_B: [
            $class:['B0']
          ,
            $class:['B1']
          ,
            $class:['B2']
          ]
        ,
          $class:['A2']
      ]

    json =
      Y_rootBranch:
        rootPath:
          first : AB
          second: AB
          third : AB

    pathAccumulationKeys = ['$class']

    m = null
    S = null
    sampler = null
    samples = null

#    it "creates multiverse", ->
#      m = new Multiverse json, {pathAccumulationKeys}
#      expect(m).to.be.ok

    # TOFIX: change these tests to be context free. this was a multiverse structure
    m = {rawtree: {"paths":["_ROOT_PATH_"],"branchName":"_ROOT_BRANCH_","branchId":"_ROOT_BRANCH_","path":{"_ROOT_PATH_":{"children":[{"branchName":"rootBranch","branchId":"rootBranch","paths":["rootPath"],"path":{"rootPath":{"children":[{"branchName":"A","branchId":"A","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},{"branchName":"A","branchId":"A&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},{"branchName":"A","branchId":"A&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}}]}}}]}},"countByNames":{"rootBranch":1,"A":3,"B":3},"branchesById":{"rootBranch":{"branchName":"rootBranch","branchId":"rootBranch","paths":["rootPath"],"path":{"rootPath":{"children":[{"branchName":"A","branchId":"A","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},{"branchName":"A","branchId":"A&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},{"branchName":"A","branchId":"A&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}}]}}},"A":{"branchName":"A","branchId":"A","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},"B":{"branchName":"B","branchId":"B","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}},"A&n=1":{"branchName":"A","branchId":"A&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},"B&n=1":{"branchName":"B","branchId":"B&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}},"A&n=2":{"branchName":"A","branchId":"A&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},"B&n=2":{"branchName":"B","branchId":"B&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}},"branchNames":["rootBranch","A","B"]}}

    it "ex) 0", ->
      S = new PathSolver m
      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 125

    it "ex) 1", ->
      S = new PathSolver m
      S['=='] S.vars.byName['B'], S.one
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 1

    it "ex) 1.b", ->
      S = new PathSolver m

      S.lookDown S.vars.root, (v) ->
        for pathName, meta of v.pathMeta
          data = meta.data
          if data?.$class
            if 'B1' in data.$class
              S['=='] v, meta.constant

      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 1

    it "ex) 2", ->
      S = new PathSolver m
      vars = S.vars.byName
      S['~='] vars['A'], S.constant(2)
      S.S.decl 'BBinder', spec_d_create_range(0, 3)
      S['~='] vars['B'], 'BBinder'
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 3

    it "ex) 2.b", ->
      S = new PathSolver m
      vars = S.vars.byName
      S['~='] vars['A'], S.constant(2)
      S['{}~='] vars['B']
      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 3

    it "ex) 3", ->
      S = new PathSolver m
      vars = S.vars.byName
      S['!='] vars['A'], S.constant(2)
      S['{}~='] vars['B']
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 8

    it "ex) 4", ->
      S = new PathSolver m
      vars = S.vars.byName
      S.S.decl 'BBinder', spec_d_create_range(0, 3)
      #S['~='] vars['B'], 'BBinder'

      S['=='](
        S['==?']('BBinder',S.off),
        S['==?'](S['sum'](vars['B']), S.off)
      )

      for v in vars['B']
        S['>='](
          S['==?'](v,'BBinder'),
          S['==?'](v.parent,S.constant(v.parentValue))
        )

      #S['=='] 'BBinder', S.off
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 65

    it "ex) 4.b", ->
      S = new PathSolver m
      S['{}~='] S.vars.byName['B']
      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 65

    it "ex) 5", ->
      S = new PathSolver m
      vars = S.vars.byName
      S['{}~='] vars['B']
      S['{}~='] vars['A']
      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 5




