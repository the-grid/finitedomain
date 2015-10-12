# Distribution strategies

module.exports = (FD) ->

  # Variable & Value Distribution Strategies
  # -----------------------------------------------------------------


  {
    distribute_presets
  } = FD.distribute

  {
    distribute_value_by_list
    distribute_value_by_markov
    distribute_value_by_max
    distribute_value_by_min
    distribute_value_by_min_max_cycle
    distribute_value_by_mid
    distribute_value_by_random
    distribute_value_by_split_max
    distribute_value_by_split_min
  } = FD.distribute.Value

  {
    distribute_var_max
    distribute_var_min
    distribute_var_naive
    distribute_var_size
  } = FD.distribute.Var

  {
    fdvar_is_undetermined
  } = FD.Var

  distribute_get_undetermined_var_names = (S, var_names) ->
    undetermined_names = []
    for var_name in var_names
      if fdvar_is_undetermined S.vars[var_name] # if we do the lookup anyways, why not just return fdvars instead?
        undetermined_names.push var_name
    return undetermined_names

  # Distribute
  # -----------------------------------------------------------------

  FD.distribute = distribute = (options) ->
    if typeof options is 'string'
      options = distribute_presets[options]
    else if !options?
      options = distribute_presets.default
    else
      # apply defaults
      for key, val of distribute_presets.default
        options[key] ?= val

    distribute_setup_choicer = (S, varnames) ->
      return setup_choice_func S, varnames, options

    return distribute_setup_choicer

  # for fd.js API compat:
  distribute.naive = distribute('naive')
  distribute.fail_first = distribute('fail_first')
  distribute.split = distribute('split')

  get_value_func = (name) ->
    switch name
      when 'list'
        return distribute_value_by_list
      when 'markov'
        return distribute_value_by_markov
      when 'max'
        return distribute_value_by_max
      when 'min'
        return distribute_value_by_min
      when 'minMaxCycle'
        return distribute_value_by_min_max_cycle
      when 'mid'
        return distribute_value_by_mid
      when 'random'
        return distribute_value_by_random
      when 'splitMax'
        return distribute_value_by_split_max
      when 'splitMin'
        return distribute_value_by_split_min
      else
        throw new Error 'unknown value order type ['+name+']'

  get_order_func = (name) ->
    switch name
      when 'naive'
        return distribute_var_naive
      when 'size'
        return distribute_var_size
      when 'min'
        return distribute_var_min
      when 'max'
        return distribute_var_max
      else
        throw new Error 'unknown order func ['+name+']'

  # Return best var according to some fitness function `is_better_var`
  # Note that this function originates from `get_order_func()`

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

  setup_choice_func = (root_space, initial_var_names, options) ->
    get_target_vars = if typeof options.filter is 'function' then options.filter else distribute_get_undetermined_var_names
    var_fitness_func = if typeof options.var == 'string' then get_order_func options.var else options.var
    get_next_value = if typeof options.val == 'string' then get_value_func options.val else options.val

    unless get_target_vars and var_fitness_func and get_next_value
      throw new Error "setup_choice_func: Invalid options - #{get_target_vars?}, #{var_fitness_func?}, #{get_next_value?}"

    varsById = root_space.solver?.vars?.byId

    # This is the actual search strategy being applied by Space root_space
    # TODO: we may want to move this function to Space directly? I'm not sure we use any others, regardless of intent

    root_space.distribuate = (current_space) ->
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
              return (get_value_func value_distributor) root_space, var_name, fdvar.distributeOptions
        if var_name
          return get_next_value current_space, var_name
      return false

    root_space

  return FD
