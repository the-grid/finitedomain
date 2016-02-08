# Config for a search tree where each node is a Space
# TOFIX: may want to rename this to "tree-state" or something; it's not just config

module.exports = do ->

  # BODY_START

  config_create = ->
    return {
      var_filter_func: 'unsolved'
      next_var_func: 'naive'
      next_value_func: 'min'
      targeted_vars: 'all'
      var_dist_options: {}
      timeout_callback: undefined

      # "solved" values should be shared with the tree. may refactor this away in the future.
      constant_cache: {}
    }

  # BODY_STOP

  return {
    config_create
  }
