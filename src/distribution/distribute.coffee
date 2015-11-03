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
    undetermined_names = []
    for var_name in var_names
      ASSERT !fdvar_is_rejected(S.vars[var_name]), 'fdvar should not be rejected at this point, but may be solved'
      unless fdvar_is_solved S.vars[var_name] # if we do the lookup anyways, why not just return fdvars instead?
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

  create_fixed_distributor = (options) ->
    options = create_distributor_options options

    # partial application by proxy (-> closure)
    distribution_create_distributor_on_space = (S, varnames) ->
      return create_distributor_on_space S, varnames, options

    return distribution_create_distributor_on_space

  create_custom_distributor = (space, var_names, options) ->
    options = create_distributor_options options
    return create_distributor_on_space space, var_names, options

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

  # Return best var according to some fitness function `is_better_var`
  # Note that this function originates from `get_distributor_var_func()`

  get_next_var = (space, vars, is_better_var) ->
    if vars.length is 0
      return null

    for var_i, i in vars
      if i is 0
        first = var_i
      else unless is_better_var space, first, var_i
        first = var_i

    return first

  # options: {filter:[Function], var:string|Function, val:string|Function}

  create_distributor_on_space = (root_space, initial_var_names, options) ->
    get_target_vars = if typeof options.filter is 'function' then options.filter else distribution_get_undetermined_var_names
    var_fitness_func = if typeof options.var == 'string' then get_distributor_var_func options.var else options.var
    get_next_value = if typeof options.val == 'string' then get_distributor_value_func options.val else options.val

    unless get_target_vars and var_fitness_func and get_next_value
      throw new Error "create_distributor_on_space: Invalid options - #{get_target_vars?}, #{var_fitness_func?}, #{get_next_value?}"

    varsById = root_space.solver?.vars?.byId

    # This is the actual search strategy being applied by Space root_space
    # Should return something from FD.distribution.Value
    # TODO: we may want to move this function to Space directly? I'm not sure we use any others, regardless of intent

    root_space.get_value_distributor = (current_space) ->
      var_names = get_target_vars current_space, initial_var_names
      if var_names.length > 0
        var_name = get_next_var current_space, var_names, var_fitness_func

        # D4:
        # - now, each var can define it's own value distribution, regardless of default
        if varsById
          # note: this is not the same as current_space.vars[var_name] because that wont have the distribute property
          fdvar = varsById[var_name]
          if fdvar
            value_distributor = fdvar.distribute
            if value_distributor
              return (get_distributor_value_func value_distributor) root_space, var_name, fdvar.distributeOptions
        if var_name
          return get_next_value current_space, var_name
      return false

    return

  # TOFIX: to improve later
  distribution = FD.distribution
  distribution.create_fixed_distributor = create_fixed_distributor
  # for fd.js API compat:
  distribution.naive = create_fixed_distributor('naive')
  distribution.fail_first = create_fixed_distributor('fail_first')
  distribution.split = create_fixed_distributor('split')

  # for testing only
  distribution.create_custom_distributor = create_custom_distributor

  return
