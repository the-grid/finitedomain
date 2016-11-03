import {
  LOG_FLAG_PROPSTEPS,
  NO_SUCH_VALUE,

  ASSERT,
  ASSERT_LOG,
  ASSERT_NORDOM,
  THROW,
} from './helpers';

import {
  TRIE_EMPTY,
  TRIE_KEY_NOT_FOUND,
  TRIE_NODE_SIZE,

  trie_addNum,
  trie_create,
  trie_get,
  trie_getNum,
} from './trie';

import {
  config_clone,
} from './config';

import {
  domain__debug,
  domain_getValue,
  domain_isEmpty,
  domain_isSolved,
  domain_toArr,
  domain_toSmallest,
  domain_toStr,
} from './domain';

// BODY_START

let space_uid = 0;

/**
 * @returns {$space}
 */
function space_createRoot() {
  // only for debugging
  let _depth = 0;
  let _child = 0;
  let _path = '';

  ASSERT(!(space_uid = 0));

  return space_createNew([], undefined, _depth, _child, _path);
}

/**
 * @param {$config} config
 * @returns {$space}
 */
function space_createFromConfig(config) {
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let space = space_createRoot();
  space_initFromConfig(space, config);
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
  let unsolvedVarIndexes = space._unsolved.slice(0);

  // only for debugging
  let _depth;
  let _child;
  let _path;
  // do it inside ASSERTs so they are eliminated in the dist
  ASSERT(!void (_depth = space._depth + 1));
  ASSERT(!void (_child = space._child_count++));
  ASSERT(!void (_path = space._path));

  return space_createNew(vardomsCopy, unsolvedVarIndexes, _depth, _child, _path);
}

/**
 * Create a new config with the configuration of the given Space
 * Basically clones its config but updates the `initialDomains` with fresh state
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {$space}
 */
function space_toConfig(space, config) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let vardoms = space.vardoms;
  let newDomains = [];
  let names = config.allVarNames;
  for (let i = 0, n = names.length; i < n; i++) {
    let domain = vardoms[i];
    newDomains[i] = domain_toStr(domain);
  }

  return config_clone(config, undefined, newDomains);
}

/**
 * Concept of a space that holds config, some named domains (referred to as "vars"), and some propagators
 *
 * @param {$domain[]} vardoms Maps 1:1 to config.allVarNames
 * @param {number[]|undefined} unsolvedVarIndexes
 * @param {number} _depth (Debugging only) How many parent nodes are there from this node?
 * @param {number} _child (Debugging only) How manieth child is this of the parent?
 * @param {string} _path (Debugging only) String of _child values from root to this node (should be unique per node and len=_depth+1)
 * @returns {$space}
 */
function space_createNew(vardoms, unsolvedVarIndexes, _depth, _child, _path) {
  ASSERT(typeof vardoms === 'object' && vardoms, 'vars should be an object', vardoms);

  let space = {
    _class: '$space',

    vardoms,
    _unsolved: unsolvedVarIndexes,

    next_distribution_choice: 0,
    updatedVarIndex: -1, // the varIndex that was updated when creating this space (-1 for root)
    _lastChosenValue: -1, // cache to prevent duplicate operations
  };

  // search graph metrics
  // debug only. do it inside ASSERT so they are stripped in the dist
  ASSERT(!void (space._depth = _depth));
  ASSERT(!void (space._child = _child));
  ASSERT(!void (space._child_count = 0));
  ASSERT(!void (space._path = _path + _child));
  ASSERT(!void (space._uid = ++space_uid)); // this will not hold in distributed solving...

  return space;
}

/**
 * @param {$space} space
 * @param {$config} config
 */
function space_initFromConfig(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  space_generateVars(space, config); // config must be initialized (generating propas may introduce fresh vars)
  space_initializeUnsolvedVars(space, config);
}

/**
 * Return the current number of unsolved vars for given space.
 * This is only used for testing, prevents leaking internals into tests
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {number}
 */
function space_getUnsolvedVarCount(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  return space._unsolved.length;
}
/**
 * Only use this for testing or debugging as it creates a fresh array
 * for the result. We don't use the names internally, anyways.
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {string[]} var names of all unsolved vars of given space
 */
function _space_getUnsolvedVarNamesFresh(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  return space._unsolved.map(varIndex => config.allVarNames[varIndex]);
}

/**
 * Initialized the list of unsolved variables. These are either the explicitly
 * targeted variables, or any unsolved variables if none were explicitly targeted.
 *
 * @param {$space} space
 * @param {$config} config
 */
