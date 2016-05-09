// Config for a search tree where each node is a Space
// TOFIX: may want to rename this to "tree-state" or something; it's not just config

import {
  SUB,
  SUP,

  ASSERT,
  ASSERT_PROPAGATORS,
  THROW,
} from './helpers';
import {
  fdvar_create,
} from './fdvar';
import {
  domain_createRange,
  domain_createValue,
} from './domain';
import distribution_getDefaults from './distribution/defaults';

// BODY_START

function config_create() {
  return {
    _class: 'config',

    var_filter_func: 'unsolved',
    next_var_func: 'naive',
    next_value_func: 'min',
    targetedVars: 'all',
    var_dist_options: {},
    timeout_callback: undefined,

    // "solved" values should be shared with the tree. may refactor this away in the future.
    constant_uid: 0,
    constant_cache: {}, // value to var.id, usually anonymous

    // names of all vars in this search tree
    // optimizes loops because `for-in` is super slow
    all_var_names: [],

    // like a blue print for the root space with just primitives/arrays
    initial_vars: {},
    propagators: [],
  };
}

function config_clone(config, newVars) {
  ASSERT(config._class = 'config');

  let {
    var_filter_func,
    next_var_func,
    next_value_func,
    targetedVars,
    var_dist_options,
    timeout_callback,
    constant_uid,
    constant_cache,
    all_var_names,
    initial_vars,
    propagators,
  } = config;

  return {
    _class: 'config',

    var_filter_func,
    next_var_func,
    next_value_func,
    targetedVars: (targetedVars instanceof Array && targetedVars.slice(0)) || targetedVars,
    var_dist_options: JSON.parse(JSON.stringify(var_dist_options)),  // TOFIX: clone this more efficiently
    timeout_callback, // by reference because it's a function if passed on...

    constant_uid,
    constant_cache, // is by reference ok?

    all_var_names: all_var_names.slice(0),

    initial_vars: newVars || initial_vars,
    propagators: propagators.slice(0), // is it okay to share them by ref? i think so...
  };
}

function config_addVarsA(config, arr, domainOrLo, hi) {
  for (let i = 0; i < arr.length; i++) {
    let name = arr[i];
    config_addVar(config, name, domainOrLo, hi);
  }
}

function config_addVarsO(config, obj) {
  for (let name in obj) {
    let domain = obj[name];
    config_addVar(config, name, domain);
  }
}

// simply alias to omit the name for complex domains

function config_addVarAnon(config, domain_or_lo, hi) {
  return config_addVar(config, undefined, domain_or_lo, hi);
}

function config_addVar(config, name, domainOrLo, hi) {
  ASSERT(domainOrLo instanceof Array || typeof domainOrLo === 'number' || domainOrLo === undefined, 'arr/num/undef', domainOrLo);

  if (domainOrLo instanceof Array) {
    let domain = domainOrLo;
    if (domain.length === 2 && domain[0] === domain[1]) {
      if (name) {
        return config_addVar(config, name, domain[0]);
      } else {
        return config_addConstant(config, domain[0]);
      }
    }
    domainOrLo = domain.slice(0);
  } else if (typeof domainOrLo === 'number') {
    let lo = domainOrLo;
    if (typeof hi === 'number') {
      if (!name && lo === hi) {
        return config_addConstant(config, lo);
      }
      domainOrLo = [lo, hi];
    } else if (!name) {
      return config_addConstant(config, lo);
    }
  }

  if (!name) {
    name = String(++config.constant_uid);
  }

  config_addVarValue(config, name, domainOrLo);
  return name;
}

// This is the core var adding function
// Preprocessing of parameters should be done here
// All parameters are mandatory and assumed scrubbed
//
// @param {Config} config
// @param {string} name
// @param {number[]} domain
// @param {undefined} _forbidden_arg Sanity check, do not use this arg

