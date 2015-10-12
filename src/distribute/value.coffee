# Value Distributions
# ======================================================================

module.exports = (FD) ->

  {
    NO_SUCH_VALUE

    ASSERT
  } = FD.helpers

  {
    domain_create_range
    domain_create_ranges
    domain_create_value
    domain_is_rejected
    domain_is_determined
    domain_is_value
    domain_max
    domain_min
    domain_remove_value
    domain_remove_next_from_list
    domain_get_value_of_first_contained_value_in_list
  } = FD.Domain

  {
    distribute_markov_sampleNextFromDomain
  } = FD.distribute.Markov

  {
    fdvar_constrain
    fdvar_constrain_to_value
    fdvar_lower_bound
    fdvar_middle_element
    fdvar_set_domain
    fdvar_upper_bound
  } = FD.Var

  FIRST_CHOICE = 0
  SECOND_CHOICE = 1

  TWO_CHOICES = 2

  # List
  # -----------------------------------------------------------------

  # Searches through a variable's values in order specified in a list.
  # Similar to the "naive" variable distribution, but for values.

  distribute_value_by_list = (S, var_name, options) ->
    list = options.list
    unless list
      throw new Error "list distribution requires SolverVar #{v} w/ distributeOptions:{list:[]}"

    isDynamic = typeof list is 'function'

    value_choicer_by_list = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      if isDynamic
        _list = list space, var_name
      else
        _list = list

      switch current_choice_index
        when FIRST_CHOICE
          value = domain_get_value_of_first_contained_value_in_list fdvar.dom, _list
          if value is NO_SUCH_VALUE
            return # signifies end of search
          # TODO: would be more efficient to set the domain inline. but right now that causes issues with shared mem.
          fdvar_set_domain fdvar, domain_create_value(value)

        when SECOND_CHOICE
          new_domain = domain_remove_next_from_list fdvar.dom, _list
          unless new_domain and new_domain.length
            return # signifies end of search
          fdvar_set_domain fdvar, new_domain

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_choicer_by_list

  # If a row is not boolean, return it.
  # If a row is boolean and 1, return it.
  # If no row meets these conditions, return the last row.

  get_next_row_to_solve = (space, matrix) ->
    vars = space.vars
    for row in matrix
      is_bool_var = vars[row.booleanId]
      unless is_bool_var
        break
      if domain_is_value is_bool_var.dom, 1
        break
    return row

  # Markov
  # -----------------------------------------------------------------

  distribute_value_by_markov = (S, var_name, options) ->
    {
      matrix
      legend
    } = options

    S.memory.lastValueByVar ?= {}

    # see Solver.addVar for setup...

    value_choicer_by_markov = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      switch current_choice_index
        when FIRST_CHOICE
          row = get_next_row_to_solve space, matrix
          value = distribute_markov_sampleNextFromDomain fdvar.dom, row.vector, legend
          unless value?
            return # signifies end of search
          space.memory.lastValueByVar[var_name] = value
          fdvar_constrain_to_value fdvar, value

        when SECOND_CHOICE
          new_domain = domain_remove_value fdvar.dom, space.memory.lastValueByVar[var_name]
          unless new_domain and new_domain.length
            return # signifies end of search
          fdvar_set_domain fdvar, new_domain

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_choicer_by_markov

  # Min
  # -----------------------------------------------------------------

  # Searches through a var's values from min to max.

  distribute_value_by_min = (S, var_name) ->
    value_choicer_by_min = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      low = fdvar_lower_bound fdvar

      ASSERT !domain_is_determined(fdvar.dom), 'should not be "solved"'

      switch current_choice_index
        when FIRST_CHOICE
          # note: caller should ensure fdvar is not yet solved nor rejected, so this cant fail
          # TOFIX: cannot reject unless domain was already empty; just force update the domain?
          fdvar_constrain_to_value fdvar, low

        when SECOND_CHOICE
          # note: caller should ensure fdvar is not yet solved nor rejected, so this cant fail
          # (because low can only be SUP if the domain is solved)
          # TOFIX: cannot reject; just force update the domain?
          # TOFIX: how does this consider _all_ the values in the fdvar? doesn't it just stop after this?
          fdvar_constrain fdvar, domain_create_range(low + 1, fdvar_upper_bound fdvar)

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_choicer_by_min

  # Max
  # -----------------------------------------------------------------

  # Searches through a var's values from max to min.

  distribute_value_by_max = (S, var_name) ->
    value_choicer_by_max = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      hi = fdvar_upper_bound fdvar

      switch current_choice_index
        when FIRST_CHOICE
          # TOFIX: propagate REJECT
          fdvar_constrain_to_value fdvar, hi

        when SECOND_CHOICE
          # TOFIX: propagate REJECT
          # TOFIX: add test for when hi===0 because that would break
          fdvar_constrain fdvar, domain_create_range(
            fdvar_lower_bound fdvar
            hi - 1
          )

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_choicer_by_max

  # Mid
  # -----------------------------------------------------------------

  distribute_value_by_mid = (S, var_name) ->
    value_choicer_by_mid = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      middle = fdvar_middle_element fdvar

      switch current_choice_index
        when FIRST_CHOICE
          fdvar_constrain_to_value fdvar, middle

        when SECOND_CHOICE
          lob = fdvar_lower_bound fdvar
          upb = fdvar_upper_bound(fdvar)
          arr = []
          if middle > lob
            arr.push lob, middle - 1
          if middle < upb
            arr.push middle + 1, upb
          # TOFIX: optimize temp array away
          # TOFIX: (or at least) propagate REJECT
          fdvar_constrain fdvar, arr

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_choicer_by_mid


  # splitMin
  # -----------------------------------------------------------------

  distribute_value_by_split_min = (S, var_name) ->
    value_choicer_by_split_min = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      domain = fdvar.dom
      min = domain_min domain
      max = domain_max domain
      mmhalf = min + max >> 1

      switch current_choice_index
        when FIRST_CHOICE
          # TOFIX: propagate REJECT
          fdvar_constrain fdvar, domain_create_range(min, mmhalf)

        when SECOND_CHOICE
          # TOFIX: propagate REJECT
          fdvar_constrain fdvar, domain_create_range(mmhalf + 1, max)

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_choicer_by_split_min

  # splitMax
  # -----------------------------------------------------------------

  distribute_value_by_split_max = (S, var_name) ->
    value_choicer_by_split_max = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      domain = fdvar.dom
      min = domain_min domain
      max = domain_max domain
      mmhalf = min + max >> 1

      switch current_choice_index
        when FIRST_CHOICE
          # TOFIX: propagate REJECT
          fdvar_constrain fdvar, domain_create_range(mmhalf + 1, max)

        when SECOND_CHOICE
          # TOFIX: propagate REJECT
          fdvar_constrain fdvar, domain_create_range(min, mmhalf)

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_choicer_by_split_max


  # WIP...
  # -----------------------------------------------------------------

  distribute_value_by_random = (S, var_name) ->
    return valDistribution.minMaxCycle(S, var_name)

  distribute_value_by_min_max_cycle = (S, var_name) ->
    vars = S.solver.vars
    cycle = vars.all.indexOf(vars.byId[var_name]) % 2
    if cycle is 0
      return distribute_value_by_min S, var_name
    else # if cycle is 1
      return distribute_value_by_max S, var_name

  return FD.distribute.Value = {
    distribute_value_by_list
    distribute_value_by_markov
    distribute_value_by_max
    distribute_value_by_min
    distribute_value_by_min_max_cycle
    distribute_value_by_mid
    distribute_value_by_random
    distribute_value_by_split_max
    distribute_value_by_split_min
  }
