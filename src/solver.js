import {
  EMPTY,
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,
  NO_SUCH_VALUE,

  ASSERT,
  GET_NAME,
  GET_NAMES,
  THROW,
} from './helpers';

import {
  config_addVarAnonConstant,
  config_addVarDomain,
  config_addVarRange,
  config_create,
  config_setDefaults,
  config_setOptions,
} from './config';

import {
  FORCE_ARRAY,

  domain_arrToStr,
  domain_any_clone,
  domain_createRange,
  domain_fromList,
  domain_any_isRejected,
  domain_any_max,
  domain_toArr,
  domain_any_toList,
  domain_validateLegacyArray,
} from './domain';

import search_depthFirst from './search';

import {
  space_createFromConfig,
  space_solution,
  space_toConfig,
} from './space';

import {
  PROP_PNAME,
  PROP_VAR_INDEXES,
  PROP_ARG1,
} from './propagator';
import {
  config_addConstraint,
} from './config';

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
   * @property {$config} [options.config=config_create()]
   */
  constructor(options = {}) {
    let {
      distribute = 'naive',
      search = 'depth_first',
      defaultDomain = domain_createRange(0, 1),
      config = config_create(),
    } = options;

    if (config.initial_vars) {
      let doms = [];
      for (let i = 0, n = config.all_var_names.length; i < n; ++i) {
        doms[i] = config.initial_vars[config.all_var_names[i]];
      }
      config.initial_domains = doms;
      console.log('### converted initial_vars to initial_domains, log out result and update examples accordingly!');
      //console.log(doms)
      //console.log('##')
      delete config.initial_vars;
      throw new Error('update test');
    }
    if (config.initial_domains) {
      let initialDomains = config.initial_domains;
      for (let i = 0, len = initialDomains.length; i < len; ++i) {
        if (initialDomains[i] instanceof Array) initialDomains[i] = domain_arrToStr(initialDomains[i]);
      }
    }

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
    let varIndex = config_addVarAnonConstant(this.config, num);
    return this.config.all_var_names[varIndex];
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
   * @param {$domain_arr|number} [domainOrValue=this.defaultDomain] Note: if number, it is a constant (so [domain,domain]) not a $domain_num!
   * @returns {string}
   */
  decl(id, domainOrValue) {
    ASSERT(id && typeof id === 'string', 'EXPECTING_ID_STRING');
    let domain;
    if (typeof domainOrValue === 'number') domain = [domainOrValue, domainOrValue]; // just normalize it here.
    else domain = domainOrValue;

    if (!domain) {
      domain = domain_any_clone(this.defaultDomain, FORCE_ARRAY);
    }

    ASSERT(domain instanceof Array, 'DOMAIN_SHOULD_BE_ARRAY', domain, domainOrValue);

    if (domain_any_isRejected(domain)) THROW('EMPTY_DOMAIN_NOT_ALLOWED');
    domain = domain_validateLegacyArray(domain);
    let varIndex = config_addVarDomain(this.config, id, domain);
    ASSERT(this.config.all_var_names[varIndex] === id, 'SHOULD_USE_ID_AS_IS');

    return id;
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

    ASSERT(typeof domain !== 'number', 'FOR_SANITY_REASON_NUMBERS_NOT_ALLOWED_HERE'); // because is it a small domain or a constant? exactly. always an array in this function.

    if (domain === undefined) {
      domain = domain_any_clone(this.defaultDomain, FORCE_ARRAY);
    } else {
      domain = domain_validateLegacyArray(domain);
      ASSERT(domain instanceof Array, 'SHOULD_NOT_TURN_THIS_INTO_NUMBER');
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
    return config_addConstraint(this.config, 'plus', [GET_NAME(e1), GET_NAME(e2), resultVar && GET_NAME(resultVar)]);
  }

  ['-'](e1, e2, resultVar) {
    return this.min(e1, e2, resultVar);
  }
  minus(e1, e2, resultVar) {
    return this.min(e1, e2, resultVar);
  }
  min(e1, e2, resultVar) {
    return config_addConstraint(this.config, 'min', [GET_NAME(e1), GET_NAME(e2), resultVar && GET_NAME(resultVar)]);
  }

  ['*'](e1, e2, resultVar) {
    return this.ring_mul(e1, e2, resultVar);
  }
  times(e1, e2, resultVar) { // deprecated
    return this.ring_mul(e1, e2, resultVar);
  }
  ring_mul(e1, e2, resultVar) {
    return config_addConstraint(this.config, 'ring-mul', [GET_NAME(e1), GET_NAME(e2), resultVar && GET_NAME(resultVar)]);
  }

  ['/'](e1, e2, resultVar) {
    return this.div(e1, e2, resultVar);
  }
  div(e1, e2, resultVar) {
    return config_addConstraint(this.config, 'ring-div', [GET_NAME(e1), GET_NAME(e2), resultVar && GET_NAME(resultVar)]);
  }

  mul(e1, e2, resultVar) {
    return config_addConstraint(this.config, 'mul', [GET_NAME(e1), GET_NAME(e2), resultVar && GET_NAME(resultVar)]);
  }

  ['∑'](es, resultVar) {
    return this.sum(es, resultVar);
  }
  sum(es, resultVar) {
    return config_addConstraint(this.config, 'sum', GET_NAMES(es), resultVar && GET_NAME(resultVar));
  }

  ['∏'](es, resultVar) {
    return this.product(es, resultVar);
  }
  product(es, resultVar) {
    return config_addConstraint(this.config, 'product', GET_NAMES(es), resultVar && GET_NAME(resultVar));
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
    config_addConstraint(this.config, 'distinct', GET_NAMES(es));
  }

  ['=='](e1, e2) {
    return this.eq(e1, e2);
  }
  eq(e1, e2) {
    return config_addConstraint(this.config, 'eq', [GET_NAME(e1), GET_NAME(e2)]);
  }

  ['!='](e1, e2) {
    return this.neq(e1, e2);
  }
  neq(e1, e2) {
    return config_addConstraint(this.config, 'neq', [GET_NAME(e1), GET_NAME(e2)]);
  }

  ['>='](e1, e2) {
    return this.gte(e1, e2);
  }
  gte(e1, e2) {
    ASSERT(!(e1 instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    return config_addConstraint(this.config, 'gte', [GET_NAME(e1), GET_NAME(e2)]);
  }

  ['<='](e1, e2) {
    return this.lte(e1, e2);
  }
  lte(e1, e2) {
    ASSERT(!(e1 instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    return config_addConstraint(this.config, 'lte', [GET_NAME(e1), GET_NAME(e2)]);
  }

  ['>'](e1, e2) {
    return this.gt(e1, e2);
  }
  gt(e1, e2) {
    ASSERT(!(e1 instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    return config_addConstraint(this.config, 'gt', [GET_NAME(e1), GET_NAME(e2)]);
  }

  ['<'](e1, e2) {
    return this.lt(e1, e2);
  }
  lt(e1, e2) {
    ASSERT(!(e1 instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    return config_addConstraint(this.config, 'lt', [GET_NAME(e1), GET_NAME(e2)]);
  }


  // Conditions, ie Reified (In)equality Propagators
  _cacheReified(op, e1, e2, boolVar) {
    return config_addConstraint(this.config, 'reifier', [GET_NAME(e1), GET_NAME(e2), boolVar && GET_NAME(boolVar)], op);
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
    return config_addConstraint(this.config, 'callback', GET_NAMES(es), cb);
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
   * @property {boolean} [_debug] A more human readable print of the configuration for this solver
   * @property {boolean} [_debugConfig] Log out solver.config after prepare() but before run()
   * @property {boolean} [_debugSpace] Log out solver._space after prepare() but before run(). Only works in dev code (stripped from dist)
   * @property {boolean} [_debugSolver] Call solver._debugSolver() after prepare() but before run()
   * @return {Object[]}
   */
  solve(options = {}) {
    let obj = this.prepare(options);

    if (options._debug) this._debugLegible();
    if (options._debugConfig) console.log('## _debugConfig:\n', getInspector()(this.config));
    // __REMOVE_BELOW_FOR_DIST__
    if (options._debugSpace) console.log('## _debugSpace:\n', getInspector()(this._space));
    // __REMOVE_ABOVE_FOR_DIST__
    if (options._debugSolver) this._debugSolver();

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
    } = options;

    if (log >= LOG_STATS) {
      console.log('      - FD Preparing...');
      console.time('      - FD Prepare Time');
    }

    let targetAll = branchVars === 'all' || branchVars === this.vars.all; // TOFIX: clean this mess up
    let varNames = GET_NAMES(branchVars);

    let overrides = solver_collectDistributionOverrides(varNames, this.vars.byId, this.config);
    if (overrides) {
      config_setOptions(this.config, {varStratOverrides: overrides});
    }

    if (!targetAll) config_setOptions(this.config, {targeted_var_names: varNames});
    config_setOptions(this.config, distributionOptions);

    let searchFunc = this._get_search_func_or_die(search);

    // create the root node of the search tree (each node is a Space)
    let rootSpace = space_createFromConfig(this.config);

    // __REMOVE_BELOW_FOR_DIST__
    this._space = rootSpace; // only exposed for easy access in tests, and so only available after .prepare()
    // __REMOVE_ABOVE_FOR_DIST__
    this.state.space = rootSpace;
    this.state.more = true;
    this.state.stack = [];

    this._prepared = true;
    if (log >= LOG_STATS) console.timeEnd('      - FD Prepare Time');

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

    let state = this.state;
    ASSERT(state);

    if (log >= LOG_STATS) {
      console.log(`      - FD Var Count: ${state.space.config.all_var_names.length}`);
      console.log(`      - FD Constraint Count: ${state.space.config.all_constraints.length}`);
      console.log(`      - FD Propagator Count: ${state.space.config._propagators.length}`);
      console.log('      - FD Solving...');
      console.time('      - FD Solving Time');
    }

    let alreadyRejected = false;
    let vardoms = state.space.vardoms;
    for (let i = 0, n = vardoms.length; i < n; ++i) {
      if (vardoms[i] === EMPTY) {
        alreadyRejected = true;
        break;
      }
    }

    let solvedSpaces;
    if (alreadyRejected) {
      solvedSpaces = [];
    } else {
      solvedSpaces = solver_runLoop(state, searchFunc, max);
    }

    if (log >= LOG_STATS) {
      console.timeEnd('      - FD Solving Time');
      console.log(`      - FD Solutions: ${solvedSpaces.length}`);
    }

    if (!squash) solver_getSolutions(solvedSpaces, this.solutions, log);
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
    let varIndex = config_addVarRange(this.config, id, lo, hi);
    ASSERT(this.config.all_var_names[varIndex] === id, 'SHOULD_USE_ID_AS_IS');
    return id;
  }

  /**
   * Exposes internal method domain_fromList for subclass
   * (Used by PathSolver in a private project)
   * It will always create an array, never a "small domain"
   * (number that is bit-wise flags) because that should be
   * kept an internal finitedomain artifact.
   *
   * @param {number[]} list
   * @returns {number[]}
   */
  domain_fromList(list) {
    return domain_toArr(domain_fromList(list));
  }

  /**
   * Used by PathSolver in another (private) project
   * Exposes domain_max
   *
   * @param {$domain} domain
   * @returns {number} If negative, search failed. Note: external dep also depends on that being negative.
   */
  domain_max(domain) {
    if (domain_any_isRejected(domain)) return NO_SUCH_VALUE;
    return domain_any_max(domain);
  }

  /**
   * Used by PathSolver in another (private) project
   * Exposes domain_toList
   * TODO: can we lock this down to a $domain_arr ?
   *
   * @param {$domain} domain
   * @returns {number[]}
   */
  domain_toList(domain) {
    return domain_any_toList(domain);
  }

  /**
   * Expose a method to normalize the internal representation
   * of a domain to always return an array representation
   *
   * @param {$space} space
   * @param {number} varIndex
   * @returns {$domain_arr}
   */
  getDomain(space, varIndex) {
    return domain_toArr(space.vardoms[varIndex]);
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

  _debugLegible() {
    let clone = JSON.parse(JSON.stringify(this.config)); // prefer this over config_clone, just in case.
    let names = clone.all_var_names;
    let targeted = clone.targetedVars;
    let constraints = clone.all_constraints;
    let domains = clone.initial_domains;
    let propagators = clone._propagators;

    clone.all_var_names = '<removed>';
    clone.all_constraints = '<removed>';
    clone.initial_domains = '<removed>';
    clone.initial_domains = '<removed>';
    if (targeted !== 'all') clone.targetedVars = '<removed>';
    clone._propagators = '<removed>';
    clone._varToPropagators = '<removed>';
    clone._var_names_trie = '<removed>';

    console.log('\n## _debug:\n');
    console.log('- config:');
    console.log(getInspector()(clone));
    console.log('- vars (' + names.length + '):');
    console.log(names.map((name, index) => `${index}: [${domain_toArr(domains[index])}] ${name === String(index) ? '' : ' // ' + name}`).join('\n'));
    if (targeted !== 'all') {
      console.log('- targeted vars (' + targeted.length + '): ' + targeted.join(', '));
    }
    console.log('- constraints (' + constraints.length + ' -> ' + propagators.length + '):');
    console.log(constraints.map((c, index) => {
      if (c.param === undefined) {
        return `${index}: ${c.name}(${c.varIndexes})      --->  ${c.varIndexes.map(index => JSON.stringify(domains[index])).join(',  ')}`;
      } else if (c.name === 'reifier') {
        return `${index}: ${c.name}[${c.param}](${c.varIndexes})      --->  ${JSON.stringify(domains[c.varIndexes[0]])} ${c.param} ${JSON.stringify(domains[c.varIndexes[1]])} = ${JSON.stringify(domains[c.varIndexes[2]])}`;
      } else {
        return `${index}: ${c.name}(${c.varIndexes}) = ${c.param}      --->  ${c.varIndexes.map(index => JSON.stringify(domains[index])).join(',  ')} -> ${JSON.stringify(domains[c.param])}`;
      }
    }).join('\n'));
    console.log('##/\n');
  }
  _debugSolver() {
    console.log('## _debugSolver:\n');
    let inspect = getInspector();

    console.log('# Config:');
    let config = this.config;
    console.log(inspect(_clone(config)));

    console.log('# Variables (' + names.length + 'x):');
    let names = config.all_var_names;
    console.log('  index name domain toArr');
    for (let varIndex = 0; varIndex < names.length; ++varIndex) {
      console.log('  ', varIndex, ':', names[varIndex], ':', config.initial_domains[varIndex], '(= [' + domain_toArr(config.initial_domains[varIndex]) + '])');
    }

    console.log('# Constraints (' + constraints.length + 'x):');
    let constraints = config.all_constraints;
    console.log('  index name vars param');
    for (let i = 0; i < constraints.length; ++i) {
      console.log('  ', i, ':', constraints[i].name, ':', constraints[i].varIndexes.join(','), ':', constraints[i].param);
    }

    console.log('# Propagators (' + propagators.length + 'x):');
    let propagators = config._propagators;
    console.log('  index name vars args');
    for (let i = 0; i < propagators.length; ++i) {
      console.log('  ', i, ':', propagators[i][PROP_PNAME], ':', propagators[i][PROP_VAR_INDEXES], ':', propagators[i].slice(PROP_ARG1));
    }

    console.log('##');
  }
}

/**
 * Deep clone given object for debugging purposes (only)
 * Revise if used for anything concrete
 *
 * @param {*} value
 * @returns {*}
 */
function _clone(value) {
  switch (typeof value) {
    case 'object':
      if (!value) return null;
      if (value instanceof Array) {
        return value.map(v => _clone(v));
      }
      let obj = {};
      for (let key in value) {
        obj[key] = _clone(value[key]);
      }
      return obj;
    case 'function':
      let fobj = {
        __THIS_IS_A_FUNCTION: 1,
        __source: value.toString(),
      };
      for (let key in value) {
        fobj[key] = _clone(value[key]);
      }
      return fobj;

    case 'string':
    case 'number':
    case 'boolean':
    case 'undefined':
      return value;
  }

  THROW('config value what?', value);
}

let inspectorCache;
function getInspector() {
  if (!inspectorCache) {
    inspectorCache = typeof require === 'function' ? function(arg) { return require('util').inspect(arg, false, null); } : function(o) { return o; };
  }
  return inspectorCache;
}

/**
 * This is the core search loop. Supports multiple solves although you
 * probably only need one solution. Won't return more solutions than max.
 *
 * @param {Object} state
 * @param {Function} searchFunc
 * @param {number} max Stop after finding this many solutions
 * @returns {$space[]} All solved spaces that were found (until max or end was reached)
 */
function solver_runLoop(state, searchFunc, max) {
  let list = [];
  while (state.more && list.length < max) {
    searchFunc(state);
    if (state.status !== 'end') {
      list.push(state.space);
    }
  }
  return list;
}

/**
 * Visit the branch vars and collect var specific configuration overrides if
 * there are any and put them on the root space. Mainly used for Markov
 * searching. The result is set to be config.var_dist_options
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
        config_addConstraint(config, 'markov', [name]);
      }
    }
  }
  return overrides;
}

function solver_getSolutions(solvedSpaces, solutions, log) {
  ASSERT(solutions instanceof Array);
  if (log >= LOG_STATS) {
    console.time('      - FD Solution Construction Time');
  }
  for (let i = 0; i < solvedSpaces.length; ++i) {
    let solution = space_solution(solvedSpaces[i]);
    solutions.push(solution);
    if (log >= LOG_SOLVES) {
      console.log('      - FD solution() ::::::::::::::::::::::::::::');
      console.log(JSON.stringify(solution));
      console.log('                      ::::::::::::::::::::::::::::');
    }
  }
  if (log >= LOG_STATS) {
    console.timeEnd('      - FD Solution Construction Time');
  }
}


// BODY_STOP

export default Solver;
