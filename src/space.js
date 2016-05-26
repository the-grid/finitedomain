import {
  NO_SUCH_VALUE,
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
 * @param {$space} space
 * @returns {$space}
 */
function space_createClone(space) {
  ASSERT(space._class === 'space');

  let unsolvedPropagators = space_collectCurrentUnsolvedPropagators(space);

  let unsolvedNames = space_filterUnsolvedVars(space);
  let vardomsCopy = space_copyVardoms(space);

  return space_createNew(space.config, unsolvedPropagators, vardomsCopy, unsolvedNames, space._depth + 1, space._child_count++);
}

/**
 * Find and return all propagators whose args have not been resolved
 *
 * @param {Space} space
 * @returns {$propagator[]}
 */
function space_collectCurrentUnsolvedPropagators(space) {
  let unsolvedPropagators = [];
  let props = space.unsolvedPropagators;
  for (let i = 0; i < props.length; i++) {
    let propagator = props[i];
    if (!propagator_isSolved(space, propagator)) {
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

  let vardoms = space.vardoms;
  let varsForClone = {};
  let names = space.config.all_var_names;
  for (let i = 0; i < names.length; i++) {
    let name = names[i];
    let domain = vardoms[name];
    varsForClone[name] = domain_clone(domain);
  }

  return config_clone(space.config, varsForClone);
}

/**
 * Note: all vars are "immutable" so should be safe to copy them by reference
 *
 * @param {Space} space
 * @return {Object.<string,$domain>} cloneVars
 */
function space_copyVardoms(space) {
  let vardomsCopy = {};
  let vardoms = space.vardoms;
  let allNames = space.config.all_var_names;
  for (let i = 0; i < allNames.length; i++) {
    let varName = allNames[i];
    vardomsCopy[varName] = vardoms[varName];
  }
  return vardomsCopy;
}

function space_filterUnsolvedVars(space) {
  let unsolvedNames = [];
  let vardoms = space.vardoms;
  for (let i = 0; i < space.unsolvedVarNames.length; ++i) {
    let varName = space.unsolvedVarNames[i];
    // todo: we can tighten this to cycle through only the unsolved names rather than all of them (AND WE SHOULD)
    if (!domain_isSolved(vardoms[varName])) unsolvedNames.push(varName);
  }
  return unsolvedNames;
}

/**
 * Concept of a space that holds config, some named domains (referred to as "vars"), and some propagators
 *
 * @param {$config} config
 * @param {Object[]} unsolvedPropagators
 * @param {Object.<string, $domain>} vardoms Each key represents a variable to work with, the value is a domain
 * @param {string[]} unsolvedVarNames Note: all var names can be found on the config
 * @param {number} _depth
 * @param {number} _child
 * @returns {$space}
 */
function space_createNew(config, unsolvedPropagators, vardoms, unsolvedVarNames, _depth, _child) {
  ASSERT(unsolvedPropagators instanceof Array, 'props should be an array', unsolvedPropagators);
  ASSERT(typeof vardoms === 'object' && vardoms, 'vars should be an object', vardoms);
  ASSERT(unsolvedVarNames instanceof Array, 'unsolvedVarNames should be an array', unsolvedVarNames);

  return ({
    _class: 'space',
    // search graph metrics
    _depth,
    _child,
    _child_count: 0,

    config,

    // TODO: should we track all_vars all_unsolved_vars AND target_vars target_unsolved_vars? because i think so.
    vardoms,
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

  config_generateVars(config, space);

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
      ASSERT(n === REJECTED || space.vardoms[propDetails[1][0]] > 0 || space.vardoms[propDetails[1][0]].length, 'prop var empty but it didnt REJECT');
      ASSERT(n === REJECTED || !propDetails[1][1] || space.vardoms[propDetails[1][1]] > 0 || space.vardoms[propDetails[1][1]].length, 'prop var empty but it didnt REJECT');

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
 * all the vars in the space have a singleton domain.
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
  let targetedVars = space.config.targetedVars;
  let unsolvedNames = space.unsolvedVarNames;

  let j = 0;
  for (let i = 0; i < unsolvedNames.length; i++) {
    let name = unsolvedNames[i];
    if (targetedVars === 'all' || targetedVars.indexOf(name) >= 0) {
      let domain = space.vardoms[name];
      ASSERT_DOMAIN(domain);

      if (!domain_isSolved(domain)) {
        unsolvedNames[j++] = name;
      }
    }
  }
  unsolvedNames.length = j;

  return j === 0;
}

/**
 * Returns an object whose field names are the var names
 * and whose values are the solved values. The space *must*
 * be already in a solved state for this to work.
 *
 * @param {Space} space
 * @returns {Object}
 */
function space_solution(space) {
  ASSERT(space._class === 'space');
  let allVarNames = space.config.all_var_names;
  let result = {};
  for (let i = 0; i < allVarNames.length; i++) {
    let varName = allVarNames[i];
    let value = space_getVarSolveState(space, varName);
    result[varName] = value;
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
  let result = {};
  for (let i = 0; i < varNames.length; i++) {
    let varName = varNames[i];
    let value = false;
    ASSERT(space.vardoms[varName] !== undefined, 'TARGET_VARS_SHOULD_EXIST', varName);
    value = space_getVarSolveState(space, varName);
    result[varName] = value;

    if (complete && value === false) {
      return false;
    }

    result[varName] = value;
  }

  return result;
}

/**
 * @param {Space} space
 * @param {string} varName
 * @returns {number|number[]|boolean} The solve state for given var name, also put into result
 */
function space_getVarSolveState(space, varName) {
  // Don't include the temporary variables in the "solution".
  // Temporary variables take the form of a numeric property
  // of the object, so we test for the varName to be a number and
  // don't include those variables in the result.
  let domain = space.vardoms[varName];

  if (domain_isRejected(domain)) {
    return false;
  }

  let value = domain_getValue(domain);
  if (value !== NO_SUCH_VALUE) return value;

  return domain_fromFlags(domain);
}

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
};
