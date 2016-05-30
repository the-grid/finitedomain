import {
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,
  SUB,
  SUP,

  ASSERT,
  GET_NAME,
  GET_NAMES,
  THROW,
} from './helpers';

import {
  config_addVarAnonConstant,
  config_addVarDomain,
  config_addVarRange,
  config_addVarsWithDomain,
  config_create,
  config_getUnknownVars,
  config_setDefaults,
  config_setOptions,
} from './config';

import {
  PAIR_SIZE,
  domain_clone,
  domain_createRange,
  domain_createValue,
  domain_fromList,
  domain_isRejected,
  domain_numarr,
} from './domain';

import search_depthFirst from './search';

import {
  space_createFromConfig,
  space_solution,
  space_toConfig,
} from './space';

import {
  propagator_addCallback,
  propagator_addDistinct,
  propagator_addDiv,
  propagator_addEq,
  propagator_addGt,
  propagator_addGte,
  propagator_addLt,
  propagator_addLte,
  propagator_addMarkov,
  propagator_addMul,
  propagator_addNeq,
  propagator_addPlus,
  propagator_addMin,
  propagator_addProduct,
  propagator_addReified,
  propagator_addRingMul,
  propagator_addSum,
} from './propagator';

// BODY_START

//
// It is extended by path_solver

/**
 * This is a super class.
 * It is extended by PathSolver in a private project
 *
 * @type {Solver}
 */
class Solver {
  /**
   * @param {Object} options = {}
   * @property {string} [options.distribute='naive']
   * @property {string} [options.search='depth_first']
   * @property {number[]} [options.defaultDomain=[0,1]]
   * @property {Object} [options.searchDefaults]
   * @property {Config} [options.config=config_create()]
   */
  constructor(options = {}) {
    let {
      distribute = 'naive',
      search = 'depth_first',
      defaultDomain = domain_createRange(0, 1),
      config = config_create(),
    } = options;

    this._class = 'solver';

    this.distribute = distribute;
    this.search = search;
    this.defaultDomain = defaultDomain;
    this.config = config;

    if (typeof distribute === 'string') {
      config_setDefaults(this.config, this.distribute);
    } else if (typeof distribute === 'object') {
      config_setOptions(this.config, this.distribute);
    } else {
      THROW('SOLVER_OPTIONS_UNKNOWN_TYPE');
    }

    this.vars = {
      byId: {},
      byName: {},
      all: [],
      byClass: {},
      root: undefined, // see PathSolver
    };

    this.solutions = [];

    this.state = {
      space: null,
      more: false,
    };

    this._prepared = false;
  }

  /**
   * @deprecated; use Solver#num() instead
   * @param {number} num
   * @returns {string}
   */
  constant(num) {
    if (num === false) {
      num = 0;
    }
    if (num === true) {
      num = 1;
    }
    return this.num(num);
  }

  /**
   * Returns an anonymous var with given value as lo/hi for the domain
   *
   * @param {number} num
   * @returns {number}
   */
  num(num) {
    if (typeof num !== 'number') {
      THROW(`Solver#num: expecting a number, got ${num} (a ${typeof num})`);
    }
    if (isNaN(num)) {
      THROW('Solver#num: expecting a number, got NaN');
    }
    return config_addVarAnonConstant(this.config, num);
  }

  /**
   * @param {Array} vs
   */
  addVars(vs) {
    ASSERT(vs instanceof Array, 'Expecting array', vs);
    for (let i = 0; i < vs.length; i++) {
      let v = vs[i];
      this.addVar(v);
    }
  }

  /**
   * @param {string} id
   * @param {$domain} [domain=this.defaultDomain]
   * @returns {string}
   */
  decl(id, domain) {
    if (!domain) {
      domain = domain_clone(this.defaultDomain);
    }
    if (domain_isRejected(domain)) THROW('EMPTY_DOMAIN_NOT_ALLOWED');
    domain = solver_validateDomain(domain);
    return config_addVarDomain(this.config, id, domain);
  }

