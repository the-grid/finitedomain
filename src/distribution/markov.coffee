# Markov Distribution Helpers
### ======================================================================

  Helpers for Markov-style probabilistic value & var distributions.

###


###

markov =
  legend: ['small','med','large']
  matrix: [
      vector:[.5,1,1], condition: (S,varId) ->
        prev = S.readMatrix(varId, S.cursor() - 1 )
        return S.isEqual prev, 'small'
    ,
      vector:[1,1,1], condition: -> true
  ]


markov =
  legend: ['small','med','large']
  matrix: [
      vector:[.5,1,1], condition: (S,varId) ->
        prev = S.readMatrix(varId, S.cursor() - 1 )
        result =
          value: S.isEqual prev, 'small'
          deps: ...
        return result
    ,
      vector:[1,1,1], condition: -> true
  ]

Inhomogenous Markov chains [see](https://cw.fel.cvut.cz/wiki/_media/courses/a6m33bin/markov-chains-2.pdf)

in an inhomogeneous Markov model, we can have different distributions at different positions in the sequence

https://en.wikipedia.org/wiki/Markov_chain#Music
###


module.exports = (FD) ->

  {
    ASSERT
  } = FD.helpers

  {
    domain_contains_value
    domain_to_list
  } = FD.Domain

  {
    fdvar_is_value
  } = FD.Fdvar

  # Given a domain, probability vector, value legend, and rng
  # function; return one of the values in the value legend
  # according to the outcome of the rng and considering the
  # prob weight of each value in the legend.
  # The rng should be normalized (returning values from 0 including
  # up to but not including 1), unless the argument says otherwise
  # (that is used for testing only, to get around rounding errors).
  #
  # @param {number[]} domain A regular fdvar domain. It's values only determine whether a legend value can be used, it may have values that can never be picked. It's only a filter mask.
  # @param {number[]} prob_vector List of probabilities, maps 1:1 to val_legend.
  # @param {number[]} val_legend List of values eligible for picking. Maps 1:1 to prob_vector. Only values in the current domain are actually eligible.
  # @param {boolean} [rng_is_normalized=true] Is 0<=rng()<1 or 0<=rng()<total_prob ? The latter is only used for testing to avoid rounding errors.
  # @return {number | undefined}

  distribution_markov_sampleNextFromDomain = (domain, prob_vector, val_legend, random_func, rng_is_normalized=true) ->
    ASSERT !!val_legend, 'expecting val_legend thanks to expandVectorsWith', val_legend
    ASSERT prob_vector.length <= val_legend.length, 'expecting prob_vector to be smaller or equal length of val_legend', prob_vector, val_legend

    # make vector & legend for available values only
    filtered_legend = []
    cumulative_filtered_prob_vector = []
    total_prob = 0
    for prob, index in prob_vector
      if prob > 0
        value = val_legend[index]
        if domain_contains_value domain, value
          total_prob += prob
          cumulative_filtered_prob_vector.push total_prob
          filtered_legend.push value

    # no more values left to search
    if cumulative_filtered_prob_vector.length is 0
      return

    # only one value left
    if cumulative_filtered_prob_vector.length is 1
      return filtered_legend[0]

    # TOFIX: could set `cumulative_filtered_prob_vector[cumulative_filtered_prob_vector.length-1] = 1` here...

    return roll random_func, total_prob, cumulative_filtered_prob_vector, filtered_legend, rng_is_normalized

  # rng is a function ("random number generator"), which is usually normalized, but in tests may not be
  # the prob vector maps 1:1 to the value legend
  # cumulative_prob_vector is: `[prob0, prob0+prob1, prob0+prob1+prob2, etc]`

  roll = (rng, total_prob, cumulative_prob_vector, value_legend, rng_is_normalized) ->

    rng_roll = rng()
    prob_val = rng_roll
    if rng_is_normalized # 0 <= rng < 1
      ASSERT rng_roll >= 0, 'expecting random() to be above or equal to zero', rng_roll, total_prob, prob_val
      ASSERT rng_roll < 1, 'expecting random() to be below one', rng_roll, total_prob, prob_val
      prob_val = rng_roll * total_prob
    # else 0 <= rng < total_prob (mostly to avoid precision problems in tests)
    ASSERT !rng_is_normalized or rng_roll < total_prob, 'bad test: roll is higher than total prob (cannot used unnormalized roll if domain filters out options!)', rng_roll, total_prob, prob_val

    for prob, index in cumulative_prob_vector
      # note: if first element is 0.1 and roll is 0.1 this will pick the
      # SECOND item. by design. so prob domains are `[x, y)`
      if prob > prob_val
        break

    return value_legend[index]

  # If a row has no boolean condition, return it.
  # If the boolean condition of a row is 1, return it.
  # If no row meets these conditions, return the last row.

  distribution_markov_get_next_row_to_solve = (space, matrix) ->
    vars = space.vars
    for row in matrix
      bool_var = vars[row.booleanId]
      if !bool_var or fdvar_is_value bool_var, 1
        break
    return row

  distribution_markov_merge_domain_and_legend = (input_legend, domain) ->
    if input_legend
      legend = input_legend.slice 0
    else
      legend = []

    for val in domain_to_list domain
      if legend.indexOf(val) < 0
        legend.push val

    return legend

  FD.distribution.Markov = {
    distribution_markov_get_next_row_to_solve
    distribution_markov_merge_domain_and_legend
    distribution_markov_sampleNextFromDomain
  }
