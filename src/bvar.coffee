module.exports = (FD) ->

  # This type of var is used in PathSolver

  create_branch_var = (id, branchId, required, type, name, paths, parent, parentValue) ->
    return {
      _class: 'branchvar'
      id
      branchId # string. may be different from id and name
      required # boolean
      type # 'branch', 'kill'
      name # may be different from branchId and id
      paths
      # branch value to path name lookup hash
      pathNameByValue: {}
      # pathMeta:
      #  pathIndex: path_index
      #  value: branch_value
      #  constant: @num branch_value
      #  data: path_data
      pathMeta: {}
      parent # parent bvar if any
      parentValue
      children: []
      childByName: {} # used by multiverse
      # domain should be csis
      domain: undefined
    }

  FD.Bvar = {
    create_branch_var
  }
