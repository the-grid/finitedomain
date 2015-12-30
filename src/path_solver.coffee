
# FD.PathSolver
# ==============================================
# Compiles a Multiverse JSON tree into FD constraints, where each branch is a FDVar and the paths (plus an implicit 0 or off path) are it's domain.  Adds additional constraint primitives for constraining branches to each other.

# TODO:
# - branchpath query selectors
# .align:(0) > .text_align:(0)
# .align:()[]

module.exports = (FD) ->
  MAX = Math.max

  {
    Domain
    Solver
  } = FD

  {
    domain_create_one
    domain_create_range
    domain_create_zero
    domain_from_list
    domain_max
  } = Domain

  binding_uid = 0

  class PathSolver extends Solver

    constructor: ({rawtree}, o = {}) ->

      super

      {
        branchRules
      } = o

      @distribute = 'naive'
      @rootBranchName = rawtree.branchName

      @vars.root = undefined

      @compileTree rawtree, branchRules

    solutionToPath: (solution) ->
      bvars_by_id = @vars.byId
      path = {}
      for var_id, solution_value of solution
        if solution_value isnt 0
          branch_var = bvars_by_id[var_id]
          if branch_var
            path[branch_var.branchId] = find_path_for_val_or_throw branch_var.pathMeta, solution_value
      return path

    find_path_for_val_or_throw = (path_meta, value) ->
      for path_name, meta of path_meta
        if meta.value is value
          return path_name

      throw new Error "solution to Path error"

