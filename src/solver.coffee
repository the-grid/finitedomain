# Adds FD.Solver to FD.js

module.exports = (FD) ->

  {
    distribution
    Domain
    helpers
    search: Search
    space: Space
  } = FD

  {
    ASSERT
    ASSERT_SPACE
  } = helpers

  {
    domain_create_bool
  } = Domain

  {
    create_custom_distributor
  } = distribution

  get_name = (e) ->
    # e can be the empty string (TOFIX: let's not allow this...)
    if e.id?
      return e.id
    return e

  get_names = (es) ->
    var_names = []
    for e in es
      var_names.push get_name e

    return var_names

  # This is a super class.
  # It is extended by path_solver and path_binary_solver.
  #
  # @constructor
  # @param {Object} o
  # @property {string} o.distribute='naive'
  # @property {string} o.search='depth_first'
  # @property {number[]} defaultDomain=[0,1]

  class FD.Solver

    # @param {Object} [o]
    # @property {string} [o.distribute='naive']
    # @property {string} [o.search='depth_first']
    # @property {number[]} [o.defaultDomain=[0,1]]
    # @property {Object} [o.searchDefaults]

    constructor: (o={}) ->
      {
        @distribute
        @search
        @defaultDomain
        search_defaults
      } = o

      @search ?= 'depth_first'
      @distribute ?= 'naive'
      @defaultDomain ?= domain_create_bool()

      # TOFIX: get rid of this bi-directional dependency Space <> Solver
      @space = new Space
      @space.solver = @

      # TOFIX: deprecate @S in favor of @space
      @S = @space

      @vars =
        byId: {}
        byName: {}
        all: []
        byClass: {}
        root: undefined # see PathSolver

      @solutions = []

      @state = {@space, more: true}

    # This wasn't a bad idea but the code debt is not worth it
    # @deprecated

    constant: (num) ->
      return @space.decl_value num

    # Returns an anonymous var with given value as lo/hi for the domain

    num: (num) ->
      return @space.decl_value num

    addVars: (vs) ->
      for v in vs
        @addVar v
      return

    decl: (id, domain) ->
      domain ?= @defaultDomain.slice 0
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
        throw new Error "Solver#addVar: requires id "
      if vars.byId[id]
        throw new Error "Solver#addVar: var.id already added: #{id}"

      domain ?= @defaultDomain.slice 0
      @space.decl id, domain
      vars.byId[id] = v
      vars.all.push v

      if name?
        vars.byName[name] ?= []
        vars.byName[name].push v

      if distribute is 'markov'
        matrix = v.distributeOptions.matrix
        unless matrix
          throw new Error "Solver#addVar: markov distribution requires SolverVar #{v} w/ distributeOptions:{matrix:[]}"
        for row in matrix
          bool_func = row.boolean
          if typeof bool_func is 'function'
            row.booleanId = bool_func @, v

      return v


    # Arithmetic Propagators

    '+': (e1, e2, result_var) ->
      return @plus e1, e2, result_var
    plus: (e1, e2, result_var) ->
      if result_var
        return @space.plus get_name(e1), get_name(e2), get_name(result_var)
      return @space.plus get_name(e1), get_name(e2)

    '*': (e1, e2, result_var) ->
      return @times e1, e2, result_var
    times: (e1, e2, result_var) ->
      if result_var
        return @space.times get_name(e1), get_name(e2), get_name(result_var)
      return @space.times get_name(e1), get_name(e2)

    '∑': (es, result_var) ->
      return @sum es, result_var
    #_sumCache: null
    sum: (es, result_var) ->
      var_names = get_names es
      if result_var
        return @space.sum var_names, get_name(result_var)
      return @space.sum var_names

    '∏': (es, result_var) ->
      return @product es, result_var
    product: (es, result_var) ->
      var_names = get_names es
      if result_var
        return @space.product var_names, get_name(result_var)
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
      @space.distinct get_names(es)
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
      @space.eq get_name(e1), get_name(e2)
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
      @space.neq get_name(e1), get_name(e2)
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
      @space.gte get_name(e1), get_name(e2)
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
      @space.lte get_name(e1), get_name(e2)
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
      @space.gt get_name(e1), get_name(e2)
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
      @space.lt get_name(e1), get_name(e2)
      return


    # Conditions, ie Reified (In)equality Propagators
    _cacheReified: (op, e1, e2, boolvar) ->
      e1 = get_name(e1)
      e2 = get_name(e2)
      if boolvar
        return @space.reified op, e1, e2, get_name boolvar
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


    # Start solving this solver. It should be setup with all the constraints.
    #
    # @param {Object} options
    # @property {number} options.max
    # @property {number} options.log One of: 0, 1 or 2
    # @property {string[]|Fdvar[]|Bvar[]} options.vars Target branch vars or var names to force solve. Defaults to all.
    # @property {number} options.search='depth_first' Maps to a function on FD.Search
    # @property {number} options.distribute='naive' Maps to FD.distribution.value
    # @param {boolean} squash If squashed, dont get the actual solutions. They are irrelevant for perf tests.

    solve: (options={}, squash) ->
      {
        max
        log
        vars
        search
        distribute: distribution_options
      } = options

      log ?= 0 # 1, 2
      max ?= 1000
      vars ?= @vars.all
      distributor_options ?= @distribute
      create_custom_distributor @space, get_names(vars), distributor_options

      search ?= @search

      solutions = @solutions

      @_solve @state, Search[search], solutions, max, log, squash

      return solutions

    _solve: (state, search_func, solutions, max, log, squash) ->
      ASSERT_SPACE state.space

      if log >= 1
        console.time '      - FD Solver Time'
        console.log "      - FD Solver Prop Count: #{@space._propagators.length}"

      count = 0
      while state.more and count < max
        state = search_func state
        if state.status isnt 'end'
          count++
          unless squash
            solution = state.space.solution()
            solutions.push solution
            if log >= 2
              console.log "      - FD solution() ::::::::::::::::::::::::::::"
              console.log JSON.stringify(solution)

      if log >= 1
        console.timeEnd '      - FD Solver Time'
        console.log "      - FD solution count: #{count}"

      return
