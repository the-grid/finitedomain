module.exports = (FD) ->

  {
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
      else
        THROW 'unknown next var func', config_next_var_func

    config_var_filter = root_space.config_var_filter_func
    if config_var_filter and typeof config_var_filter isnt 'function'
      switch config_var_filter
        when 'unsolved'
          config_var_filter = fdvar_is_undetermined
        else
          THROW 'unknown var filter', config_var_filter

    return find_best fdvars, target_vars, is_better_var, config_var_filter

  # Return the best var name according to a fitness function
  # but only if the filter function is okay with it.
  #
  # @param {Fdvar[]} fdvars
  # @param {string[]} names A subset of names that are properties on fdvars
  # @param {Function(fdvar,fdvar)} [fitness_func] Given two fdvars returns true iif the first var is better than the second var
  # @param {Function(fdvar)} [filter_func] If given only consider vars where this function returns true
  # @returns {Fdvar}

  find_best = (fdvars, names, fitness_func, filter_func) ->
    best = ''
    for name, i in names
      fdvar = fdvars[name]
      # TOFIX: if the name is the empty string this could lead to a problem. Must eliminate the empty string as var name
      if (!filter_func or filter_func fdvar) and (!best or (fitness_func and fitness_func fdvar, best))
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

  FD.distribution.var = {
    distribution_get_next_var

    _distribution_var_max: by_max
    _distribution_var_min: by_min
    _distribution_var_size: by_size
  }
