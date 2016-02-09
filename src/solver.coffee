# Adds FD.Solver to FD.js

module.exports = do ->

  {
    LOG_NONE
    LOG_STATS
    LOG_SOLVES
    LOG_MAX
    LOG_MIN
    SUB
    SUP

    ASSERT
    ASSERT_SPACE
    GET_NAME
    GET_NAMES
    THROW
  } = require './helpers'

  {
    config_create
    config_set_defaults
    config_set_options
  } = require './config'

  {
    domain_create_bool
    domain_create_value
    domain_from_list
  } = require './domain'

  {
    search_depth_first
  } = require './search'

  {
    __space_debug_string
    space_add_var
    space_add_vars_a
    space_create_root
    space_get_unknown_vars
    space_solution
  } = require './space'

  {
    propagator_add_distinct
    propagator_add_div
    propagator_add_eq
    propagator_add_gt
    propagator_add_gte
    propagator_add_lt
    propagator_add_lte
    propagator_add_markov
    propagator_add_min
    propagator_add_mul
    propagator_add_neq
    propagator_add_plus
    propagator_add_product
    propagator_add_reified
    propagator_add_ring_mul
    propagator_add_sum
  } = require './propagator'

  # BODY_START

  # This is a super class.
  # It is extended by path_solver
  #
  # @constructor
  # @param {Object} o
  # @property {string} o.distribute='naive'
  # @property {string} o.search='depth_first'
  # @property {number[]} defaultDomain=[0,1]

  Solver = class Solver

    # @param {Object} [o]
    # @property {string} [o.distribute='naive']
    # @property {string} [o.search='depth_first']
    # @property {number[]} [o.defaultDomain=[0,1]]
    # @property {Object} [o.searchDefaults]

    constructor: (o={}) ->
      @_class = 'solver'

      {
        @distribute
        @search
        @defaultDomain
      } = o

      @search ?= 'depth_first'
      @distribute ?= 'naive'
      @defaultDomain ?= domain_create_bool()

      # TOFIX: cache @space and move set_defaults to prepare step
      @config = config_create()
      @space = space_create_root @config

      if typeof @distribute is 'string'
        config_set_defaults @config, @distribute
      else if @distribute
        config_set_options @config, @distribute

      @vars =
        byId: {}
        byName: {}
        all: []
        byClass: {}
        root: undefined # see PathSolver

      @solutions = []

      @state =
        space: null
        more: false

      @_prepared = false

    # @deprecated; use Solver#num() instead

    constant: (num) ->
      if num is false
        num = 0
      if num is true
        num = 1
      return @num num

    # Returns an anonymous var with given value as lo/hi for the domain

    num: (num) ->
      if typeof num isnt 'number'
        THROW "Solver#num: expecting a number, got #{num} (a #{typeof num})"
      if isNaN num
        THROW "Solver#num: expecting a number, got NaN"
      return space_add_var @space, num

    addVars: (vs) ->
      ASSERT vs instanceof Array, 'Expecting array', vs
      for v in vs
        @addVar v
      return

    decl: (id, domain) ->
      domain ?= @defaultDomain.slice 0
      domain = validate_domain domain
      return space_add_var @space, id, domain

    # Uses @defaultDomain if no domain was given
    # If domain is a number it becomes [dom, dom]
    # Distribution is optional
    # Name is used to create a `byName` hash
    #
    # Usage:
    # S.addVar 'foo'
    # S.addVar 'foo', [1, 2]
    # S.addVar {id: '12', name: 'foo', domain: [1, 2]}
    # S.addVar {id: 'foo', domain: [1, 2]}
    # S.addVar {id: 'foo', domain: [1, 2], distribution: 'markov'}

    addVar: (v, dom) ->
      ASSERT !(v instanceof Array), 'Not expecting to receive an array', v
      if typeof v is 'string'
        v = {
          id: v
          domain: dom
        }

      {
        id,
        domain
        name
        distribute
      } = v

      vars = @vars

      unless id?
        THROW "Solver#addVar: requires id "
      if vars.byId[id]
        THROW "Solver#addVar: var.id already added: #{id}"

      domain ?= @defaultDomain.slice 0
      if typeof domain is 'number'
        domain = domain_create_value domain
      domain = validate_domain domain

      space_add_var @space, id, domain
      vars.byId[id] = v
      vars.all.push v

      if name?
        vars.byName[name] ?= []
        vars.byName[name].push v

      if distribute is 'markov' or (v.distributeOptions and v.distributeOptions.distributor_name is 'markov')
        matrix = v.distributeOptions.matrix
        unless matrix
          if v.distributeOptions.expandVectorsWith
            matrix = v.distributeOptions.matrix = [vector: []]
          else
            THROW "Solver#addVar: markov distribution requires SolverVar #{JSON.stringify v} w/ distributeOptions:{matrix:[]}"
        for row in matrix
          bool_func = row.boolean
          if typeof bool_func is 'function'
            row.booleanId = bool_func @, v
          else if typeof bool_func is 'string'
            row.booleanId = bool_func # only considers a row if the var is solved to 1
          else
            ASSERT !bool_func, 'row.boolean should be a function returning a var name or just a var name'

      return v

    # validate domains, filter and fix legacy domains, throw for bad inputs

    validate_domain = (domain) ->
      # support legacy domains and validate input here
      if msg = _confirm_domain domain
        fixed_domain = _try_to_fix_legacy_domain domain
        if fixed_domain
