import {
  SOME_CHANGES,
  REJECTED,

  ASSERT,
  ASSERT_DOMAIN,
} from './helpers';

import {
  config_clone,
  config_create,
  config_generateVars,
} from './config';

import {
  domain_clone,
  domain_fromFlags,
  domain_getValue,
  domain_isRejected,
  domain_isSolved,
} from './domain';

import {
  fdvar_clone,
  fdvar_isSolved,
} from './fdvar';

import propagator_stepAny from './propagators/step_any';
import propagator_isSolved from './propagators/is_solved';

// BODY_START

/**
 * @param {$config} config
 * @returns {$space}
 */
function space_createRoot(config) {
  if (!config) config = config_create();

  return space_createNew(config, [], {}, [], 0, 0);
}

/**
 * @param {$config} config
 * @returns {Space}
 */
function space_createFromConfig(config) {
  ASSERT(config._class === 'config');

  let space = space_createRoot(config);
  space_initFromConfig(space);
  return space;
}

/**
 * Create a space node that is a child of given space node
 *
 * @param {Space} space
 * @returns {$space}
 */
function space_createClone(space) {
  ASSERT(space._class === 'space');

  let unsolvedNames = [];
  let cloneVars = {};

  let unsolvedPropagators = space_collectCurrentUnsolvedPropagators(space);

  space_pseudoCloneVars(space.config.all_var_names, space.vars, cloneVars, unsolvedNames);
  return space_createNew(space.config, unsolvedPropagators, cloneVars, unsolvedNames, space._depth + 1, space._child_count++);
}

/**
 * Find and return all propagators whose args have not been resolved
 *
 * @param {Space} space
 * @returns {$propagator[]}
 */
function space_collectCurrentUnsolvedPropagators(space) {
  let vars = space.vars;
  let unsolvedPropagators = [];
  let props = space.unsolvedPropagators;
  for (let i = 0; i < props.length; i++) {
    let propagator = props[i];
    if (!propagator_isSolved(vars, propagator)) {
      unsolvedPropagators.push(propagator);
    }
  }
  return unsolvedPropagators;
}

/**
 * Create a new config with the configuration of the given Space
 * Basically clones its config but updates the `initial_vars` with fresh state
 *
 * @param {Space} space
 * @returns {Space}
 */
function space_toConfig(space) {
  ASSERT(space._class = 'space');

  let varsForClone = {};
  let names = space.config.all_var_names;
  let fdvars = space.vars;
  for (let i = 0; i < names.length; i++) {
    let name = names[i];
    let fdvar = fdvars[name];
    let dom = fdvar.dom;
    varsForClone[name] = domain_clone(dom);
  }

  return config_clone(space.config, varsForClone);
}

/**
 * Note: it's pseudo because solved vars are not cloned but copied...
 *
 * @param {string[]} allNames
 * @param {Fdvar[]} parentVars
 * @param {Fdvar[]} cloneVars
 * @param {Fdvar[]} cloneUnsolvedVarNames
 */
function space_pseudoCloneVars(allNames, parentVars, cloneVars, cloneUnsolvedVarNames) {
  for (let i = 0; i < allNames.length; i++) {
    let varName = allNames[i];
    let fdvar = parentVars[varName];
    if (fdvar.was_solved) {
      cloneVars[varName] = fdvar;
    } else { // copy by reference
      cloneVars[varName] = fdvar_clone(fdvar);
      cloneUnsolvedVarNames.push(varName);
    }
  }
}

/**
 * Concept of a space that holds config, some fdvars, and some propagators
 *
 * @param {$config} config
 * @param {Object[]} unsolvedPropagators
 * @param {Fdvar[]} vars
 * @param {string[]} unsolvedVarNames
 * @param {number} _depth
 * @param {number} _child
 * @returns {$space}
 */
function space_createNew(config, unsolvedPropagators, vars, unsolvedVarNames, _depth, _child) {
  ASSERT(unsolvedPropagators instanceof Array, 'props should be an array', unsolvedPropagators);
  ASSERT(typeof vars === 'object' && vars, 'vars should be an object', vars);
  ASSERT(unsolvedVarNames instanceof Array, 'unsolvedVarNames should be an array', unsolvedVarNames);

  return ({
    _class: 'space',
    // search graph metrics
    _depth,
    _child,
    _child_count: 0,

    config,

    vars,
    unsolvedVarNames,
    unsolvedPropagators, // by references from space.config.propagators

    next_distribution_choice: 0,
  });
}

/**
 * @param {Space} space
 */
function space_initFromConfig(space) {
  let config = space.config;
  ASSERT(config, 'should have a config');

  config_generateVars(config, space.vars, space.unsolvedVarNames);

  // propagators are immutable so share by reference
  for (let i = 0; i < config.propagators.length; i++) {
    let propagator = config.propagators[i];
    space.unsolvedPropagators.push(propagator);
  }
}

/**
 * Run all the propagators until stability point. Returns the number
 * of changes made or throws a 'fail' if any propagator failed.
 *
 * @param {Space} space
 * @returns {boolean}
 */