# this stuff is unused and not obviously debug. remove it, use it, or clarify it.
# (and where does the @M come from? I think it's a MultiVerse instance... but who sets it?)
#    collapseSolution: (solution) ->
#      path = @space.solutionToPath(solution)
#      collapsed = @M.collapse path
#      collapsed

    # walk the whole tree from this node downward
    # walks in depth first search order
    # TOFIX: do we ever use the done/floor stuff in state? could simplify this func

    lookDown: (node, callback) ->
      state =
        round: 0
        flooredRounds: []
        data: []
        continue: true
        done: () ->
          state.continue = false
        floor: () ->
          state.flooredRounds.push state.round

      _lookDown node, callback, state
      return

    _lookDown = (node, func, state) ->
      if state.continue
        state.round++
        func node, state
        round = state.round
        for child in node.children
          _lookDown child, func, state
          unless state.continue
            return
      return

    # overwrite == to handle paths on both sides
    eq: (e1, e2) ->
      unless e1 instanceof Array
        @_eq e1, e2
        return

      unless e2 instanceof Array
        for e in e1
          @_eq e, e2
        return

      # this only works with ==
      @eq e1, e2[0]
      @eq e2, e1[0]
      return

    ## for these mythical ops:
    ## ~` denotes a softer constraint, as in if you *can* then respect the constraint, ie. if the
    ## branch var is on (greater than zero) then you must respect constraint & if branch var is
    ## off (zero) then do no respect the constraint
    ## `{}` denotes a constraint against a collection. `{}==` means they are all equal to each other...

    '~=': (e1, e2) ->
      unless e1 instanceof Array
        @['_~'] '==', e1, e2
        return

      unless e2 instanceof Array
        for e in e1
          @['_~'] '==', e, e2
        return

      # validate if all are paths?
      @['{}~='] e1.concat e2
      return

    '~>=': (e1, e2) ->
      unless e1 instanceof Array
        @['_~'] '>=', e1, e2
        return

      unless e2 instanceof Array
        for e in e1
          @['_~'] '>=', e, e2
        return

      # validate if all are paths?
      @['{}~='] e1.concat e2
      return

    '_~': (op, e1, e2) ->
      if e1.type is 'branch' and e2.type isnt 'branch'
        rif1 = @["#{op}?"] e1, e2
        rif2 = @['==?'] e1.parent, @num e1.parentValue
        @['>='] rif1, rif2
        return

      #if e2.type is 'branch'
      #  parents.push e2.parent
      #if parents.length > 0
      #  parents.push(@num 1) if parents.length is 1
      #  @['>='](
      #    @['==?'](e1, e2),
      #    @['==?'](parents[0], parents[1])
      #  )

      throw new Error "PathSolver... ~= ???"
      #return @['=='] e1, e2

    kill: (paths) ->
      for path in paths
        @['=='] path, @num 0
      return

    '{}~=': (bvars) ->
      # TODO
      # - cache collections by selector!!!!

      bind_name = "__bind#{binding_uid++}__"

      # TOFIX: should the lo of this domain also be the min of all domains?
      @S.decl bind_name, domain_create_range 0, find_max_or_throw bvars

      A = @['==?'] bind_name, @num 0
      B = @['==?'] @['sum'](bvars), @num 0
      @['=='] A, B

      for branchvar in bvars
        A = @['==?'] branchvar, bind_name
        B = @['==?'] branchvar.parent, @num branchvar.parentValue
        @['>='] A, B

      return bind_name

    find_max_or_throw = (bvars) ->
      had_domain = false
      max_domain = 0

      for branchvar in bvars
        domain = branchvar.domain # csis domain
        if domain
          had_domain = true
          max_domain = MAX max_domain, domain_max domain

      unless had_domain
        throw new Error "{}~= Cant find domain for binding"

      return max_domain

    compileTree: (rawtree,branchRules) ->
      ###
        {
          name: branchName
          data: (from parent path)
          children:  [
            ... tp leaf node!
          ]

        }

        # Leaf Node
        - boolean domain
        - leaf

      ###
      return @_compileTree(rawtree, branchRules)

    _compileTree: (branch, branchRules, parentBranchVar, parentValue, depth = 0) ->
      {branchName, branchId, paths, _type} = branch
      _type ?= 'branch'

      parentIsRoot = parentBranchVar?.id is @rootBranchName

      required = false
      optional = false

      id = branchId

      # handle API for required `!` & optional `?` branches
      if branchName.indexOf('!') >= 0
        required = true
        branchName = branchName.substr 0, branchName.indexOf('!')
        id = branchId.split('!').join('')
      else if branchName.indexOf('?') >= 0
        optional = true
        branchName = branchName.substr 0, branchName.indexOf('?')
        id = branchId.split('?').join('')
      else if parentIsRoot
        required = true
      else if parentBranchVar?
        if parentBranchVar.required and parentBranchVar.paths.length is 1
          required = true

      branchVar = {
        _class: 'branchvar'
        id:id,
        branchId:branchId
        required: required,
        type: _type,
        name: branchName,
        paths: paths,
        pathNameByValue:{},
        pathMeta:{},
        parent: parentBranchVar,
        parentValue: parentValue,
        children: [],
        childByName: {},
        classes: [],
        depth: depth,
        isLeaf: undefined
      }

      numberedPaths = false
      possibleValues = []

      # branchVar.pathMeta
      if paths?
        {path} = branch

        #
        for pName, pIndex in paths
          pathData = path?[pName]?.data
          if !isNaN(pName)
            numberedPaths = true
            branchValue = Number(pName) + 1
          else
            throw new Error "Cant mix numbered paths with nonnumbered paths" if numberedPaths
            branchValue = pIndex + 1
          # apply branchRules
          valid = true
          if branchRules
            for rule in branchRules
              # {$class:'target', type:'kill'}
              if rule.$class and pathData?.$class
                if rule.$class in path?[pName]?.data.$class
                  if rule.type is 'kill'
                    valid = false
                    break
          if valid
            # TODO
            # - what if none are valid?  make optional?
            possibleValues.push branchValue

          meta = {
            pathIndex: pIndex
            value: branchValue
            constant: @num branchValue
          }
          if pathData
            meta.data = pathData
          branchVar.pathMeta[pName] = meta
          branchVar.pathNameByValue[branchValue] = pName

      # create the domain for the branch Var
      if possibleValues.length > 0
        possibleValues.unshift 0 unless required
        domain = domain_from_list possibleValues
      else
        throw new Error "PathSolver: no possible values???"
        domain = domain_create_zero()
      branchVar.domain = domain

      if depth is 0
        @vars.root = branchVar

      #if branchName isnt @rootBranchName
      @addVar branchVar

      # root branch must be on
      if branchVar?.id is @rootBranchName
        @['=='] branchVar, @num 1

      if parentBranchVar?

        # if optional
        if optional
          # must be off if parent is off,
          # but if off, parent can be on
          unless parentIsRoot or parentBranchVar?.required
            @['>='](
              @['==?'](branchVar, @num 0),
              @['==?'](parentBranchVar, @num 0)
            )
        # if branch is required
        else if required or parentIsRoot
          # branch is on
          @['>='](branchVar, @num 1)
          # parent branch must be parentValue as well
          @['=='](parentBranchVar, @num parentValue) unless parentIsRoot or parentBranchVar?.required
        else
          # branch is on if parent is parentValue
          @['=='](
            @['>=?'](branchVar, @num 1),
            @['==?'](parentBranchVar, @num parentValue)
          )

        parentBranchVar.children.push branchVar
        parentBranchVar.childByName[branchName] = branchVar


      isLeaf = true

      if paths?
        {path} = branch

        for pName, pIndex in paths
          childBranches = path?[pName]?.children
          if childBranches?
            isLeaf = false
            branchValue = branchVar.pathMeta[pName].value
            for childBranch in childBranches
              depth++
              @_compileTree childBranch, branchRules, branchVar, branchValue, depth
          #else
          #  @leafCount ?= 0
          #  childBranch = {branchName:"__LEAF__", branchId:"LEAF_#{@leafCount}", _type:'leaf'}
          #  @leafCount++
          #  # create leaf node
          #  @_compileTree childBranch, branchRules, branchVar, branchValue+1, pathData, depth++

      branchVar.isLeaf = isLeaf

      branchVar

  FD.PathSolver = PathSolver
