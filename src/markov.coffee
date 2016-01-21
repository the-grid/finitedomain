# markov helper functions

module.exports = do ->

  {
    domain_to_list
  } = require './domain'

  {
    fdvar_is_value
  } = require './fdvar'

  # BODY_START

  # If a row has no boolean condition, return it.
  # If the boolean condition of a row is 1, return it.
  # If no row meets these conditions, return the last row.

  markov_get_next_row_to_solve = (space, matrix) ->
    vars = space.vars
    for row in matrix
      bool_var = vars[row.booleanId]
      if !bool_var or fdvar_is_value bool_var, 1
        break
    return row

  markov_create_legend = (merge, input_legend, domain) ->
    if merge
      return markov_merge_domain_and_legend input_legend, domain
    return input_legend

  markov_merge_domain_and_legend = (input_legend, domain) ->
    if input_legend
      legend = input_legend.slice 0
    else
      legend = []

    for val in domain_to_list domain
      if legend.indexOf(val) < 0
        legend.push val

    return legend

  markov_create_prob_vector = (space, matrix, expand_vectors_with, value_count) ->
    row = markov_get_next_row_to_solve space, matrix

    if expand_vectors_with? # could be 0
      prob_vector = row.vector and row.vector.slice(0) or []
      delta = value_count - prob_vector.length
      if delta > 0
        for [0...delta]
          prob_vector.push expand_vectors_with
      return prob_vector

    prob_vector = row.vector
    unless prob_vector
      THROW "distribution_value_by_markov error, each markov var must have a prob vector or use `expandVectorsWith:{Number}`"
    if prob_vector.length isnt value_count
      THROW "distribution_value_by_markov error, vector must be same length of legend or use `expandVectorsWith:{Number}`"
    return prob_vector

  # BODY_STOP

  return {
    markov_create_legend
    markov_create_prob_vector
  }
