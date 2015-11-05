# Distribution strategies

module.exports = (FD) ->

  # Variable & Value Distribution Strategies
  # -----------------------------------------------------------------

  {
    ASSERT
  } = FD.helpers

  {
    distribution_presets
  } = FD.distribution

  {
    distribution_value_by_list
    distribution_value_by_markov
    distribution_value_by_max
    distribution_value_by_min
    distribution_value_by_min_max_cycle
    distribution_value_by_mid
    distribution_value_by_split_max
    distribution_value_by_split_min
  } = FD.distribution.Value

  {
    distribution_var_max
    distribution_var_min
    distribution_var_naive
    distribution_var_size
  } = FD.distribution.Var

  {
    fdvar_is_rejected
    fdvar_is_solved
  } = FD.Var

  distribution_get_undetermined_var_names = (S, var_names) ->
    svars = S.vars
    undetermined_names = []
    for var_name in var_names
      fdvar = svars[var_name]
      ASSERT !fdvar_is_rejected(fdvar), 'fdvar should not be rejected at this point, but may be solved'
      # TOFIX: we can drop the fdvar_is_solved check if we make sure `was_solved` is properly set all the time... meh
      unless fdvar.was_solved or fdvar_is_solved fdvar # if we do the lookup anyways, why not just return fdvars instead?
        undetermined_names.push var_name
    return undetermined_names

  create_distributor_options = (options) ->
    if typeof options is 'string'
      return distribution_presets[options]
    if !options?
      return distribution_presets.default

    # apply defaults
    for key, val of distribution_presets.default
      options[key] ?= val

    return options

  create_custom_distributor = (space, var_names, options) ->
    return create_distributor_on_space space, var_names, create_distributor_options options

  get_distributor_value_func = (name) ->
    switch name
      when 'list'
        return distribution_value_by_list
      when 'markov'
        return distribution_value_by_markov
      when 'max'
        return distribution_value_by_max
      when 'min'
        return distribution_value_by_min
      when 'minMaxCycle'
        return distribution_value_by_min_max_cycle
      when 'mid'
        return distribution_value_by_mid
      when 'splitMax'
        return distribution_value_by_split_max
      when 'splitMin'
        return distribution_value_by_split_min
      else
        throw new Error 'unknown value order type ['+name+']'

  get_distributor_var_func = (name) ->
    switch name
      when 'naive'
        return distribution_var_naive
      when 'size'
        return distribution_var_size
      when 'min'
        return distribution_var_min
      when 'max'
        return distribution_var_max
      else
        throw new Error 'unknown order func ['+name+']'

  # options: {filter:[Function], var:string|Function, val:string|Function}

  create_distributor_on_space = (root_space, initial_targeted_var_names, options) ->
    ASSERT !root_space.get_targeted_var_names, 'should not be set'
    ASSERT !root_space.get_var_fitness, 'should not be set'
    ASSERT !root_space.get_next_value, 'should not be set'

    root_space.get_targeted_var_names = if typeof options.filter is 'function' then options.filter else distribution_get_undetermined_var_names
    root_space.get_var_fitness = if typeof options.var == 'string' then get_distributor_var_func options.var else options.var
    root_space.get_next_value = if typeof options.val == 'string' then get_distributor_value_func options.val else options.val
    root_space.initial_targeted_var_names = initial_targeted_var_names
    root_space.markov_vars_by_id = root_space.solver?.vars?.byId

    ASSERT root_space.get_targeted_var_names, 'should be set'
    ASSERT root_space.get_var_fitness, 'should be set'
    ASSERT root_space.get_next_value, 'should be set'

    return

  distribution_naive = (space, var_names) ->
    return create_custom_distributor space, var_names, 'naive'

  distribution_fail_first = (space, var_names) ->
    return create_custom_distributor space, var_names, 'fail_first'

  distribution_split = (space, var_names) ->
    return create_custom_distributor space, var_names, 'split'

  # TOFIX: to improve later
  distribution = FD.distribution
  distribution.create_custom_distributor = create_custom_distributor
  distribution.get_distributor_value_func = get_distributor_value_func

  # for fd.js API compat (should change this dynamic behavior
  # to something we can trace and control more easily)
  distribution.naive = distribution_naive
  distribution.fail_first = distribution_fail_first
  distribution.split = distribution_split

  return
