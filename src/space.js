import {
  EMPTY,
  NO_SUCH_VALUE,

  ASSERT,
  THROW,
} from './helpers';

import {
  TRIE_KEY_NOT_FOUND,

  trie_addNum,
  trie_get,
  trie_getNum,
} from './trie';

import {
  config_clone,
  config_create,
  config_initForSpace,
} from './config';

import {
  FORCE_STRING,

  domain_any_clone,
  domain_any_getValue,
  domain_any_isSolved,
  domain_toArr,
} from './domain';

// BODY_START

let space_uid = 0;

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

  ASSERT(!(space_uid = 0));

  return space_createNew(config, [], [], _depth, _child, _path);
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

  let vardomsCopy = space.vardoms.slice(0);
  let unsolvedVarIndexes = space.unsolvedVarIndexes.slice(0); // note: the list should have been updated before cloning

  // only for debugging
  let _depth;
  let _child;
  let _path;
  // do it inside ASSERTs so they are eliminated in the dist
  ASSERT(!void (_depth = space._depth + 1));
  ASSERT(!void (_child = space._child_count++));
  ASSERT(!void (_path = space._path));

  return space_createNew(space.config, vardomsCopy, unsolvedVarIndexes, _depth, _child, _path);
}

/**
 * Create a new config with the configuration of the given Space
 * Basically clones its config but updates the `initial_domains` with fresh state
 *
 * @param {$space} space
 * @returns {$space}
 */
function space_toConfig(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');

  let vardoms = space.vardoms;
  let newDomains = [];
  let names = space.config.all_var_names;
  for (let i = 0, n = names.length; i < n; i++) {
    let domain = vardoms[i];
    newDomains[i] = domain_any_clone(domain, FORCE_STRING);
  }

  return config_clone(space.config, newDomains);
}

/**
 * Concept of a space that holds config, some named domains (referred to as "vars"), and some propagators
 *
 * @param {$config} config
 * @param {$domain[]} vardoms Maps 1:1 to config.all_var_names
 * @param {number[]} unsolvedVarIndexes Note: Indexes to the config.all_var_names array
 * @param {number} _depth
 * @param {number} _child
 * @param {string} _path
 * @returns {$space}
 */
function space_createNew(config, vardoms, unsolvedVarIndexes, _depth, _child, _path) {
  ASSERT(typeof vardoms === 'object' && vardoms, 'vars should be an object', vardoms);
  ASSERT(unsolvedVarIndexes instanceof Array, 'unsolvedVarIndexes should be an array', unsolvedVarIndexes);

  let space = {
    _class: '$space',

    config,

    vardoms,
    unsolvedVarIndexes,

    next_distribution_choice: 0,
    updatedVarIndex: -1, // the varIndex that was updated when creating this space (-1 for root)
  };

  // search graph metrics
  // debug only. do it inside ASSERT so they are stripped in the dist
  ASSERT(!void (space._depth = _depth));
  ASSERT(!void (space._child = _child));
  ASSERT(!void (space._child_count = 0));
  ASSERT(!void (space._path = _path + _child));
  ASSERT(!void (space._uid = ++space_uid));

  return space;
}

/**
 * @param {$space} space
 */
function space_initFromConfig(space) {
  let config = space.config;
  ASSERT(config, 'should have a config');
  ASSERT(config._class === '$config', 'should be a config');

  config_initForSpace(config, space);
  initializeUnsolvedVars(space, config);
}
/**
 * Initialized space.unsolvedVarIndexes with either the explicitly targeted var indexes
 * or any index that is currently unsolved and either constrained or marked as such
 *
 * @param {$space} space
 * @param {$config} config
 */
function initializeUnsolvedVars(space, config) {
  let unsolvedVarIndexes = space.unsolvedVarIndexes;
  let targetVarNames = config.targetedVars;
  let vardoms = space.vardoms;

  ASSERT(unsolvedVarIndexes.length === 0, 'should be initialized with empty list');

  if (targetVarNames === 'all') {
    for (let varIndex = 0, n = vardoms.length; varIndex < n; ++varIndex) {
      if (!domain_any_isSolved(vardoms[varIndex])) {
        if (config._varToPropagators[varIndex] || (config._constrainedAway && config._constrainedAway.indexOf(varIndex) >= 0)) {
          unsolvedVarIndexes.push(varIndex);
        }
      }
    }
  } else {
    let varNamesTrie = space.config._var_names_trie;
    for (let i = 0, n = targetVarNames.length; i < n; ++i) {
      let varName = targetVarNames[i];
      let varIndex = trie_get(varNamesTrie, varName);
      if (varIndex === TRIE_KEY_NOT_FOUND) THROW('E_TARGETED_VARS_SHOULD_EXIST_NOW');
      if (!domain_any_isSolved(vardoms[varIndex])) {
        unsolvedVarIndexes.push(varIndex);
      }
    }
  }
}

