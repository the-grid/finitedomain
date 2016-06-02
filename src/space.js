import {
  EMPTY,
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
  domain_getValue,
  domain_isSolved,
  domain_toArr,
} from './domain';

import {
  PROP_VAR_INDEXES,
} from './propagator';

import propagator_stepAny from './propagators/step_any';
import propagator_isSolved from './propagators/is_solved';

// BODY_START

/**
 * @param {$config} config
 * @returns {$space}
 */
function space_createRoot(config) {
  if (!config) config = config_create();

  // only for debugging
  let _depth = 0;
  let _child = 0;
  let _path = '';

  return space_createNew(config, [], [], [], _depth, _child, _path);
}

/**
 * @param {$config} config
 * @returns {$space}
 */
function space_createFromConfig(config) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

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
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');

  let unsolvedPropagators = space_collectCurrentUnsolvedPropagators(space);

  let unsolvedVarIndexes = space_filterUnsolvedVarIndexes(space);
  let vardomsCopy = space.vardoms.slice(0);

  // only for debugging
  let _depth;
  let _child;
  let _path;
  // do it inside ASSERTs so they are eliminated in the dist
  ASSERT(!void (_depth = space.depth + 1));
  ASSERT(!void (_child = space._child_count++));
  ASSERT(!void (_path = space._path));

  return space_createNew(space.config, unsolvedPropagators, vardomsCopy, unsolvedVarIndexes, _depth, _child, _path);
}

/**
 * Find and return all propagators whose args have not been resolved
 *
 * @param {$space} space
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
 * @param {$space} space
 * @returns {$space}
 */
function space_toConfig(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');

  let vardoms = space.vardoms;
  let varsForClone = {};
  let names = space.config.all_var_names;
  for (let i = 0; i < names.length; i++) {
    let domain = vardoms[i];
    // note: this object is used as `config.initial_vars` so dont use index here
    varsForClone[names[i]] = domain_clone(domain);
  }

  return config_clone(space.config, varsForClone);
}

function space_filterUnsolvedVarIndexes(space) {
  let unsolvedVarIndexes = [];
  let vardoms = space.vardoms;
  for (let i = 0; i < space.unsolvedVarIndexes.length; ++i) {
    let varIndex = space.unsolvedVarIndexes[i];
    if (!domain_isSolved(vardoms[varIndex])) unsolvedVarIndexes.push(varIndex);
  }
  return unsolvedVarIndexes;
}

/**
 * Concept of a space that holds config, some named domains (referred to as "vars"), and some propagators
 *
 * @param {$config} config
 * @param {Object[]} unsolvedPropagators
 * @param {$domain[]} vardoms Maps 1:1 to config.all_var_names
 * @param {string[]} unsolvedVarIndexes Note: Indexes to the config.all_var_names array
 * @param {number} _depth
 * @param {number} _child
 * @param {string} _path
 * @returns {$space}
 */
function space_createNew(config, unsolvedPropagators, vardoms, unsolvedVarIndexes, _depth, _child, _path) {
  ASSERT(unsolvedPropagators instanceof Array, 'props should be an array', unsolvedPropagators);
  ASSERT(typeof vardoms === 'object' && vardoms, 'vars should be an object', vardoms);
  ASSERT(unsolvedVarIndexes instanceof Array, 'unsolvedVarIndexes should be an array', unsolvedVarIndexes);

  let space = {
    _class: '$space',

    config,

    // TODO: should we track all_vars all_unsolved_vars AND target_vars target_unsolved_vars? because i think so.
    vardoms,
    unsolvedVarIndexes,
    unsolvedPropagators, // by references from space.config.propagators

    next_distribution_choice: 0,
  };

  // search graph metrics
  // debug only. do it inside ASSERT so they are stripped in the dist
  ASSERT(!void (space._depth = _depth));
  ASSERT(!void (space._child = _child));
  ASSERT(!void (space._child_count = 0));
  ASSERT(!void (space._path = _path + _child));

  return space;
}

/**
 * @param {$space} space
 */
function space_initFromConfig(space) {
  let config = space.config;
  ASSERT(config, 'should have a config');

  config_generateVars(config, space);

  // propagators are immutable so share by reference
  for (let i = 0; i < config.propagators.length; i++) {
    let propagator = config.propagators[i];
    let copy = propagator.slice(0);

    // update the propagator with indexes of the vars.
    // we did not know all the indexes before this time.
    let indexes = [];
    let propVarNames = copy[PROP_VAR_INDEXES];
    for (let j = 0; j < propVarNames.length; ++j) {
      indexes[j] = config.all_var_names.indexOf(propVarNames[j]);
    }
    copy[PROP_VAR_INDEXES] = indexes; // dont affect the original! only the (deep) clone

    space.unsolvedPropagators.push(copy);
  }
}

/**
 * Run all the propagators until stability point. Returns the number
 * of changes made or throws a 'fail' if any propagator failed.
 *
 * @param {$space} space
 * @returns {boolean}
 */
function space_propagate(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
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
 * @param {$space} space
 * @returns {boolean}
 */
function space_abortSearch(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
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
 * @param {$space} space
 * @returns {boolean}
 */
function space_isSolved(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  let targetedIndexes = space.config.targetedIndexes;
  let unsolvedVarIndexes = space.unsolvedVarIndexes;

  let j = 0;
  for (let i = 0; i < unsolvedVarIndexes.length; i++) {
    let varIndex = unsolvedVarIndexes[i];
    if (targetedIndexes === 'all' || targetedIndexes.indexOf(varIndex) >= 0) {
      let domain = space.vardoms[varIndex];
      ASSERT_DOMAIN(domain);

      if (!domain_isSolved(domain)) {
        unsolvedVarIndexes[j++] = varIndex;
      }
    }
  }
  unsolvedVarIndexes.length = j;
  return j === 0;
}

/**
 * Returns an object whose field names are the var names
 * and whose values are the solved values. The space *must*
 * be already in a solved state for this to work.
 *
 * @param {$space} space
 * @returns {Object}
 */
function space_solution(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  let allVarNames = space.config.all_var_names;
  let result = {};
  for (let varIndex = 0; varIndex < allVarNames.length; varIndex++) {
    let varName = allVarNames[varIndex];
    result[varName] = space_getVarSolveState(space, varIndex);
  }
  return result;
}

/**
 * Note: this is the (shared) second most called function of the library
 * (by a third of most, but still significantly more than the rest)
 *
 * @param {$space} space
 * @param {string} varIndex
 * @returns {number|number[]|boolean} The solve state for given var index, also put into result
 */
function space_getVarSolveState(space, varIndex) {
  ASSERT(typeof varIndex === 'number', 'VAR_SHOULD_BE_INDEX');
  let domain = space.vardoms[varIndex];

  if (domain === EMPTY) {
    return false;
  }

  let value = domain_getValue(domain);
  if (value !== NO_SUCH_VALUE) return value;

  return domain_toArr(domain);
}

// BODY_STOP

export {
  space_createClone,
  space_createFromConfig,
  space_createRoot,
  space_getVarSolveState,
  space_initFromConfig,
  space_isSolved,
  space_propagate,
  space_solution,
  space_toConfig,
};
