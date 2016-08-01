// Config for a search tree where each node is a Space
// TOFIX: may want to rename this to "tree-state" or something; it's not just config

// Note: all domains in this class should be array based!
// This prevents leaking the small domain artifact outside of the library.

import {
  EMPTY_STR,
  NO_SUCH_VALUE,
  SUB,
  SUP,

  ASSERT,
  ASSERT_STRDOM,
  GET_NAMES,
  THROW,
} from './helpers';
import {
  TRIE_KEY_NOT_FOUND,

  trie_add,
  trie_create,
  trie_get,
  trie_has,
} from './trie';
import {
  PROP_VAR_INDEXES,

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
import {
  NOT_FOUND,
  ZERO,

  domain_arrToStr,
  domain_createRange,
  domain_createValue,
  domain_any_getValue,
  domain_str_getValue,
  domain_any_max,
  domain_any_min,
  domain_str_isSolved,
  domain_any_intersection,
  domain_strstr_intersection,
  domain_str_removeGte,
  domain_str_removeLte,
  domain_str_removeValue,
  domain_toNumstr,
  domain_toStr,
} from './domain';
import domain_any_plus from './doms/domain_plus';
import {
  constraint_create,
} from './constraint';
import distribution_getDefaults from './distribution/defaults';

// BODY_START

/**
 * @returns {$finitedomain_config}
 */
function config_create() {
  return {
    _class: '$config',
    // doing `indexOf` for 5000+ names is _not_ fast. so use a trie
    _var_names_trie: trie_create(),

    varStratConfig: config_createVarStratConfig(),
    valueStratName: 'min',
    targetedVars: 'all',
    var_dist_options: {},
    timeout_callback: undefined,

    // names of all vars in this search tree
    // optimizes loops because `for-in` is super slow
    all_var_names: [],
    // the propagators are generated from the constraints when a space
    // is created from this config. constraints are more higher level.
    all_constraints: [],

    constant_cache: {}, // <value:varIndex>, generally anonymous vars but pretty much first come first serve
    initial_domains: [], // $domain_str[] : initial domains for each var, maps 1:1 to all_var_names

    _propagators: [], // initialized later
    _varToPropagators: [], // initialized later
    _constrainedAway: [], // list of var names that were constrained but whose constraint was optimized away. they will still be "targeted" if target is all. TODO: fix all tests that depend on this and eliminate this. it is a hack.
  };
}

function config_clone(config, newDomains) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let {
    varStratConfig,
    valueStratName,
    targetedVars,
    var_dist_options,
    timeout_callback,
    constant_cache,
    all_var_names,
    all_constraints,
    initial_domains,
    _propagators,
    _varToPropagators,
    _constrainedAway,
  } = config;

  return {
    _class: '$config',
    _var_names_trie: trie_create(all_var_names), // just create a new trie with (should be) the same names

    varStratConfig,
    valueStratName,
    targetedVars: targetedVars instanceof Array ? targetedVars.slice(0) : targetedVars,
    var_dist_options: JSON.parse(JSON.stringify(var_dist_options)),  // TOFIX: clone this more efficiently
    timeout_callback, // by reference because it's a function if passed on...

    constant_cache, // is by reference ok?

    all_var_names: all_var_names.slice(0),
    all_constraints: all_constraints.slice(0),
    initial_domains: newDomains || initial_domains, // <varName:domain>

    _propagators: _propagators && _propagators.slice(0), // in case it is initialized
    _varToPropagators: _varToPropagators && _varToPropagators.slice(0), // inited elsewhere
    _constrainedAway: _constrainedAway && _constrainedAway.slice(0), // list of var names that were constrained but whose constraint was optimized away. they will still be "targeted" if target is all. TODO: fix all tests that depend on this and eliminate this. it is a hack.
  };
}

/**
 * Add an anonymous var with max allowed range
 *
 * @param {$config} config
 * @returns {number} varIndex
 */
function config_addVarAnonNothing(config) {
  return config_addVarNothing(config, true);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (If true, is anonymous)
 * @returns {number} varIndex
 */
function config_addVarNothing(config, varName) {
  return _config_addVar(config, varName, domain_toStr(domain_createRange(SUB, SUP)));
}
/**
 * @param {$config} config
 * @param {number} lo
 * @param {number} hi
 * @returns {number} varIndex
 */
function config_addVarAnonRange(config, lo, hi) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof lo === 'number', 'A_LO_MUST_BE_NUMBER');
  ASSERT(typeof hi === 'number', 'A_HI_MUST_BE_NUMBER');

  if (lo === hi) return config_addVarAnonConstant(config, lo);

  return config_addVarRange(config, true, lo, hi);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (If true, is anonymous)
 * @param {number} lo
 * @param {number} hi
 * @returns {number} varIndex
 */
