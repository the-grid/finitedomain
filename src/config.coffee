# Config for a search tree where each node is a Space
# TOFIX: may want to rename this to "tree-state" or something; it's not just config

module.exports = do ->

  {
    SUB
    SUP

    ASSERT
    ASSERT_PROPAGATORS
    THROW
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
      propagators: []
    }

  config_create_with = (obj) ->
    config = config_create()
    for name, domain of obj
      config_add_var config, name, domain
    return config

  config_add_vars_a = (config, arr, domain_or_lo, hi) ->
    for name in arr
      config_add_var config, name, domain_or_lo, hi
    return

  config_add_vars_o = (config, obj) ->
    for name of obj
      domain = obj[name]
      config_add_var config, name, domain
    return

  # simply alias to omit the name for complex domains

  config_add_var_anon = (config, domain_or_lo, hi) ->
    return config_add_var config, undefined, domain_or_lo, hi

  config_add_var = (config, name, domain_or_lo, hi) ->
    ASSERT domain_or_lo instanceof Array or typeof domain_or_lo is 'number' or domain_or_lo is undefined, 'arr/num/undef', domain_or_lo

    if domain_or_lo instanceof Array
      domain = domain_or_lo
      if domain.length is 2 and domain[0] is domain[1]
        if name
          return config_add_var config, name, domain[0]
        else
          return config_add_constant config, domain[0]
      domain_or_lo = domain.slice 0

    else if typeof domain_or_lo is 'number'
      lo = domain_or_lo
      if typeof hi is 'number'
        if !name and lo is hi
          return config_add_constant config, lo
        domain_or_lo = [lo, hi]
      else unless name
        return config_add_constant config, lo

    unless name
      name = String ++config.constant_uid

    _config_add_var_value config, name, domain_or_lo
    return name

  # This is the core var adding function
  # Preprocessing of parameters should be done here
  # All parameters are mandatory and assumed scrubbed
  #
  # @param {Config} config
  # @param {string} name
  # @param {number[]} domain
  # @param {undefined} _forbidden_arg Sanity check, do not use this arg

  _config_add_var_value = (config, name, domain, _forbidden_arg) ->
    ASSERT config._class is 'config', 'wants config', config._class, config
    ASSERT name and typeof name is 'string', 'name should be a non-empty string', name
    ASSERT !config.initial_vars[name], 'fdvar should not be defined but was, when would that not be a bug?', config.initial_vars[name], '->', name, '->', domain
    ASSERT !_forbidden_arg?, 'not expecting a hi, pass on [lo,hi] in array or just lo', _forbidden_arg
    ASSERT domain instanceof Array or typeof domain is 'number' or domain is undefined, 'domain check', domain
    ASSERT domain not instanceof Array or domain.length is 0 or domain[0] >= SUB, 'domain lo should be >= SUB', domain
    ASSERT domain not instanceof Array or domain.length is 0 or domain[domain.length-1] <= SUP, 'domain hi should be <= SUP', domain
    ASSERT typeof domain isnt 'number' or (domain >= SUB and domain <= SUP), 'single value should be SUB<=value<=SUP', domain

    if config.all_var_names.indexOf(name) >= 0
      THROW 'Var name already part of this config. Probably a bug?'

    config.initial_vars[name] = domain
    config.all_var_names.push name

    # we cant change the name here but we can cache the constant if it were one
    if domain instanceof Array and domain.length is 2 and domain[0] is domain[1]
      if !config.constant_cache[domain[0]]
        config.constant_cache[domain[0]] = name
    else if typeof domain is 'number'
      if !config.constant_cache[domain]
        config.constant_cache[domain] = name

    return

  config_add_constant = (config, value) ->
    ASSERT config._class is 'config'
    ASSERT typeof value is 'number', 'constant value should be a number', value
    if config.constant_cache[value]
      return config.constant_cache[value]
    name = String ++config.constant_uid
    _config_add_var_value config, name, value
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

  config_add_propagator = (config, propagator) ->
    ASSERT config._class is 'config'
    config.propagators.push propagator
    ASSERT_PROPAGATORS config.propagators
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
    config_add_propagator
    config_add_var
    config_add_var_anon
    config_add_vars_a
    config_add_vars_o
    config_create
    config_create_with
    config_set_defaults
    config_set_options

    # testing
    _config_add_var_value
    _config_init_configs_and_fallbacks
  }