#          if console?.warn
#            console.warn msg, domain, 'auto-converted to', fixed_domain
        else
          if console?.warn
            console.warn msg, domain, 'unable to fix'
          THROW "Fatal: unable to fix domain: #{JSON.stringify domain}"
        domain = fixed_domain
      return domain

    # Domain input validation
    # Have to support and transform legacy domain formats of domains of domains
    # and transform them to flat domains with lo/hi pairs

    _confirm_domain = (domain) ->
      if (domain.length % 2) isnt 0
        return 'Detected invalid domain, maybe legacy?'
      lhi = SUB - 10
      for lo, i in domain by 2
        hi = domain[i + 1]
        if e = _confirm_domain_element lo
          return e
        if e = _confirm_domain_element hi
          return e

        if lo < SUB
          return "Domain contains a number lower than SUB (#{n} < #{SUB}), this is probably a bug"
        if hi > SUP
          return "Domain contains a number higher than SUP (#{n} > #{SUP}), this is probably a bug"
        if lo > hi
          return "Found a lo/hi pair where lo>hi, expecting all pairs lo<=hi (#{lo}>#{hi})"

    _confirm_domain_element = (n) ->
      if typeof n isnt 'number'
        if n instanceof Array
          return 'Detected legacy domains (arrays of arrays), expecting flat array of lo-hi pairs'
        return "Expecting array of numbers, found something else (#{n}), this is probably a bug"
      if n < SUB
        return "Domain contains a number lower than SUB (#{n} < #{SUB}), this is probably a bug"
      if n > SUP
        return "Domain contains a number higher than SUP (#{n} > #{SUP}), this is probably a bug"
      if isNaN n
        return "Domain contains an actual NaN, this is probably a bug"

    # Try to convert old array of arrays domain to new
    # flat array of number pairs domain. If any validation
    # step fails, return nothing.

    _try_to_fix_legacy_domain = (domain) ->
      fixed = []
      for a in domain
        unless a instanceof Array
          return
        unless a.length is 2
          return
        [lo, hi] = a
        if lo > hi
          return
        fixed.push lo, hi
      return fixed

    # Arithmetic Propagators

    '+': (e1, e2, result_var) ->
      return @plus e1, e2, result_var
    plus: (e1, e2, result_var) ->
      if result_var
        return propagator_add_plus @space, GET_NAME(e1), GET_NAME(e2), GET_NAME(result_var)
      return propagator_add_plus @space, GET_NAME(e1), GET_NAME(e2)

    '-': (e1, e2, result_var) ->
      return @min e1, e2, result_var
    minus: (e1, e2, result_var) ->
      return @min e1, e2, result_var
    min: (e1, e2, result_var) ->
      if result_var
        return propagator_add_min @space, GET_NAME(e1), GET_NAME(e2), GET_NAME(result_var)
      return propagator_add_min @space, GET_NAME(e1), GET_NAME(e2)

    '*': (e1, e2, result_var) ->
      return @ring_mul e1, e2, result_var
    times: (e1, e2, result_var) -> # deprecated
      return @ring_mul e1, e2, result_var
    ring_mul: (e1, e2, result_var) ->
      if result_var
        return propagator_add_ring_mul @space, GET_NAME(e1), GET_NAME(e2), GET_NAME(result_var)
      return propagator_add_ring_mul @space, GET_NAME(e1), GET_NAME(e2)

    '/': (e1, e2, result_var) ->
      return @div e1, e2, result_var
    div: (e1, e2, result_var) ->
      if result_var
        return propagator_add_div @space, GET_NAME(e1), GET_NAME(e2), GET_NAME(result_var)
      return propagator_add_div @space, GET_NAME(e1), GET_NAME(e2)

    mul: (e1, e2, result_var) ->
      if result_var
        return propagator_add_mul @space, GET_NAME(e1), GET_NAME(e2), GET_NAME(result_var)
      return propagator_add_mul @space, GET_NAME(e1), GET_NAME(e2)

    '∑': (es, result_var) ->
      return @sum es, result_var
    #_sumCache: null
    sum: (es, result_var) ->
      var_names = GET_NAMES es
      if result_var
        return propagator_add_sum @space, var_names, GET_NAME(result_var)
      return propagator_add_sum @space, var_names

    '∏': (es, result_var) ->
      return @product es, result_var
    product: (es, result_var) ->
      var_names = GET_NAMES es
      if result_var
        return propagator_add_product @space, var_names, GET_NAME(result_var)
      return propagator_add_product @space, var_names

    # TODO
    # times_plus    k1*v1 + k2*v2
    # wsum          ∑ k*v
    # scale         k*v


    # (In)equality Propagators
    # only first expression can be array

    '{}≠': (es) ->
      @distinct es
      return
    distinct: (es) ->
      propagator_add_distinct @space, GET_NAMES(es)
      return

    '==': (e1, e2) ->
      @eq e1, e2
      return
    eq: (e1, e2) ->
      if e1 instanceof Array
        for e in e1
          @_eq e, e2
        return e2
      else
        return @_eq e1, e2
    _eq: (e1, e2) ->
      return propagator_add_eq @space, GET_NAME(e1), GET_NAME(e2)

    '!=': (e1, e2) ->
      @neq e1, e2
      return
    neq: (e1, e2) ->
      if e1 instanceof Array
        for e in e1
          @_neq e, e2
      else
        @_neq e1, e2
      return
    _neq: (e1, e2) ->
      propagator_add_neq @space, GET_NAME(e1), GET_NAME(e2)
      return

    '>=': (e1, e2) ->
      @gte e1, e2
      return
    gte: (e1, e2) ->
      if e1 instanceof Array
        for e in e1
          @_gte e, e2
      else
        @_gte e1, e2
      return
    _gte: (e1, e2) ->
      propagator_add_gte @space, GET_NAME(e1), GET_NAME(e2)
      return

    '<=': (e1, e2) ->
      @lte e1, e2
      return
    lte: (e1, e2) ->
      if e1 instanceof Array
        for e in e1
          @_lte e, e2
      else
        @_lte e1, e2
      return
    _lte: (e1, e2) ->
      propagator_add_lte @space, GET_NAME(e1), GET_NAME(e2)
      return

    '>': (e1, e2) ->
      @gt e1, e2
      return
    gt: (e1, e2) ->
      if e1 instanceof Array
        for e in e1
          @_gt e, e2
      else
        @_gt e1, e2
      return
    _gt: (e1, e2) ->
      propagator_add_gt @space, GET_NAME(e1), GET_NAME(e2)
      return

    '<': (e1, e2) ->
      @lt e1, e2
      return
    lt: (e1, e2) ->
      if e1 instanceof Array
        for e in e1
          @_lt e, e2
      else
        @_lt e1, e2
      return
    _lt: (e1, e2) ->
      propagator_add_lt @space, GET_NAME(e1), GET_NAME(e2)
      return


    # Conditions, ie Reified (In)equality Propagators
    _cacheReified: (op, e1, e2, boolvar) ->
      e1 = GET_NAME(e1)
      e2 = GET_NAME(e2)
      if boolvar
        return propagator_add_reified @space, op, e1, e2, GET_NAME boolvar
      return propagator_add_reified @space, op, e1, e2

    '!=?': (e1, e2, boolvar) ->
      return @isNeq e1, e2, boolvar
    isNeq: (e1, e2, boolvar) ->
      return @_cacheReified 'neq', e1, e2, boolvar

    '==?': (e1, e2, boolvar) ->
      return @isEq e1, e2, boolvar
    isEq: (e1, e2, boolvar) ->
      return @_cacheReified 'eq', e1, e2, boolvar

    '>=?': (e1, e2, boolvar) ->
      return @isGte e1, e2, boolvar
    isGte: (e1, e2, boolvar) ->
      return @_cacheReified 'gte', e1, e2, boolvar

    '<=?': (e1, e2, boolvar) ->
      return @isLte e1, e2, boolvar
    isLte: (e1, e2, boolvar) ->
      return @_cacheReified 'lte', e1, e2, boolvar

    '>?': (e1, e2, boolvar) ->
      return @isGt e1, e2, boolvar
    isGt: (e1, e2, boolvar) ->
      return @_cacheReified 'gt', e1, e2, boolvar

    '<?': (e1, e2, boolvar) ->
      return @isLt e1, e2, boolvar
    isLt: (e1, e2, boolvar) ->
      return @_cacheReified 'lt', e1, e2, boolvar

    # Solve this solver. It should be setup with all the constraints.
    #
    # @param {Object} options
    # @property {number} options.max
    # @property {number} options.log Logging level; one of: 0, 1 or 2 (see LOG_* constants)
    # @property {string[]|Fdvar[]|Bvar[]} options.vars Target branch vars or var names to force solve. Defaults to all.
    # @property {number} options.search='depth_first' See FD.Search
    # @property {number} options.distribute='naive' Maps to FD.distribution.value
    # @property {Object} [options.distribute] See config_set_options
    # @param {boolean} squash If squashed, dont get the actual solutions. They are irrelevant for perf tests.

    solve: (options, squash) ->
      obj = @prepare options
      ASSERT !options?.dbg or !console.log __space_debug_string @state.space
      @run obj
      return @solutions

    # Prepare internal configuration before actually solving
    # Collects one-time config data and sets up defaults
    #
    # @param {Object} [options={}] See @solve

    prepare: (options={}) ->
      {
        max
        log
        vars: bvars
        search
        distribute: distribution_options
        add_unknown_vars # bool
      } = options

      log ?= LOG_NONE # 0, 1, 2
      max ?= 1000
      bvars ?= @vars.all
      var_names = GET_NAMES bvars
      distribution_options ?= @distribute # TOFIX: this is weird. if @distribute is a string this wont do anything...

      if add_unknown_vars
        unknown_names = space_get_unknown_vars @space
        space_add_vars_a @space, unknown_names

      overrides = collect_distribution_overrides var_names, @vars.byId, @space
      if overrides
        config_set_options @config, var_dist_config: overrides

      config_set_options @config, targeted_var_names: var_names
      config_set_options @config, distribution_options

      search_func = @_get_search_func_or_die search

      @state.space = @space
      @state.more = true

      @_prepared = true

      return {
        search_func
        max
        log
      }

    _get_search_func_or_die: (search) ->
      search ?= @search

      switch search
        when 'depth_first'
          search_func = search_depth_first
        else
          THROW "Unknown search strategy: #{search}"

      return search_func

    # Run the solver. You should call @prepare before calling this function.
    #
    # @param {Object} options
    # @param {boolean} squash If squashed, dont get the actual solutions. They are irrelevant for perf tests.

    run: ({search_func, max, log}, squash) ->
      ASSERT typeof search_func is 'function'
      ASSERT typeof max is 'number'
      ASSERT log >= LOG_MIN and log <= LOG_MAX

      ASSERT @_prepared, 'must run @prepare before @run'
      @_prepared = false

      solutions = @solutions
      ASSERT solutions instanceof Array

      state = @state
      ASSERT state
      root_space = state.space
      ASSERT_SPACE root_space

      if log >= LOG_STATS
        console.time '      - FD Solver Time'
        console.log "      - FD Solver Var Count: #{root_space.all_var_names.length}"
        console.log "      - FD Solver Prop Count: #{root_space._propagators.length}"

      count = 0
      while state.more and count < max
        search_func state
        if state.status isnt 'end'
          count++
          unless squash
            solution = space_solution state.space
            solutions.push solution
            if log >= LOG_SOLVES
              console.log "      - FD solution() ::::::::::::::::::::::::::::"
              console.log JSON.stringify(solution)

      if log >= LOG_STATS
        console.timeEnd '      - FD Solver Time'
        console.log "      - FD solution count: #{count}"

      return

    # exposes internal method space_add_var for subclass

    space_add_var_range: (id, lo, hi) ->
      return space_add_var @space, id, lo, hi

    # exposes internal method domain_from_list for subclass

    domain_from_list: (list) ->
      return domain_from_list list

    # Visit the branch vars and collect var specific configuration overrides if
    # there are any and put them on the root space. This way we don't need to
    # burden Fdvar with this. Mainly used for Markov searching.
    # The result is set to be Space#var_dist_config
    #
    # @param {string[]} var_names
    # @param {Object} bvars_by_id Maps var names to their Bvar
    # @returns {Object|null} Contains data for each var that has dist options

    collect_distribution_overrides = (var_names, bvars_by_id, root_space) ->
      overrides = null
      for name in var_names
        bvar = bvars_by_id[name]
        if dist_opts = bvar?.distributeOptions
          overrides ?= {}
          overrides[name] ?= {}
          for key, val of dist_opts
            overrides[name][key] = val
        # TOFIX: change upstreams to put this override in the config as well instead of directly on the bvar
        if bvar?.distribute
          overrides ?= {}
          overrides[name] ?= {}
          overrides[name].distributor_name = bvar.distribute

        # add a markov verifier propagator for each markov var
        if overrides?[name]?.distributor_name is 'markov'
          propagator_add_markov root_space, name

      return overrides

  # BODY_STOP

  return {
    Solver
  }