function config_addVarRange(config, varName, lo, hi) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varName === 'string' || varName === true, 'A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  ASSERT(typeof lo === 'number', 'A_LO_MUST_BE_NUMBER');
  ASSERT(typeof hi === 'number', 'A_HI_MUST_BE_NUMBER');
  ASSERT(lo <= hi, 'A_RANGES_SHOULD_ASCEND');

  let domain = domain_toStr(domain_createRange(lo, hi));
  return _config_addVar(config, varName, domain);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (If true, anon)
 * @param {$domain_arr} domain Small domain format not allowed here. this func is intended to be called from Solver, which only accepts arrdoms
 * @returns {number} varIndex
 */
function config_addVarDomain(config, varName, domain) {
  ASSERT(domain instanceof Array, 'DOMAIN_MUST_BE_ARRAY_HERE');

  return _config_addVar(config, varName, domain_arrToStr(domain));
}
/**
 * @param {$config} config
 * @param {number} value
 * @returns {number} varIndex
 */
function config_addVarAnonConstant(config, value) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');

  if (config.constant_cache[value] !== undefined) {
    return config.constant_cache[value];
  }

  return config_addVarConstant(config, true, value);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (True means anon)
 * @param {number} value
 * @returns {number} varIndex
 */
function config_addVarConstant(config, varName, value) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varName === 'string' || varName === true, 'varName must be a string or true for anon');
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');

  let domain = domain_toStr(domain_createRange(value, value));

  return _config_addVar(config, varName, domain);
}

/**
 * @param {$config} config
 * @param {string|true} varName If true, the varname will be the same as the index it gets on all_var_names
 * @param {$domain_str} domain strdom ONLY! other methods that call this should make sure their $domain is converted to a strdom
 * @returns {number} varIndex
 */
function _config_addVar(config, varName, domain) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(varName === true || typeof varName === 'string', 'VAR_NAMES_SHOULD_BE_STRINGS');
  ASSERT(String(parseInt(varName, 10)) !== varName, 'DONT_USE_NUMBERS_AS_VAR_NAMES[' + varName + ']');
  ASSERT(varName && typeof varName === 'string' || varName === true, 'A_VAR_NAME_MUST_BE_STRING_OR_TRUE');
  ASSERT(varName === true || !trie_has(config._var_names_trie, varName), 'Do not declare the same varName twice');
  ASSERT_STRDOM(domain);
  ASSERT(domain, 'NON_EMPTY_DOMAIN');
  ASSERT(domain === EMPTY_STR || domain_any_min(domain) >= SUB, 'domain lo should be >= SUB', domain);
  ASSERT(domain === EMPTY_STR || domain_any_max(domain) <= SUP, 'domain hi should be <= SUP', domain);

  let allVarNames = config.all_var_names;
  let varIndex = allVarNames.length;
  let wasAnonymous = varName === true;
  if (wasAnonymous) {
    varName = String(varIndex); // this var will be assigned to this index
  }
  // note: 100 is an arbitrary number but since large sets are probably
  // automated it's very unlikely we'll need this check in those cases
  if (varIndex < 100 && trie_has(config._var_names_trie, varName)) {
    if (wasAnonymous) THROW('DONT_USE_NUMBERS_AS_VAR_NAMES'); // there is an assertion for this above but wont be at runtime
    THROW('Var varName already part of this config. Probably a bug?');
  }

  let solvedTo = domain_str_getValue(domain);
  if (solvedTo !== NOT_FOUND && !config.constant_cache[solvedTo]) config.constant_cache[solvedTo] = varIndex;

  config.initial_domains[varIndex] = domain;
  config.all_var_names.push(varName);
  trie_add(config._var_names_trie, varName, varIndex);

  return varIndex;
}

/**
 * Initialize the config of this space according to certain presets
 *
 * @param {$config} config
 * @param {string} varName
 */
function config_setDefaults(config, varName) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  config_setOptions(config, distribution_getDefaults(varName));
}

/**
 * Create a config object for the var distribution
 *
 * @param {Object} obj
 * @property {string} [obj.type] Map to the internal names for var distribution strategies
 * @property {string} [obj.priorityList] An ordered list of var names to prioritize. Names not in the list go implicitly and unordered last.
 * @property {boolean} [obj.inverted] Should the list be interpreted inverted? Unmentioned names still go last, regardless.
 * @property {Object} [obj.fallback] Same struct as obj. If current strategy is inconclusive it can fallback to another strategy.
 * @returns {$var_strat_config}
 */
function config_createVarStratConfig(obj) {
  /**
   * @typedef {$var_strat_config}
   */
  return {
    _class: '$var_strat_config',
    type: (obj && obj.type) || 'naive',
    priorityByName: obj && obj.priorityList,
    _priorityByIndex: undefined,
    inverted: !!(obj && obj.inverted),
    fallback: obj && obj.fallback,
  };
}

/**
 * @param {$config} config
 * @param {Object} options
 * @property {Object} [options.varStrategy]
 * @property {string} [options.varStrategy.name]
 * @property {string[]} [options.varStrategy.list] Only if name=list
 * @property {string[]} [options.varStrategy.priorityList] Only if name=list
 * @property {boolean} [options.varStrategy.inverted] Only if name=list
 * @property {Object} [options.varStrategy.fallback] Same struct as options.varStrategy (recursive)
 */
