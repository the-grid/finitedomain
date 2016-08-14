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
  front_addNode,
  front_addCell,
  front_getCell,
  _front_getCell,
  front_getSizeOf,
  _front_getSizeOf,
  front_setSizeOf,
} from './front';

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

  return space_createNew(config, [], 0, _depth, _child, _path);
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
 * @param {$config} config
 * @returns {$space}
 */
function space_createClone(space, config) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(space.config === config);

  let vardomsCopy = space.vardoms.slice(0);
  let frontNodeIndex = space.frontNodeIndex;

  // only for debugging
  let _depth;
  let _child;
  let _path;
  // do it inside ASSERTs so they are eliminated in the dist
  ASSERT(!void (_depth = space._depth + 1));
  ASSERT(!void (_child = space._child_count++));
  ASSERT(!void (_path = space._path));

  return space_createNew(config, vardomsCopy, frontNodeIndex, _depth, _child, _path);
}

/**
 * Create a new config with the configuration of the given Space
 * Basically clones its config but updates the `initial_domains` with fresh state
 *
 * @param {$space} space
 * @param {$config} config
 * @returns {$space}
 */
function space_toConfig(space, config) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(space.config === config);

  let vardoms = space.vardoms;
  let newDomains = [];
  let names = config.all_var_names;
  for (let i = 0, n = names.length; i < n; i++) {
    let domain = vardoms[i];
    newDomains[i] = domain_any_clone(domain, FORCE_STRING);
  }

  return config_clone(config, newDomains);
}

/**
 * Concept of a space that holds config, some named domains (referred to as "vars"), and some propagators
 *
 * @param {$config} config
 * @param {$domain[]} vardoms Maps 1:1 to config.all_var_names
 * @param {number} frontNodeIndex
 * @param {number} _depth
 * @param {number} _child
 * @param {string} _path
 * @returns {$space}
 */
