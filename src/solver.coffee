# Adds FD.Solver to FD.js

_ =
  e: (e) ->
    return e.id if e.id?
    return e

  es: (es) ->
    vnames = []
    for v in es
      vnames.push _.e(v)
    vnames

module.exports = (FD) ->

  {
    ASSERT_SPACE
  } = FD.helpers

  {
    domain_create_bool
  } = FD.Domain

  class FD.Solver

    constructor: (o={}) ->
      {@distribute, @search, @defaultDomain} = o

      @search ?= 'depth_first'

      @distribute ?= 'naive'

      @defaultDomain ?= domain_create_bool()

      @S = new FD.space()
      @S.solver = @

      @vars =
        byId:{}
        byName:{}
        all:[]
        byClass:{}

      # TODO
      # - constants & resetState? eek
      @_constants = {}
      @_cache = {}

      @resetState()
      @

    # Variables

    valueOf: (varr, solution) ->
      return solution[varr.id]

    varsByName: (name, context) ->
      return @vars


    constant: (num) ->
      num = Number(num)
      return @_constants[num] if @_constants[num]?
      @_constants[num] = @S.konst num
      @_constants[num]

    addVars: (vs) ->
      vars = []
      for v in vs
        vars.push @addVar v
      vs

    decl: (id, domain) ->
      domain ?= @defaultDomain
      v = @S.decl id, domain
      v.id = id
      v

    addVar: (v) ->
      if typeof v is 'string'
        v = {id:v}
      {id, domain, name, distribute} = v
      throw new Error "FD Var requires id " unless id?
      throw new Error "FDSpace var.id already added: #{id}" if @vars.byId[id]
      domain ?= @defaultDomain
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
      return @S.plus _.e(e1), _.e(e2), _.e(resultVar) if resultVar
      return @S.plus _.e(e1), _.e(e2)

    '*': (e1, e2, resultVar) ->
      @times e1, e2, resultVar
    times: (e1, e2, resultVar) ->
      return @S.times _.e(e1), _.e(e2), _.e(resultVar) if resultVar
      return @S.times _.e(e1), _.e(e2)

    '∑': (es, resultVar) ->
      @sum es, resultVar
    #_sumCache: null
    sum: (es, resultVar) ->
      vnames = _.es es
      #@_sumCache ?= {}
      #key = vnames.toString()
      #if @_sumCache[key]?
      #else
      #@_sumCache[key] = true
      return @S.sum vnames, _.e(resultVar) if resultVar
      return @S.sum vnames

    '∏': (es, resultVar) ->
      @product es, resultVar
    product: (es, resultVar) ->
      vnames = _.es es
      return @S.product vnames, _.e(resultVar) if resultVar
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
      @S.distinct _.es(es)

    '==': (e1, e2) ->
      @eq e1, e2
    eq: (e1, e2) ->
      return @_eq(e1, e2) unless e1 instanceof Array
      for e in e1
        @_eq e, e2
      @
    _eq: (e1, e2) ->
      @S.eq _.e(e1), _.e(e2)
      @

    '!=': (e1, e2) ->
      @neq e1, e2
    neq: (e1, e2) ->
      return @_neq(e1, e2) unless e1 instanceof Array
      for e in e1
        @_neq e, e2
      @
    _neq: (e1, e2) ->
      @S.neq _.e(e1), _.e(e2)
      @

    '>=': (e1, e2) ->
      @gte e1, e2
    gte: (e1, e2) ->
      return @_gte(e1, e2) unless e1 instanceof Array
      for e in e1
        @_gte e, e2
      @
    _gte: (e1, e2) ->
      @S.gte _.e(e1), _.e(e2)
      @

    '<=': (e1, e2) ->
      @lte e1, e2
    lte: (e1, e2) ->
      return @_lte(e1, e2) unless e1 instanceof Array
      for e in e1
        @_lte e, e2
      @
    _lte: (e1, e2) ->
      @S.lte _.e(e1), _.e(e2)
      @

    '>': (e1, e2) ->
      @gt e1, e2
    gt: (e1, e2) ->
      return @_gt(e1, e2) unless e1 instanceof Array
      for e in e1
        @_gt e, e2
      @
    _gt: (e1, e2) ->
      @S.gt _.e(e1), _.e(e2)
      @

    '<': (e1, e2) ->
      @lt e1, e2
    lt: (e1, e2) ->
      return @_lt(e1, e2) unless e1 instanceof Array
      for e in e1
        @_lt e, e2
      @
    _lt: (e1, e2) ->
      @S.lt _.e(e1), _.e(e2)
      @


    # Conditions, ie Reified (In)equality Propagators
    _cacheReified: (op, e1, e2, boolvar) ->
      e1 = _.e(e1)
      e2 = _.e(e2)
      key = "#{e1} #{op}? #{e2}"
      if boolvar
        boolvar = _.e(boolvar)
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

    solve: (o={}) ->
      {max, log, vars, search, distribute:distributor_options} = o
      log ?= 0 # 1, 2
      max ?= 1000
      vars ?= @vars.all

      distributor_options ?= @distribute
      FD.distribution.create_fixed_distributor(distributor_options)(@S, _.es(vars))

      search ?= @search
      searchMethod = FD.search[search]

      state = @state

      count = 0

      solutions = @solutions

      ASSERT_SPACE state.space

      if log >= 1
        console.time '      - FD Solver Time'
      while state.more and count < max
        state = searchMethod state
        break if state.status is 'end'
        count++
        solution = state.space.solution()
        solutions.push solution
        if log >= 2
          console.log "      - FD solution() ::::::::::::::::::::::::::::"
          console.log JSON.stringify(solution)

      if log >= 1
        console.timeEnd '      - FD Solver Time'
        console.log "      - FD solution count: #{count}"

      return solutions