function config_setOptions(config, options) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  if (!options) return;

  if (options.var) THROW('REMOVED. Replace `var` with `varStrategy`');
  if (options.val) THROW('REMOVED. Replace `var` with `valueStrategy`');

  if (options.varStrategy) {
    if (typeof options.varStrategy === 'function') THROW('functions no longer supported');
    if (typeof options.varStrategy === 'string') THROW('strings should be type property');
    if (typeof options.varStrategy !== 'object') THROW('varStrategy should be object');
    if (options.varStrategy.name) THROW('name should be type');
    if (options.varStrategy.dist_name) THROW('dist_name should be type');

    let vsc = config_createVarStratConfig(options.varStrategy);
    config.varStratConfig = vsc;
    while (vsc.fallback) {
      vsc.fallback = config_createVarStratConfig(vsc.fallback);
      vsc = vsc.fallback;
    }
  }
  if (options.valueStrategy) {
    // see distribution.value
    config.valueStratName = options.valueStrategy;
  }
  if (options.targeted_var_names && (options.targeted_var_names === 'all' || options.targeted_var_names.length)) {
    // which vars must be solved for this space to be solved
    // string: 'all'
    // string[]: list of vars that must be solved
    // function: callback to return list of names to be solved
    config.targetedVars = options.targeted_var_names;
  }
  if (options.varStratOverrides) {
    // An object which defines a value distributor per variable
    // which overrides the globally set value distributor.
    // See Bvar#distributionOptions (in multiverse)
    config.var_dist_options = options.varStratOverrides;
  }
  if (options.timeout_callback) {
    // A function that returns true if the current search should stop
    // Can be called multiple times after the search is stopped, should
    // keep returning false (or assume an uncertain outcome).
    // The function is called after the first batch of propagators is
    // called so it won't immediately stop. But it stops quickly.
    config.timeout_callback = options.timeout_callback;
  }
}

/**
 * @param {$config} config
 * @param {$propagator} propagator
 */
function config_addPropagator(config, propagator) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  config._propagators.push(propagator);
}

function config_generateVars(config, space) {
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(space && space._class === '$space', 'SPACE_SHOULD_BE_SPACE');

  ASSERT(space.vardoms, 'expecting var domains');
  let initialDomains = config.initial_domains;
  ASSERT(initialDomains, 'config should have initial vars');
  let allVarNames = config.all_var_names;
  ASSERT(allVarNames, 'config should have a list of vars');

  for (let varIndex = 0, n = allVarNames.length; varIndex < n; varIndex++) {
    let domain = initialDomains[varIndex];
    ASSERT_STRDOM(domain);

    space.vardoms[varIndex] = domain_toNumstr(domain);
  }
}

/**
 * Creates a mapping from a varIndex to a set of propagatorIndexes
 * These propagators are the ones that use the varIndex
 * This is useful for quickly determining which propagators
 * need to be stepped while propagating them.
 *
 * @param {$config} config
 */
function config_populateVarPropHash(config) {
  let hash = new Array(config.all_var_names.length);
  let propagators = config._propagators;
  let initialDomains = config.initial_domains;
  for (let propagatorIndex = 0, plen = propagators.length; propagatorIndex < plen; ++propagatorIndex) {
    let pvars = propagators[propagatorIndex][PROP_VAR_INDEXES];
    for (let propVarIndex = 0, vlen = pvars.length; propVarIndex < vlen; ++propVarIndex) {
      let varIndex = pvars[propVarIndex];
      // dont bother adding props on unsolved vars because they can't affect
      // anything anymore. seems to prevent about 10% in our case so worth it.
      if (!domain_str_isSolved(initialDomains[varIndex])) {
        if (!hash[varIndex]) hash[varIndex] = [propagatorIndex];
        else if (hash[varIndex].indexOf(propagatorIndex) < 0) hash[varIndex].push(propagatorIndex);
      }
    }
  }
  config._varToPropagators = hash;
}