function space_createNew(config, vardoms, frontNodeIndex, _depth, _child, _path) {
  ASSERT(typeof vardoms === 'object' && vardoms, 'vars should be an object', vardoms);

  let space = {
    _class: '$space',

    config,

    vardoms,

    frontNodeIndex,

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
 * Return the current number of unsolved vars for given space.
 * Due to the nature of how we use a $front this is not reliable
 * retroactively.
 * This is only used for testing, prevents leaking internals into tests
 *
 * @param {$space} space
 * @returns {number}
 */
function space_getUnsolvedVarCount(space) {
  return front_getSizeOf(space.config._front, space.frontNodeIndex);
}
/**
 * Return the index of the nth unsolved var in given node
 * You are responsible for making sure that node is still relevant
 * This is only used for testing, prevents leaking internals into tests
 *
 * @param {$space} space
 * @param {number} nodeIndex The node (offset of the list) to access
 * @param {number} cellIndex The cell offset relative to the node to return
 * @returns {number}
 */
function space_getUnsolvedVarAt(space, nodeIndex, cellIndex) {
  return front_getCell(space.config._front, nodeIndex, cellIndex);
}
/**
 * Return the index of the nth unsolved var in the node of this space
 * Only reliable if this space is the current active one
 * This is only used for testing, prevents leaking internals into tests
 *
 * @param {$space} space
 * @param {number} cellIndex The cell offset relative to the space's node to return
 * @returns {number}
 */
function space_getUnsolvedIndex(space, cellIndex) {
  return front_getCell(space.config._front, space.frontNodeIndex, cellIndex);
}
/**
 * Only use this for testing or debugging as it creates a fresh array
 * for the result. We don't use the names internally, anyways.
 *
 * @param {$space} space
 * @returns {string[]} var names of all unsolved vars of given space
 */
function _space_getUnsolvedVarNamesFresh(space) {
  let nodeIndex = space.frontNodeIndex;
  // fugly! :)
  let buf = space.config._front.buffer;
  let sub = [].slice.call(buf, nodeIndex + 1, nodeIndex + 1 + buf[nodeIndex]); // or .subArray() or something like that... or even toArray?
  return sub.map(index => space.config.all_var_names[index]);
}

/**
 * Initialized the front with unsolved variables. These are either the explicitly
 * targeted variables, or any unsolved variables if none were explicitly targeted.
 *
 * @param {$space} space
 * @param {$config} config (=space.config)
 */
function initializeUnsolvedVars(space, config) {
  ASSERT(space.config === config);

  let targetVarNames = config.targetedVars;
  let vardoms = space.vardoms;

  let unsolvedFront = config._front;
  let nodeIndexStart = space.frontNodeIndex;
  let cellIndex = 0;

  if (targetVarNames === 'all') {
    for (let varIndex = 0, n = vardoms.length; varIndex < n; ++varIndex) {
      if (!domain_any_isSolved(vardoms[varIndex])) {
        if (config._varToPropagators[varIndex] || (config._constrainedAway && config._constrainedAway.indexOf(varIndex) >= 0)) {
          front_addCell(unsolvedFront, nodeIndexStart, cellIndex++, varIndex);
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
        front_addCell(unsolvedFront, nodeIndexStart, cellIndex++, varIndex);
      }
    }
  }

  front_setSizeOf(unsolvedFront, nodeIndexStart, cellIndex);
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
  let changedTrie = config._changedVarsTrie; // track changed vars per cycle, epoch. persists across propagate calls for efficiency reasons.

  ASSERT(typeof cycles === 'number', 'cycles is a number?');
  ASSERT(changedTrie._class === '$trie', 'trie is a trie?');

  let changedVars = []; // in one cycle

  let minimal = 1;
  if (space.updatedVarIndex >= 0) {
    changedVars.push(space.updatedVarIndex);
  } else {
    // very first cycle of first epoch of the search. all propagators must be visited at least once now.
    let rejected = space_propagateAll(space, propagators, changedVars, changedTrie, ++cycles);
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
    let rejected = space_propagateChanges(space, propagators, minimal, changedVars, newChangedVars, changedTrie, ++cycles);
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

function space_propagateAll(space, propagators, changedVars, changedTrie, cycleIndex) {
  for (let i = 0, n = propagators.length; i < n; i++) {
    let propagator = propagators[i];
    let rejected = space_propagateStep(space, propagator, changedVars, changedTrie, cycleIndex);
    if (rejected) return true;
  }
  return false;
}
function space_propagateByIndexes(space, propagators, propagatorIndexes, changedVars, changedTrie, cycleIndex) {
  for (let i = 0, n = propagatorIndexes.length; i < n; i++) {
    let propagatorIndex = propagatorIndexes[i];
    let propagator = propagators[propagatorIndex];
    let rejected = space_propagateStep(space, propagator, changedVars, changedTrie, cycleIndex);
    if (rejected) return true;
  }
  return false;
}
function space_propagateStep(space, propagator, changedVars, changedTrie, cycleIndex) {
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
  // TODO: if we can get a "solved" state here we can prevent an isSolved check later...
  stepper(space, index1, index2, index3, propagator.arg1, propagator.arg2, propagator.arg3, propagator.arg4, propagator.arg5, propagator.arg6);

  if (domain1 !== vardoms[index1]) {
    if (vardoms[index1] === EMPTY) return true; // fail
    space_recordChange(index1, changedTrie, changedVars, cycleIndex);
  }
  if (index2 !== undefined && domain2 !== vardoms[index2]) {
    if (vardoms[index2] === EMPTY) return true; // fail
    space_recordChange(index2, changedTrie, changedVars, cycleIndex);
  }
  if (index3 !== undefined && domain3 !== vardoms[index3]) {
    if (vardoms[index3] === EMPTY) return true; // fail
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
function space_propagateChanges(space, allPropagators, minimal, targetVars, changedVars, changedTrie, cycleIndex) {
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
      let result = space_propagateByIndexes(space, allPropagators, propagatorIndexes, changedVars, changedTrie, cycleIndex);
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
 * @param {$space} space
 * @returns {boolean}
 */
function space_updateUnsolvedVarList(space) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  let vardoms = space.vardoms;

  let unsolvedFront = space.config._front;
  let lastNodeIndex = unsolvedFront.lastNodeIndex;
  let nodeIndex = front_addNode(unsolvedFront);
  space.frontNodeIndex = nodeIndex;

  let cellIndex = 0;

  for (let i = 0, n = _front_getSizeOf(unsolvedFront.buffer, lastNodeIndex); i < n; i++) {
    let varIndex = _front_getCell(unsolvedFront.buffer, lastNodeIndex, i);
    let domain = vardoms[varIndex];

    if (!domain_any_isSolved(domain)) {
      front_addCell(unsolvedFront, nodeIndex, cellIndex++, varIndex);
    }
  }

  front_setSizeOf(unsolvedFront, nodeIndex, cellIndex);
  return cellIndex === 0; // 0 unsolved means we've solved it :)
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


function _space_debug(space, printPath) {
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
  console.log(space.vardoms.map(domain_toArr).map((d, i) => (d + '').padEnd(15, ' ') + (space.config.all_var_names[i] === String(i) ? '' : ' (' + space.config.all_var_names[i] + ')')).join('\n'));
  console.log('##\n');
}


// BODY_STOP

export {
  space_createClone,
  space_createFromConfig,
  space_createRoot,
  space_getDomainArr,
  space_getUnsolvedVarCount,
  space_getUnsolvedVarAt,
  space_getUnsolvedIndex,
  _space_getUnsolvedVarNamesFresh,
  space_getVarSolveState,
  space_initFromConfig,
  space_updateUnsolvedVarList,
  space_propagate,
  space_solution,
  space_toConfig,
  _space_debug,
};
