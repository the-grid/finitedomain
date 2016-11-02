import {
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,

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
  config_create,
  config_setDefaults,
  config_setOption,
  config_setOptions,
} from './config';

import {
  domain__debug,
  domain_createEmpty,
  domain_fromListToArrdom,
  domain_isEmpty,
  domain_toArr,
  domain_anyToSmallest,
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
   * @property {$arrdom} [options.defaultDomain=[0,1]]
   * @property {Object} [options.searchDefaults]
   * @property {$config} [options.config=config_create()]
   */
  constructor(options = {}) {
    this._class = 'solver';
    this.distribute = options.distribute || 'naive';

    if (options.config) {
      let config = this.config = options.config;
      if (config.initialDomains) {
        let initialDomains = config.initialDomains;
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

    this.defaultDomain = options.defaultDomain || [0, 1];
    ASSERT_ARRDOM(this.defaultDomain);

    this.solutions = [];

    this.state = {
      space: null,
      more: false,
    };

    this._prepared = false;
  }

  /**
   * Returns an anonymous var with given value as lo/hi for the domain
   *
   * @param {number} num
   * @returns {string}
   */
  num(num) {
    if (typeof num !== 'number') {
      THROW(`Solver#num: expecting a number, got ${num} (a ${typeof num})`);
    }
    if (isNaN(num)) {
      THROW('Solver#num: expecting a number, got NaN');
    }
    let varIndex = config_addVarAnonConstant(this.config, num);
    return this.config.allVarNames[varIndex];
  }

  /**
   * Declare a var with optional given domain or constant value and distribution options.
   *
   * @param {string} varName Required. You can use this.num to declare a constant.
   * @param {$arrdom|number} [domainOrValue=this.defaultDomain] Note: if number, it is a constant (so [domain,domain]) not a $numdom!
   * @param {Object} [distributionOptions] Var distribution options. A defined non-object here will throw an error to prevent doing declRange
   * @returns {string}
   */
  decl(varName, domainOrValue, distributionOptions) {
    ASSERT(varName && typeof varName === 'string', 'EXPECTING_ID_STRING');
    ASSERT(distributionOptions === undefined || typeof distributionOptions === 'object', 'options must be omitted or an object');
    let domain;
    if (typeof domainOrValue === 'number') domain = [domainOrValue, domainOrValue]; // just normalize it here.
    else domain = domainOrValue;

    if (domain === undefined) { // domain could be 0
      ASSERT_ARRDOM(this.defaultDomain);
      domain = this.defaultDomain.slice(0);
    }

    ASSERT(domain instanceof Array, 'DOMAIN_SHOULD_BE_ARRAY', domain, domainOrValue);
    ASSERT(!domain.some(e => typeof e !== 'number'), 'ARRAY_SHOULD_ONLY_CONTAIN_NUMBERS', domain, domainOrValue);

    if (!domain.length) THROW('EMPTY_DOMAIN_NOT_ALLOWED');
    let varIndex = config_addVarDomain(this.config, varName, domain);
    ASSERT(this.config.allVarNames[varIndex] === varName, 'SHOULD_USE_ID_AS_IS');

    if (distributionOptions) {
      if (distributionOptions.distribute) THROW('Use `valtype` to set the value distribution strategy');
      config_setOption(this.config, 'varValueStrat', distributionOptions, varName);
      if (distributionOptions.valtype === 'markov') {
        config_addConstraint(this.config, 'markov', [varName]);
      }
    }

    return varName;
  }

  /**
   * Declare multiple variables with the same domain/options
   *
   * @param {string[]} varNames
   * @param {$arrdom|number} [domainOrValue=this.defaultDomain] Note: if number, it is a constant (so [domain,domain]) not a $numdom!
   * @param {Object} [options] Var distribution options. A number here will throw an error to prevent doing declRange
   */
  decls(varNames, domainOrValue, options) {
    for (let i = 0, n = varNames.length; i < n; ++i) {
      this.decl(varNames[i], domainOrValue, options);
    }
  }

  /**
   * Declare a var with given range
   *
   * @param {string} varName
   * @param {number} lo Ensure SUB<=lo<=hi<=SUP
   * @param {number} hi Ensure SUB<=lo<=hi<=SUP
   * @param {Object} [options] Var distribution options
   */
  declRange(varName, lo, hi, options) {
    ASSERT(typeof varName === 'string', 'NAME_SHOULD_BE_STRING');
    ASSERT(typeof lo === 'number', 'LO_SHOULD_BE_NUMBER');
    ASSERT(typeof hi === 'number', 'HI_SHOULD_BE_NUMBER');
    ASSERT(typeof options !== 'number', 'USE_declRange_INSTEAD');
    ASSERT(typeof options === 'object' || options === undefined, 'EXPECTING_OPTIONS_OR_NOTHING');

    return this.decl(varName, [lo, hi], options);
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
    this.eq(e1, e2);
  }
  eq(e1, e2) {
    if (e1 instanceof Array) {
      for (let i = 0, n = e1.length; i < n; ++i) {
        this.eq(e1[i], e2);
      }
    } else if (e2 instanceof Array) {
      for (let i = 0, n = e2.length; i < n; ++i) {
        this.eq(e1, e2[i]);
      }
    } else {
      config_addConstraint(this.config, 'eq', [GET_NAME(e1), GET_NAME(e2)]);
    }
  }

  ['!='](e1, e2) {
    this.neq(e1, e2);
  }
  neq(e1, e2) {
    if (e1 instanceof Array) {
      for (let i = 0, n = e1.length; i < n; ++i) {
        this.neq(e1[i], e2);
      }
    } else if (e2 instanceof Array) {
      for (let i = 0, n = e2.length; i < n; ++i) {
        this.neq(e1, e2[i]);
      }
    } else {
      config_addConstraint(this.config, 'neq', [GET_NAME(e1), GET_NAME(e2)]);
    }
  }

  ['>='](e1, e2) {
    this.gte(e1, e2);
  }
  gte(e1, e2) {
    ASSERT(!(e1 instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    config_addConstraint(this.config, 'gte', [GET_NAME(e1), GET_NAME(e2)]);
  }

  ['<='](e1, e2) {
    this.lte(e1, e2);
  }
  lte(e1, e2) {
    ASSERT(!(e1 instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    config_addConstraint(this.config, 'lte', [GET_NAME(e1), GET_NAME(e2)]);
  }

  ['>'](e1, e2) {
    this.gt(e1, e2);
  }
  gt(e1, e2) {
    ASSERT(!(e1 instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    config_addConstraint(this.config, 'gt', [GET_NAME(e1), GET_NAME(e2)]);
  }

  ['<'](e1, e2) {
    this.lt(e1, e2);
  }
  lt(e1, e2) {
    ASSERT(!(e1 instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    config_addConstraint(this.config, 'lt', [GET_NAME(e1), GET_NAME(e2)]);
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
    ASSERT_VARDOMS_SLOW(config.initialDomains, domain__debug);

    // TODO: deal with the GET_NAMES bit at callsites, only allow string[] for .vars here. and do rename .vars as well.
    if (options.vars && options.vars !== 'all') {
      let ids = GET_NAMES(options.vars);
      config_setOption(config, 'targeted_var_names', ids);
    }

    // TODO: eliminate?
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
      console.log(`      - FD Var Count: ${this.config.allVarNames.length}`);
      console.log(`      - FD Constraint Count: ${this.config.allConstraints.length}`);
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
    return domain_fromListToArrdom(list);
  }

  /**
   * Expose a method to normalize the internal representation
   * of a domain to always return an array representation
   *
   * @param {$space} space
   * @param {number} varIndex
   * @returns {$arrdom}
   */
  getDomain(space, varIndex) {
    return domain_toArr(space.vardoms[varIndex]);
  }

  /**
   * Exposed for multiverse as a legacy api.
   * Sets the value distribution options for a var after declaring it.
   *
   * @param {string} varName
   * @param {Object} options
   */
  setValueDistributionFor(varName, options) {
    ASSERT(typeof varName === 'string', 'var name should be a string', varName);
    ASSERT(typeof options === 'object', 'value strat options should be an object');

    config_setOption(this.config, 'varValueStrat', options, varName);
    if (options.valtype === 'markov') {
      config_addConstraint(this.config, 'markov', [varName]);
    }
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
    let names = clone.allVarNames;
    let targeted = clone.targetedVars;
    let constraints = clone.allConstraints;
    let domains = clone.initialDomains;
    let propagators = clone._propagators;

    for (let key in clone) {
      // underscored prefixed objects are generally auto-generated structs
      // we don't want to debug a 5mb buffer, one byte per line.
      if (key[0] === '_' && typeof clone[key] === 'object') {
        clone[key] = '<removed>';
      }
    }
    clone.allVarNames = '<removed>';
    clone.allConstraints = '<removed>';
    clone.initialDomains = '<removed>';
    clone.varDistOptions = '<removed>';
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

    let names = config.allVarNames;
    console.log('# Variables (' + names.length + 'x):');
    console.log('  index name domain toArr');
    for (let varIndex = 0; varIndex < names.length; ++varIndex) {
      console.log('  ', varIndex, ':', names[varIndex], ':', domain__debug(config.initialDomains[varIndex]));
    }

    let constraints = config.allConstraints;
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
        domain__debug(config.initialDomains[propagators[i].index1]),
        domain__debug(config.initialDomains[propagators[i].index2]),
        domain__debug(config.initialDomains[propagators[i].index3])
    );
    }

    console.log('##');
  }

  _debugConfig() {
    let config = _clone(this.config);
    config.initialDomains = config.initialDomains.map(domain__debug);

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
