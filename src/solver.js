import {
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,
  NO_SUCH_VALUE,

  ASSERT,
  ASSERT_ARRDOM,
  ASSERT_VARDOMS_SLOW,
  GET_NAME,
  GET_NAMES,
  THROW,
} from './helpers';

import {
  config_addConstraint,
  config_addVarAnonConstant,
  config_addVarDomain,
  config_addVarRange,
  config_create,
  config_setDefaults,
  config_setOption,
  config_setOptions,
} from './config';

import {
  FORCE_ARRAY,

  domain__debug,
  domain_clone,
  domain_createEmpty,
  domain_createRange,
  domain_fromListToArrdom,
  domain_isEmpty,
  domain_max,
  domain_toArr,
  domain_toList,
  domain_arrToSmallest,
  domain_anyToSmallest,
  domain_validateLegacyArray,
} from './domain';

import search_depthFirst from './search';

import {
  space_createFromConfig,
  space_solution,
  space_toConfig,
} from './space';

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
   * @property {number[]} [options.defaultDomain=[0,1]]
   * @property {Object} [options.searchDefaults]
   * @property {$config} [options.config=config_create()]
   */
  constructor(options = {}) {
    this._class = 'solver';
    this.distribute = options.distribute || 'naive';

    if (options.config) {
      let config = this.config = options.config;
      if (config.initial_domains) {
        let initialDomains = config.initial_domains;
        for (let i = 0, len = initialDomains.length; i < len; ++i) {
          let domain = initialDomains[i];
          if (domain.length === 0) domain = domain_createEmpty();
          initialDomains[i] = domain_anyToSmallest(domain);
        }
      }
      if (config._propagators) config._propagators = undefined; // will be regenerated
      if (config._varToPropagators) config._varToPropagators = undefined; // will be regenerated
    } else {
      this.config = config_create();
    }

    this.defaultDomain = options.defaultDomain || domain_createRange(0, 1);

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
      domain = domain_clone(this.defaultDomain, FORCE_ARRAY);
    }

    ASSERT(domain instanceof Array, 'DOMAIN_SHOULD_BE_ARRAY', domain, domainOrValue);

    domain = domain_validateLegacyArray(domain);
    if (!domain.length) THROW('EMPTY_DOMAIN_NOT_ALLOWED');
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
   * @param varOptions
   * @param [domain=v.domain] Note: this cannot be a "small domain"! Numbers are interpreted to be constants in Solver
   * @returns {*}
   */
  addVar(varOptions, domain) {
    if (typeof varOptions === 'string') {
      ASSERT(typeof domain !== 'number', 'FOR_SANITY_REASON_NUMBERS_NOT_ALLOWED_HERE'); // because is it a small domain or a constant? exactly. always an array in this function.
      if (domain === undefined) domain = domain_clone(this.defaultDomain, FORCE_ARRAY);
      ASSERT(domain, 'NO_EMPTY_DOMAIN', domain);
      domain = domain_validateLegacyArray(domain);
      config_addVarDomain(this.config, varOptions, domain);

      return varOptions;
    }

    // the rest is mostly legacy stuff that should move to multiverse's pathsolver subclass
    ASSERT(!(varOptions instanceof Array), 'Not expecting to receive an array', varOptions);
    ASSERT(typeof varOptions === 'object', 'v should be an id or an object containing meta');

    domain = varOptions.domain;
    ASSERT(domain === undefined || domain instanceof Array, 'ARRAY_DOMAIN_OR_DEFAULT');
    if (domain) {
      domain = domain_validateLegacyArray(domain);
      ASSERT(domain instanceof Array, 'SHOULD_NOT_TURN_THIS_INTO_NUMBER');
    } else {
      domain = domain_clone(this.defaultDomain, FORCE_ARRAY);
    }

    let id = varOptions.id;
    if (!id) THROW('Solver#addVar: requires id');

    config_addVarDomain(this.config, id, domain);

    if (varOptions.distributeOptions && varOptions.distributeOptions.valtype === 'markov') {
      let matrix = varOptions.distributeOptions.matrix;
      if (!matrix) {
        if (varOptions.distributeOptions.expandVectorsWith) {
          matrix = varOptions.distributeOptions.matrix = [{vector: []}];
        } else {
          THROW('Solver#addVar: markov var missing distribution (needs matrix or expandVectorsWith)');
        }
      }

      for (let i = 0; i < matrix.length; ++i) {
        let row = matrix[i];
        let boolFunc = row.boolean;
        if (typeof boolFunc === 'function') {
          row.booleanId = boolFunc(this, varOptions);
        } else if (typeof boolFunc === 'string') {
          row.booleanId = boolFunc;
        } else {
          ASSERT(!boolFunc, 'row.boolean should be a function returning a var name or just a var name');
        }
      }
    }

    // the rest is this.vars stuff for multiverse...

    let vars = this.vars;
    if (vars.byId[id]) THROW(`Solver#addVar: var.id already added: ${id}`);

    vars.byId[id] = varOptions;
    vars.all.push(varOptions);

    let name = varOptions.name;
    if (name != null) {
      if (vars.byName[name] == null) {
        vars.byName[name] = [];
      }
      vars.byName[name].push(varOptions);
    }

    return varOptions;
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

  /**
   * Solve this solver. It should be setup with all the constraints.
   *
   * @param {Object} options
   * @property {number} [options.max=1000]
   * @property {number} [options.log=LOG_NONE] Logging level; one of: 0, 1 or 2 (see LOG_* constants)
   * @property {string|Array.<string|Bvar>} options.vars Target branch vars or var names to force solve. Defaults to all.
   * @property {string|Object} [options.distribute='naive'] Maps to FD.distribution.value, see config_setOptions
   * @property {boolean} [_debug] A more human readable print of the configuration for this solver
   * @property {boolean} [_debugConfig] Log out solver.config after prepare() but before run()
   * @property {boolean} [_debugSpace] Log out solver._space after prepare() but before run(). Only works in dev code (stripped from dist)
   * @property {boolean} [_debugSolver] Call solver._debugSolver() after prepare() but before run()
   * @return {Object[]}
   */
  solve(options = {}) {
    let log = options.log === undefined ? LOG_NONE : options.log;
    let max = options.max || 1000;

    this._prepare(options, log);

    if (options._debug) this._debugLegible();
    if (options._debugConfig) this._debugConfig();
    // __REMOVE_BELOW_FOR_DIST__
    if (options._debugSpace) console.log('## _debugSpace:\n', getInspector()(this._space));
    // __REMOVE_ABOVE_FOR_DIST__
    if (options._debugSolver) this._debugSolver();

    this._run(max, log);

    return this.solutions;
  }

  /**
   * Prepare internal configuration before actually solving
   * Collects one-time config data and sets up defaults
   *
   * @param {Object} [options={}] See @solve
   * @param {number} log One of the LOG_* constants
   */
  _prepare(options, log) {
    ASSERT(log === undefined || log >= LOG_MIN && log <= LOG_MAX, 'log level should be a valid value or be undefined (in tests)');
    if (log >= LOG_STATS) {
      console.log('      - FD Preparing...');
      console.time('      - FD Prepare Time');
    }

    let config = this.config;
    ASSERT_VARDOMS_SLOW(config.initial_domains, domain__debug);

    // TODO: cant move this to addVar yet because mv can alter these settings after the addVar call
    let allVars = config.all_var_names;
    for (var i = 0; i < allVars.length; ++i) {
      var name = allVars[i];
      var bvar = this.vars.byId[name];
      if (bvar) solver_varDistOptions(name, bvar, config);
    }

    // TODO: deal with the GET_NAMES bit at callsites, only allow string[] for .vars here. and do rename .vars as well.
    if (options.vars && options.vars !== 'all') config_setOption(config, 'targeted_var_names', GET_NAMES(options.vars));

    let distributionSettings = options.distribute || this.distribute;
    if (typeof distributionSettings === 'string') config_setDefaults(config, distributionSettings);
    else config_setOptions(config, distributionSettings); // TOFIX: get rid of this in mv

    // create the root node of the search tree (each node is a Space)
    let rootSpace = space_createFromConfig(config);

    // __REMOVE_BELOW_FOR_DIST__
    this._space = rootSpace; // only exposed for easy access in tests, and so only available after .prepare()
    // __REMOVE_ABOVE_FOR_DIST__
    this.state.space = rootSpace;
    this.state.more = true;
    this.state.stack = [];

    this._prepared = true;
    if (log >= LOG_STATS) console.timeEnd('      - FD Prepare Time');
  }

  /**
   * Run the solver. You should call @_prepare before calling this function.
   *
   * @param {number} max Hard stop the solver when this many solutions have been found
   * @param {number} log One of the LOG_* constants
   */
  _run(max, log) {
    ASSERT(typeof max === 'number', 'max should be a number');
    ASSERT(log >= LOG_MIN && log <= LOG_MAX, 'log level should be a valid value');

    ASSERT(this._prepared, 'must run #prepare before #run');
    this._prepared = false;

    let state = this.state;
    ASSERT(state);

    if (log >= LOG_STATS) {
      console.log(`      - FD Var Count: ${this.config.all_var_names.length}`);
      console.log(`      - FD Constraint Count: ${this.config.all_constraints.length}`);
      console.log(`      - FD Propagator Count: ${this.config._propagators.length}`);
      console.log('      - FD Solving...');
      console.time('      - FD Solving Time');
    }

    let alreadyRejected = false;
    let vardoms = state.space.vardoms;
    for (let i = 0, n = vardoms.length; i < n; ++i) {
      if (domain_isEmpty(vardoms[i])) {
        alreadyRejected = true;
        if (log >= LOG_STATS) {
          console.log('      - FD: rejected without propagation');
        }
        break;
      }
    }

    let solvedSpaces;
    if (alreadyRejected) {
      solvedSpaces = [];
    } else {
      solvedSpaces = solver_runLoop(state, this.config, max);
    }

    if (log >= LOG_STATS) {
      console.timeEnd('      - FD Solving Time');
      ASSERT(!void console.log(`      - FD debug stats: called propagate(): ${this.config._propagates > 0 ? this.config._propagates + 'x' : 'never! Finished by only using precomputations.'}`));
      console.log(`      - FD Solutions: ${solvedSpaces.length}`);
    }

    solver_getSolutions(solvedSpaces, this.config, this.solutions, log);
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
   * @returns {$arrdom[]}
   */
  domain_fromList(list) {
    return domain_toArr(domain_fromListToArrdom(list));
  }

  /**
   * Used by PathSolver in another (private) project
   * Exposes domain_max
   *
   * @param {$arrdom} domain
   * @returns {number} If negative, search failed. Note: external dep also depends on that being negative.
   */
  domain_max(domain) {
    ASSERT_ARRDOM(domain);
    if (domain.length === 0) return NO_SUCH_VALUE;
    return domain_max(domain_arrToSmallest(domain));
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
    return domain_toList(domain);
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
    let solvedConfig = space_toConfig(this.state.space, this.config);
    return new Solver({config: solvedConfig});
  }

  _debugLegible() {
    let clone = JSON.parse(JSON.stringify(this.config)); // prefer this over config_clone, just in case.
    let names = clone.all_var_names;
    let targeted = clone.targetedVars;
    let constraints = clone.all_constraints;
    let domains = clone.initial_domains;
    let propagators = clone._propagators;

    for (let key in clone) {
      // underscored prefixed objects are generally auto-generated structs
      // we don't want to debug a 5mb buffer, one byte per line.
      if (key[0] === '_' && typeof clone[key] === 'object') {
        clone[key] = '<removed>';
      }
    }
    clone.all_var_names = '<removed>';
    clone.all_constraints = '<removed>';
    clone.initial_domains = '<removed>';
    clone.var_dist_options = '<removed>';
    if (targeted !== 'all') clone.targetedVars = '<removed>';

    console.log('\n## _debug:\n');
    console.log('- config:');
    console.log(getInspector()(clone));
    console.log('- vars (' + names.length + '):');
    console.log(names.map((name, index) => `${index}: ${domain__debug(domains[index])} ${name === String(index) ? '' : ' // ' + name}`).join('\n'));
    if (targeted !== 'all') {
      console.log('- targeted vars (' + targeted.length + '): ' + targeted.join(', '));
    }
    console.log('- constraints (' + constraints.length + ' -> ' + propagators.length + '):');
    console.log(constraints.map((c, index) => {
      if (c.param === undefined) {
        return `${index}: ${c.name}(${c.varIndexes})      --->  ${c.varIndexes.map(index => domain__debug(domains[index])).join(',  ')}`;
      } else if (c.name === 'reifier') {
        return `${index}: ${c.name}[${c.param}](${c.varIndexes})      --->  ${domain__debug(domains[c.varIndexes[0]])} ${c.param} ${domain__debug(domains[c.varIndexes[1]])} = ${domain__debug(domains[c.varIndexes[2]])}`;
      } else {
        return `${index}: ${c.name}(${c.varIndexes}) = ${c.param}      --->  ${c.varIndexes.map(index => domain__debug(domains[index])).join(',  ')} -> ${domain__debug(domains[c.param])}`;
      }
    }).join('\n'));
    console.log('##/\n');
  }
  _debugSolver() {
    console.log('## _debugSolver:\n');
    //let inspect = getInspector();

    let config = this.config;
    //console.log('# Config:');
    //console.log(inspect(_clone(config)));

    let names = config.all_var_names;
    console.log('# Variables (' + names.length + 'x):');
    console.log('  index name domain toArr');
    for (let varIndex = 0; varIndex < names.length; ++varIndex) {
      console.log('  ', varIndex, ':', names[varIndex], ':', domain__debug(config.initial_domains[varIndex]));
    }

    let constraints = config.all_constraints;
    console.log('# Constraints (' + constraints.length + 'x):');
    console.log('  index name vars param');
    for (let i = 0; i < constraints.length; ++i) {
      console.log('  ', i, ':', constraints[i].name, ':', constraints[i].varIndexes.join(','), ':', constraints[i].param);
    }

    let propagators = config._propagators;
    console.log('# Propagators (' + propagators.length + 'x):');
    console.log('  index name vars args');
    for (let i = 0; i < propagators.length; ++i) {
      console.log(
        '  ', i, ':', propagators[i].name + (propagators[i].name === 'reified' ? '(' + propagators[i].arg3 + ')' : ''),
        ':',
        propagators[i].index1, propagators[i].index2, propagators[i].index3,
        '->',
        domain__debug(config.initial_domains[propagators[i].index1]),
        domain__debug(config.initial_domains[propagators[i].index2]),
        domain__debug(config.initial_domains[propagators[i].index3])
    );
    }

    console.log('##');
  }

  _debugConfig() {
    let config = _clone(this.config);
    config.initial_domains = config.initial_domains.map(domain__debug);

    console.log('## _debugConfig:\n', getInspector()(config));
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
 * @param {$config} config
 * @param {number} max Stop after finding this many solutions
 * @returns {$space[]} All solved spaces that were found (until max or end was reached)
 */
function solver_runLoop(state, config, max) {
  let list = [];
  while (state.more && list.length < max) {
    search_depthFirst(state, config);
    if (state.status !== 'end') {
      list.push(state.space);
    }
  }
  return list;
}

function solver_varDistOptions(name, bvar, config) {
  let options = bvar.distributeOptions;
  if (options) {
    // TOFIX: change usages of .distribute as a string with valtype
    if (bvar.distribute) options.valtype = bvar.distribute;
    config_setOption(config, 'varStratOverride', options, name);
    if (options.valtype === 'markov') {
      config_addConstraint(config, 'markov', [name]);
    }
  }
}

function solver_getSolutions(solvedSpaces, config, solutions, log) {
  ASSERT(solutions instanceof Array);
  if (log >= LOG_STATS) {
    console.time('      - FD Solution Construction Time');
  }
  for (let i = 0; i < solvedSpaces.length; ++i) {
    let solution = space_solution(solvedSpaces[i], config);
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