/**
 * Run all the propagators until stability point.
 * Returns true if any propagator rejects.
 *
 * @param {$space} space
 * @returns {boolean} when true, a propagator rejects and the (current path to a) solution is invalid
 */
function space_propagate(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  let config = space.config;
  let propagators = config._propagators;

  // "cycle" is one step, "epoch" all steps until stable (but not solved per se)
  let cycles = config._propagationCycles;
  let epochFence = ++cycles; // any key in the trie below this value is considered "new"
  let changedTrie = config._changedVarsTrie; // track changed vars per cycle, epoch. persists across propagate calls for efficiency reasons.

  ASSERT(typeof cycles === 'number', 'cycles is a number?');
  ASSERT(changedTrie._class === '$trie', 'trie is a trie?');

  let changedVars = []; // in one cycle
  let allChangedVars = []; // all cycles in this epoch

  let minimal = 1;
  if (space.updatedVarIndex >= 0) {
    changedVars.push(space.updatedVarIndex);
  } else {
    // very first cycle of first epoch of the search. all propagators must be visited at least once now.
    let rejected = space_propagateAll(space, propagators, changedVars, changedTrie, epochFence, ++cycles, allChangedVars);
    if (rejected) {
      config._propagationCycles = cycles;
      return true;
    }
  }

  if (space_abortSearch(space)) {
    config._propagationCycles = cycles;
    return true;
  }

  let returnValue = false;
  while (changedVars.length) {
    let newChangedVars = [];
    let rejected = space_propagateChanges(space, propagators, minimal, changedVars, newChangedVars, changedTrie, epochFence, ++cycles, allChangedVars);
    if (rejected) {
      returnValue = true;
      break;
    }

    if (space_abortSearch(space)) {
      returnValue = true;
      break;
    }

    changedVars = newChangedVars;
    minimal = 2; // see space_propagateChanges
  }

  config._propagationCycles = cycles;
  return returnValue;
}