function space_propagate(space) {
  ASSERT(space._class === 'space');
  let unsolvedPropagators = space.unsolvedPropagators;

  let changed;
  do {
    changed = false;
    for (let i = 0; i < unsolvedPropagators.length; i++) {
      let propDetails = unsolvedPropagators[i];
      let n = propagator_stepAny(propDetails, space); // TODO: if we can get a "solved" state here we can prevent an "is_solved" check later...

      // the domain of either var of a propagator can only be empty if the prop REJECTED
      ASSERT(n === REJECTED || space.vars[propDetails[1][0]].dom > 0 || space.vars[propDetails[1][0]].dom.length, 'prop var empty but it didnt REJECT');
      ASSERT(n === REJECTED || !propDetails[1][1] || space.vars[propDetails[1][1]].dom > 0 || space.vars[propDetails[1][1]].dom.length, 'prop var empty but it didnt REJECT');
      // if a domain was set empty and the flag is on the property should be set or
      // the unit test setup is unsound and it should be fixed (ASSERT_DOMAIN_EMPTY_SET)
      //ASSERT(!ENABLED || !ENABLE_EMPTY_CHECK || space.vars[propDetails[1][0]].dom.length || space.vars[propDetails[1][0]].dom._trace, 'domain empty but not marked');
      //ASSERT(!ENABLED || !ENABLE_EMPTY_CHECK || !propDetails[1][1] || space.vars[propDetails[1][1]].dom.length || space.vars[propDetails[1][1]].dom._trace, 'domain empty but not marked');

      if (n === SOME_CHANGES) {
        changed = true;
      } else if (n === REJECTED) {
        return false; // solution impossible
      }
    }

    if (space_abortSearch(space)) {
      return false;
    }
  } while (changed);

  return true;
}

/**
 * @param {Space} space
 * @returns {boolean}
 */
function space_abortSearch(space) {
  ASSERT(space._class === 'space');
  let callback = space.config.timeout_callback;
  if (callback) {
    return callback(space);
  }
  return false;
}

/**
 * Returns true if this space is solved - i.e. when
 * all the fdvars in the space have a singleton domain.
 *
 * This is a *very* strong condition that might not need
 * to be satisfied for a space to be considered to be
 * solved. For example, the propagators may determine
 * ranges for all variables under which all conditions
 * are met and there would be no further need to enumerate
 * those solutions.
 *
 * For weaker tests, use the solve_for_variables function
 * to create an appropriate "is_solved" tester and
 * set the "state.is_solved" field at search time to
 * that function.
 *
 * @param {Space} space
 * @returns {boolean}
 */
function space_isSolved(space) {
  ASSERT(space._class === 'space');
  let vars = space.vars;
  let targetedVars = space.config.targetedVars;
  let unsolvedNames = space.unsolvedVarNames;

  let j = 0;
  for (let i = 0; i < unsolvedNames.length; i++) {
    let name = unsolvedNames[i];
    if (targetedVars === 'all' || targetedVars.indexOf(name) >= 0) {
      let fdvar = vars[name];
      ASSERT(!fdvar.was_solved, 'should not be set yet at this stage'); // we may change this though...
      ASSERT_DOMAIN(fdvar.dom);

      if (fdvar_isSolved(fdvar)) {
        fdvar.was_solved = true; // makes space_createClone faster
      } else {
        unsolvedNames[j++] = name;
      }
    }
  }
  unsolvedNames.length = j;

  return j === 0;
}

/**
 * Returns an object whose field names are the fdvar names
 * and whose values are the solved values. The space *must*
 * be already in a solved state for this to work.
 *
 * @param {Space} space
 * @returns {Object}
 */
function space_solution(space) {
  ASSERT(space._class === 'space');
  let result = {};
  let vars = space.vars;
  let allVarNames = space.config.all_var_names;
  for (let i = 0; i < allVarNames.length; i++) {
    let varName = allVarNames[i];
    space_getsetVarSolveState(varName, vars, result);
  }
  return result;
}

/**
 * @param {Space} space
 * @param {string[]} varNames List of var names to query the solution for
 * @param {boolean} [complete=false] Return false if at least one var could not be solved?
 * @returns {Object}
 */
function space_solutionFor(space, varNames, complete = false) { // todo implement memorize flag
  ASSERT(space._class === 'space');
  let vars = space.vars;
  let result = {};
  for (let i = 0; i < varNames.length; i++) {
    let varName = varNames[i];
    let value = false;
    if (vars[varName]) {
      value = space_getsetVarSolveState(varName, vars, result);
    }

    if (complete && value === false) {
      return false;
    }

    result[varName] = value;
  }

  return result;
}

/**
 * @param {string} varName
 * @param {Fdvar[]} vars
 * @param result
 * @returns {number|number[]|boolean} The solve state for given var name, also put into result
 */
function space_getsetVarSolveState(varName, vars, result) {
  // Don't include the temporary variables in the "solution".
  // Temporary variables take the form of a numeric property
  // of the object, so we test for the varName to be a number and
  // don't include those variables in the result.
  let domain = vars[varName].dom;
  let value = domain;
  if (domain_isRejected(domain)) {
    value = false;
  } else if (domain_isSolved(domain)) {
    value = domain_getValue(domain);
  } else {
    value = domain_fromFlags(domain);
  }
  result[varName] = value;

  return value;
}

// __REMOVE_BELOW_FOR_DIST__

//# ## Debugging

// debug stuff (should be stripped from dist)

/**
 * @param {Space} space
 * @returns {string[]}
 */
function __space_debugVarDomains(space) {
  let things = [];
  for (let name in space.vars) {
    things.push(name + ': [' + space.vars[name].dom + ']');
  }
  return things;
}

/**
 * @param {Space} space
 * @returns {string[]}
 */
function __space_getUnsolved(space) {
  let vars = space.vars;
  let unsolved_names = [];
  for (let name in vars) {
    let fdvar = vars[name];
    if (!fdvar_isSolved(fdvar)) {
      unsolved_names.push(name);
    }
  }
  return unsolved_names;
}

// __REMOVE_ABOVE_FOR_DIST__

// BODY_STOP

export {
  space_createClone,
  space_createFromConfig,
  space_createRoot,
  space_initFromConfig,
  space_isSolved,
  space_propagate,
  space_solution,
  space_solutionFor,
  space_toConfig,

  // debugging / testing
  __space_debugVarDomains,
  __space_getUnsolved,
};
