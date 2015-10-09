# Adds FD.PathSolver to FD.js

# (I dont think we use this class in the grid...)

# TODO
# - branchpath query selectors
# .align:(0) > .text_align:(0)
# .align:()[]


module.exports = (FD) ->

  class FD.PathBinarySolver extends FD.Solver

    constructor: (multiverse, o = {}) ->

      super

      {@rawtree} = multiverse

      {branchRules} = o
      branchRules ?= {}
      @branchRules = branchRules

      @branchesByName = {}
      @pathsByName = {}
      @['branch/path'] = {}
      @pathsByDataKey = {}

      @one  = @on  = @constant 1
      @zero = @off = @constant 0

      @rootBranchName = @rawtree.branchName
      @rootPathName = @rawtree.paths[0]

      @compileTree(@rawtree,branchRules)
      @

    getPathsByMeta: (key,val) ->
      paths = @pathsByDataKey[key]
      results = []
      for p in paths
        pVal = p.data[key]
        if pVal instanceof Array
          results.push(p) if val in pVal
        else
          results.push(p) if val is pVal
      results

    lookDown: (node, callback) ->
      observation =
        round:0
        flooredRounds: []
        data:[]
        continue: true
        done: () ->
          observation.continue = false
        floor: () ->
          observation.flooredRounds.push observation.round
      @_lookDown node, callback, observation

    _lookDown: (node, cb, o) ->
      return unless o.continue
      for child in node.children
        cb child, o
        break unless o.continue
        continue if o.round in o.flooredRounds
        o.round++
        @_lookDown child, cb, o
      o

    addVar: (v) ->
      super
      {type, name} = v
      if type is 'branch'
        @branchesByName[name] ?= []
        @branchesByName[name].push v
      if type is 'path'
        @pathsByName[name] ?= []
        @pathsByName[name].push v
        if v.parent
          branch_path_name = v.parent.name+'/'+name
          @['branch/path'][branch_path_name] ?= []
          @['branch/path'][branch_path_name].push v
        if v.data
          for key in Object.keys(v.data)
            @pathsByDataKey[key] ?= []
            @pathsByDataKey[key].push v
      v

    # overwrite == to handle paths on both sides
    eq: (e1, e2) ->
      if e1 instanceof Array
        if e2 instanceof Array
          # this only works with ==
          @eq e1, e2[0]
          @eq e2, e1[0]
          return @
        else
          for e in e1
            @_eq e, e2
          return @
      else
        return @_eq(e1, e2)


    '~=': (e1, e2) ->
      if e1 instanceof Array
        if e2 instanceof Array
          # validate if all are paths?
          return @['{}~='] e1.concat e2
        else
          for e in e1
            @['_~='] e, e2
          return @
      else
        return @['_~='](e1, e2)
    '_~=': (e1, e2) ->
      parents = []
      if e1.type is 'path'
        parents.push e1.parent
      if e2.type is 'path'
        parents.push e2.parent
      if parents.length > 0
        parents.push(@on) if parents.length is 1
        @['>='](
          @['==?'](e1, e2),
          @['==?'](parents[0], parents[1])
        )
      else
        throw new Error "FDTreeSolver... ~= ???"
        return @['=='] e1, e2

    'branch,path~=': (branchName, pathName, val) ->
      for branch in @branchesByName[branchName]
        @['~='] branch.childByName[pathName], val

    'branch,path==': (branchName, pathName, val) ->
      for branch in @branchesByName[branchName]
        @['=='] branch.childByName[pathName], val

    'kill': (paths) ->
      for path in paths
        @['=='] path, @off

    '{}~=': (paths) ->
      for path in paths
        # attempt to be on if at least one is on
        # attempt to be off if none are on
        @['~='] path, @['>=?'](@['∑'](paths), @on)

        # if at least one such path is on, then path is on when parent is on >=(1,1)
        # if at least one such path is on, then path is off when parent is off >=(1,0)
        # if zero such paths are on, then path is zero when parent is on >=(0,0)
        #@['>='](
        #  @['==?'](path, path.parent)
        #  @['>=?'](@['∑'](paths), path.parent)
        #)
      @

    '{branches}~=': (branches) ->
      # TODO
      # - Cache, dont double syncPaths of same branch
      prevPathNames = undefined
      prevBranch = undefined
      pathsByName = {}
      for branch, i in branches
        pathNames = Object.keys(branch.childByName)
        # validate
        unbalanced = false
        if prevPathNames
          unbalanced = pathNames.length isnt prevPathNames.length
        for pName in pathNames
          pathsByName[pName] ?= []
          pathsByName[pName].push branch.childByName[pName]
          break if unbalanced
          if prevPathNames
            unbalanced = pName not in prevPathNames
        throw new Error "unbalanced path syncing: #{branch.id} & #{prevBranch.id} " if unbalanced
        #
        for pName in pathNames
          @['{}~='] pathsByName[pName]

        @


     #   prevPathNames = pathNames
     #   prevBranch = branch
     # for branch, i in branches
     #   next = branches[i+1]
     #   continue unless next
     #   for pathName in Object.keys(branch.childByName)
     #     e1 = branch.pathsByName[pathName]
     #     e2 = next.pathsByName[pathName]
     #     throw new Error "FDTreeSolver syncPaths, unbalanced branches" if !e1? or !e2?
     #     @['~='] e1, e2

    '--- ~=sync': (branchName) ->
      # TODO
      # - Cache, dont double syncPaths of same branch
      branches = @branchesByName[branchName]
      for branch, i in branches
        next = branches[i+1]
        continue unless next
        for pathName in Object.keys(branch.childByName)
          e1 = branch.pathsByName[pathName]
          e2 = next.pathsByName[pathName]
          throw new Error "FDTreeSolver syncPaths, unbalanced branches" if !e1? or !e2?
          $['~='] e1, e2

    '~=entangle': (branchName1, branchName2, callback) ->
      @['syncPaths'] branchName1
      @['syncPaths'] branchName2
      branches1 = @branchesByName[branchName1]
      branches2 = @branchesByName[branchName2]
      # TODO
      # bridge between the two branch groups? FUCK!
      # what if
      callback.call @, branches1, branches2

    compileTree: (rawtree,branchRules) ->
      return @_compileTree(rawtree, branchRules)

    _compileTree: (branch, branchRules, parentBranchVar, parentPathVar, depth = 0) ->
      {branchName, branchId} = branch

      branchVar = {id:branchId, parent:parentPathVar, children:[], childByName:{}, type:'branch', name:branchName, classes:[], depth:depth}
      if branchName isnt @rootBranchName
        @addVar branchVar

      # root branches must be on
      if parentBranchVar?.id is @rootBranchName
        @['=='] branchVar, @one
      # child-parent binding
      else if parentBranchVar?
        @['=='] branchVar, parentPathVar

      {paths, path} = branch
      for pName in paths

        pathVar = {id:branchId + '/' + pName, parent:branchVar, children:[], childByName:{}, type:'path', name:pName, classes:[], depth:depth}
        pathData = path?[pName]?.data
        pathVar.data = pathData if pathData
        if pName isnt @rootPathName
          branchVar.children.push pathVar
          branchVar.childByName[pName] = pathVar
          @addVar pathVar

        childBranches = path?[pName]?.children
        if childBranches?
          for childBranch in childBranches
            childBranchVar = @_compileTree childBranch, branchRules, branchVar, pathVar, depth++
            pathVar.children.push childBranchVar
            pathVar.childByName[childBranchVar.name] = childBranchVar

      # path to branch binding
      if branchName isnt @rootBranchName
        @['∑'] branchVar.children, branchVar

      branchVar

    syncBranchPathToVal: (branchVar, pathName, val) ->


    sample: (o={}) ->
      @solve(o)
