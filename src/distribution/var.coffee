module.exports = do ->

  {
    ASSERT
    THROW
  } = require '../helpers'

  {
    fdvar_is_undetermined
    fdvar_lower_bound
    fdvar_size
    fdvar_upper_bound
  } = require '../fdvar'

  # BODY_START

  BETTER = 1
  SAME = 2
  WORSE = 3

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

    # if it's a function it should return the name of the next var to process
    if typeof config_next_var_func is 'function'
      return config_next_var_func space, target_vars

    dist_name = config_next_var_func

    # if it's an object it's a more complex config
    if typeof config_next_var_func is 'object'
      dist_name = config_next_var_func.dist_name

    switch dist_name
      when 'naive'
        is_better_var = null
      when 'size'
        is_better_var = _distribution_var_by_min_size
      when 'min'
        is_better_var = _distribution_var_by_min
      when 'max'
        is_better_var = _distribution_var_by_max
      when 'throw'
        ASSERT false, 'not expecting to pick this distributor'
      when 'markov'
        is_better_var = _distribution_var_by_markov
      when 'list'
        is_better_var = _distribution_var_by_list
      else
        THROW 'unknown next var func', dist_name

    config_var_filter = root_space.config_var_filter_func
    if config_var_filter and typeof config_var_filter isnt 'function'
      switch config_var_filter
        when 'unsolved'
          config_var_filter = fdvar_is_undetermined
        else
          THROW 'unknown var filter', config_var_filter

    return _distribution_var_find_best fdvars, target_vars, is_better_var, config_var_filter, config_next_var_func, root_space

  # Return the best var name according to a fitness function
  # but only if the filter function is okay with it.
  #
  # @param {Fdvar[]} fdvars
  # @param {string[]} names A subset of names that are properties on fdvars
  # @param {Function(fdvar,fdvar)} [fitness_func] Given two fdvars returns true iif the first var is better than the second var
  # @param {Function(fdvar)} [filter_func] If given only consider vars where this function returns true
  # @param {string|Object} config_next_var_func From Space; either the name of the dist or specific options for a var dist
  # @param {Space} root_space
  # @returns {Fdvar}

  _distribution_var_find_best = (fdvars, names, fitness_func, filter_func, config_next_var_func, root_space) ->
    best = ''
    for name, i in names
      fdvar = fdvars[name]
      # TOFIX: if the name is the empty string this could lead to a problem. Must eliminate the empty string as var name

      if !filter_func or filter_func fdvar
        if not best or (fitness_func and BETTER is fitness_func fdvar, best, root_space, config_next_var_func)
          best = fdvar
    return best

  ######
  # preset fitness functions
  ######

  _distribution_var_by_min_size = (v1, v2) ->
    n = fdvar_size(v1) - fdvar_size(v2)
    if n < 0
      return BETTER
    if n > 0
      return WORSE
    return SAME

  _distribution_var_by_min = (v1, v2) ->
    n = fdvar_lower_bound(v1) - fdvar_lower_bound(v2)
    if n < 0
      return BETTER
    if n > 0
      return WORSE
    return SAME

  _distribution_var_by_max = (v1, v2) ->
    n = fdvar_upper_bound(v1) - fdvar_upper_bound(v2)
    if n > 0
      return BETTER
    if n < 0
      return WORSE
    return SAME

  _distribution_var_by_markov = (v1, v2, root_space, config_next_var_func) ->
    # v1 is only, but if so always, better than v2 if v1 is a markov var
    if root_space.config_var_dist_options[v1.id]?.distributor_name is 'markov'
      return BETTER
    if root_space.config_var_dist_options[v2.id]?.distributor_name is 'markov'
      return WORSE

    return _distribution_var_fallback v1, v2, root_space, config_next_var_func.fallback_config

  _distribution_var_by_list = (v1, v2, root_space, config_next_var_func) ->
    # note: config.priority_hash is compiled by Solver#prepare from given priority_list
    # if in the list, lowest prio can be 1. if not in the list, prio will be undefined
    hash = config_next_var_func.priority_hash

    # if v1 or v2 is not in the list they will end up as undefined
    p1 = hash[v1.id]
    p2 = hash[v2.id]

    ASSERT p1 isnt 0, 'index 0 should never be used'
    ASSERT p2 isnt 0, 'index 0 should never be used'

    unless p1 or p2
      # either p1 and p2 both dont exist on the list, or ... well no that's it
      return _distribution_var_fallback v1, v2, root_space, config_next_var_func.fallback_config

    # invert this operation? ("deprioritizing").
    inverted = config_next_var_func.inverted

    # if inverted being on the list makes it worse than not.

    if !p2
      if inverted
        return WORSE
      return BETTER
    if !p1
      if inverted
        return BETTER
      return WORSE

    # if inverted being low on the list makes it better

    if p1 > p2
      if inverted
        return WORSE
      return BETTER
    if p2 > p1
      if inverted
        return BETTER
      return WORSE

    ASSERT p1 isnt p2, 'cant have same indexes, would mean same item is compared'
    ASSERT false, 'not expecting to reach here', p1, p2, v1, v2, hash
    return SAME

  _distribution_var_fallback = (v1, v2, root_space, config) ->
    unless config
      return SAME

    if typeof config is 'string'
      dist_name = config
    else if typeof config is 'object'
      dist_name = config.dist_name
      unless dist_name
        THROW "Missing fallback var distribution name: #{JSON.stringify config}"
    else if typeof config is 'function'
      return config v1, v2, root_space
    else
      THROW 'Unexpected fallback config', config

    switch dist_name
      when 'size'
        return _distribution_var_by_min_size v1, v2
      when 'min'
        return _distribution_var_by_min v1, v2
      when 'max'
        return _distribution_var_by_max v1, v2
      when 'throw'
        THROW 'nope'
      when 'markov'
        return _distribution_var_by_markov v1, v2, root_space, config
      when 'list'
        return _distribution_var_by_list v1, v2, root_space, config
      else
        THROW "Unknown var dist fallback name: #{dist_name}"

    ASSERT false, 'should not reach here'
    return

  # BODY_STOP

  return {
    BETTER
    SAME
    WORSE

    distribution_get_next_var

    # __REMOVE_BELOW_FOR_DIST__
    # for testing
    _distribution_var_list: _distribution_var_by_list
    _distribution_var_max: _distribution_var_by_max
    _distribution_var_markov: _distribution_var_by_markov
    _distribution_var_min: _distribution_var_by_min
    _distribution_var_size: _distribution_var_by_min_size
    _distribution_var_throw: (s) -> THROW s
    _distribution_var_fallback: _distribution_var_fallback
    # __REMOVE_ABOVE_FOR_DIST__
  }
