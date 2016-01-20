module.exports = do ->

  {
    ASSERT

    REJECTED
    ZERO_CHANGES
  } = require '../helpers'

  {
    fdvar_is_solved
    fdvar_lower_bound
  } = require '../fdvar'

  {
    markov_create_legend
    markov_create_prob_vector
  } = require '../markov'

  # Markov uses a special system for trying values. The domain doesn't
  # govern the list of possible values, only acts as a mask for the
  # current node in the search tree (-> space). But since FD will work
  # based on this domain anyways we will need this extra step to verify
  # whether a solved var is solved to a valid value in current context.
  #
  # Return REJECTED if that is the value is invalid, else ZERO_CHANGES.
  # Every markov variable should have a propagator. Perhaps later
  # there can be one markov propagator that checks all markov vars.

  propagator_markov_step_bare = (space, var_name) ->
    # THIS IS VERY EXPENSIVE IF expand_vectors_with IS ENABLED

    ASSERT typeof var_name is 'string', 'arg should be a string', var_name

    root_space = space.get_root()
    fdvar = space.vars[var_name]

    unless fdvar_is_solved fdvar
      return ZERO_CHANGES

    value = fdvar_lower_bound fdvar # note: solved so lo=hi=value

    config_var_dist_options = root_space.config_var_dist_options
    distribution_options = config_var_dist_options[var_name]

    ASSERT distribution_options, 'var should have a config', var_name, distribution_options or JSON.stringify config_var_dist_options
    ASSERT distribution_options.distributor_name is 'markov', 'var should be a markov var', distribution_options.distributor_name

    domain = fdvar.dom
    var_name = fdvar.id

    expand_vectors_with = distribution_options.expandVectorsWith
    ASSERT distribution_options.matrix, 'there should be a matrix available for every var', distribution_options.matrix or JSON.stringify(fdvar), distribution_options.matrix or JSON.stringify distribution_options
    ASSERT distribution_options.legend or expand_vectors_with?, 'every var should have a legend or expand_vectors_with set', distribution_options.legend or expand_vectors_with? or JSON.stringify(fdvar), distribution_options.legend or expand_vectors_with? or JSON.stringify distribution_options

    # note: expand_vectors_with can be 0, so check with ?
    values = markov_create_legend expand_vectors_with?, distribution_options.legend, domain
    probabilities = markov_create_prob_vector space, distribution_options.matrix, expand_vectors_with, values.length

    pos = values.indexOf value
    if pos >= 0 and pos < probabilities.length and probabilities[pos] isnt 0
      return ZERO_CHANGES
    return REJECTED

  return {
    propagator_markov_step_bare
  }