function config_addConstraint(config, name, varNames, param) {
  // should return a new var name for most props
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');

  // if any constants were passed on, varNameToReturn should become that.
  // if the constraint has a result var, always return that regardless
  // if there are no constants and result vars, return the first var name
  let varNameToReturn = varNames[0];
  // for stuff like solver.neq(['A', 'B'], 'C')
  if (varNameToReturn instanceof Array) {
    let leftNames = GET_NAMES(varNameToReturn);
    if (leftNames.length === 0) return varNames[1];
    for (let i = 0, n = leftNames.length; i < n; ++i) {
      config_addConstraint(config, name, [].concat(leftNames[i], varNames.slice(1)), param);
    }
    return undefined;
  }

  let forceBool = false;
  switch (name) { /* eslint no-fallthrough: "off" */
    case 'reifier':
      forceBool = true;
      // fall-through
    case 'plus':
    case 'min':
    case 'ring-mul':
    case 'ring-div':
    case 'mul':
      ASSERT(varNames.length === 3, 'MISSING_RESULT_VAR'); // note that the third value may still be "undefined"
      // fall-through
    case 'sum':
    case 'product': {
      let resultIsParam = name === 'product' || name === 'sum';

      let sumName = resultIsParam ? param : varNames[2];
      let sumVarIndex;

      let freshResultVar = typeof sumName === 'undefined';
      if (freshResultVar) {
        if (forceBool) sumVarIndex = config_addVarAnonRange(config, 0, 1);
        else sumVarIndex = config_addVarAnonNothing(config);
        sumName = config.all_var_names[sumVarIndex];
      } else if (typeof sumName === 'number') {
        sumVarIndex = config_addVarAnonConstant(config, sumName);
        sumName = config.all_var_names[sumVarIndex];
      } else if (typeof sumName !== 'string') {
        THROW(`expecting result var name to be absent or a number or string: \`${sumName}\``);
      } else {
        sumVarIndex = config.all_var_names.indexOf(sumName);
      }

      if (resultIsParam) param = sumVarIndex;
      else varNames[2] = sumName;

      // check all other var names, except result var, for constants
      let hasNonConstant = false;
      for (let i = 0, n = varNames.length - (resultIsParam ? 0 : 1); i < n; ++i) {
        if (typeof varNames[i] === 'number') {
          let varIndex = config_addVarAnonConstant(config, varNames[i]);
          varNames[i] = config.all_var_names[varIndex];
        } else {
          hasNonConstant = true;
        }
      }
      if (!hasNonConstant) THROW('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

      varNameToReturn = sumName;
      break;
    }

    case 'markov':
    case 'distinct':
    case 'callback':
    case 'eq':
    case 'neq':
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      ASSERT(name !== 'markov' || varNames.length === 1, 'MARKOV_PROP_USES_ONE_VAR');

      // require at least one non-constant variable... except callback/distinct can have zero vars
      let hasNonConstant = (name !== 'callback' || name !== 'distinct') && varNames.length === 0;
      for (let i = 0, n = varNames.length; i < n; ++i) {
        if (typeof varNames[i] === 'number') {
          let varIndex = config_addVarAnonConstant(config, varNames[i]);
          varNames[i] = config.all_var_names[varIndex];
          varNameToReturn = varNames[i];
        } else {
          hasNonConstant = true;
        }
      }

      if (!hasNonConstant) THROW('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');
      if (varNames.length === 0) varNameToReturn = param;
      break;
    }

    default:
      THROW(`UNKNOWN_PROPAGATOR ${name}`);
  }

  let varIndexes = [];
  for (let i = 0, n = varNames.length; i < n; ++i) {
    //console.log('testing', varNames[i], 'in', config._var_names_trie)
    let varIndex = trie_get(config._var_names_trie, varNames[i]);
    ASSERT(varIndex !== TRIE_KEY_NOT_FOUND, 'CONSTRAINT_VARS_SHOULD_BE_DECLARED');
    varIndexes[i] = varIndex;
  }

  if (name === 'sum') {
    let initialDomains = config.initial_domains;

    // limit result var to the min/max possible sum
    let maxDomain = initialDomains[varIndexes[0]]; // dont start with EMPTY or [0,0]!
    for (let i = 1, n = varIndexes.length; i < n; ++i) {
      let varIndex = varIndexes[i];
      maxDomain = domain_any_plus(maxDomain, initialDomains[varIndex]);
    }
    initialDomains[param] = domain_toStr(domain_any_intersection(maxDomain, initialDomains[param]));

    // eliminate multiple constants
    if (varIndexes.length > 1) {
      let newVarIndexes = [];
      let constants = domain_createValue(0);
      for (let i = 0, n = varIndexes.length; i < n; ++i) {
        let varIndex = varIndexes[i];
        let domain = initialDomains[varIndex];
        let value = domain_str_getValue(domain);
        if (value === NO_SUCH_VALUE) {
          newVarIndexes.push(varIndex);
        } else if (value !== 0) {
          constants = domain_any_plus(constants, domain);
        }
      }
      let cValue = domain_any_getValue(constants);
      if (cValue !== 0) {
        let varIndex = config_addVarAnonConstant(config, cValue);
        newVarIndexes.push(varIndex);
      }
      if (!newVarIndexes.length) initialDomains[param] = domain_toStr(domain_any_intersection(ZERO, initialDomains[param]));
      varIndexes = newVarIndexes;
    }
  }

  if (!config_solvedAtCompileTime(config, name, varIndexes, param)) {
    let constraint = constraint_create(name, varIndexes, param);
    config.all_constraints.push(constraint);
  }

  return varNameToReturn;
}

/**
 * If either side of certain constraints are solved at compile time, which
 * is right now, then the constraint should not be recorded at all because
 * it will never "unsolve". This can cause vars to become rejected before
 * the search even begins and that is okay.
 *
 * @param {$config} config
 * @param {string} constraintName
 * @param {number[]} varIndexes
 * @param {*} [param] The extra parameter for constraints
 * @returns {boolean}
 */
