if typeof require is 'function'
  finitedomain = require('../../src/index')
  chai = require 'chai'

{expect, assert} = chai
FD = finitedomain

describe "PathBinarySolver", ->

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

    solver = null
    samples = null


#    it "creates multiverse", ->
#      m = new Multiverse json, {pathAccumulationKeys}
#      expect(m).to.be.ok
    # note: the obj below was a dump and the only part used. TODO: refactor this to an actual context-free test
    rawtree_obj = {"paths":["_ROOT_PATH_"],"branchName":"_ROOT_BRANCH_","branchId":"_ROOT_BRANCH_","path":{"_ROOT_PATH_":{"children":[{"branchName":"align","branchId":"align","paths":["0","1"],"path":{"0":{"data":{"$class":["left"]}},"1":{"data":{"$class":["right"]}}}},{"branchName":"text_align","branchId":"text_align","paths":["0","1","2"]},{"branchName":"size","branchId":"size","paths":["0","1","2"]},{"branchName":"cols","branchId":"cols","paths":["0","1"]}]}},"countByNames":{"align":1,"text_align":1,"size":1,"cols":1},"branchesById":{"align":{"branchName":"align","branchId":"align","paths":["0","1"],"path":{"0":{"data":{"$class":["left"]}},"1":{"data":{"$class":["right"]}}}},"text_align":{"branchName":"text_align","branchId":"text_align","paths":["0","1","2"]},"size":{"branchName":"size","branchId":"size","paths":["0","1","2"]},"cols":{"branchName":"cols","branchId":"cols","paths":["0","1"]}},"branchNames":["align","text_align","size","cols"]}
    m = {rawtree: rawtree_obj}

    it "solver w/o rules", ->
      solver = new FD.PathBinarySolver m
      expect(solver).to.be.ok
      samples = solver.solve({log:1})
      expect(samples.length).to.equal 36
      #console.log JSON.stringify sampler,1,1

    it "solver w/ rules: var ~= var ", ->
      S = new FD.PathBinarySolver m
      # .align:p(0) ~= on;
      # .text-align:p(0) == off;
      # .size:p(0) == off;
      # .cols:p(0) ~= on;
      S['~='] S.branchesByName['align'][0].childByName['0'], S.on
      S['=='] S.branchesByName['text_align'][0].childByName['0'], S.off
      S['=='] S.branchesByName['size'][0].childByName['0'], S.off
      S['~='] S.branchesByName['cols'][0].childByName['0'], S.on
      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 4

    it "solver w/ rules: branch,path ~= var ", ->
      S = new FD.PathBinarySolver m
      # .align:p(0) ~= on;
      # .text-align:p(0) == off;
      # .size:p(0) == off;
      # .cols:p(0) ~= on;
      S['branch,path~='] 'align', '0', S.on
      S['branch,path=='] 'text_align', '0', S.off
      S['branch,path=='] 'size', '0', S.off
      S['branch,path~='] 'cols', '0', S.on
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 4

    it "solver w/ rules: vars ~= var", ->
      S = new FD.PathBinarySolver m
      # .align:p(0) ~= on;
      # .text-align:p(0) == off;
      # .size:p(0) == .text-align:p(0);
      # .cols:p(0) ~= .align:p(0);
      align_0_paths = S.branchesByName['align'].map (b) ->
        b.childByName['0']

      text_align_0_paths = S.branchesByName['text_align'].map (b) ->
        b.childByName['0']

      size_0_paths = S.branchesByName['size'].map (b) ->
        b.childByName['0']

      cols_0_paths = S.branchesByName['cols'].map (b) ->
        b.childByName['0']

      S['~='] align_0_paths.concat(cols_0_paths), S.on
      S['=='] text_align_0_paths.concat(size_0_paths), S.off
      #S['=='] size_0_paths, text_align_0_paths
      #S['~='] align_0_paths, cols_0_paths
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 4

    it "sampler.sample() w/ rules: vars ~= vars", ->
      S = new FD.PathBinarySolver m
      # .align:p(0) ~= on;
      # .text-align:p(0) == off;
      # .size:p(0) == .text-align:p(0);
      # .cols:p(0) ~= .align:p(0);
      align_0_paths = S.branchesByName['align'].map (b) ->
        b.childByName['0']

      text_align_0_paths = S.branchesByName['text_align'].map (b) ->
        b.childByName['0']

      size_0_paths = S.branchesByName['size'].map (b) ->
        b.childByName['0']

      cols_0_paths = S.branchesByName['cols'].map (b) ->
        b.childByName['0']

      S['~='] align_0_paths, S.on
      S['=='] text_align_0_paths, S.off
      S['=='] size_0_paths, text_align_0_paths
      S['~='] align_0_paths, cols_0_paths
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 4

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

    o = {"paths":["_ROOT_PATH_"],"branchName":"_ROOT_BRANCH_","branchId":"_ROOT_BRANCH_","path":{"_ROOT_PATH_":{"children":[{"branchName":"rootBranch","branchId":"rootBranch","paths":["rootPath"],"path":{"rootPath":{"children":[{"branchName":"A","branchId":"A","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},{"branchName":"A","branchId":"A&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},{"branchName":"A","branchId":"A&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}}]}}}]}},"countByNames":{"rootBranch":1,"A":3,"B":3},"branchesById":{"rootBranch":{"branchName":"rootBranch","branchId":"rootBranch","paths":["rootPath"],"path":{"rootPath":{"children":[{"branchName":"A","branchId":"A","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},{"branchName":"A","branchId":"A&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},{"branchName":"A","branchId":"A&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}}]}}},"A":{"branchName":"A","branchId":"A","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},"B":{"branchName":"B","branchId":"B","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}},"A&n=1":{"branchName":"A","branchId":"A&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},"B&n=1":{"branchName":"B","branchId":"B&n=1","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}},"A&n=2":{"branchName":"A","branchId":"A&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["A0"]}},"1":{"data":{"$class":["A1"]},"children":[{"branchName":"B","branchId":"B&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}]},"2":{"data":{"$class":["A2"]}}}},"B&n=2":{"branchName":"B","branchId":"B&n=2","paths":["0","1","2"],"path":{"0":{"data":{"$class":["B0"]}},"1":{"data":{"$class":["B1"]}},"2":{"data":{"$class":["B2"]}}}}},"branchNames":["rootBranch","A","B"]}
    S = null
    sampler = null
    samples = null