  /**
   * Uses @defaultDomain if no domain was given
   * If domain is a number it becomes [dom, dom]
   * Distribution is optional
   * Name is used to create a `byName` hash
   *
   * @example
   *
   * S.addVar 'foo'
   * S.addVar 'foo', [1, 2]
   * S.addVar {id: '12', name: 'foo', domain: [1, 2]}
   * S.addVar {id: 'foo', domain: [1, 2]}
   * S.addVar {id: 'foo', domain: [1, 2], distribution: 'markov'}
   *
   * @param v
   * @param [dom=v.domain] Note: this cannot be a "small domain"! Numbers are interpreted to be constants in Solver
   * @returns {*}
   */
  addVar(v, dom) {
    ASSERT(!(v instanceof Array), 'Not expecting to receive an array', v);
    if (typeof v === 'string') {
      v = {
        id: v,
        domain: dom,
      };
    } else {
      ASSERT(typeof v === 'object', 'v should be an id or an object containing meta');
    }

    let {
      id,
      domain,
      name,
      distribute,
    } = v;

    if (id == null) {
      THROW('Solver#addVar: requires id');
    }

    let vars = this.vars;
    if (vars.byId[id]) {
      THROW(`Solver#addVar: var.id already added: ${id}`);
    }

    if (typeof domain === 'number') {
      domain = domain_createValue(domain);
    } else if (!domain) {
      domain = domain_clone(this.defaultDomain);
    } else {
      domain = solver_validateDomain(domain);
    }

    config_addVarDomain(this.config, id, domain);
    ASSERT(!vars.byId[id], 'var should not yet exist', id, v);
    vars.byId[id] = v;
    ASSERT(vars.all.indexOf(v) < 0, 'var should not yet be part of vars.all', id, v);
    vars.all.push(v);

    if (name != null) {
      if (vars.byName[name] == null) {
        vars.byName[name] = [];
      }
      vars.byName[name].push(v);
    }

    if (distribute === 'markov' || (v.distributeOptions && v.distributeOptions.distributor_name === 'markov')) {
      let { matrix } = v.distributeOptions;
      if (!matrix) {
        if (v.distributeOptions.expandVectorsWith) {
          matrix = v.distributeOptions.matrix = [{vector: []}];
        } else {
          THROW(`Solver#addVar: markov distribution requires SolverVar ${JSON.stringify(v)} w/ distributeOptions:{matrix:[]}`);
        }
      }

      for (let i = 0; i < matrix.length; ++i) {
        let row = matrix[i];
        let boolFunc = row.boolean;
        if (typeof boolFunc === 'function') {
          row.booleanId = boolFunc(this, v);
        } else if (typeof boolFunc === 'string') {
          row.booleanId = boolFunc;
        } else {
          ASSERT(!boolFunc, 'row.boolean should be a function returning a var name or just a var name');
        }
      }
    }

    return v;
  }

  // Arithmetic Propagators

