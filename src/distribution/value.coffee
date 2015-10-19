# Value Distributions
# ======================================================================

module.exports = (FD) ->

  {
    NO_SUCH_VALUE

    ASSERT
  } = FD.helpers

  {
    domain_contains_value
    domain_is_determined
    domain_is_value
    domain_max
    domain_min
    domain_remove_value
    domain_remove_next_from_list
    domain_get_value_of_first_contained_value_in_list
  } = FD.Domain

  {
    distribution_markov_sampleNextFromDomain
  } = FD.distribution.Markov

  {
    fdvar_constrain
    fdvar_constrain_to_range
    fdvar_lower_bound
    fdvar_middle_element
    fdvar_set_domain
    fdvar_set_value_inline
    fdvar_upper_bound
  } = FD.Var

  FIRST_CHOICE = 0
  SECOND_CHOICE = 1

  TWO_CHOICES = 2

  # Searches through a variable's values in order specified in a list.
  # Similar to the "naive" variable distribution, but for values.

  distribution_value_by_list = (S, var_name, options) ->
    list = options.list
    unless list
      throw new Error "list distribution requires SolverVar #{v} w/ distributeOptions:{list:[]}"

    isDynamic = typeof list is 'function'

    value_distribution_by_list = (parent_space, current_choice_index) ->
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
          fdvar_set_value_inline fdvar, value

        when SECOND_CHOICE
          new_domain = domain_remove_next_from_list fdvar.dom, _list
          unless new_domain and new_domain.length
            return # signifies end of search
          fdvar_set_domain fdvar, new_domain

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_distribution_by_list

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

  # options is fdvar.distributeOptions for the fdvar with var_name in root_space

  distribution_value_by_markov = (root_space, var_name, options) ->
    {
      matrix
      legend
    } = options

    # TOFIX: are we going to want to set/access lastValueByVar externally? otherwise drop the `memory` struct
    unless root_space.memory
      root_space.memory = {}
    unless root_space.memory.lastValueByVar
      root_space.memory.lastValueByVar = {}
    lastValueByVar = root_space.memory.lastValueByVar

    # see Solver.addVar for setup...

    value_distribution_by_markov = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]

      switch current_choice_index
        when FIRST_CHOICE
          row = get_next_row_to_solve space, matrix
          value = distribution_markov_sampleNextFromDomain fdvar.dom, row.vector, legend
          unless value?
            return # signifies end of search
          ASSERT domain_contains_value(fdvar.dom, value), 'markov picks the value from the existing domain' # the update below assumes this (skips constrain for this assumption)
          lastValueByVar[var_name] = value
          # it is assumed that markov picks its value from the existing domain, so a direct update should be fine
          fdvar_set_value_inline fdvar, value

        when SECOND_CHOICE
          new_domain = domain_remove_value fdvar.dom, lastValueByVar[var_name]
          unless new_domain and new_domain.length
            return # signifies end of search
          fdvar_set_domain fdvar, new_domain

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_distribution_by_markov

  # Searches through a var's values from min to max.

  distribution_value_by_min = (S, var_name) ->
    value_distribution_by_min = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      low = fdvar_lower_bound fdvar

      ASSERT !domain_is_determined(fdvar.dom), 'should not be "solved" nor "rejected"'

      switch current_choice_index
        when FIRST_CHOICE
          # note: caller should ensure fdvar is not yet solved nor rejected, so this cant fail
          fdvar_set_value_inline fdvar, low

        when SECOND_CHOICE
          # note: caller should ensure fdvar is not yet solved nor rejected, so this cant fail
          # (because low can only be SUP if the domain is solved which we assert it cannot be)
          # note: must use some kind of intersect here (there's a test if you mess this up :)
          # TOFIX: how does this consider _all_ the values in the fdvar? doesn't it just stop after this?
          # TOFIX: improve performance, this cant fail so constrain is not needed (but you must intersect!)
          fdvar_constrain_to_range fdvar, low + 1, fdvar_upper_bound fdvar

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_distribution_by_min

  # Searches through a var's values from max to min.

  distribution_value_by_max = (S, var_name) ->
    value_distribution_by_max = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      hi = fdvar_upper_bound fdvar

      ASSERT !domain_is_determined(fdvar.dom), 'should not be "solved" nor "rejected"'

      switch current_choice_index
        when FIRST_CHOICE
          # Note: this is not determined so the operation cannot fail
          fdvar_set_value_inline fdvar, hi

        when SECOND_CHOICE
          # Note: this is not determined so the operation cannot fail
          # note: must use some kind of intersect here (there's a test if you mess this up :)
          # TOFIX: how does this consider _all_ the values in the fdvar? doesn't it just stop after this?
          # TOFIX: improve performance, this cant fail so constrain is not needed (but you must intersect!)
          fdvar_constrain_to_range fdvar, fdvar_lower_bound(fdvar), hi - 1

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_distribution_by_max

  distribution_value_by_mid = (S, var_name) ->
    value_distribution_by_mid = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]
      middle = fdvar_middle_element fdvar

      ASSERT !domain_is_determined(fdvar.dom), 'should not be "solved" nor "rejected"'

      switch current_choice_index
        when FIRST_CHOICE
          # Note: fdvar is not determined so the operation cannot fail
          fdvar_set_value_inline fdvar, middle

        when SECOND_CHOICE
          lob = fdvar_lower_bound fdvar
          upb = fdvar_upper_bound fdvar
          arr = []
          if middle > lob
            arr.push lob, middle - 1
          if middle < upb
            arr.push middle + 1, upb
          # Note: fdvar is not determined so the operation cannot fail
          # note: must use some kind of intersect here (there's a test if you mess this up :)
          # TOFIX: how does this consider _all_ the values in the fdvar? doesn't it just stop after this?
          # TOFIX: improve performance, this cant fail so constrain is not needed (but you must intersect!)
          fdvar_constrain fdvar, arr

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_distribution_by_mid


  distribution_value_by_split_min = (S, var_name) ->
    value_distribution_by_split_min = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]

      ASSERT !domain_is_determined(fdvar.dom), 'should not be "solved" nor "rejected"'

      domain = fdvar.dom
      min = domain_min domain
      max = domain_max domain
      mmhalf = min + max >> 1

      switch current_choice_index
        when FIRST_CHOICE
          # Note: fdvar is not determined so the operation cannot fail
          # Note: this must do some form of intersect, though maybe not constrain
          fdvar_constrain_to_range fdvar, min, mmhalf

        when SECOND_CHOICE
          # Note: fdvar is not determined so the operation cannot fail
          # Note: this must do some form of intersect, though maybe not constrain
          fdvar_constrain_to_range fdvar, mmhalf + 1, max

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_distribution_by_split_min

  distribution_value_by_split_max = (S, var_name) ->
    value_distribution_by_split_max = (parent_space, current_choice_index) ->
      if current_choice_index >= TWO_CHOICES
        return

      space = parent_space.clone()
      fdvar = space.vars[var_name]

      ASSERT !domain_is_determined(fdvar.dom), 'should not be "solved" nor "rejected"'

      domain = fdvar.dom
      min = domain_min domain
      max = domain_max domain
      mmhalf = min + max >> 1

      switch current_choice_index
        when FIRST_CHOICE
          # Note: fdvar is not determined so the operation cannot fail
          # Note: this must do some form of intersect, though maybe not constrain
          fdvar_constrain_to_range fdvar, mmhalf + 1, max

        when SECOND_CHOICE
          # Note: fdvar is not determined so the operation cannot fail
          # Note: this must do some form of intersect, though maybe not constrain
          fdvar_constrain_to_range fdvar, min, mmhalf

        else
          throw new Error "Invalid choice value [#{current_choice_index}]"

      return space

    return value_distribution_by_split_max


  # WIP...
  # -----------------------------------------------------------------

  distribution_value_by_min_max_cycle = (S, var_name) ->
    vars = S.solver.vars
    cycle = vars.all.indexOf(vars.byId[var_name]) % 2
    if cycle is 0
      return distribution_value_by_min S, var_name
    else # if cycle is 1
      return distribution_value_by_max S, var_name

  return FD.distribution.Value = {
    distribution_value_by_list
    distribution_value_by_markov
    distribution_value_by_max
    distribution_value_by_min
    distribution_value_by_min_max_cycle
    distribution_value_by_mid
    distribution_value_by_split_max
    distribution_value_by_split_min
  }