function config_addVarValue(config, name, domain, _forbiddenArg) {
  ASSERT(config._class === 'config', 'wants config', config._class, config);
  ASSERT(name && typeof name === 'string', 'name should be a non-empty string', name);
  ASSERT(!config.initial_vars[name], 'fdvar should not be defined but was, when would that not be a bug?', config.initial_vars[name], '->', name, '->', domain);
  ASSERT(!(_forbiddenArg != null), 'not expecting a hi, pass on [lo,hi] in array or just lo', _forbiddenArg);
  ASSERT(domain instanceof Array || typeof domain === 'number' || domain === undefined, 'domain check', domain);
  ASSERT(!(domain instanceof Array) || domain.length === 0 || domain[0] >= SUB, 'domain lo should be >= SUB', domain);
  ASSERT(!(domain instanceof Array) || domain.length === 0 || domain[domain.length - 1] <= SUP, 'domain hi should be <= SUP', domain);
  ASSERT(typeof domain !== 'number' || (domain >= SUB && domain <= SUP), 'single value should be SUB<=value<=SUP', domain);

  if (config.all_var_names.indexOf(name) >= 0) {
    THROW('Var name already part of this config. Probably a bug?');
  }

  config.initial_vars[name] = domain;
  config.all_var_names.push(name);

  // we cant change the name here but we can cache the constant if it were one
  if (domain instanceof Array && domain.length === 2 && domain[0] === domain[1]) {
    let lo = domain[0];
    if (!config.constant_cache[lo]) {
      config.constant_cache[lo] = name;
    }
  } else if (typeof domain === 'number') {
    if (!config.constant_cache[domain]) {
      config.constant_cache[domain] = name;
    }
  }
}

function config_addConstant(config, value) {
  ASSERT(config._class === 'config');
  ASSERT(typeof value === 'number', 'constant value should be a number', value);
  if (config.constant_cache[value]) {
    return config.constant_cache[value];
  }
  let name = String(++config.constant_uid);
  config_addVarValue(config, name, value);
  config.constant_cache[value] = name;
  return name;
}

/**
 * Initialize the config of this space according to certain presets
 *
 * @param {Space} space
 * @param {string} name
 */
function config_setDefaults(space, name) {
  ASSERT(space._class === 'config');
  config_setOptions(space, distribution_getDefaults(name));
}

// Set solving options on this config. Only required for the root.

function config_setOptions(config, options) {
  ASSERT(config._class === 'config');
  if (options && options.filter) {
    // for markov,
    // string: 'none', ignored
    // function: callback to determine which vars of a space are considered, should return array of names
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

function config_addPropagator(config, propagator) {
  ASSERT(config._class === 'config');
  config.propagators.push(propagator);
  ASSERT_PROPAGATORS(config.propagators);
}

// TOFIX: config_getUnknownVars was not exported but imported in Solver. is it used at all? i dont think so.
function config_getUnknownVars(config) {
  let names = [];
  for (let i = 0; i < config.propagators.length; i++) {
    let p = config.propagators[i];
    let a = p[1][0];
    if (!config.initial_vars[a] && names.indexOf(a) < 0) {
      names.push(a);
    }
    let b = p[1][1];
    if (!config.initial_vars[b] && names.indexOf(b) < 0) {
      names.push(b);
    }
  }
  return names;
}

function config_generateVars(config, vars, unsolvedVarNames) {
  ASSERT(config, 'should have a config');
  if (typeof vars === 'undefined' || vars === null) { vars = {}; }
  let { initial_vars } = config;

  for (let i = 0; i < config.all_var_names.length; i++) {
    let name = config.all_var_names[i];
    let val = initial_vars[name];
    if (typeof val === 'number') {
      val = fdvar_create(name, domain_createValue(val));
    } else if (val === undefined) {
      val = fdvar_create(name, domain_createRange(SUB, SUP));
    } else {
      ASSERT(val instanceof Array);
      ASSERT((val.length % 2) === 0);
      val = fdvar_create(name, val);
    }

    vars[name] = val;
    if (unsolvedVarNames && val.length !== 2 || val[0] !== val[1]) {
      unsolvedVarNames.push(name);
    }
  }

  return vars;
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
        let name = list[index];
        hash[name] = max - index;
      }
    }

    // do it for all the fallback configs as well...
    config = config.fallback_config;
  }
}

// BODY_STOP

export {
  config_addConstant,
  config_addPropagator,
  config_addVar,
  config_addVarAnon,
  config_addVarsA,
  config_addVarsO,
  config_clone,
  config_create,
  config_generateVars,
  config_getUnknownVars,
  config_setDefaults,
  config_setOptions,

  // testing
  config_addVarValue,
  config_initConfigsAndFallbacks,
};