#    it "creates multiverse", ->
#      m = new Multiverse json, {pathAccumulationKeys}
#      expect(m).to.be.ok
    # exported from the actual test TODO: refactor this to a clean context-free test
    m = {rawtree: o}

    it "ex) 0", ->
      S = new FD.PathBinarySolver m
      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 125

    it "ex) 1", ->
      S = new FD.PathBinarySolver m
      S['=='] S['branch/path']['B/1'], S.on
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 1

    it "ex) 1.b", ->
      S = new FD.PathBinarySolver m
      paths = S.pathsByDataKey['$class'].filter (p) ->
        return 'B1' in p.data.$class
      S['=='] paths, S.on
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 1

    it "ex) 2", ->
      S = new FD.PathBinarySolver m
      S['~='] S['branch/path']['A/1'], S.on
      S['{}~='] S['branch/path']['B/0']
      S['{}~='] S['branch/path']['B/1']
      S['{}~='] S['branch/path']['B/2']
      expect(S).to.be.ok
      samples = S.solve()
      expect(samples.length).to.equal 3

    it "ex) 2.b", ->
      S = new FD.PathBinarySolver m
      S['~='] S['branch/path']['A/1'], S.on
      S['{branches}~='] S.branchesByName['B']
      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 3

    it "ex) 3", ->
      S = new FD.PathBinarySolver m
      S['=='] S['branch/path']['A/1'], S.off
      S['{branches}~='] S.branchesByName['B']
      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 8

    it "ex) 4", ->
      S = new FD.PathBinarySolver m
      S['{branches}~='] S.branchesByName['B']
      expect(S).to.be.ok
      samples = S.solve({log:1})
      expect(samples.length).to.equal 65