function space_propagateAll(space, propagators, changedVars, changedTrie, epochFence, cycleIndex, allChangedVars) {
  for (let i = 0, n = propagators.length; i < n; i++) {
    let propagator = propagators[i];
    let rejected = space_propagateStep(space, propagator, changedVars, changedTrie, epochFence, cycleIndex, allChangedVars);
    if (rejected) return true;
  }
  return false;
}
function space_propagateByIndexes(space, propagators, propagatorIndexes, changedVars, changedTrie, epochFence, cycleIndex, allChangedVars) {
  for (let i = 0, n = propagatorIndexes.length; i < n; i++) {
    let propagatorIndex = propagatorIndexes[i];
    let propagator = propagators[propagatorIndex];
    let rejected = space_propagateStep(space, propagator, changedVars, changedTrie, epochFence, cycleIndex, allChangedVars);
    if (rejected) return true;
  }
  return false;
}
function space_propagateStep(space, propagator, changedVars, changedTrie, epochFence, cycleIndex, allChangedVars) {
  ASSERT(propagator._class === '$propagator', 'EXPECTING_PROPAGATOR');

  let vardoms = space.vardoms;

  let index1 = propagator.index1;
  let index2 = propagator.index2;
  let index3 = propagator.index3;
  ASSERT(index1 !== 'undefined', 'all props at least use the first var...');
  let domain1 = vardoms[index1];
  let domain2 = index2 !== undefined && vardoms[index2];
  let domain3 = index3 !== undefined && vardoms[index3];

  let stepper = propagator.stepper;
  ASSERT(typeof stepper === 'function', 'stepper should be a func');
  // TODO: if we can get a "solved" state here we can prevent an "is_solved" check later...
  stepper(space, index1, index2, index3, propagator.arg1, propagator.arg2, propagator.arg3, propagator.arg4, propagator.arg5, propagator.arg6);

  if (domain1 !== vardoms[index1]) {
    if (vardoms[index1] === EMPTY) return true; // fail
    space_recordChange(index1, changedTrie, changedVars, epochFence, cycleIndex, allChangedVars);
  }
  if (index2 !== undefined && domain2 !== vardoms[index2]) {
    if (vardoms[index2] === EMPTY) return true; // fail
    space_recordChange(index2, changedTrie, changedVars, epochFence, cycleIndex, allChangedVars);
  }
  if (index3 !== undefined && domain3 !== vardoms[index3]) {
    if (vardoms[index3] === EMPTY) return true; // fail
    space_recordChange(index3, changedTrie, changedVars, epochFence, cycleIndex, allChangedVars);
  }

  return false;
}
function space_recordChange(varIndex, changedTrie, changedVars, epochFence, cycleIndex, allChangedVars) {
  if (typeof varIndex === 'number') {
    let status = trie_getNum(changedTrie, varIndex);
    if (status !== cycleIndex) {
      if (status < epochFence) {
        allChangedVars.push(varIndex);
      }
      changedVars.push(varIndex);
      trie_addNum(changedTrie, varIndex, cycleIndex);
    }
  } else {
    ASSERT(varIndex instanceof Array, 'index1 is always used');
    for (let i = 0, len = varIndex.length; i < len; ++i) {
      space_recordChange(varIndex[i], changedTrie, changedVars, cycleIndex, allChangedVars);
    }
  }
}
function space_propagateChanges(space, allPropagators, minimal, targetVars, changedVars, changedTrie, epochFence, cycleIndex, allChangedVars) {
  let varToPropagators = space.config._varToPropagators;
  for (let i = 0, vlen = targetVars.length; i < vlen; i++) {
    let propagatorIndexes = varToPropagators[targetVars[i]];
    // note: the first loop of propagate() should require all propagators affected, even if
    // it is just one. after that, if a var was updated that only has one propagator it can
    // only have been updated by that one propagator. however, this step is queueing up
    // propagators to check, again, since one of its vars changed. a propagator that runs
    // twice without other changes will change nothing. so we do it for the initial loop,
    // where the var is updated externally, after that the change can only occur from within
    // a propagator so we skip it.
    // ultimately a list of propagators should perform better but the indexOf negates that perf
    // (this doesn't affect a whole lot of vars... most of them touch multiple propas)
    if (propagatorIndexes && propagatorIndexes.length >= minimal) {
      let result = space_propagateByIndexes(space, allPropagators, propagatorIndexes, changedVars, changedTrie, epochFence, cycleIndex, allChangedVars);
      if (result) return true; // rejected
    }
  }
  return false;
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
function space_updateUnsolvedVarList(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  let unsolvedVarIndexes = space.unsolvedVarIndexes;
  let vardoms = space.vardoms;

  let j = 0;
  for (let i = 0, n = unsolvedVarIndexes.length; i < n; i++) {
    let varIndex = unsolvedVarIndexes[i];
    let domain = vardoms[varIndex];

    if (!domain_any_isSolved(domain)) {
      unsolvedVarIndexes[j++] = varIndex;
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
  for (let varIndex = 0, n = allVarNames.length; varIndex < n; varIndex++) {
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
 * @param {number} varIndex
 * @returns {number|number[]|boolean} The solve state for given var index, also put into result
 */
function space_getVarSolveState(space, varIndex) {
  ASSERT(typeof varIndex === 'number', 'VAR_SHOULD_BE_INDEX');
  let domain = space.vardoms[varIndex];

  if (domain === EMPTY) {
    return false;
  }

  let value = domain_any_getValue(domain);
  if (value !== NO_SUCH_VALUE) return value;

  return domain_toArr(domain);
}

function space_getDomainArr(space, varIndex) {
  return domain_toArr(space.vardoms[varIndex]);
}

// BODY_STOP

export {
  space_createClone,
  space_createFromConfig,
  space_createRoot,
  space_getDomainArr,
  space_getVarSolveState,
  space_initFromConfig,
  space_updateUnsolvedVarList,
  space_propagate,
  space_solution,
  space_toConfig,
};
