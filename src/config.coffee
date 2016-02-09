# Config for a search tree where each node is a Space
# TOFIX: may want to rename this to "tree-state" or something; it's not just config

module.exports = do ->

  {
    ASSERT
  } = require './helpers'

  {
    distribution_get_defaults
  } = require './distribution/defaults'

  # BODY_START

  config_create = ->
    return {
      _class: 'config'

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

  config_add_var_value = (config, name, domain, tmp_migration_flag) ->
    if !tmp_migration_flag and config.all_var_names.indexOf(name) >= 0
      throw new Error 'Var name already part of this config. Probably a bug?'
    config.initial_vars[name] = domain
    !tmp_migration_flag and config.all_var_names.push name
    return

  config_add_constant = (config, value) ->
    ASSERT typeof value is 'number', 'constant value should be a number', value
    if config.constant_cache[value]
      return config.constant_cache[value]
    name = String ++config.constant_uid
    config_add_var_value config, name, value
    config.constant_cache[value] = name
    return name

  # Initialize the config of this space according to certain presets
  #
  # @param {string} name

  config_set_defaults = (space, name) ->
    ASSERT space._class is 'config'
    config_set_options space, distribution_get_defaults name
    return

  # Set solving options on this config. Only required for the root.

  config_set_options = (config, options) ->
    ASSERT config._class is 'config'
    if options?.filter
      # for markov,
      # string: 'none', ignored
      # function: callback to determine which vars of a space are considered, should return array of names
      config.var_filter_func = options.filter
    if options?.var
      # see distribution.var
      # either
      # - a function: should return the _name_ of the next var to process
      # - a string: the name of the var distributor to use
      # - an object: a complex object like {dist_name:string, fallback_config: string|object, data...?}
      # fallback_config has the same struct as the main config.next_var_func and is used when the dist returns SAME
      # this way you can chain distributors if they cant decide on their own (list -> markov -> naive)
      config.next_var_func = options.var
      _config_init_configs_and_fallbacks options.var
    if options?.val
      # see distribution.value
      config.next_value_func = options.val
    if options?.targeted_var_names
      # which vars must be solved for this space to be solved
      # string: 'all'
      # string[]: list of vars that must be solved
      # function: callback to return list of names to be solved
      config.targeted_vars = options.targeted_var_names
    if options?.var_dist_config
      # An object which defines a value distributor per variable
      # which overrides the globally set value distributor.
      # See Bvar#distributionOptions (in multiverse)
      config.var_dist_options = options.var_dist_config
    if options?.timeout_callback
      # A function that returns true if the current search should stop
      # Can be called multiple times after the search is stopped, should
      # keep returning false (or assume an uncertain outcome).
      # The function is called after the first batch of propagators is
      # called so it won't immediately stop. But it stops quickly.
      config.timeout_callback = options.timeout_callback

    return

  # Create a simple lookup hash from an array of strings
  # to an object that looks up the index from the string.
  # This is used for finding the priority of a var elsewhere.
  #
  # @param {Object} [config] This is the var dist config (-> space.config.next_var_func)
  # @property {string[]} [config.priority_list] If present, creates a priority_hash on config which maps string>index

  _config_init_configs_and_fallbacks = (config) ->

    # populate the priority hashes for all (sub)configs
    while config?

      # explicit list of priorities. vars not in this list have equal
      # priority, but lower than any var that is in the list.
      list = config.priority_list
      if list
        hash = {}
        config.priority_hash = hash
        max = list.length
        for name, index in list
          # note: lowest priority still in the list is one, not zero
          # this way you dont have to check -1 for non-existing, later
          hash[name] = max - index

      # do it for all the fallback configs as well...
      config = config.fallback_config

    return

  # BODY_STOP

  return {
    config_add_constant
    config_add_var
    config_add_var_value
    config_add_vars_a
    config_add_vars_o
    config_create
    config_set_defaults
    config_set_options

    # testing
    _config_init_configs_and_fallbacks
  }
