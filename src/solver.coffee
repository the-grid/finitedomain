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
    domain_create_bool
  } = require './domain'

  {
    search_depth_first
  } = require './search'

  {
    Space
  } = require './space'

  # hack to get around "private" warnings.
  _ = {}

  # This is a super class.
  # It is extended by path_solver
  #
  # @constructor
  # @param {Object} o
  # @property {string} o.distribute='naive'
  # @property {string} o.search='depth_first'
  # @property {number[]} defaultDomain=[0,1]

  class _.Solver

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
        search_defaults
      } = o

      @search ?= 'depth_first'
      @distribute ?= 'naive'
      @defaultDomain ?= domain_create_bool()

      @space = new Space

      if typeof @distribute is 'string'
        @space.set_defaults @distribute
      else if @distribute
        @space.set_options @distribute
      if search_defaults # TOFIX: is multiverse using it or can we drop this override? same as o.distribute...
        @space.set_defaults search_defaults

      @vars =
        byId: {}
        byName: {}
        all: []
        byClass: {}
        root: undefined # see PathSolver

      @solutions = []

      @state = {@space, more: true}

      @_prepared = false

    # @deprecated; use Solver#num() instead

    constant: (num) ->
      if num is false
        num = 0
      if num is true
        num = 1
      if typeof num isnt 'number'
        THROW "Solver#constant: expecting a number, got #{num} (a #{typeof num})"
      if isNaN num
        THROW "Solver#constant: expecting a number, got NaN"
      return @space.decl_value num

    # Returns an anonymous var with given value as lo/hi for the domain

    num: (num) ->
      if typeof num isnt 'number'
        THROW "Solver#num: argument is not a number: #{num}"
      return @space.decl_value num

    addVars: (vs) ->
      ASSERT vs instanceof Array, 'Expecting array', vs
      for v in vs
        @addVar v
      return

    decl: (id, domain) ->
      domain ?= @defaultDomain.slice 0
      domain = validate_domain domain
      @space.decl id, domain
      return

    # Uses @defaultDomain if no domain was given
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
      domain = validate_domain domain

      @space.decl id, domain
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
        return @space.plus GET_NAME(e1), GET_NAME(e2), GET_NAME(result_var)
      return @space.plus GET_NAME(e1), GET_NAME(e2)

    '*': (e1, e2, result_var) ->
      return @times e1, e2, result_var
    times: (e1, e2, result_var) ->
      if result_var
        return @space.times GET_NAME(e1), GET_NAME(e2), GET_NAME(result_var)
      return @space.times GET_NAME(e1), GET_NAME(e2)

    '∑': (es, result_var) ->
      return @sum es, result_var
    #_sumCache: null
    sum: (es, result_var) ->
      var_names = GET_NAMES es
      if result_var
        return @space.sum var_names, GET_NAME(result_var)
      return @space.sum var_names

    '∏': (es, result_var) ->
      return @product es, result_var
    product: (es, result_var) ->
      var_names = GET_NAMES es
      if result_var
        return @space.product var_names, GET_NAME(result_var)
      return @space.product var_names

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
      @space.distinct GET_NAMES(es)
      return

    '==': (e1, e2) ->
      @eq e1, e2
      return
    eq: (e1, e2) ->
      if e1 instanceof Array
        for e in e1
          @_eq e, e2
      else
        @_eq e1, e2
      return
    _eq: (e1, e2) ->
      @space.eq GET_NAME(e1), GET_NAME(e2)
      return

    '!=': (e1, e2) ->
      @neq e1, e2
      return
    neq: (e1, e2) ->
      if e1 instanceof Array
        for e in e1
          @_neq e, e2
      else
        return @_neq e1, e2
      return
    _neq: (e1, e2) ->
      @space.neq GET_NAME(e1), GET_NAME(e2)
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
      @space.gte GET_NAME(e1), GET_NAME(e2)
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
      @space.lte GET_NAME(e1), GET_NAME(e2)
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
      @space.gt GET_NAME(e1), GET_NAME(e2)
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
      @space.lt GET_NAME(e1), GET_NAME(e2)
      return


    # Conditions, ie Reified (In)equality Propagators
    _cacheReified: (op, e1, e2, boolvar) ->
      e1 = GET_NAME(e1)
      e2 = GET_NAME(e2)
      if boolvar
        return @space.reified op, e1, e2, GET_NAME boolvar
      return @space.reified op, e1, e2

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
    # @property {Object} [options.distribute] See Space#set_options
    # @param {boolean} squash If squashed, dont get the actual solutions. They are irrelevant for perf tests.

    solve: (options, squash) ->
      obj = @prepare options
      ASSERT !options?.dbg or !console.log @state.space.__debug_string()
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
      } = options

      log ?= LOG_NONE # 0, 1, 2
      max ?= 1000
      bvars ?= @vars.all
      var_names = GET_NAMES bvars
      distribution_options ?= @distribute # TOFIX: this is weird. if @distribute is a string this wont do anything...

      overrides = collect_distribution_overrides var_names, @vars.byId, @space
      if overrides
        @space.set_options var_dist_config: overrides

      @space.set_options targeted_var_names: var_names
      @space.set_options distribution_options

      search ?= @search

      switch search
        when 'depth_first'
          search_func = search_depth_first
        else
          THROW "Unknown search strategy: #{search}"

      @_prepared = true

      return {
        search_func
        max
        log
      }

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
      ASSERT_SPACE state.space

      if log >= LOG_STATS
        console.time '      - FD Solver Time'
        console.log "      - FD Solver Var Count: #{@space.all_var_names.length}"
        console.log "      - FD Solver Prop Count: #{@space._propagators.length}"

      count = 0
      while state.more and count < max
        search_func state
        if state.status isnt 'end'
          count++
          unless squash
            solution = state.space.solution()
            solutions.push solution
            if log >= LOG_SOLVES
              console.log "      - FD solution() ::::::::::::::::::::::::::::"
              console.log JSON.stringify(solution)

      if log >= LOG_STATS
        console.timeEnd '      - FD Solver Time'
        console.log "      - FD solution count: #{count}"

      return

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
          root_space._propagators.push ['markov', [name]]

      return overrides

  return {
    Solver: _.Solver
  }