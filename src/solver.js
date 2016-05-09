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
  config_addVar,
  config_addVarAnon,
  config_create,
  config_getUnknownVars,
  config_setDefaults,
  config_setOptions,
} from './config';

import {
  domain_createBool,
  domain_createValue,
  domain_fromList,
} from './domain';

import search_depthFirst from './search';

import {
  __space_debugString,
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
  propagator_addRing_mul,
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
let Solver = class Solver {
  /**
   * @param {Object} options
   * @property {string} [o.distribute='naive']
   * @property {string} [o.search='depth_first']
   * @property {number[]} [o.defaultDomain=[0,1]]
   * @property {Object} [o.searchDefaults]
   * @property {Config} [o.config=config_create()]
   */
  constructor(options = {}) {
    this._class = 'solver';

    let {
      distribute,
      search,
      defaultDomain,
      config,
    } = options;

    this.distribute = distribute;
    this.search = search;
    this.defaultDomain = defaultDomain;
    this.config = config;

    if (this.search == null) {
      this.search = 'depth_first';
    }
    if (this.distribute == null) {
      this.distribute = 'naive';
    }
    if (this.defaultDomain == null) {
      this.defaultDomain = domain_createBool();
    }
    if (this.config == null) {
      this.config = config_create();
    }

    if (typeof this.distribute === 'string') {
      config_setDefaults(this.config, this.distribute);
    } else if (this.distribute) {
      config_setOptions(this.config, this.distribute);
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
    return config_addVarAnon(this.config, num);
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
   * @param {number[]} domain
   * @returns {string}
   */
  decl(id, domain) {
    if (typeof domain === 'undefined' || domain === null) {
      domain = this.defaultDomain.slice(0);
    }
    domain = solver_validateDomain(domain);
    return config_addVar(this.config, id, domain);
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
   * @param dom
   * @returns {*}
   */
  addVar(v, dom) {
    ASSERT(!(v instanceof Array), 'Not expecting to receive an array', v);
    if (typeof v === 'string') {
      v = {
        id: v,
        domain: dom,
      };
    }

    let {
      id,
      domain,
      name,
      distribute,
    } = v;

    if (id == null) {
      THROW('Solver#addVar: requires id ');
    }

    let vars = this.vars;
    if (vars.byId[id]) {
      THROW(`Solver#addVar: var.id already added: ${id}`);
    }

    if (typeof domain === 'undefined' || domain === null) {
      domain = this.defaultDomain.slice(0);
    }
    if (typeof domain === 'number') {
      domain = domain_createValue(domain);
    }
    domain = solver_validateDomain(domain);

    config_addVar(this.config, id, domain);
    vars.byId[id] = v;
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
      return propagator_addRing_mul(this.config, GET_NAME(e1), GET_NAME(e2), GET_NAME(resultVar));
    }
    return propagator_addRing_mul(this.config, GET_NAME(e1), GET_NAME(e2));
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
    this.eq(e1, e2);
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
    if (boolVar) {
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
   * @property {number} options.max
   * @property {number} options.log Logging level; one of: 0, 1 or 2 (see LOG_* constants)
   * @property {string[]|Fdvar[]|Bvar[]} options.vars Target branch vars or var names to force solve. Defaults to all.
   * @property {number} options.search='depth_first' See FD.Search
   * @property {number} options.distribute='naive' Maps to FD.distribution.value
   * @property {Object} [options.distribute] See config_setOptions
   * @return {Array}
   */
  solve(options) {
    let obj = this.prepare(options);
    ASSERT(!(options && options.dbg === true || options && options.dbg & 1) || !console.log(__space_debugString(this.state.space)));
    ASSERT(!(options && options.dbg & 2) || !console.log(`## state.space.config:\n${this.state.space.config}`));
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
      max,
      log, // 0, 1, 2
      vars: branchVars,
      search,
      distribute: distributionOptions,
      add_unknown_vars: addUnknownVars, // bool, TOFIX: is this used anywhere? (by a dependency), otherwise drop it.
    } = options;

    if (typeof log === 'undefined' || log === null) {
      log = LOG_NONE;
    }
    if (typeof max === 'undefined' || max === null) {
      max = 1000;
    }
    if (typeof branchVars === 'undefined' || branchVars === null) {
      branchVars = this.vars.all;
    }
    let varNames = GET_NAMES(branchVars);
    if (typeof distributionOptions === 'undefined' || distributionOptions === null) {
      distributionOptions = this.distribute;
    } // TOFIX: this is weird. if @distribute is a string this wont do anything...

    if (addUnknownVars) {
      let unknown_names = config_getUnknownVars(this.config);
      config_addVarAnon(this.config, unknown_names);
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
   * @param {string} search
   * @returns {string} [search]
   */
  _get_search_func_or_die(search) {
    if (typeof search === 'undefined' || search === null) {
      search = this.search;
    }

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
   * @param {boolean} squash If squashed, dont get the actual solutions. They are irrelevant for perf tests.
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

    ASSERT(Object.keys(this.state.space.vars).sort().join('--') === Object.keys(this.state.space.config.initial_vars).sort().join('--'), 'migration test');

    let count = 0;
    while (state.more && count < max) {
      searchFunc(state);
      if (state.status !== 'end') {
        count++;
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
    return config_addVar(this.config, id, lo, hi);
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
};

/**
 * Visit the branch vars and collect var specific configuration overrides if
 * there are any and put them on the root space. This way we don't need to
 * burden Fdvar with this. Mainly used for Markov searching.
 * The result is set to be Space#var_dist_config
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
    var bvar = bvarsById[name];
    let distributeOptions = bvar && bvar.distributeOptions;
    if (distributeOptions) {
      if (!overrides) overrides = {};
      if (!overrides[name]) overrides[name] = {};
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
  return overrides;
}


/**
 * validate domains, filter and fix legacy domains, throw for bad inputs
 *
 * @param {number[]} domain
 * @returns {number[]}
 */
function solver_validateDomain(domain) {
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
  return domain;
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
  if ((domain.length % 2) !== 0) {
    return 'Detected invalid domain, maybe legacy?';
  }
  for (let i = 0; i < domain.length; i += 2) {
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
      return `$omain contains a number lower than SUB (#{n} < ${SUB}), this is probably a bug`;
    }
    if (hi > SUP) {
      return `$omain contains a number higher than SUP (#{n} > ${SUP}), this is probably a bug`;
    }
    if (lo > hi) {
      return `$ound a lo/hi pair where lo>hi, expecting all pairs lo<=hi (#{lo}>${hi})`;
    }
  }
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
  if (n < SUB) {
    return `Domain contains a number lower than SUB (#{n} < ${SUB}), this is probably a bug`;
  }
  if (n > SUP) {
    return `Domain contains a number higher than SUP (#{n} > ${SUP}), this is probably a bug`;
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
    if (a.length !== 2) {
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
