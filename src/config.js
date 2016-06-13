// Config for a search tree where each node is a Space
// TOFIX: may want to rename this to "tree-state" or something; it's not just config

// Note: all domains in this class should be array based!
// This prevents leaking the small domain artifact outside of the library.

import {
  EMPTY,
  SUB,
  SUP,

  ASSERT,
  GET_NAMES,
  THROW,
} from './helpers';
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
  LO_BOUND,
  NOT_FOUND,
  SMALL_MAX_FLAG,

  domain_createRange,
  domain_getValueArr,
  domain_numarr,
  domain_isSolved,
  domain_toArr,
} from './domain';
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

    var_filter_func: 'unsolved',
    next_var_func: 'naive',
    next_value_func: 'min',
    targetedVars: 'all',
    targetedIndexes: 'all', // function, string or array. initialized by config_generateVars, will contain var index for targetedVars
    var_dist_options: {},
    timeout_callback: undefined,

    // names of all vars in this search tree
    // optimizes loops because `for-in` is super slow
    all_var_names: [],
    // the propagators are generated from the constraints when a space
    // is created from this config. constraints are more higher level.
    all_constraints: [],

    constant_cache: {}, // <value:varName>, those names are usually anonymous vars
    initial_vars: {}, // initial domains for each var <varName:domain>

    _propagators: [], // initialized later
    _varToProps: [], // initialized later
  };
}

function config_clone(config, newVars) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let {
    var_filter_func,
    next_var_func,
    next_value_func,
    targetedVars,
    targetedIndexes,
    var_dist_options,
    timeout_callback,
    constant_cache,
    all_var_names,
    all_constraints,
    initial_vars,
    _propagators,
    _varToProps,
  } = config;

  return {
    _class: '$config',

    var_filter_func,
    next_var_func,
    next_value_func,
    targetedVars: targetedVars instanceof Array ? targetedVars.slice(0) : targetedVars,
    targetedIndexes: targetedIndexes instanceof Array ? targetedIndexes.slice(0) : targetedIndexes,
    var_dist_options: JSON.parse(JSON.stringify(var_dist_options)),  // TOFIX: clone this more efficiently
    timeout_callback, // by reference because it's a function if passed on...

    constant_cache, // is by reference ok?

    all_var_names: all_var_names.slice(0),
    all_constraints: all_constraints.slice(0),
    initial_vars: newVars || initial_vars, // <varName:domain>

    _propagators: _propagators.slice(0), // in case it is initialized
    _varToProps: _varToProps.slice(0), // inited elsewhere
  };
}

/**
 * Add an anonymous var with max allowed range
 *
 * @param {$config} config
 * @returns {string}
 */
function config_addVarAnonNothing(config) {
  return config_addVarNothing(config, true);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (If true, is anonymous)
 * @returns {string}
 */
function config_addVarNothing(config, varName) {
  return config_addVarDomain(config, varName, domain_createRange(SUB, SUP));
}
/**
 * @param {$config} config
 * @param {number} lo
 * @param {number} hi
 * @returns {string}
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
 * @returns {string}
 */
function config_addVarRange(config, varName, lo, hi) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varName === 'string' || varName === true, 'A_VARNAME_SHOULD_BE_STRING_OR_TRUE');
  ASSERT(typeof lo === 'number', 'A_LO_MUST_BE_NUMBER');
  ASSERT(typeof hi === 'number', 'A_HI_MUST_BE_NUMBER');
  ASSERT(lo <= hi, 'A_RANGES_SHOULD_ASCEND');

  let domain = domain_toArr(domain_createRange(lo, hi));
  return config_addVarDomain(config, varName, domain);
}
/**
 * @param {$config} config
 * @param {Array.<string|boolean>} varNames Will only be strings but true could mean anonymous vars. Useless since you don't get their id back, though.
 * @param {$domain_arr} domain Small domain format not allowed here.
 */
