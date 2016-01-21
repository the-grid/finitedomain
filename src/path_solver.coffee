
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
    Bvar
    Domain
    helpers
    Solver
  } = FD

  {
    THROW
  } = helpers

  {
    create_branch_var
  } = Bvar

  {
    domain_create_range
    domain_from_list
    domain_max
  } = Domain

  UNDETERMINED = 0
  NUM = 1
  NAN = 2

  binding_uid = 0

  class PathSolver extends Solver

    constructor: ({rawtree}, o = {}) ->
      super(o)

      @_class = 'path_solver'

      @root_branch_name = rawtree.branchName

      @vars.root = undefined # initialized by compile_tree
      @compile_tree rawtree, o.branchRules

    solutionToPath: (solution) ->
      bvars_by_id = @vars.byId
      path = {}
      for var_id, solution_value of solution
        if solution_value isnt 0
          branch_var = bvars_by_id[var_id]
          if branch_var
            path_name = find_path_for_val_or_throw branch_var.pathMeta, solution_value
            if path_name isnt false
              path[branch_var.branchId] = path_name
      return path

    find_path_for_val_or_throw = (path_meta, value) ->
      for path_name, meta of path_meta
        if meta.value is value
          return path_name
      return false

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

      THROW "PathSolver... ~= ???"
      return
      #return @['=='] e1, e2

    kill: (paths) ->
      for path in paths
        @['=='] path, @num 0
      return

    # an internal thing to make the implementation of the ~ methods more DRY

    '{}~=': (bvars) ->
      # TODO
      # - cache collections by selector!!!!

      bind_name = "__bind#{binding_uid++}__"

      # TOFIX: should the lo of this domain also be the min of all domains?
      @space.decl bind_name, domain_create_range 0, find_max_or_throw bvars

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
        THROW "{}~= Cant find domain for binding"

      return max_domain

    compile_tree: (rawtree, branch_rules) ->
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
      return @_compile_tree(rawtree, branch_rules)

    _compile_tree: (branch, branch_rules, parent_branch_var, parent_value) ->
      {
        branchName: branch_name
        branchId: branch_id
        paths
        _type
        path: branch_path
      } = branch

      unless paths?
        THROW "PathSolver: no possible values??? (no paths)"

      _type ?= 'branch' # can also be 'kill'

      parent_is_root = parent_branch_var and parent_branch_var is @vars.root

      # handle API for required `!` & optional `?` branches
      required = false
      optional = false
      bvar_id = branch_id
      if branch_name.indexOf('!') >= 0
        required = true
        branch_name = branch_name.substr 0, branch_name.indexOf('!')
        bvar_id = branch_id.split('!').join('')
      else if branch_name.indexOf('?') >= 0
        optional = true
        branch_name = branch_name.substr 0, branch_name.indexOf('?')
        bvar_id = branch_id.split('?').join('')
      else if parent_is_root
        required = true
      else if parent_branch_var
        if parent_branch_var.required and parent_branch_var.paths.length is 1
          required = true

      branch_var = create_branch_var(
        bvar_id
        branch_id
        required
        _type
        branch_name
        paths
        parent_branch_var
        parent_value
      )

      valid_branch_values = @add_path_meta_to_bvar branch_var, paths, branch_path, branch_rules
      set_bvar_domain branch_var, valid_branch_values, required

      @addVar branch_var

      if parent_branch_var
        parent_branch_var.children.push branch_var
        parent_branch_var.childByName[branch_name] = branch_var
        @force_parent_child_state branch_var, parent_branch_var, optional, required, parent_is_root, parent_value
      else
        @vars.root = branch_var
        # root branch must be on
        # TOFIX: shouldnt we just init the domain of branch_var to 1 instead?
        @['=='] branch_var, @num 1

      if branch_path
        path_meta = branch_var.pathMeta
        for path_name, path_index in paths
          childBranches = branch_path[path_name]?.children
          if childBranches?
            branch_value = path_meta[path_name].value
            for child_branch in childBranches
              @_compile_tree child_branch, branch_rules, branch_var, branch_value

      return

    add_path_meta_to_bvar: (branch_var, paths, branch_path, branch_rules) ->
      path_type = UNDETERMINED
      valid_branch_values = []

      for path_name, path_index in paths
        path_data = branch_path?[path_name]?.data

        if isNaN path_name
          if path_type is NUM
            THROW "Cant mix numbered paths with nonnumbered paths"
          path_type = NAN
          branchValue = path_index + 1
        else
          if path_type is NAN
            THROW "Cant mix numbered paths with nonnumbered paths"
          path_type = NUM
          branchValue = 1 + parseFloat path_name

        if valid_rules branch_rules, path_data
          # TODO
          # - what if none are valid?  make optional?
          valid_branch_values.push branchValue

        branch_var.pathMeta[path_name] =
          pathIndex: path_index
          value: branchValue
          constant: @num branchValue
          data: path_data
        branch_var.pathNameByValue[branchValue] = path_name

      return valid_branch_values

    valid_rules = (branch_rules, path_data) ->
      path_$class = path_data?.$class
      if branch_rules and path_$class
        for rule in branch_rules
          if rule.$class in path_$class and rule.type is 'kill'
            return false
      return true

    set_bvar_domain = (branch_var, valid_branch_values, required) ->
      unless valid_branch_values.length > 0
        THROW "PathSolver: no possible values???"
        #domain = domain_create_zero()

      unless required # allow zero?
        valid_branch_values.unshift 0
      domain = domain_from_list valid_branch_values
      branch_var.domain = domain

      return

    force_parent_child_state: (branch_var, parent_branch_var, optional, required, parent_is_root, parent_value) ->
      # if optional
      if optional
        # must be off if parent is off,
        # but if off, parent can be on
        unless parent_is_root or parent_branch_var.required
          A = @['==?'] branch_var, @num 0
          B = @['==?'] parent_branch_var, @num 0
          @['>='] A, B
        # if branch is required
      else if required or parent_is_root
        # branch is on
        @['>='] branch_var, @num 1
        # parent branch must be parent_value as well
        unless parent_is_root or parent_branch_var.required
          @['=='] parent_branch_var, @num parent_value
      else
        # branch is on if parent is parent_value
        A = @['>=?'] branch_var, @num 1
        B = @['==?'] parent_branch_var, @num parent_value
        @['=='] A, B

  FD.PathSolver = PathSolver