function space_initializeUnsolvedVars(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let targetVarNames = config.targetedVars;
  let vardoms = space.vardoms;

  let unsolvedVarIndexes = [];
  space._unsolved = unsolvedVarIndexes;

  if (targetVarNames === 'all') {
    for (let varIndex = 0, n = vardoms.length; varIndex < n; ++varIndex) {
      if (!domain_isSolved(vardoms[varIndex])) {
        if (config._varToPropagators[varIndex] || (config._constrainedAway && config._constrainedAway.indexOf(varIndex) >= 0)) {
          unsolvedVarIndexes.push(varIndex);
        }
      }
    }
  } else {
    let varNamesTrie = config._varNamesTrie;
    for (let i = 0, n = targetVarNames.length; i < n; ++i) {
      let varName = targetVarNames[i];
      let varIndex = trie_get(varNamesTrie, varName);
      if (varIndex === TRIE_KEY_NOT_FOUND) THROW('E_TARGETED_VARS_SHOULD_EXIST_NOW');
      if (!domain_isSolved(vardoms[varIndex])) {
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
 * @param {$config} config
 * @returns {boolean} when true, a propagator rejects and the (current path to a) solution is invalid
 */
function space_propagate(space, config) {
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('space_propagate()'));

  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(!void (config._propagates = (config._propagates | 0) + 1), 'number of calls to space_propagate');

  let propagators = config._propagators;

  // "cycle" is one step, "epoch" all steps until stable (but not solved per se)

  // worst case all unsolved vars change. but in general it's about 30% so run with that
  let cells = Math.ceil(space._unsolved.length * TRIE_NODE_SIZE * 0.3);
  let changedTrie = trie_create(TRIE_EMPTY, cells); // track changed vars per cycle in this epoch
  let cycles = 0;

  ASSERT(typeof cycles === 'number', 'cycles is a number?');
  ASSERT(changedTrie._class === '$trie', 'trie is a trie?');

  let changedVars = []; // in one cycle

  let minimal = 1;
  if (space.updatedVarIndex >= 0) {
    changedVars.push(space.updatedVarIndex);
  } else {
    // very first cycle of first epoch of the search. all propagators must be visited at least once now.
    let rejected = space_propagateAll(space, config, propagators, changedVars, changedTrie, ++cycles);
    if (rejected) {
      return true;
    }
  }

  if (space_abortSearch(space, config)) {
    return true;
  }

  let returnValue = false;
  while (changedVars.length) {
    let newChangedVars = [];
    let rejected = space_propagateChanges(space, config, propagators, minimal, changedVars, newChangedVars, changedTrie, ++cycles);
    if (rejected) {
      returnValue = true;
      break;
    }

    if (space_abortSearch(space, config)) {
      returnValue = true;
      break;
    }

    changedVars = newChangedVars;
    minimal = 2; // see space_propagateChanges
  }

  return returnValue;
}

function space_propagateAll(space, config, propagators, changedVars, changedTrie, cycleIndex) {
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('space_propagateAll(' + propagators.length + 'x)'));
  for (let i = 0, n = propagators.length; i < n; i++) {
    let propagator = propagators[i];
    let rejected = space_propagateStep(space, config, propagator, changedVars, changedTrie, cycleIndex);
    if (rejected) return true;
  }
  return false;
}
function space_propagateByIndexes(space, config, propagators, propagatorIndexes, changedVars, changedTrie, cycleIndex) {
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('space_propagateByIndexes(' + propagators.length + 'x)'));
  for (let i = 0, n = propagatorIndexes.length; i < n; i++) {
    let propagatorIndex = propagatorIndexes[i];
    let propagator = propagators[propagatorIndex];
    let rejected = space_propagateStep(space, config, propagator, changedVars, changedTrie, cycleIndex);
    if (rejected) return true;
  }
  return false;
}
function space_propagateStep(space, config, propagator, changedVars, changedTrie, cycleIndex) {
  ASSERT(propagator._class === '$propagator', 'EXPECTING_PROPAGATOR');

  let vardoms = space.vardoms;

  let index1 = propagator.index1;
  let index2 = propagator.index2;
  let index3 = propagator.index3;
  ASSERT(index1 !== 'undefined', 'all props at least use the first var...');
  let domain1 = vardoms[index1];
  let domain2 = index2 !== undefined && vardoms[index2];
  let domain3 = index3 !== undefined && vardoms[index3];

  ASSERT_NORDOM(domain1, true, domain__debug);
  ASSERT(domain2 === undefined || ASSERT_NORDOM(domain2, true, domain__debug));
  ASSERT(domain3 === undefined || ASSERT_NORDOM(domain3, true, domain__debug));

  let stepper = propagator.stepper;
  ASSERT(typeof stepper === 'function', 'stepper should be a func');
  // TODO: if we can get a "solved" state here we can prevent an isSolved check later...
  stepper(space, config, index1, index2, index3, propagator.arg1, propagator.arg2, propagator.arg3, propagator.arg4, propagator.arg5, propagator.arg6);

  if (domain1 !== vardoms[index1]) {
    if (domain_isEmpty(vardoms[index1])) {
      return true; // fail
    }
    space_recordChange(index1, changedTrie, changedVars, cycleIndex);
  }
  if (index2 !== undefined && domain2 !== vardoms[index2]) {
    if (domain_isEmpty(vardoms[index2])) {
      return true; // fail
    }
    space_recordChange(index2, changedTrie, changedVars, cycleIndex);
  }
  if (index3 !== undefined && domain3 !== vardoms[index3]) {
    if (domain_isEmpty(vardoms[index3])) {
      return true; // fail
    }
    space_recordChange(index3, changedTrie, changedVars, cycleIndex);
  }

  return false;
}
function space_recordChange(varIndex, changedTrie, changedVars, cycleIndex) {
  if (typeof varIndex === 'number') {
    let status = trie_getNum(changedTrie, varIndex);
    if (status !== cycleIndex) {
      changedVars.push(varIndex);
      trie_addNum(changedTrie, varIndex, cycleIndex);
    }
  } else {
    ASSERT(varIndex instanceof Array, 'index1 is always used');
    for (let i = 0, len = varIndex.length; i < len; ++i) {
      space_recordChange(varIndex[i], changedTrie, changedVars, cycleIndex);
    }
  }
}
function space_propagateChanges(space, config, allPropagators, minimal, targetVars, changedVars, changedTrie, cycleIndex) {
  ASSERT_LOG(LOG_FLAG_PROPSTEPS, log => log('space_propagateChanges(' + changedVars.length + 'x)'));
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let varToPropagators = config._varToPropagators;
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
      let result = space_propagateByIndexes(space, config, allPropagators, propagatorIndexes, changedVars, changedTrie, cycleIndex);
      if (result) return true; // rejected
    }
  }
  return false;
}