function config_addVarsWithDomain(config, varNames, domain) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(domain instanceof Array, 'DOMAIN_MUST_BE_ARRAY_HERE');

  for (let i = 0, n = varNames.length; i < n; ++i) {
    let varName = varNames[i];
    ASSERT(typeof varName === 'string' || varName === true, 'varName must be a string or true');
    config_addVarDomain(config, varName, domain);
  }
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (If true, anon)
 * @param {$domain_arr} domain Small domain format not allowed here.
 * @param {undefined} [_forbidden] Throws if this is used, prevents bad api mistakes (since domain can be a number)
 * @returns {string}
 */
function config_addVarDomain(config, varName, domain, _forbidden) {
  ASSERT(_forbidden === undefined, 'A_WRONG_API');
  ASSERT(domain instanceof Array, 'DOMAIN_MUST_BE_ARRAY_HERE');

  return _config_addVar(config, varName, domain);
}
/**
 * @param {$config} config
 * @param {number} value
 * @returns {string}
 */
function config_addVarAnonConstant(config, value) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');

  if (config.constant_cache[value]) {
    return config.constant_cache[value];
  }

  return config_addVarConstant(config, true, value);
}
/**
 * @param {$config} config
 * @param {string|boolean} varName (True means anon)
 * @param {number} value
 * @returns {string}
 */
function config_addVarConstant(config, varName, value) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varName === 'string' || varName === true, 'varName must be a string or true for anon');
  ASSERT(typeof value === 'number', 'A_VALUE_SHOULD_BE_NUMBER');

  let domain = domain_toArr(domain_createRange(value, value));

  varName = config_addVarDomain(config, varName, domain);

  return varName;
}

/**
 * @param {$config} config
 * @param {string|true} varName If true, the varname will be the same as the index it gets on all_var_names
 * @param {$domain_arr} domain Small domain format not allowed here.
 * @returns {string} the var name (you need this for anonymous vars)
 */
function _config_addVar(config, varName, domain) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(varName && typeof varName === 'string' || varName === true, 'A_VAR_NAME_MUST_BE_STRING_OR_TRUE');
  ASSERT(domain instanceof Array, 'DOMAIN_MUST_BE_ARRAY_HERE');
  ASSERT(varName === true || !config.initial_vars[varName], 'Do not declare the same varName twice', config.initial_vars[varName], '->', varName, '->', domain);
  ASSERT(!(domain instanceof Array) || domain.length === 0 || domain[LO_BOUND] >= SUB, 'domain lo should be >= SUB', domain);
  ASSERT(!(domain instanceof Array) || domain.length === 0 || domain[domain.length - 1] <= SUP, 'domain hi should be <= SUP', domain);
  ASSERT(typeof domain !== 'number' || (domain >= EMPTY && domain <= SMALL_MAX_FLAG), 'domain as value should be within small domain range', domain);
  ASSERT(String(parseInt(varName, 10)) !== varName, 'DONT_USE_NUMBERS_AS_VAR_NAMES[' + varName + ']');

  let wasAnonymous = varName === true;
  if (wasAnonymous) {
    varName = String(config.all_var_names.length); // this var will be assigned to this index
  }
  if (config.all_var_names.indexOf(varName) >= 0) {
    if (wasAnonymous) THROW('DONT_USE_NUMBERS_AS_VAR_NAMES'); // there is an assertion for this above but wont be at runtime
    THROW('Var varName already part of this config. Probably a bug?');
  }

  let solvedTo = domain_getValueArr(domain);
  if (solvedTo !== NOT_FOUND && !config.constant_cache[solvedTo]) config.constant_cache[solvedTo] = varName;

  config.initial_vars[varName] = domain;
  config.all_var_names.push(varName);

  return varName;
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

// Set solving options on this config. Only required for the root.

