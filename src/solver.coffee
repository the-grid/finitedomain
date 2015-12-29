# Adds FD.Solver to FD.js

module.exports = (FD) ->

  {
    distribution
    Domain
    helpers
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

    constructor: (o={}) ->
      {
        @distribute
        @search
        @defaultDomain
      } = o

      @search ?= 'depth_first'
      @distribute ?= 'naive'
      @defaultDomain ?= domain_create_bool()

      # TOFIX: get rid of this bi-directional dependency
      @space = new Space
      @space.solver = @

      # TOFIX: deprecate @S in favor of @space
      @S = @space

      @vars =
        byId:{}
        byName:{}
        all:[]
        byClass:{}

      @_cache = {}
      @resetState()

    # Variables

    valueOf: (varr, solution) ->
      return solution[varr.id]

    varsByName: (name, context) ->
      return @vars


    constant: (num) ->
      return @space.decl_value num

    addVars: (vs) ->
      vars = []
      for v in vs
        vars.push @addVar v
      vs

    decl: (id, domain) ->
      domain ?= @defaultDomain.slice 0
      v = @S.decl id, domain
      v.id = id
      v

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

    addVar: (v, domain) ->
      if typeof v is 'string'
        v = {id:v, domain}
      {id, domain, name, distribute} = v
      throw new Error "FD Var requires id " unless id?
      throw new Error "FDSpace var.id already added: #{id}" if @vars.byId[id]
      domain ?= @defaultDomain.slice 0
      @S.decl id, domain
      @vars.byId[id] = v
      @vars.all.push v

      if name?
        @vars.byName[name] ?= []
        @vars.byName[name].push v

      if distribute is 'markov'
        o = v.distributeOptions
        {matrix} = o
        throw new Error "markov distribution requires SolverVar #{v} w/ distributeOptions:{matrix:[]}" unless matrix
        for row in matrix
          boolean = row.boolean
          if boolean?
            if typeof boolean is 'function'
              row.booleanId = boolean(@,v)

      # {classes} = v
      # if classes
      #   for className in classes
      #     @vars.byClass[className] ?= []
      #     @vars.byClass[className].push v
      v

    # Arithmetic Propagators

    '+': (e1, e2, resultVar) ->
      @plus e1, e2, resultVar
    plus: (e1, e2, resultVar) ->
      return @S.plus get_name(e1), get_name(e2), get_name(resultVar) if resultVar
      return @S.plus get_name(e1), get_name(e2)

    '*': (e1, e2, resultVar) ->
      @times e1, e2, resultVar
    times: (e1, e2, resultVar) ->
      return @S.times get_name(e1), get_name(e2), get_name(resultVar) if resultVar
      return @S.times get_name(e1), get_name(e2)

    '∑': (es, resultVar) ->
      @sum es, resultVar
    #_sumCache: null
    sum: (es, resultVar) ->
      vnames = get_names es
      #@_sumCache ?= {}
      #key = vnames.toString()
      #if @_sumCache[key]?
      #else
      #@_sumCache[key] = true
      return @S.sum vnames, get_name(resultVar) if resultVar
      return @S.sum vnames

    '∏': (es, resultVar) ->
      @product es, resultVar
    product: (es, resultVar) ->
      vnames = get_names es
      return @S.product vnames, get_name(resultVar) if resultVar
      return @S.product vnames

    # TODO
    # times_plus    k1*v1 + k2*v2
    # wsum          ∑ k*v
    # scale         k*v

    # (In)equality Propagators
    # only first expression can be array

    '{}≠': (es) ->
      @distinct es
    distinct: (es) ->
      @S.distinct get_names(es)

    '==': (e1, e2) ->
      @eq e1, e2
    eq: (e1, e2) ->
      return @_eq(e1, e2) unless e1 instanceof Array
      for e in e1
        @_eq e, e2
      @
    _eq: (e1, e2) ->
      @S.eq get_name(e1), get_name(e2)
      @

    '!=': (e1, e2) ->
      @neq e1, e2
    neq: (e1, e2) ->
      return @_neq(e1, e2) unless e1 instanceof Array
      for e in e1
        @_neq e, e2
      @
    _neq: (e1, e2) ->
      @S.neq get_name(e1), get_name(e2)
      @

    '>=': (e1, e2) ->
      @gte e1, e2
    gte: (e1, e2) ->
      return @_gte(e1, e2) unless e1 instanceof Array
      for e in e1
        @_gte e, e2
      @
    _gte: (e1, e2) ->
      @S.gte get_name(e1), get_name(e2)
      @

    '<=': (e1, e2) ->
      @lte e1, e2
    lte: (e1, e2) ->
      return @_lte(e1, e2) unless e1 instanceof Array
      for e in e1
        @_lte e, e2
      @
    _lte: (e1, e2) ->
      @S.lte get_name(e1), get_name(e2)
      @

    '>': (e1, e2) ->
      @gt e1, e2
    gt: (e1, e2) ->
      return @_gt(e1, e2) unless e1 instanceof Array
      for e in e1
        @_gt e, e2
      @
    _gt: (e1, e2) ->
      @S.gt get_name(e1), get_name(e2)
      @

    '<': (e1, e2) ->
      @lt e1, e2
    lt: (e1, e2) ->
      return @_lt(e1, e2) unless e1 instanceof Array
      for e in e1
        @_lt e, e2
      @
    _lt: (e1, e2) ->
      @S.lt get_name(e1), get_name(e2)
      @


    # Conditions, ie Reified (In)equality Propagators
    _cacheReified: (op, e1, e2, boolvar) ->
      e1 = get_name(e1)
      e2 = get_name(e2)
      key = "#{e1} #{op}? #{e2}"
      if boolvar
        boolvar = get_name(boolvar)
        if !@_cache[key]?
          @S.reified op, e1, e2, boolvar
          @_cache[key] = boolvar
        else
          cache = @_cache[key]
          return cache if cache is boolvar
          return @S['=='](cache, boolvar)
        return @
      else
        @_cache[key] ?= @S.reified op, e1, e2
        @_cache[key]

    '!=?': (e1, e2, boolvar) ->
      @_cacheReified 'neq', e1, e2, boolvar
    isNeq: (e1, e2, boolvar) ->
      @_cacheReified 'neq', e1, e2, boolvar

    '==?': (e1, e2, boolvar) ->
      @_cacheReified 'eq', e1, e2, boolvar
    isEq: (e1, e2, boolvar) ->
      @_cacheReified 'eq', e1, e2, boolvar
      #return @S.reified 'eq', _.e(e1), _.e(e2), _.e(boolvar) if boolvar
      #return @S.reified 'eq', _.e(e1), _.e(e2)

    '>=?': (e1, e2, boolvar) ->
      @_cacheReified 'gte', e1, e2, boolvar
    isGte: (e1, e2, boolvar) ->
      @_cacheReified 'gte', e1, e2, boolvar

    '<=?': (e1, e2, boolvar) ->
      @_cacheReified 'lte', e1, e2, boolvar
    isLte: (e1, e2, boolvar) ->
      @_cacheReified 'lte', e1, e2, boolvar

    '>?': (e1, e2, boolvar) ->
      @_cacheReified 'gt', e1, e2, boolvar
    isGt: (e1, e2, boolvar) ->
      @_cacheReified 'gt', e1, e2, boolvar

    '<?': (e1, e2, boolvar) ->
      @_cacheReified 'lt', e1, e2, boolvar
    isLt: (e1, e2, boolvar) ->
      @_cacheReified 'lt', e1, e2, boolvar


    # Solving

    resetState: () ->
      @solutions = []
      space = @S #new FD.space @S # TODO???
      @state = {space:space, more:true}
      @

    # If squashed, dont get the actual solutions. They are irrelevant for perf tests.

    solve: (o={}, squash) ->
      {max, log, vars, search, distribute:distributor_options} = o
      log ?= 0 # 1, 2
      max ?= 1000
      vars ?= @vars.all

      distributor_options ?= @distribute
      create_custom_distributor @S, get_names(vars), distributor_options

      search ?= @search
      searchMethod = FD.search[search]

      state = @state

      count = 0

      solutions = @solutions

      ASSERT_SPACE state.space
      if log >= 1
        console.time '      - FD Solver Time'
        console.log "      - FD Solver Prop Count: #{@S._propagators.length}"

      considered = 0
      while state.more and count < max
        state = searchMethod state
        if state.status is 'end'
          considered += state.considered
          break
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
        console.log "      - Spaces considered: #{considered}"

      return solutions