function config_solvedAtCompileTime(config, constraintName, varIndexes, param) {
  if (constraintName === 'lte' || constraintName === 'lt') {
    return _config_solvedAtCompileTimeLtLte(config, constraintName, varIndexes);
  } else if (constraintName === 'gte' || constraintName === 'gt') {
    return _config_solvedAtCompileTimeGtGte(config, constraintName, varIndexes);
  } else if (constraintName === 'eq') {
    return _config_solvedAtCompileTimeEq(config, constraintName, varIndexes);
  } else if (constraintName === 'neq') {
    return _config_solvedAtCompileTimeNeq(config, constraintName, varIndexes);
  } else if (constraintName === 'reifier') {
    return _config_solvedAtCompileTimeReifier(config, constraintName, varIndexes, param);
  } else if (constraintName === 'sum') {
    if (!varIndexes.length) return true;
    return _config_solvedAtCompileTimeSumProduct(config, constraintName, varIndexes, param);
  } else if (constraintName === 'sum') {
    return _config_solvedAtCompileTimeSumProduct(config, constraintName, varIndexes, param);
  }
  return false;
}
function _config_solvedAtCompileTimeLtLte(config, constraintName, varIndexes) {
  let initialDomains = config.initial_domains;
  let varIndexLeft = varIndexes[0];
  let varIndexRight = varIndexes[1];

  let domainLeft = initialDomains[varIndexLeft];
  let domainRight = initialDomains[varIndexRight];

  ASSERT_STRDOM(domainLeft);
  ASSERT_STRDOM(domainRight);
  if (!domainLeft || !domainRight) THROW('E_NON_EMPTY_DOMAINS_EXPECTED'); // it's probably a bug to feed empty domains to config

  let v = domain_str_getValue(domainLeft);
  if (v !== NO_SUCH_VALUE) {
    initialDomains[varIndexRight] = domain_toStr(domain_str_removeLte(domainRight, v - (constraintName === 'lt' ? 0 : 1)));
    // do not add constraint; this constraint is already solved
    config._constrainedAway.push(varIndexLeft, varIndexRight);
    return true;
  }

  v = domain_str_getValue(domainRight);
  if (v !== NO_SUCH_VALUE) {
    initialDomains[varIndexLeft] = domain_toStr(domain_str_removeGte(domainLeft, v + (constraintName === 'lt' ? 0 : 1)));
    // do not add constraint; this constraint is already solved
    config._constrainedAway.push(varIndexLeft, varIndexRight);
    return true;
  }

  initialDomains[varIndexLeft] = domain_toStr(domain_str_removeGte(domainLeft, domain_any_max(domainRight) + (constraintName === 'lt' ? 0 : 1)));
  initialDomains[varIndexRight] = domain_toStr(domain_str_removeLte(domainRight, domain_any_min(domainLeft) - (constraintName === 'lt' ? 0 : 1)));

  return false;
}
function _config_solvedAtCompileTimeGtGte(config, constraintName, varIndexes) {
  let initialDomains = config.initial_domains;
  let varIndexLeft = varIndexes[0];
  let varIndexRight = varIndexes[1];

  let domainLeft = initialDomains[varIndexLeft];
  let domainRight = initialDomains[varIndexRight];

  let v = domain_str_getValue(domainLeft);
  if (v !== NO_SUCH_VALUE) {
    initialDomains[varIndexRight] = domain_toStr(domain_str_removeGte(domainRight, v + (constraintName === 'gt' ? 0 : 1)));
    // do not add constraint; this constraint is already solved
    config._constrainedAway.push(varIndexLeft, varIndexRight);
    return true;
  }

  v = domain_str_getValue(domainRight);
  if (v !== NO_SUCH_VALUE) {
    initialDomains[varIndexLeft] = domain_toStr(domain_str_removeLte(domainLeft, v - (constraintName === 'gt' ? 0 : 1)));
    // do not add constraint; this constraint is already solved
    config._constrainedAway.push(varIndexLeft, varIndexRight);
    return true;
  }

  // A > B or A >= B. smallest number in A must be larger than the smallest number in B. largest number in B must be smaller than smallest number in A
  initialDomains[varIndexLeft] = domain_toStr(domain_str_removeLte(domainLeft, domain_any_min(domainRight) - (constraintName === 'gt' ? 0 : 1)));
  initialDomains[varIndexRight] = domain_toStr(domain_str_removeGte(domainRight, domain_any_max(domainLeft) + (constraintName === 'gt' ? 0 : 1)));

  return false;
}
function _config_solvedAtCompileTimeEq(config, constraintName, varIndexes) {
  let initialDomains = config.initial_domains;
  let varIndexLeft = varIndexes[0];
  let varIndexRight = varIndexes[1];
  let a = initialDomains[varIndexLeft];
  let b = initialDomains[varIndexRight];
  let v = domain_str_getValue(a);
  if (v === NO_SUCH_VALUE) v = domain_str_getValue(b);
  if (v !== NO_SUCH_VALUE) {
    let r = domain_toStr(domain_strstr_intersection(a, b));
    initialDomains[varIndexLeft] = r;
    initialDomains[varIndexRight] = r;
    config._constrainedAway.push(varIndexLeft, varIndexRight);
    return true;
  }
  return false;
}
function _config_solvedAtCompileTimeNeq(config, constraintName, varIndexes) {
  let initialDomains = config.initial_domains;
  let varIndexLeft = varIndexes[0];
  let varIndexRight = varIndexes[1];
  let v = domain_str_getValue(initialDomains[varIndexLeft]);
  if (v !== NO_SUCH_VALUE) {
    initialDomains[varIndexRight] = domain_toStr(domain_str_removeValue(initialDomains[varIndexRight], v));
    config._constrainedAway.push(varIndexLeft, varIndexRight);
    return true;
  }
  v = domain_str_getValue(initialDomains[varIndexRight]);
  if (v !== NO_SUCH_VALUE) {
    initialDomains[varIndexLeft] = domain_toStr(domain_str_removeValue(initialDomains[varIndexLeft], v));
    config._constrainedAway.push(varIndexLeft, varIndexRight);
    return true;
  }
  return false;
}
function _config_solvedAtCompileTimeReifier(config, constraintName, varIndexes, opName) {
  let initialDomains = config.initial_domains;
  let varIndexLeft = varIndexes[0];
  let varIndexRight = varIndexes[1];
  let varIndexResult = varIndexes[2];

  let domain1 = initialDomains[varIndexLeft];
  let domain2 = initialDomains[varIndexRight];
  ASSERT_STRDOM(domain1);
  ASSERT_STRDOM(domain2);
  if (!domain1 || !domain2) THROW('E_NON_EMPTY_DOMAINS_EXPECTED'); // it's probably a bug to feed empty domains to config

  let v1 = domain_str_getValue(initialDomains[varIndexLeft]);
  let v2 = domain_str_getValue(initialDomains[varIndexRight]);
  let hasLeft = v1 !== NO_SUCH_VALUE;
  let hasRight = v2 !== NO_SUCH_VALUE;
  if (hasLeft && hasRight) { // just left or right would not force anything. but both does.
    return _config_solvedAtCompileTimeReifierBoth(config, varIndexes, opName, v1, v2);
  }

  let v3 = domain_str_getValue(initialDomains[varIndexResult]);
  let hasResult = v3 !== NO_SUCH_VALUE;
  if (hasResult) {
    if (hasLeft) {
      // resolve right and eliminate reifier
      return _config_solvedAtCompileTimeReifierLeft(config, opName, varIndexRight, v1, v3, domain1, domain2);
    } else if (hasRight) {
      // resolve right and eliminate reifier
      return _config_solvedAtCompileTimeReifierRight(config, opName, varIndexLeft, v2, v3, domain1, domain2);
    }
  }

  if (opName !== 'eq' && opName !== 'neq') {
    // must be lt lte gt gte. these are solved completely when either param is solved
    ASSERT(opName === 'lt' || opName === 'lte' || opName === 'gt' || opName === 'gte', 'should be lt lte gt gte now because there are no other reifiers atm');

    if (opName === 'lt') {
      // A < B. solved if max(A) < min(B). rejected if min(A) >= max(B)
      if (domain_any_max(domain1) < domain_any_min(domain2)) {
        initialDomains[varIndexResult] = domain_toStr(domain_str_removeValue(initialDomains[varIndexResult], 0));
        config._constrainedAway.push(varIndexLeft, varIndexRight, varIndexResult);
        return true;
      }
      if (domain_any_min(domain1) >= domain_any_max(domain2)) {
        initialDomains[varIndexResult] = domain_toStr(domain_str_removeValue(initialDomains[varIndexResult], 1));
        config._constrainedAway.push(varIndexLeft, varIndexRight, varIndexResult);
        return true;
      }
    } else if (opName === 'lte') {
      // A <= B. solved if max(A) <= min(B). rejected if min(A) > max(B)
      if (domain_any_max(domain1) <= domain_any_min(domain2)) {
        initialDomains[varIndexResult] = domain_toStr(domain_str_removeValue(initialDomains[varIndexResult], 0));
        config._constrainedAway.push(varIndexLeft, varIndexRight, varIndexResult);
        return true;
      }
      if (domain_any_min(domain1) > domain_any_max(domain2)) {
        initialDomains[varIndexResult] = domain_toStr(domain_str_removeValue(initialDomains[varIndexResult], 1));
        config._constrainedAway.push(varIndexLeft, varIndexRight, varIndexResult);
        return true;
      }
    } else if (opName === 'gt') {
      // A > B. solved if min(A) > max(B). rejected if max(A) <= min(B)
      if (domain_any_min(domain1) > domain_any_max(domain2)) {
        initialDomains[varIndexResult] = domain_toStr(domain_str_removeValue(initialDomains[varIndexResult], 0));
        config._constrainedAway.push(varIndexLeft, varIndexRight, varIndexResult);
        return true;
      }
      if (domain_any_max(domain1) <= domain_any_min(domain2)) {
        initialDomains[varIndexResult] = domain_toStr(domain_str_removeValue(initialDomains[varIndexResult], 1));
        config._constrainedAway.push(varIndexLeft, varIndexRight, varIndexResult);
        return true;
      }
    } else if (opName === 'gte') {
      // A > B. solved if min(A) >= max(B). rejected if max(A) < min(B)
      if (domain_any_min(domain1) >= domain_any_max(domain2)) {
        initialDomains[varIndexResult] = domain_toStr(domain_str_removeValue(initialDomains[varIndexResult], 0));
        config._constrainedAway.push(varIndexLeft, varIndexRight, varIndexResult);
        return true;
      }
      if (domain_any_max(domain1) < domain_any_min(domain2)) {
        initialDomains[varIndexResult] = domain_toStr(domain_str_removeValue(initialDomains[varIndexResult], 1));
        config._constrainedAway.push(varIndexLeft, varIndexRight, varIndexResult);
        return true;
      }
    } else {
      THROW('UNKNOWN_OP');
    }
  }

  return false;
}
function _config_solvedAtCompileTimeReifierBoth(config, varIndexes, opName, v1, v2) {
  let initialDomains = config.initial_domains;
  let varIndexResult = varIndexes[2];

  let bool = false;
  switch (opName) {
    case 'lt':
      bool = v1 < v2;
      break;
    case 'lte':
      bool = v1 <= v2;
      break;
    case 'gt':
      bool = v1 > v2;
      break;
    case 'gte':
      bool = v1 >= v2;
      break;
    case 'eq':
      bool = v1 === v2;
      break;
    case 'neq':
      bool = v1 !== v2;
      break;
    default:
      return false;
  }

  initialDomains[varIndexResult] = domain_toStr(domain_str_removeValue(initialDomains[varIndexResult], bool ? 0 : 1));
  config._constrainedAway.push(varIndexResult); // note: left and right have been solved already so no need to push those here
  return true;
}
function _config_solvedAtCompileTimeReifierLeft(config, opName, varIndexRight, value, result, domain1, domain2) {
  let initialDomains = config.initial_domains;

  let domainRight = initialDomains[varIndexRight];
  switch (opName) {
    case 'lt':
      if (result) domainRight = domain_str_removeLte(domainRight, value);
      else domainRight = domain_str_removeGte(domainRight, value + 1);
      break;
    case 'lte':
      if (result) domainRight = domain_str_removeLte(domainRight, value - 1);
      else domainRight = domain_str_removeGte(domainRight, value);
      break;
    case 'gt':
      if (result) domainRight = domain_str_removeGte(domainRight, value);
      else domainRight = domain_str_removeLte(domainRight, value - 1);
      break;
    case 'gte':
      if (result) domainRight = domain_str_removeGte(domainRight, value + 1);
      else domainRight = domain_str_removeLte(domainRight, value);
      break;
    case 'eq':
      if (result) domainRight = domain_strstr_intersection(domain1, domain2);
      else domainRight = domain_str_removeValue(domainRight, value);
      break;
    case 'neq':
      if (result) domainRight = domain_str_removeValue(domainRight, value);
      else domainRight = domain_strstr_intersection(domain1, domain2);
      break;
    default:
      return false;
  }

  initialDomains[varIndexRight] = domain_toStr(domainRight);
  config._constrainedAway.push(varIndexRight); // note: left and result have been solved already so no need to push those here
  return true;
}
function _config_solvedAtCompileTimeReifierRight(config, opName, varIndexLeft, value, result, domain1, domain2) {
  let initialDomains = config.initial_domains;

  let domainLeft = initialDomains[varIndexLeft];
  switch (opName) {
    case 'lt':
      if (result) domainLeft = domain_str_removeGte(domainLeft, value + 1);
      else domainLeft = domain_str_removeLte(domainLeft, value);
      break;
    case 'lte':
      if (result) domainLeft = domain_str_removeGte(domainLeft, value);
      else domainLeft = domain_str_removeLte(domainLeft, value);
      break;
    case 'gt':
      if (result) domainLeft = domain_str_removeLte(domainLeft, value - 1);
      else domainLeft = domain_str_removeGte(domainLeft, value);
      break;
    case 'gte':
      if (result) domainLeft = domain_str_removeLte(domainLeft, value);
      else domainLeft = domain_str_removeGte(domainLeft, value + 1);
      break;
    case 'eq':
      if (result) domainLeft = domain_strstr_intersection(domain1, domain2);
      else domainLeft = domain_str_removeValue(domainLeft, value);
      break;
    case 'neq':
      if (result) domainLeft = domain_str_removeValue(domainLeft, value);
      else domainLeft = domain_strstr_intersection(domain1, domain2);
      break;
    default:
      return false;
  }

  initialDomains[varIndexLeft] = domain_toStr(domainLeft);
  config._constrainedAway.push(varIndexLeft); // note: right and result have been solved already so no need to push those here
  return true;
}
function _config_solvedAtCompileTimeSumProduct(config, constraintName, varIndexes, resultIndex) {
  if (varIndexes.length === 1) {
    let domain = domain_toStr(domain_strstr_intersection(config.initial_domains[resultIndex], config.initial_domains[varIndexes[0]]));
    config.initial_domains[resultIndex] = domain;
    config.initial_domains[varIndexes[0]] = domain;
    if (domain_str_isSolved(domain)) {
      config._constrainedAway.push(varIndexes[0], resultIndex);
      return true;
    }
    // cant eliminate constraint; sum will compile an `eq` for it.
  }
  return false;
}

