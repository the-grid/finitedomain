# Value Distributions
# ======================================================================

# The interface contract for "values" functions is that
# they take a variable name and return a function that will
# impose a sequence of choices on the variable into a given
# space. The returned function (S, n) will commit the given
# space S to a choice for the originally specified variable.
# The returned function's "numChoices" property tells you
# how many choices are available, and the choices are numbered
# from 0 to numChoices-1.
#
# Note that this change of interface has resulted in a noticeable
# performance degradation. My guess is that the degradation is due
# to the computations outside the switch blocks having to execute
# for every choice, whereas in the earlier implementation there
# were only executed once per space.

module.exports = (FD) ->

  {
    domain_collapsed_value
    domain_remove_value
    domain_remove_next_from_list
    domain_equal_next_from_list
  } = FD.Domain

  {
    fdvar_constrain
    fdvar_lower_bound
    fdvar_middle_element
    fdvar_set_domain
    fdvar_upper_bound
  } = FD.Var

  # Markov Helper
  {Markov} = FD.distribute

  # List
  # -----------------------------------------------------------------

  # Searches through a variable's values in order specified in a list.
  # Similar to the "naive" variable distribution, but for values.

  distribute_value_by_list = (S, v, o) ->
    list = o.list
    unless list
      throw new Error "list distribution requires SolverVar #{v} w/ distributeOptions:{list:[]}"

    if typeof list is 'function'
      isDynamic = true
    else
      isDynamic = false

    options = (S, n) ->
      vS = S.vars[v]
      dom = vS.dom
      if isDynamic
        _list = list S, v
      else
        _list = list

      switch n
        when 0
          d = domain_equal_next_from_list dom, _list
          unless d.length
            return null # signifies end of search
          fdvar_set_domain vS, d

        when 1
          d = domain_remove_next_from_list dom, _list
          unless d.length
            return null # signifies end of search
          fdvar_set_domain vS, d

        else
          throw new Error('Invalid choice')

      return S

    options.numChoices = 2
    options


    # Markov
    # -----------------------------------------------------------------

  distribute_value_by_markov = (S, v, o) ->
    {matrix,legend} = o

    S.memory.lastValueByVar ?= {}

    # see Solver.addVar for setup...

    options = (S, n) ->
      vS = S.vars[v]
      dom = vS.dom
      switch n

        when 0
          i = 0
          while i < matrix.length
            row = matrix[i]
            booleanVar = S.vars[row.booleanId]
            if booleanVar
              value = domain_collapsed_value booleanVar.dom
            else
              value = 1
            if value is 1
              break
            i++
          vector = row.vector

          value = Markov.sampleNextFromDomain dom, vector, legend
          if value?

            S.memory.lastValueByVar[v] = value

            fdvar_constrain vS, [ [
              value
              value
            ] ]
            return S

          return null # signifies end of search

        when 1
          d = domain_remove_value dom, S.memory.lastValueByVar[v]
          unless d.length
            return null # signifies end of search
          fdvar_set_domain vS, d
          return S

        else
          throw new Error('Invalid choice')

      return
    options.numChoices = 2
    options


    # Min
    # -----------------------------------------------------------------

    # Searches through a var's values from min to max.

  distribute_value_by_min = (S, v) ->
    options = (S, n) ->
      vS = S.vars[v]
      d = fdvar_lower_bound vS
      switch n
        when 0
          fdvar_constrain vS, [ [
            d
            d
          ] ]
          return S
        when 1
          fdvar_constrain vS, [ [
            d + 1
            fdvar_upper_bound vS
          ] ]
          return S
        else
          throw new Error('Invalid choice')
      return

    options.numChoices = 2
    options


    # Max
    # -----------------------------------------------------------------

    # Searches through a var's values from max to min.

  distribute_value_by_max = (S, v) ->
    options = (S, n) ->
      vS = S.vars[v]
      d = fdvar_upper_bound vS
      switch n
        when 0
          fdvar_constrain vS, [ [
            d
            d
          ] ]
          return S
        when 1
          fdvar_constrain vS, [ [
            fdvar_lower_bound vS
            d - 1
          ] ]
          return S
        else
          throw new Error('Invalid choice')
      return

    options.numChoices = 2
    options


    # Mid
    # -----------------------------------------------------------------

  distribute_value_by_mid = (S, v) ->
    options = (S, n) ->
      fv = S.vars[v]
      d = fdvar_middle_element fv
      if n == 0
        fdvar_constrain fv, [ [
          d
          d
        ] ]
        return S
      else if n == 1
        if d > fdvar_lower_bound fv
          fdvar_constrain fv, [
            [
              fdvar_lower_bound fv
              d - 1
            ]
            [
              d + 1
              fdvar_upper_bound fv
            ]
          ]
          return S
        else
          fdvar_constrain fv, [ [
            d + 1
            fdvar_upper_bound fv
          ] ]
          return S
      else
        throw new Error('Invalid choice')
      return

    options.numChoices = 2
    options


    # splitMin
    # -----------------------------------------------------------------


  distribute_value_by_splitMin = (S, v) ->
    options = (S, n) ->
      vS = S.vars[v]
      d = vS.dom
      m = d[0][0] + d[d.length - 1][1] >> 1
      switch n
        when 0
          fdvar_constrain vS, [ [
            d[0][0]
            m
          ] ]
          return S
        when 1
          fdvar_constrain vS, [ [
            m + 1
            d[d.length - 1][1]
          ] ]
          return S
        else
          throw new Error('Invalid choice')
      return

    options.numChoices = 2
    options


    # splitMax
    # -----------------------------------------------------------------

  distribute_value_by_splitMax = (S, v) ->
    options = (S, n) ->
      vS = S.vars[v]
      d = vS.dom
      m = d[0][0] + d[d.length - 1][1] >> 1
      switch n
        when 0
          fdvar_constrain vS, [ [
            m + 1
            d[d.length - 1][1]
          ] ]
          return S
        when 1
          fdvar_constrain vS, [ [
            d[0][0]
            m
          ] ]
          return S
        else
          throw new Error('Invalid choice')
      return

    options.numChoices = 2
    options


    # WIP...
    # -----------------------------------------------------------------

  distribute_value_by_random = (S, v) ->
    valDistribution.minMaxCycle(S, v)

  distribute_value_by_minMaxCycle = (S, v) ->
    vars = S.solver.vars
    cycle = vars.all.indexOf(vars.byId[v]) % 2
    if cycle is 0
      method = distribute_value_by_min S, v
    else # if cycle is 1
      method = distribute_value_by_max S, v
    return method

  return FD.distribute.Value = {
    distribute_value_by_list
    distribute_value_by_markov
    distribute_value_by_max
    distribute_value_by_min
    distribute_value_by_minMaxCycle
    distribute_value_by_mid
    distribute_value_by_random
    distribute_value_by_splitMax
    distribute_value_by_splitMin
  }