  ['+'](e1, e2, resultVar) {
    return this.plus(e1, e2, resultVar);
  }
  plus(e1, e2, resultVar) {
    if (resultVar) {
      return propagator_addPlus(this.config, GET_NAME(e1), GET_NAME(e2), GET_NAME(resultVar));
    }
    return propagator_addPlus(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  ['-'](e1, e2, resultVar) {
    return this.min(e1, e2, resultVar);
  }
  minus(e1, e2, resultVar) {
    return this.min(e1, e2, resultVar);
  }
  min(e1, e2, resultVar) {
    if (resultVar) {
      return propagator_addMin(this.config, GET_NAME(e1), GET_NAME(e2), GET_NAME(resultVar));
    }
    return propagator_addMin(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  ['*'](e1, e2, resultVar) {
    return this.ring_mul(e1, e2, resultVar);
  }
  times(e1, e2, resultVar) { // deprecated
    return this.ring_mul(e1, e2, resultVar);
  }
  ring_mul(e1, e2, resultVar) {
    if (resultVar) {
      return propagator_addRingMul(this.config, GET_NAME(e1), GET_NAME(e2), GET_NAME(resultVar));
    }
    return propagator_addRingMul(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  ['/'](e1, e2, resultVar) {
    return this.div(e1, e2, resultVar);
  }
  div(e1, e2, resultVar) {
    if (resultVar) {
      return propagator_addDiv(this.config, GET_NAME(e1), GET_NAME(e2), GET_NAME(resultVar));
    }
    return propagator_addDiv(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  mul(e1, e2, resultVar) {
    if (resultVar) {
      return propagator_addMul(this.config, GET_NAME(e1), GET_NAME(e2), GET_NAME(resultVar));
    }
    return propagator_addMul(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  ['∑'](es, resultVar) {
    return this.sum(es, resultVar);
  }
  sum(es, resultVar) {
    let var_names = GET_NAMES(es);
    if (resultVar) {
      return propagator_addSum(this.config, var_names, GET_NAME(resultVar));
    }
    return propagator_addSum(this.config, var_names);
  }

  ['∏'](es, resultVar) {
    return this.product(es, resultVar);
  }
  product(es, resultVar) {
    let var_names = GET_NAMES(es);
    if (resultVar) {
      return propagator_addProduct(this.config, var_names, GET_NAME(resultVar));
    }
    return propagator_addProduct(this.config, var_names);
  }

  // TODO
  // times_plus    k1*v1 + k2*v2
  // wsum          ∑ k*v
  // scale         k*v


  // (In)equality Propagators
  // only first expression can be array

  ['{}≠'](es) {
    this.distinct(es);
  }
  distinct(es) {
    propagator_addDistinct(this.config, GET_NAMES(es));
  }

  ['=='](e1, e2) {
    return this.eq(e1, e2);
  }
  eq(e1, e2) {
    if (e1 instanceof Array) {
      for (let i = 0; i < e1.length; i++) {
        let e = e1[i];
        this._eq(e, e2);
      }
      return e2;
    } else {
      return this._eq(e1, e2);
    }
  }
  _eq(e1, e2) {
    return propagator_addEq(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  ['!='](e1, e2) {
    this.neq(e1, e2);
  }
  neq(e1, e2) {
    if (e1 instanceof Array) {
      for (let i = 0; i < e1.length; i++) {
        let e = e1[i];
        this._neq(e, e2);
      }
    } else {
      this._neq(e1, e2);
    }
  }
  _neq(e1, e2) {
    propagator_addNeq(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  ['>='](e1, e2) {
    this.gte(e1, e2);
  }
  gte(e1, e2) {
    if (e1 instanceof Array) {
      for (let i = 0; i < e1.length; i++) {
        let e = e1[i];
        this._gte(e, e2);
      }
    } else {
      this._gte(e1, e2);
    }
  }
  _gte(e1, e2) {
    propagator_addGte(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  ['<='](e1, e2) {
    this.lte(e1, e2);
  }
  lte(e1, e2) {
    if (e1 instanceof Array) {
      for (let i = 0; i < e1.length; i++) {
        let e = e1[i];
        this._lte(e, e2);
      }
    } else {
      this._lte(e1, e2);
    }
  }
  _lte(e1, e2) {
    propagator_addLte(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  ['>'](e1, e2) {
    this.gt(e1, e2);
  }
  gt(e1, e2) {
    if (e1 instanceof Array) {
      for (let i = 0; i < e1.length; i++) {
        let e = e1[i];
        this._gt(e, e2);
      }
    } else {
      this._gt(e1, e2);
    }
  }
  _gt(e1, e2) {
    propagator_addGt(this.config, GET_NAME(e1), GET_NAME(e2));
  }

  ['<'](e1, e2) {
    this.lt(e1, e2);
  }
  lt(e1, e2) {
    if (e1 instanceof Array) {
      for (let i = 0; i < e1.length; i++) {
        let e = e1[i];
        this._lt(e, e2);
      }
    } else {
      this._lt(e1, e2);
    }
  }
  _lt(e1, e2) {
    propagator_addLt(this.config, GET_NAME(e1), GET_NAME(e2));
  }


  // Conditions, ie Reified (In)equality Propagators
  _cacheReified(op, e1, e2, boolVar) {
    e1 = GET_NAME(e1);
    e2 = GET_NAME(e2);
    if (boolVar != null) { // can be 0
      return propagator_addReified(this.config, op, e1, e2, GET_NAME(boolVar));
    }
    return propagator_addReified(this.config, op, e1, e2);
  }

  ['!=?'](e1, e2, boolVar) {
    return this.isNeq(e1, e2, boolVar);
  }
  isNeq(e1, e2, boolVar) {
    return this._cacheReified('neq', e1, e2, boolVar);
  }

  ['==?'](e1, e2, boolVar) {
    return this.isEq(e1, e2, boolVar);
  }
  isEq(e1, e2, boolVar) {
    return this._cacheReified('eq', e1, e2, boolVar);
  }

  ['>=?'](e1, e2, boolVar) {
    return this.isGte(e1, e2, boolVar);
  }
  isGte(e1, e2, boolVar) {
    return this._cacheReified('gte', e1, e2, boolVar);
  }

  ['<=?'](e1, e2, boolVar) {
    return this.isLte(e1, e2, boolVar);
  }
  isLte(e1, e2, boolVar) {
    return this._cacheReified('lte', e1, e2, boolVar);
  }

  ['>?'](e1, e2, boolVar) {
    return this.isGt(e1, e2, boolVar);
  }
  isGt(e1, e2, boolVar) {
    return this._cacheReified('gt', e1, e2, boolVar);
  }

  ['<?'](e1, e2, boolVar) {
    return this.isLt(e1, e2, boolVar);
  }
  isLt(e1, e2, boolVar) {
    return this._cacheReified('lt', e1, e2, boolVar);
  }

  // Various rest

  callback(es, cb) {
    propagator_addCallback(this.config, GET_NAMES(es), cb);
  }

  /**
   * Solve this solver. It should be setup with all the constraints.
   *
   * @param {Object} options
   * @property {number} [options.max=1000]
   * @property {number} [options.log=LOG_NONE] Logging level; one of: 0, 1 or 2 (see LOG_* constants)
   * @property {string|Array.<string|Bvar>} options.vars Target branch vars or var names to force solve. Defaults to all.
   * @property {number} [options.search='depth_first'] See FD.Search
   * @property {string|Object} [options.distribute='naive'] Maps to FD.distribution.value, see config_setOptions
   * @property {boolean} add_unknown_vars
   * @return {Object[]}
   */
  solve(options) {
    let obj = this.prepare(options);

    // logging inside asserts because they are stripped out for dist
    ASSERT(!(options && (options.dbg === true || (options.dbg & LOG_STATS)) && console.log(this.state.space.config)));
    ASSERT(!(options && (options.dbg & LOG_STATS) && console.log(`## state.space.config:\n${this.state.space.config}`)));

    this.run(obj);
    return this.solutions;
  }

  /**
   * Prepare internal configuration before actually solving
   * Collects one-time config data and sets up defaults
   *
   * @param {Object} [options={}] See @solve
   */
  prepare(options = {}) {
    let {
      max = 1000,
      log = LOG_NONE,
      vars: branchVars = this.vars.all,
      search,
      distribute: distributionOptions = this.distribute,
      add_unknown_vars: addUnknownVars, // TOFIX: is this used anywhere? (by a dependency), otherwise drop it.
    } = options;

    let varNames = GET_NAMES(branchVars);

    if (addUnknownVars) {
      let unknown_names = config_getUnknownVars(this.config);
      config_addVarsWithDomain(this.config, unknown_names, domain_clone(this.defaultDomain));
    }

    let overrides = solver_collectDistributionOverrides(varNames, this.vars.byId, this.config);
    if (overrides) {
      config_setOptions(this.config, {var_dist_config: overrides});
    }

    config_setOptions(this.config, {targeted_var_names: varNames});
    config_setOptions(this.config, distributionOptions);

    let searchFunc = this._get_search_func_or_die(search);

    // create the root node of the search tree (each node is a Space)
    let rootSpace = space_createFromConfig(this.config);

    // __REMOVE_BELOW_FOR_DIST__
    this._space = rootSpace; // only exposed for easy access in tests, and so only available after .prepare()
    // __REMOVE_ABOVE_FOR_DIST__
    this.state.space = rootSpace;
    this.state.more = true;

    this._prepared = true;

    return ({
      searchFunc,
      max,
      log,
    });
  }

  /**
   * @param {string} [search=this.search]
   * @returns {Function}
   */
  _get_search_func_or_die(search = this.search) {
    switch (search) {
      case 'depth_first':
        var searchFunc = search_depthFirst;
        break;
      default:
        THROW(`Unknown search strategy: ${search}`);
    }

    return searchFunc;
  }

  /**
   * Run the solver. You should call @prepare before calling this function.
   *
   * @param {Object} options
   * @property {Function} options.searchFunc
   * @property {number} options.max
   * @property {number} options.log
   * @param {boolean} [squash] If squashed, dont get the actual solutions. They are irrelevant for perf tests.
   */
  run({searchFunc, max, log}, squash) {
    ASSERT(typeof searchFunc === 'function', 'search func should be a function');
    ASSERT(typeof max === 'number', 'max should be a number');
    ASSERT(log >= LOG_MIN && log <= LOG_MAX, 'log level should be a valid value');

    ASSERT(this._prepared, 'must run #prepare before #run');
    this._prepared = false;

    let solutions = this.solutions;
    ASSERT(solutions instanceof Array);

    let state = this.state;
    ASSERT(state);

    if (log >= LOG_STATS) {
      console.time('      - FD Solver Time');
      console.log(`      - FD Solver Var Count: ${this.state.space.config.all_var_names.length}`);
      console.log(`      - FD Solver Prop Count: ${this.state.space.config.propagators.length}`);
    }

    let count = solver_runLoop(state, searchFunc, max, solutions, log, squash);

    if (log >= LOG_STATS) {
      console.timeEnd('      - FD Solver Time');
      console.log(`      - FD solution count: ${count}`);
    }
  }

  /**
   * Exposes internal method config_addVar for subclass
   * (Used by PathSolver in a private project)
   *
   * @public
   * @param {string} id
   * @param {number} lo
   * @param {number} hi
   * @returns {string}
   */
  space_add_var_range(id, lo, hi) {
    return config_addVarRange(this.config, id, lo, hi);
  }

  /**
   * Exposes internal method domain_fromList for subclass
   * (Used by PathSolver in a private project)
   *
   * @param {number[]} list
   * @returns {number[]}
   */
  domain_fromList(list) {
    return domain_fromList(list);
  }

  /**
   * @returns {Solver}
   */
  branch_from_current_solution() {
    // get the _solved_ space, convert to config,
    // use new config as base for new solver
    let solvedConfig = space_toConfig(this.state.space);
    return new Solver({config: solvedConfig});
  }

  /**
   * Internally finitedomain only uses var indexes. This function can
   * be used to look them up (externally). Should prevent manual lookups.
   *
   * @param {number} varIndex
   * @returns {string}
   */
  getNameForIndex(varIndex) {
    return this._space.config.all_var_names[varIndex];
  }
}

/**
 * This is the core search loop. Supports multiple solves although you
 * probably only need one solution. Won't return more solutions than max.
 *
 * @param {Object} state
 * @param {Function} searchFunc
 * @param {number} max Stop after finding this many solutions
 * @param {Object[]} solutions All solutions are pushed into this array
 * @param {number} log LOG constant
 * @param {boolean} squash Suppress creating solutions? For testing perf.
 * @returns {number} Number of solutions found (could be bound by max)
 */
function solver_runLoop(state, searchFunc, max, solutions, log, squash) {
  let count = 0;
  while (state.more && count < max) {
    searchFunc(state);
    if (state.status !== 'end') {
      count++;
      solver_handleSolution(state, solutions, log, squash);
    }
  }
  return count;
}

/**
 * When the search finds a solution, store and log it
 *
 * @param {Object} state
 * @param {Object[]} solutions
 * @param {number} log
 * @param {boolean} squash
 */
function solver_handleSolution(state, solutions, log, squash) {
  if (state.status !== 'end') {
    if (!squash) {
      let solution = space_solution(state.space);
      solutions.push(solution);
      if (log >= LOG_SOLVES) {
        console.log('      - FD solution() ::::::::::::::::::::::::::::');
        console.log(JSON.stringify(solution));
      }
    }
  }
}

/**
 * Visit the branch vars and collect var specific configuration overrides if
 * there are any and put them on the root space. Mainly used for Markov
 * searching. The result is set to be Space#var_dist_config
 *
 * @param {string[]} varNames
 * @param {Object} bvarsById Maps var names to their Bvar
 * @param {$config} config
 * @returns {Object|null} Contains data for each var that has dist options
 */
function solver_collectDistributionOverrides(varNames, bvarsById, config) {
  let overrides;
  for (var i = 0; i < varNames.length; ++i) {
    var name = varNames[i];
    if (!overrides || !overrides[name]) {
      var bvar = bvarsById[name];
      let distributeOptions = bvar && bvar.distributeOptions;
      if (distributeOptions) {
        if (!overrides) overrides = {};
        ASSERT(!overrides[name], 'each name is visited only once so this key should not yet exist', name, distributeOptions);
        overrides[name] = {};
        for (let key in distributeOptions) {
          overrides[name][key] = distributeOptions[key];
        }
      }
      // TOFIX: change upstreams to put this override in the config as well instead of directly on the bvar
      if (bvar && bvar.distribute) {
        if (!overrides) overrides = {};
        if (!overrides[name]) overrides[name] = {};
        overrides[name].distributor_name = bvar.distribute;
      }
      if (overrides && overrides[name] && overrides[name].distributor_name === 'markov') {
        propagator_addMarkov(config, name);
      }
    }
  }
  return overrides;
}

/**
 * validate domains, filter and fix legacy domains, throw for bad inputs
 *
 * @param {$domain} domain
 * @returns {number[]}
 */
function solver_validateDomain(domain) {
  // i hope this doesnt trip up implicit constants
  if (typeof domain === 'number') return domain;

  // support legacy domains and validate input here
  let msg = solver_confirmDomain(domain);
  if (msg) {
    let fixedDomain = solver_tryToFixLegacyDomain(domain);
    if (fixedDomain) {
      if (console && console.warn) {
        console.warn(msg, domain, 'auto-converted to', fixedDomain);
      }
    } else {
      if (console && console.warn) {
        console.warn(msg, domain, 'unable to fix');
      }
      THROW(`Fatal: unable to fix domain: ${JSON.stringify(domain)}`);
    }
    domain = fixedDomain;
  }
  return domain_numarr(domain);
}

/**
 * Domain input validation
 * Have to support and transform legacy domain formats of domains of domains
 * and transform them to flat domains with lo/hi pairs
 *
 * @param {number[]} domain
 * @returns {string|undefined}
 */
function solver_confirmDomain(domain) {
  for (let i = 0; i < domain.length; i += PAIR_SIZE) {
    let lo = domain[i];
    let hi = domain[i + 1];
    let e = solver_confirmDomainElement(lo);
    if (e) {
      return e;
    }
    let f = solver_confirmDomainElement(hi);
    if (f) {
      return f;
    }

    if (lo < SUB) {
      return `Domain contains a number lower than SUB (${lo} < ${SUB}), this is probably a bug`;
    }
    if (hi > SUP) {
      return `Domain contains a number higher than SUP (${hi} > ${SUP}), this is probably a bug`;
    }
    if (lo > hi) {
      return `Found a lo/hi pair where lo>hi, expecting all pairs lo<=hi (${lo}>${hi})`;
    }
  }
  ASSERT((domain.length % PAIR_SIZE) === 0, 'other tests should have caught uneven domain lengths');
}

/**
 * @param {number} n
 * @returns {string|undefined}
 */
function solver_confirmDomainElement(n) {
  if (typeof n !== 'number') {
    if (n instanceof Array) {
      return 'Detected legacy domains (arrays of arrays), expecting flat array of lo-hi pairs';
    }
    return 'Expecting array of numbers, found something else (#{n}), this is probably a bug';
  }
  if (isNaN(n)) {
    return 'Domain contains an actual NaN, this is probably a bug';
  }
}

/**
 * Try to convert old array of arrays domain to new
 * flat array of number pairs domain. If any validation
 * step fails, return nothing.
 *
 * @param {number[]} domain
 * @returns {number[]}
 */
function solver_tryToFixLegacyDomain(domain) {
  let fixed = [];
  for (let i = 0; i < domain.length; i++) {
    let a = domain[i];
    if (!(a instanceof Array)) {
      return;
    }
    if (a.length !== PAIR_SIZE) {
      return;
    }
    let [lo, hi] = a;
    if (lo > hi) {
      return;
    }
    fixed.push(lo, hi);
  }
  return fixed;
}

// BODY_STOP

export default Solver;