/**
 * Generate all propagators from the constraints in given config
 * Puts these back into the same config.
 *
 * @param {$config} config
 */
function config_generatePropagators(config) {
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');
  let constraints = config.all_constraints;
  config._propagators = [];
  for (let i = 0, n = constraints.length; i < n; ++i) {
    let constraint = constraints[i];
    if (constraint.varNames) {
      console.warn('saw constraint.varNames, converting to varIndexes, log out result and update test accordingly');
      constraint.varIndexes = constraint.varNames.map(name => trie_get(config._var_names_trie, name));
      let p = constraint.param;
      delete constraint.param;
      delete constraint.varNames;
      constraint.param = p;
    }
    config_generatePropagator(config, constraint.name, constraint.varIndexes, constraint.param, constraint);
  }
}
/**
 * @param {$config} config
 * @param {string} name
 * @param {number[]} varIndexes
 * @param {string|Function|undefined} param Depends on the prop; reifier=op name, product/sum=result var, callback=func
 */
function config_generatePropagator(config, name, varIndexes, param, _constraint) {
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof name === 'string', 'NAME_SHOULD_BE_STRING');
  ASSERT(varIndexes instanceof Array, 'INDEXES_SHOULD_BE_ARRAY', JSON.stringify(_constraint));

  switch (name) {
    case 'plus':
      return propagator_addPlus(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'min':
      return propagator_addMin(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'ring-mul':
      return propagator_addRingMul(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'ring-div':
      return propagator_addDiv(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'mul':
      return propagator_addMul(config, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'sum':
      return propagator_addSum(config, varIndexes.slice(0), param);

    case 'product':
      return propagator_addProduct(config, varIndexes.slice(0), param);

    case 'distinct':
      return propagator_addDistinct(config, varIndexes.slice(0));

    case 'markov':
      return propagator_addMarkov(config, varIndexes[0]);

    case 'callback':
      return propagator_addCallback(config, varIndexes.slice(0), param);

    case 'reifier':
      return propagator_addReified(config, param, varIndexes[0], varIndexes[1], varIndexes[2]);

    case 'neq':
      return propagator_addNeq(config, varIndexes[0], varIndexes[1]);

    case 'eq':
      return propagator_addEq(config, varIndexes[0], varIndexes[1]);

    case 'gte':
      return propagator_addGte(config, varIndexes[0], varIndexes[1]);

    case 'lte':
      return propagator_addLte(config, varIndexes[0], varIndexes[1]);

    case 'gt':
      return propagator_addGt(config, varIndexes[0], varIndexes[1]);

    case 'lt':
      return propagator_addLt(config, varIndexes[0], varIndexes[1]);

    default:
      THROW('UNEXPECTED_NAME');
  }
}

function config_populateVarStrategyListHash(config) {
  let vsc = config.varStratConfig;
  while (vsc) {
    if (vsc.priorityByName) {
      let obj = {};
      let list = vsc.priorityByName;
      for (let i = 0, len = list.length; i < len; ++i) {
        let varIndex = trie_get(config._var_names_trie, list[i]);
        ASSERT(varIndex !== TRIE_KEY_NOT_FOUND, 'VARS_IN_PRIO_LIST_SHOULD_BE_KNOWN_NOW');
        obj[varIndex] = len - i; // never 0, offset at 1. higher value is higher prio
      }
      vsc._priorityByIndex = obj;
    }

    vsc = vsc.fallback;
  }
}

/**
 * At the start of a search, populate this config with the dynamic data
 *
 * @param {$config} config
 * @param {$space} space
 */
function config_initForSpace(config, space) {
  if (!config._var_names_trie) {
    config._var_names_trie = trie_create(config.all_var_names);
  }

  config_generatePropagators(config);
  config_generateVars(config, space); // after props because they may introduce new vars (TODO: refactor this...)
  config_populateVarPropHash(config);
  config_populateVarStrategyListHash(config);

  ASSERT(config._varToPropagators, 'should have generated hash');
}

// BODY_STOP

export {
  config_addConstraint,
  config_addPropagator,
  config_addVarAnonConstant,
  config_addVarAnonNothing,
  config_addVarAnonRange,
  config_addVarConstant,
  config_addVarDomain,
  config_addVarNothing,
  config_addVarRange,
  config_clone,
  config_create,
  config_createVarStratConfig,
  config_generateVars,
  config_generatePropagators,
  config_initForSpace,
  config_populateVarPropHash,
  config_setDefaults,
  config_setOptions,

  // testing
  _config_addVar,
};