/**
 * @param {$space} space
 * @param {$config} config
 * @returns {boolean}
 */
function space_abortSearch(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let callback = config.timeoutCallback;
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
 * @param {$space} space
 * @param {$config} config
 * @returns {boolean}
 */
function space_updateUnsolvedVarList(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let vardoms = space.vardoms;
  let unsolvedVarIndexes = space._unsolved;

  let m = 0;
  for (let i = 0, len = unsolvedVarIndexes.length; i < len; ++i) {
    let varIndex = unsolvedVarIndexes[i];
    let domain = vardoms[varIndex];
    if (!domain_isSolved(domain)) {
      unsolvedVarIndexes[m++] = varIndex;
    }
  }
  unsolvedVarIndexes.length = m;

  return m === 0; // 0 unsolved means we've solved it :)
}

/**
 * Returns an object whose field names are the var names
 * and whose values are the solved values. The space *must*
 * be already in a solved state for this to work.
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {Object}
 */
function space_solution(space, config) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let allVarNames = config.allVarNames;
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

  if (domain_isEmpty(domain)) {
    return false;
  }

  let value = domain_getValue(domain);
  if (value !== NO_SUCH_VALUE) return value;

  return domain_toArr(domain);
}

function space_getDomainArr(space, varIndex) {
  return domain_toArr(space.vardoms[varIndex]);
}

/**
 * Initialize the vardoms array on the first space node.
 *
 * @param {$space} space
 * @param {$config} config
 */
function space_generateVars(space, config) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  let vardoms = space.vardoms;
  ASSERT(vardoms, 'expecting var domains');
  let initialDomains = config.initialDomains;
  ASSERT(initialDomains, 'config should have initial vars');
  let allVarNames = config.allVarNames;
  ASSERT(allVarNames, 'config should have a list of vars');

  for (let varIndex = 0, len = allVarNames.length; varIndex < len; varIndex++) {
    let domain = initialDomains[varIndex];
    ASSERT_NORDOM(domain, true, domain__debug);
    vardoms[varIndex] = domain_toSmallest(domain);
  }
}

/**
 * @param {$space} space
 * @param {$config} [config]
 * @param {boolean} [printPath]
 */
function _space_debug(space, config, printPath) {
  console.log('\n## Space:');
  //__REMOVE_BELOW_FOR_ASSERTS__
  console.log('# Meta:');
  console.log('uid:', space._uid);
  console.log('depth:', space._depth);
  console.log('child:', space._child);
  console.log('children:', space._child_count);
  if (printPath) console.log('path:', space._path);
  //__REMOVE_ABOVE_FOR_ASSERTS__
  console.log('# Domains:');
  console.log(space.vardoms.map(domain_toArr).map((d, i) => (d + '').padEnd(15, ' ') + ((!config || config.allVarNames[i] === String(i)) ? '' : ' (' + config.allVarNames[i] + ')')).join('\n'));
  console.log('##\n');
}


// BODY_STOP

export {
  space_createClone,
  space_createFromConfig,
  space_createRoot,
  space_generateVars,
  space_getDomainArr,
  space_getUnsolvedVarCount,
  _space_getUnsolvedVarNamesFresh,
  space_getVarSolveState,
  space_initFromConfig,
  space_updateUnsolvedVarList,
  space_propagate,
  space_solution,
  space_toConfig,
  _space_debug,
};
