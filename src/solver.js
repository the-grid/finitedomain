import {
  LOG_NONE,
  LOG_STATS,
  LOG_SOLVES,
  LOG_MAX,
  LOG_MIN,
  SUB,
  SUP,

  ASSERT,
  ASSERT_ARRDOM,
  ASSERT_VARDOMS_SLOW,
  THROW,
} from './helpers';

import {
  config_addConstraint,
  config_addVarAnonConstant,
  config_addVarDomain,
  config_create,
  config_init,
  config_setDefaults,
  config_setOption,
  config_setOptions,
} from './config';
import exporter_main, {
  exporter_encodeVarName,
} from './exporter';
import importer_main from './importer';

import {
  domain__debug,
  domain_createEmpty,
  domain_fromListToArrdom,
  domain_isEmpty,
  domain_toArr,
  domain_anyToSmallest,
} from './domain';

import search_depthFirst, {
  search_afterPropagation,
  search_createNextSpace,
} from './search';

import {
  space_createFromConfig,
  space_propagate,
  space_solution,
  space_toConfig,
} from './space';

import {
  trie_get,
} from './trie';

// BODY_START

let GENERATE_BARE_DSL = false;

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
   * @property {Object} [options.searchDefaults]
   * @property {$config} [options.config=config_create()]
   * @property {boolean} [options.exportBare]
   * @property {number} [options.logging=LOG_NONE]
   */
  constructor(options = {}) {
    this._class = 'solver';
    this.logging = options.log || LOG_NONE;
    this.distribute = options.distribute || 'naive';
    ASSERT(!void (options.exportBare !== undefined && (GENERATE_BARE_DSL = options.exportBare || false), this.exported = ''), 'bare exports kind of log the api inputs of this class in a DSL and print it at .solve() time');

    ASSERT(options._class !== '$config', 'config should be passed on in a config property of options');

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
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += ': __' + varIndex + '__ = ' + num + '\n')));
    return this.config.allVarNames[varIndex];
  }

  /**
   * Declare a var with optional given domain or constant value and distribution options.
   *
   * @param {string} [varName] Optional, Note that you can use this.num() to declare a constant.
   * @param {$arrdom|number} [domainOrValue] Note: if number, it is a constant (so [domain,domain]) not a $numdom! If omitted it becomes [SUB, SUP]
   * @param {Object} [distributionOptions] Var distribution options. A defined non-object here will throw an error to prevent doing declRange
   * @param {boolean} [_allowEmpty=false] Temp (i hope) override for importer
   * @returns {string}
   */
  decl(varName, domainOrValue, distributionOptions, _allowEmpty) {
    if (varName === '') THROW('Var name can not be the empty string');
    ASSERT(varName === undefined || typeof varName === 'string', 'var name should be undefined or a string');
    ASSERT(distributionOptions === undefined || typeof distributionOptions === 'object', 'options must be omitted or an object');

    let arrdom;
    if (typeof domainOrValue === 'number') arrdom = [domainOrValue, domainOrValue]; // just normalize it here.
    else if (!domainOrValue) arrdom = [SUB, SUP];
    else arrdom = domainOrValue;
    ASSERT_ARRDOM(arrdom);

    if (!arrdom.length && !_allowEmpty) THROW('EMPTY_DOMAIN_NOT_ALLOWED');
    let varIndex = config_addVarDomain(this.config, varName || true, arrdom, _allowEmpty);
    varName = this.config.allVarNames[varIndex];

    if (distributionOptions) {
      if (distributionOptions.distribute) THROW('Use `valtype` to set the value distribution strategy');
      config_setOption(this.config, 'varValueStrat', distributionOptions, varName);
    }

    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += ': ' + exporter_encodeVarName(varName) + ' = [' + arrdom + ']' + (distributionOptions ? (distributionOptions.valtype === 'markov' ? (' @markov' + (distributionOptions.matrix ? ' matrix(' + distributionOptions.matrix + ')' : '') + (distributionOptions.expandVectorsWith !== undefined ? ' expand(' + distributionOptions.expandVectorsWith + ')' : '') + (distributionOptions.legend ? ' legend(' + distributionOptions.legend + ')' : '')) : '') : '') + ' # options=' + JSON.stringify(distributionOptions) + '\n')));
    return varName;
  }

  /**
   * Declare multiple variables with the same domain/options
   *
   * @param {string[]} varNames
   * @param {$arrdom|number} [domainOrValue] Note: if number, it is a constant (so [domain,domain]) not a $numdom! If omitted it becomes [SUB, SUP]
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
    ASSERT(typeof lo === 'number', 'LO_SHOULD_BE_NUMBER');
    ASSERT(typeof hi === 'number', 'HI_SHOULD_BE_NUMBER');
    ASSERT(typeof options === 'object' || options === undefined, 'EXPECTING_OPTIONS_OR_NOTHING');

    return this.decl(varName, [lo, hi], options);
  }

  // Arithmetic Propagators

  plus(A, B, C) {
    let R = config_addConstraint(this.config, 'plus', [A, B, C]);
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' + ' + exporter_encodeVarName(B) + ' # plus, result var was: ' + C + '\n')));
    return R;
  }

  minus(A, B, C) {
    let R = config_addConstraint(this.config, 'min', [A, B, C]);
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' - ' + exporter_encodeVarName(B) + ' # min, result var was: ' + C + '\n')));
    return R;
  }

  mul(A, B, C) {
    let R = config_addConstraint(this.config, 'ring-mul', [A, B, C]);
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' * ' + exporter_encodeVarName(B) + ' # ringmul, result var was: ' + C + '\n')));
    return R;
  }

  div(A, B, C) {
    let R = config_addConstraint(this.config, 'ring-div', [A, B, C]);
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' / ' + exporter_encodeVarName(B) + ' # ringdiv, result var was: ' + C + '\n')));
    return R;
  }

  sum(A, C) {
    let R = config_addConstraint(this.config, 'sum', A, C);
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = sum(' + A.map(exporter_encodeVarName) + ') # result var was: ' + C + '\n')));
    return R;
  }

  product(A, C) {
    let R = config_addConstraint(this.config, 'product', A, C);
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = product(' + A.map(exporter_encodeVarName) + ') # result var was: ' + C + '\n')));
    return R;
  }

  // TODO
  // times_plus    k1*v1 + k2*v2
  // wsum          ∑ k*v
  // scale         k*v


  // (In)equality Propagators
  // only first expression can be array

  distinct(A) {
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += 'distinct(' + A.map(exporter_encodeVarName) + ')\n')));
    config_addConstraint(this.config, 'distinct', A);
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
      ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(e1) + ' == ' + exporter_encodeVarName(e2) + '\n')));
      config_addConstraint(this.config, 'eq', [e1, e2]);
    }
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
      ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(e1) + ' != ' + exporter_encodeVarName(e2) + '\n')));
      config_addConstraint(this.config, 'neq', [e1, e2]);
    }
  }

  gte(A, B) {
    ASSERT(!(A instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(A) + ' >= ' + exporter_encodeVarName(B) + '\n')));
    config_addConstraint(this.config, 'gte', [A, B]);
  }

  lte(A, B) {
    ASSERT(!(A instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(A) + ' <= ' + exporter_encodeVarName(B) + '\n')));
    config_addConstraint(this.config, 'lte', [A, B]);
  }

  gt(A, B) {
    ASSERT(!(A instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(A) + ' > ' + exporter_encodeVarName(B) + '\n')));
    config_addConstraint(this.config, 'gt', [A, B]);
  }

  lt(A, B) {
    ASSERT(!(A instanceof Array), 'NOT_ACCEPTING_ARRAYS');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(A) + ' < ' + exporter_encodeVarName(B) + '\n')));
    config_addConstraint(this.config, 'lt', [A, B]);
  }

  isNeq(A, B, C) {
    let R = config_addConstraint(this.config, 'reifier', [A, B, C], 'neq');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' !=? ' + exporter_encodeVarName(B) + '\n')));
    return R;
  }

  isEq(A, B, C) {
    let R = config_addConstraint(this.config, 'reifier', [A, B, C], 'eq');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' ==? ' + exporter_encodeVarName(B) + '\n')));
    return R;
  }

  isGte(A, B, C) {
    let R = config_addConstraint(this.config, 'reifier', [A, B, C], 'gte');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' >=? ' + exporter_encodeVarName(B) + '\n')));
    return R;
  }

  isLte(A, B, C) {
    let R = config_addConstraint(this.config, 'reifier', [A, B, C], 'lte');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' <=? ' + exporter_encodeVarName(B) + '\n')));
    return R;
  }

  isGt(A, B, C) {
    let R = config_addConstraint(this.config, 'reifier', [A, B, C], 'gt');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' >? ' + exporter_encodeVarName(B) + '\n')));
    return R;
  }

  isLt(A, B, C) {
    let R = config_addConstraint(this.config, 'reifier', [A, B, C], 'lt');
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported += exporter_encodeVarName(R) + ' = ' + exporter_encodeVarName(A) + ' <? ' + exporter_encodeVarName(B) + '\n')));
    return R;
  }

  // Various rest

  /**
   * Solve this solver. It should be setup with all the constraints.
   *
   * @param {Object} options
   * @property {number} [options.max=1000]
   * @property {number} [options.log=this.logging] Logging level; one of: 0, 1 or 2 (see LOG_* constants)
   * @property {string|Array.<string|Bvar>} options.vars Target branch vars or var names to force solve. Defaults to all.
   * @property {string|Object} [options.distribute='naive'] Maps to FD.distribution.value, see config_setOptions
   * @property {boolean} [_debug] A more human readable print of the configuration for this solver
   * @property {boolean} [_debugConfig] Log out solver.config after prepare() but before run()
   * @property {boolean} [_debugSpace] Log out solver._space after prepare() but before run(). Only works in dev code (stripped from dist)
   * @property {boolean} [_debugSolver] Call solver._debugSolver() after prepare() but before run()
   * @property {boolean} [_tostring] Serialize the config into a DSL
   * @property {boolean} [_nosolve] Dont actually solve. Used for debugging when printing something but not interested in actually running.
   * @property {number} [_debugDelay=0] When debugging, how many propagate steps should the debugging wait? (0 is only preprocessing)
   * @return {Object[]}
   */
  solve(options = {}) {
    let log = this.logging = options.log === undefined ? this.logging : options.log;
    let max = options.max || 1000;

    ASSERT(!void (GENERATE_BARE_DSL && console.log('## bare export:\n@mode constraints\n' + this.exported + '## end of exported\n')));

    this._prepare(options, log);
    let dbgCallback;
    if (options._tostring || options._debug || options._debugConfig || options._debugSpace || options._debugSolver) {
      dbgCallback = epoch => {
        if (options._debugDelay >= epoch) {
          // __REMOVE_BELOW_FOR_DSL__
          if (options._tostring) console.log(exporter_main(this.config));
          // __REMOVE_ABOVE_FOR_DSL__
          if (options._debug) this._debugLegible();
          if (options._debugConfig) this._debugConfig();
          // __REMOVE_BELOW_FOR_DIST__
          if (options._debugSpace) console.log('## _debugSpace:\n', getInspector()(this._space));
          // __REMOVE_ABOVE_FOR_DIST__
          if (options._debugSolver) this._debugSolver();
          return true;
        }
        return false;
      };
      if (dbgCallback(0)) dbgCallback = undefined;
    }
    if (options._nosolve) return;

    this._run(max, log, dbgCallback);

    return this.solutions;
  }

  /**
   * Generate the next child from given space. Or none if there isn't any.
   *
   * @param {$space} space
   * @returns {$space|undefined}
   */
  offspring(space) {
    return search_createNextSpace(space, this.config);
  }

  /**
   * Propagate the given space to stability.
   * Returns whether this ended in a reject.
   *
   * @param {$space} space
   * @returns {boolean}
   */
  propagate(space) {
    return space_propagate(space, this.config);
  }

  /**
   * Checks the state of a space (search node).
   * Basically one depth first search loop step
   * without the propagation. Returns true if
   * the space was solved, false if the space
   * was rejected, and undefined otherwise.
   *
   * @param {$space} space
   * @returns {boolean|undefined} true=solved, false=rejected, undefined=neither
   */
  checkStableSpace(space) {
    return search_afterPropagation(false, space, this.config, this.state.stack, this.state);
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

    this._prepareConfig(options, log);

    // create the root node of the search tree (each node is a Space)
    let rootSpace = this.createSpace();

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
   * Create the root space using the config of this solver as its base.
   *
   * @returns {$space}
   */
  createSpace() {
    return space_createFromConfig(this.config);
  }

  /**
   * Prepare the config side of things for a solve.
   * No space is created in this function (that's the point).
   *
   * @param {Object} options See _prepare
   * @param {number} log
   */
  _prepareConfig(options, log) {
    ASSERT(log === undefined || log >= LOG_MIN && log <= LOG_MAX, 'log level should be a valid value or be undefined (in tests)');

    let config = this.config;
    ASSERT_VARDOMS_SLOW(config.initialDomains, domain__debug);

    if (options.vars && options.vars !== 'all') {
      config_setOption(config, 'targeted_var_names', options.vars);
    }

    // TODO: eliminate?
    let distributionSettings = options.distribute || this.distribute;
    if (typeof distributionSettings === 'string') config_setDefaults(config, distributionSettings);
    else config_setOptions(config, distributionSettings); // TOFIX: get rid of this in mv

    config_init(config);
  }

  /**
   * Run the solver. You should call @_prepare before calling this function.
   *
   * @param {number} max Hard stop the solver when this many solutions have been found
   * @param {number} log One of the LOG_* constants
   * @param {Function} [dbgCallback] Call after each epoch until it returns false, then stop calling it.
   */
  _run(max, log, dbgCallback) {
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
          console.log('      - FD: rejected without propagation (' + this.config.allVarNames[i] + ' is empty)');
        }
        break;
      }
    }

    let solvedSpaces;
    if (alreadyRejected) {
      if (log >= LOG_STATS) {
        console.log('      - FD Input Problem Rejected Immediately');
      }
      solvedSpaces = [];
    } else {
      solvedSpaces = solver_runLoop(state, this.config, max, dbgCallback);
    }

    if (log >= LOG_STATS) {
      console.timeEnd('      - FD Solving Time');
      ASSERT(!void console.log(`      - FD debug stats: called propagate(): ${this.config._propagates > 0 ? this.config._propagates + 'x' : 'never! Finished by only using precomputations.'}`));
      console.log(`      - FD Solutions: ${solvedSpaces.length}`);
    }

    solver_getSolutions(solvedSpaces, this.config, this.solutions, log);
  }

  generateSolutions(solvedSpaces, config, targetObject, log) {
    solver_getSolutions(solvedSpaces, config, targetObject, log);
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

  hasVar(varName) {
    return trie_get(this.config._varNamesTrie, varName) >= 0;
  }

  /**
   * Get the current domains for all targeted vars (only)
   * Heavy operation.
   *
   * @param {$space} space
   * @returns {Object.<string,$arrdom>}
   */
  getTargetState(space) {
    let result = {};
    let targets = this.config.targetedVars;
    if (targets === 'all') {
      targets = this.config.allVarNames;
    }
    let varNamesTrie = this.config._varNamesTrie;
    for (let i = 0, n = targets.length; i < n; ++i) {
      let varName = targets[i];
      let varIndex = trie_get(varNamesTrie, varName);
      result[varName] = domain_toArr(space.vardoms[varIndex]);
    }
    return result;
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
    ASSERT(!void (GENERATE_BARE_DSL && (this.exported = this.exported.replace(new RegExp('^(: ' + exporter_encodeVarName(varName) + ' =.*)', 'm'), '$1 # markov (set below): ' + JSON.stringify(options)) + '@custom set-valdist ' + exporter_encodeVarName(varName) + ' ' + JSON.stringify(options) + '\n')));
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
    let WITH_INDEX = true;
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
    console.log(names.map((name, index) => `${WITH_INDEX ? index : ''}: ${domain__debug(domains[index])} ${name === String(index) ? '' : ' // ' + name}`).join('\n'));
    if (targeted !== 'all') {
      console.log('- targeted vars (' + targeted.length + '): ' + targeted.join(', '));
    }
    console.log('- constraints (' + constraints.length + ' -> ' + propagators.length + '):');
    console.log(constraints.map((c, index) => {
      if (c.param === undefined) {
        return `${WITH_INDEX ? index : ''}: ${c.name}(${c.varIndexes})      --->  ${c.varIndexes.map(index => domain__debug(domains[index])).join(',  ')}`;
      } else if (c.name === 'reifier') {
        return `${WITH_INDEX ? index : ''}: ${c.name}[${c.param}](${c.varIndexes})      --->  ${domain__debug(domains[c.varIndexes[0]])} ${c.param} ${domain__debug(domains[c.varIndexes[1]])} = ${domain__debug(domains[c.varIndexes[2]])}`;
      } else {
        return `${WITH_INDEX ? index : ''}: ${c.name}(${c.varIndexes}) = ${c.param}      --->  ${c.varIndexes.map(index => domain__debug(domains[index])).join(',  ')} -> ${domain__debug(domains[c.param])}`;
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

  // __REMOVE_BELOW_FOR_DSL__

  /**
   * Import from a dsl into this solver
   *
   * @param {string} s
   * @param {boolean} [_debug] Log out entire input with error token on fail?
   * @returns {Solver} this
   */
  imp(s, _debug) {
    if (this.logging) {
      console.log('      - FD Importing DSL; ' + s.length + ' bytes');
      console.time('      - FD Import Time:');
    }
    let solver = importer_main(s, this, _debug);
    if (this.logging) {
      console.timeEnd('      - FD Import Time:');
    }
    return solver;
  }

  /**
   * Export this config to a dsl. Optionally pass on a
   * space whose vardoms state to use for initialization.
   *
   * @param {$space} [space]
   * @param {boolean} [usePropagators]
   * @param {boolean} [minimal]
   * @param {boolean} [withDomainComments]
   * @returns {string}
   */
  exp(space, usePropagators, minimal, withDomainComments) {
    return exporter_main(this.config, space.vardoms, usePropagators, minimal, withDomainComments);
  }

  // __REMOVE_ABOVE_FOR_DSL__

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
  static domainFromList(list) {
    return domain_fromListToArrdom(list);
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
 * @param {Function} [dbgCallback] Call after each epoch until it returns false, then stop calling it.
 * @returns {$space[]} All solved spaces that were found (until max or end was reached)
 */
function solver_runLoop(state, config, max, dbgCallback) {
  let list = [];
  while (state.more && list.length < max) {
    search_depthFirst(state, config, dbgCallback);
    if (state.status !== 'end') {
      list.push(state.space);
    }
  }
  return list;
}

function solver_getSolutions(solvedSpaces, config, solutions, log) {
  ASSERT(solutions instanceof Array, 'solutions target object should be an array');
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
