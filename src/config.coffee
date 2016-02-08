# Config for a search tree where each node is a Space
# TOFIX: may want to rename this to "tree-state" or something; it's not just config

module.exports = do ->

  {
    ASSERT
  } = require './helpers'

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
      constant_uid: 0
      constant_cache: {} # value to var.id, all anonymous

      # names of all vars in this search tree
      # optimizes loops because `for-in` is super slow
      all_var_names: []

      # like a blue print for the root space with just primitives/arrays
      initial_vars: {}
      initial_propagators: {}
    }

  config_add_vars_a = (config, arr, domain_or_lo, hi) ->
    for name in arr
      config_add_var config, name, domain_or_lo, hi
    return

  config_add_vars_o = (config, obj) ->
    for name of obj
      domain = obj[name]
      config_add_var config, name, domain
    return

  config_add_var = (config, name, domain_or_lo, hi) ->
    is_number = typeof domain_or_lo is 'number'
    if is_number
      if typeof hi is 'number'
        config_add_var_value config, name, [domain_or_lo, hi]
        return

    if domain_or_lo instanceof Array
      domain_or_lo = domain_or_lo.slice 0
    config_add_var_value config, name, domain_or_lo
    return

  config_add_var_value = (config, name, domain) ->
    if config.all_var_names.indexOf(name) >= 0
      throw new Error 'Var name already part of this config. Probably a bug?'
    config.initial_vars[name] = domain
    config.all_var_names.push name
    return

  config_add_constant = (config, value) ->
    ASSERT typeof value is 'number', 'constant value should be a number', value
    if config.constant_cache[value]
      return config.constant_cache[value]
    name = String ++config.constant_uid
    config_add_var_value config, name, value
    config.constant_cache[value] = name
    return name

  # BODY_STOP

  return {
    config_add_constant
    config_add_var
    config_add_var_value
    config_add_vars_a
    config_add_vars_o
    config_create
  }