function config_setOptions(config, options) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  if (options && options.filter) {
    // for markov,
    // string: 'none', ignored
    // function: callback to determine which vars of a space are considered, should return array of varNames
    config.var_filter_func = options.filter;
  }
  if (options && options.var) {
    // see distribution.var
    // either
    // - a function: should return the _name_ of the next var to process
    // - a string: the name of the var distributor to use
    // - an object: a complex object like {dist_name:string, fallback_config: string|object, data...?}
    // fallback_config has the same struct as the main config.next_var_func and is used when the dist returns SAME
    // this way you can chain distributors if they cant decide on their own (list -> markov -> naive)
    config.next_var_func = options.var;
    config_initConfigsAndFallbacks(options.var);
  }
  if (options && options.val) {
    // see distribution.value
    config.next_value_func = options.val;
  }
  if (options && options.targeted_var_names) {
    // which vars must be solved for this space to be solved
    // string: 'all'
    // string[]: list of vars that must be solved
    // function: callback to return list of names to be solved
    config.targetedVars = options.targeted_var_names;
  }
  if (options && options.var_dist_config) {
    // An object which defines a value distributor per variable
    // which overrides the globally set value distributor.
    // See Bvar#distributionOptions (in multiverse)
    config.var_dist_options = options.var_dist_config;
  }
  if (options && options.timeout_callback) {
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

// TOFIX: config_getUnknownVars was not exported but imported in Solver. is it used at all? i dont think so.
function config_getUnknownVars(config) {
  let newNames = [];
  let constraints = config.all_constraints;
  for (let i = 0, n = constraints.length; i < n; i++) {
    let varNames = constraints[i].varNames;
    for (let j = 0, m = varNames.length; j < m; ++j) {
      let varName = varNames[j];
      if (!config.initial_vars[varName] && newNames.indexOf(varName) < 0) {
        newNames.push(varName);
      }
    }
  }
  return newNames;
}

function config_generateVars(config, space) {
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(space && space._class === '$space', 'SPACE_SHOULD_BE_SPACE');

  let unsolvedVarIndexes = space.unsolvedVarIndexes;

  ASSERT(space.vardoms, 'expecting var domains');
  let initialVars = config.initial_vars;
  ASSERT(initialVars, 'config should have initial vars');
  let allVarNames = config.all_var_names;
  ASSERT(allVarNames, 'config should have a list of vars');

  for (let varIndex = 0, n = allVarNames.length; varIndex < n; varIndex++) {
    let varName = allVarNames[varIndex];
    let domain = initialVars[varName];
    ASSERT(domain !== undefined, 'ALL_VARS_GET_A_DOMAIN'); // 0,1 or sub,sup if nothing else

    space.vardoms[varIndex] = domain_numarr(domain);
    if (!domain_isSolved(domain)) unsolvedVarIndexes.push(varIndex);
  }

  if (config.targetedVars === 'all') {
    config.targetedIndexes = 'all';
  } else {
    config.targetedIndexes = [];
    for (let i = 0; i < config.targetedVars.length; ++i) {
      let name = config.targetedVars[i];
      let index = allVarNames.indexOf(name);
      if (index < 0) THROW('TARGETED_VARS_SHOULD_EXIST_NOW');
      config.targetedIndexes.push(index);
    }
  }
}

/**
 * Create a simple lookup hash from an array of strings
 * to an object that looks up the index from the string.
 * This is used for finding the priority of a var elsewhere.
 *
 * @param {$config} [config] This is the var dist config (-> space.config.next_var_func)
 * @property {string[]} [config.priority_list] If present, creates a priority_hash on config which maps string>index
 */
function config_initConfigsAndFallbacks(config) {
  // populate the priority hashes for all (sub)configs
  while (config != null) {
    // explicit list of priorities. vars not in this list have equal
    // priority, but lower than any var that is in the list.
    let list = config.priority_list;
    if (list) {
      let hash = {};
      config.priority_hash = hash;
      for (let index = 0, max = list.length; index < max; index++) {
        // note: lowest priority still in the list is one, not zero
        // this way you dont have to check -1 for non-existing, later
        let varName = list[index];
        hash[varName] = max - index;
      }
    }

    // do it for all the fallback configs as well...
    config = config.fallback_config;
  }
}

/**
 * Creates a mapping from a varIndex to a set of propIndexes
 * These propagators are the ones that use the varIndex
 * This is useful for quickly determining which propagators
 * need to be stepped while propagating them.
 *
 * @param {$config} config
 */
function config_populateVarPropHash(config) {
  let hash = new Array(config.all_var_names.length);
  let propagators = config._propagators;
  for (let propIndex = 0, plen = propagators.length; propIndex < plen; ++propIndex) {
    let pvars = propagators[propIndex][PROP_VAR_INDEXES];
    for (let propVarIndex = 0, vlen = pvars.length; propVarIndex < vlen; ++propVarIndex) {
      let varIndex = pvars[propVarIndex];
      if (!hash[varIndex]) hash[varIndex] = [propIndex];
      else if (hash[varIndex].indexOf(propIndex) < 0) hash[varIndex].push(propIndex);
    }
  }
  config._varToProps = hash;
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

      let sumName = varNames[2];
      if (resultIsParam) sumName = param;

      if (typeof sumName === 'undefined') {
        if (forceBool) sumName = config_addVarAnonRange(config, 0, 1);
        else sumName = config_addVarAnonNothing(config);
      } else if (typeof sumName === 'number') {
        sumName = config_addVarAnonConstant(config, sumName);
      } else if (typeof sumName !== 'string') {
        THROW(`expecting result var name to be absent or a number or string: \`${sumName}\``);
      }
      if (resultIsParam) param = sumName;
      else varNames[2] = sumName;

      // check all other var names, except result var, for constants
      let hasNonConstant = false;
      for (let i = 0, n = varNames.length - (resultIsParam ? 0 : 1); i < n; ++i) {
        if (typeof varNames[i] === 'number') {
          varNames[i] = config_addVarAnonConstant(config, varNames[i]);
        } else {
          hasNonConstant = true;
        }
      }
      if (!hasNonConstant) THROW('E_MUST_GET_AT_LEAST_ONE_VAR_NAME');

      varNameToReturn = sumName;
      break;
    }

    case 'markov':
      ASSERT(varNames.length === 1, 'MARKOV_PROP_USES_ONE_VAR');
      // fall-through
    case 'distinct':
    case 'callback':
    case 'eq':
    case 'neq':
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      // require at least one non-constant variable... except callback/distinct can have zero vars
      let hasNonConstant = (name !== 'callback' || name !== 'distinct') && varNames.length === 0;
      for (let i = 0, n = varNames.length; i < n; ++i) {
        if (typeof varNames[i] === 'number') {
          varNames[i] = config_addVarAnonConstant(config, varNames[i]);
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

  let constraint = constraint_create(name, varNames, param);
  config.all_constraints.push(constraint);

  return varNameToReturn;
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
    config_generatePropagator(config, constraint.name, constraint.varNames, constraint.param);
  }
}
/**
 * @param {$config} config
 * @param {string} name
 * @param {string[]} varNames
 * @param {string|Function|undefined} param Depends on the prop; reifier=op name, product/sum=result var, callback=func
 */
function config_generatePropagator(config, name, varNames, param) {
  ASSERT(config && config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof name === 'string', 'NAME_SHOULD_BE_STRING');
  ASSERT(varNames instanceof Array, 'NAMES_SHOULD_BE_ARRAY');

  let allVarNames = config.all_var_names;
  let varIndexes = varNames.map(name => allVarNames.indexOf(name));

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
      return propagator_addSum(config, varIndexes.slice(0), allVarNames.indexOf(param));

    case 'product':
      return propagator_addProduct(config, varIndexes.slice(0), allVarNames.indexOf(param));

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

/**
 * At the start of a search, populate this config with the dynamic data
 *
 * @param {$config} config
 * @param {$space} space
 */
function config_initForSpace(config, space) {
  config_generatePropagators(config);
  config_generateVars(config, space); // after props because they may introduce new vars (TODO: refactor this...)
  config_populateVarPropHash(config);
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
  config_addVarsWithDomain,
  config_clone,
  config_create,
  config_generateVars,
  config_generatePropagators,
  config_getUnknownVars,
  config_initForSpace,
  config_populateVarPropHash,
  config_setDefaults,
  config_setOptions,

  // testing
  _config_addVar,
  config_initConfigsAndFallbacks,
};
