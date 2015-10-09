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
    distribute_value_by_minMaxCycle
    distribute_value_by_mid
    distribute_value_by_random
    distribute_value_by_splitMax
    distribute_value_by_splitMin
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

  # Filters
  # -----------------------------------------------------------------

  filters =

    undet: (S, varnames) ->
      undetermined_names = []
      for var_name in varnames
        if fdvar_is_undetermined S.vars[var_name]
          undetermined_names.push var_name
      undetermined_names

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

    return (S, varnames) ->
      return distribute.generic S, varnames, options

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
        return distribute_value_by_minMaxCycle
      when 'mid'
        return distribute_value_by_mid
      when 'random'
        return distribute_value_by_random
      when 'splitMax'
        return distribute_value_by_splitMax
      when 'splitMin'
        return distribute_value_by_splitMin
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

  FD.distribute.generic = (S, varnames, spec) ->
    filterfn = if typeof spec.filter == 'string' then filters[spec.filter] else spec.filter
    orderingfn = if typeof spec.var == 'string' then get_order_func spec.var else spec.var
    valuefn = if typeof spec.val == 'string' then get_value_func spec.val else spec.val

    select_by_order = (S, vars, orderingfn) ->
      if vars.length > 0
        if vars.length == 1
          return vars[0]
        i = undefined
        N = undefined
        first = 0
        i = 1
        N = vars.length
        while i < N
          if !orderingfn(S, vars[first], vars[i])
            first = i
          ++i
        vars[first]
      else
        null

    if !filterfn or !orderingfn or !valuefn
      throw new Error "FD.distribute.generic: Invalid spec - #{filterfn?}, #{orderingfn?}, #{valuefn?}"

    # The role of the branch() function is to produce a function (S, n)
    # that will return S with the choice point n committed. The function's
    # 'numChoices' property will tell you how many choices are available.

    varsById = S.solver?.vars?.byId

    # This is the actual search strategy being applied by Space S
    # TODO: we may want to move this function to Space directly? I'm not sure we use any others, regardless of intent

    S.distribuate = (space) ->
      vars = filterfn(space, varnames)
      if vars.length > 0
        v = select_by_order space, vars, orderingfn

        # D4:
        # - now, each var can define it's own value distribution, regardless of default
        if varsById
          varr = varsById[v]
          if varr
            localValueDistributor = varr?.distribute
            if localValueDistributor
              return (get_value_func localValueDistributor) S, v, varr.distributeOptions
        if v
          return valuefn space, v
      return false

    S

  return FD
