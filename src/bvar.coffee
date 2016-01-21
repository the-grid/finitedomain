module.exports = do ->

  # BODY_START

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
      # set by multiverse Matrix and Constraints, for example the list, matrix, or legend
      distributeOptions: undefined
    }

  # BODY_STOP

  return {
    create_branch_var
  }
