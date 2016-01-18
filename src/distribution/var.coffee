module.exports = (FD) ->

  {
    ASSERT
    THROW
  } = FD.helpers

  {
    fdvar_is_undetermined
    fdvar_lower_bound
    fdvar_size
    fdvar_upper_bound
  } = FD.Fdvar


  # Given a list of variables return the next var to consider based on the
  # current var distribution configuration and an optional filter condition.
  #
  # @param {Space} root_space
  # @param {Space} space
  # @param {Fdvar[]} target_vars
  # @returns {Fdvar}

  distribution_get_next_var = (root_space, space, target_vars) ->
    config_next_var_func = root_space.config_next_var_func
    fdvars = space.vars

    if typeof config_next_var_func is 'function'
      return config_next_var_func space, target_vars

    switch config_next_var_func
      when 'naive'
        is_better_var = null
      when 'size'
        is_better_var = by_size
      when 'min'
        is_better_var = by_min
      when 'max'
        is_better_var = by_max
      when 'throw'
        ASSERT false, 'not expecting to pick this distributor'
      when 'markov'
        is_better_var = by_markov
      when 'list'
        is_better_var = by_list
      else
        THROW 'unknown next var func', config_next_var_func

    config_var_filter = root_space.config_var_filter_func
    if config_var_filter and typeof config_var_filter isnt 'function'
      switch config_var_filter
        when 'unsolved'
          config_var_filter = fdvar_is_undetermined
        else
          THROW 'unknown var filter', config_var_filter

    return find_best fdvars, target_vars, is_better_var, config_var_filter, root_space

  # Return the best var name according to a fitness function
  # but only if the filter function is okay with it.
  #
  # @param {Fdvar[]} fdvars
  # @param {string[]} names A subset of names that are properties on fdvars
  # @param {Function(fdvar,fdvar)} [fitness_func] Given two fdvars returns true iif the first var is better than the second var
  # @param {Function(fdvar)} [filter_func] If given only consider vars where this function returns true
  # @param {Space} root_space
  # @returns {Fdvar}

  find_best = (fdvars, names, fitness_func, filter_func, root_space) ->
    best = ''
    for name, i in names
      fdvar = fdvars[name]
      # TOFIX: if the name is the empty string this could lead to a problem. Must eliminate the empty string as var name
      if (!filter_func or filter_func fdvar) and (!best or (fitness_func and fitness_func fdvar, best, root_space))
        best = fdvar
    return best

  ######
  # preset fitness functions
  ######

  by_size = (v1, v2) ->
    return fdvar_size(v1) < fdvar_size(v2)

  by_min = (v1, v2) ->
    return fdvar_lower_bound(v1) < fdvar_lower_bound(v2)

  by_max = (v1, v2) ->
    return fdvar_upper_bound(v1) > fdvar_upper_bound(v2)

  by_markov = (v1, v2, root_space) ->
    # v1 is only, but if so always, better than v2 if v1 is a markov var
    return root_space.config_var_dist_options[v1.id]?.distributor_name is 'markov'

  by_list = (v1, v2, root_space) ->
    # note: config_var_priority_hash is compiled by Solver#prepare
    # if in the list, lowest prio is 1. if not in the list, prio will be undefined
    hash = root_space.config_var_priority_hash

    p1 = hash[v1.id]
    if !p1
      return false
    p2 = hash[v2.id]
    return !p2 or p1 > p2

  FD.distribution.var = {
    distribution_get_next_var

    _distribution_var_max: by_max
    _distribution_var_min: by_min
    _distribution_var_size: by_size
  }
