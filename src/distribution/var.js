import {
  NO_SUCH_VALUE,
  ASSERT,
  THROW,
} from '../helpers';

import {
  domain_isUndetermined,
  domain_max,
  domain_min,
  domain_size,
} from '../domain';

// BODY_START

const BETTER = 1;
const SAME = 2;
const WORSE = 3;

/**
 * Given a list of variables return the next var to consider based on the
 * current var distribution configuration and an optional filter condition.
 *
 * @param {$space} space
 * @returns {number}
 */
function distribution_getNextVar(space) {
  let unsolvedVarIndexes = space.unsolvedVarIndexes;
  let configNextVarFunc = space.config.next_var_func;
  // if it's a function it should return the name of the next var to process
  if (typeof configNextVarFunc === 'function') {
    return configNextVarFunc(space, unsolvedVarIndexes);
  }

  let distName = configNextVarFunc;
  // if it's an object it's a more complex config
  if (typeof configNextVarFunc === 'object') {
    distName = configNextVarFunc.dist_name;
  }

  let isBetterVar = distribution_getFunc(distName);

  let configVarFilter = space.config.var_filter_func;
  if (configVarFilter && typeof configVarFilter !== 'function') {
    switch (configVarFilter) {
      case 'unsolved':
        // TODO: fix this mess. maybe even eliminate it completely if we dont use the function path
        configVarFilter = domain_isUndetermined;
        break;
      default:
        THROW('unknown var filter', configVarFilter);
    }
  }

  return _distribution_varFindBest(space, unsolvedVarIndexes, isBetterVar, configVarFilter, configNextVarFunc);
}

/**
 * @param {string} distName
 * @returns {Function|undefined}
 */
function distribution_getFunc(distName) {
  switch (distName) {
    case 'naive':
      return null;
    case 'size':
      return distribution_varByMinSize;
    case 'min':
      return distribution_varByMin;
    case 'max':
      return distribution_varByMax;
    case 'markov':
      return distribution_varByMarkov;
    case 'list':
      return distribution_varByList;
    case 'throw':
      return THROW('not expecting to pick this distributor');
  }

  return THROW('unknown next var func', distName);
}

/**
 * Return the best varIndex according to a fitness function
 * but only if the filter function is okay with it.
 *
 * @param {$space} space
 * @param {number[]} indexes A subset of indexes that are properties on space.vardoms
 * @param {Function($space, string, string, Function)} [fitnessFunc] Given two var indexes returns true iif the first var is better than the second var
 * @param {Function($space, string)} [filterFunc] If given only consider vars where this function returns true on it
 * @param {string|Object} configNextVarFunc From Space; either the varIndex of the dist or specific options for a var dist
 * @returns {number} The varIndex of the next var or NO_SUCH_VALUE
 */
function _distribution_varFindBest(space, indexes, fitnessFunc, filterFunc, configNextVarFunc) {
  ASSERT(indexes.length, 'SHOULD_HAVE_VARS');
  let bestVarIndex = NO_SUCH_VALUE;
  for (let i = 0; i < indexes.length; i++) {
    let varIndex = indexes[i];
    ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
    ASSERT(space.vardoms[varIndex] !== undefined, 'expecting each varIndex to have an domain', varIndex);

    if (!filterFunc || filterFunc(space.vardoms[varIndex])) {
      if (bestVarIndex === NO_SUCH_VALUE || (fitnessFunc && BETTER === fitnessFunc(space, varIndex, bestVarIndex, configNextVarFunc))) {
        bestVarIndex = varIndex;
      }
    }
  }
  return bestVarIndex;
}

//#####
// preset fitness functions
//#####

function distribution_varByMinSize(space, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  let n = domain_size(space.vardoms[varIndex1]) - domain_size(space.vardoms[varIndex2]);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMin(space, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  let n = domain_min(space.vardoms[varIndex1]) - domain_min(space.vardoms[varIndex2]);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMax(space, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  let n = domain_max(space.vardoms[varIndex1]) - domain_max(space.vardoms[varIndex2]);
  if (n > 0) return BETTER;
  if (n < 0) return WORSE;
  return SAME;
}

function distribution_varByMarkov(space, varIndex1, varIndex2, configNextVarFunc) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  let distOptions = space.config.var_dist_options;

  // v1 is only, but if so always, better than v2 if v1 is a markov var

  let varName1 = space.config.all_var_names[varIndex1];
  ASSERT(typeof varName1 === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  if (distOptions[varName1] && distOptions[varName1].distributor_name === 'markov') {
    return BETTER;
  }

  let varName2 = space.config.all_var_names[varIndex2];
  ASSERT(typeof varName2 === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  if (distOptions[varName2] && distOptions[varName2].distributor_name === 'markov') {
    return WORSE;
  }

  return distribution_varFallback(space, varIndex1, varIndex2, configNextVarFunc.fallback_config);
}

function distribution_varByList(space, varIndex1, varIndex2, configNextVarFunc) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  let varName1 = space.config.all_var_names[varIndex1];
  ASSERT(typeof varName1 === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  let varName2 = space.config.all_var_names[varIndex2];
  ASSERT(typeof varName2 === 'string', 'VAR_NAME_SHOULD_BE_STRING');

  // note: config.priority_hash is compiled by Solver#prepare from given priority_list
  // if in the list, lowest prio can be 1. if not in the list, prio will be undefined
  let hash = configNextVarFunc.priority_hash;

  // if v1 or v2 is not in the list they will end up as undefined
  let p1 = hash[varName1];
  let p2 = hash[varName2];

  ASSERT(p1 !== 0, 'SHOULD_NOT_USE_INDEX_ZERO');
  ASSERT(p2 !== 0, 'SHOULD_NOT_USE_INDEX_ZERO');

  if (!p1 && !p2) {
    // either p1 and p2 both dont exist on the list, or ... well no that's it
    return distribution_varFallback(space, varIndex1, varIndex2, configNextVarFunc.fallback_config);
  }

  // invert this operation? ("deprioritizing").
  let inverted = configNextVarFunc.inverted;

  // if inverted being on the list makes it worse than not.

  if (!p2) {
    if (inverted) return WORSE;
    return BETTER;
  }
  if (!p1) {
    if (inverted) return BETTER;
    return WORSE;
  }

  // if inverted being low on the list makes it better

  if (p1 > p2) {
    if (inverted) return WORSE;
    return BETTER;
  }
  if (p2 > p1) {
    if (inverted) return BETTER;
    return WORSE;
  }

  ASSERT(p1 !== p2, 'A_CANNOT_GET_SAME_INDEX_FOR_DIFFERENT_NAME');
  THROW('T_SHOULD_NOT_REACH_HERE');
  return SAME;
}

function distribution_varFallback(space, varIndex1, varIndex2, fallbackConfig) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  if (!fallbackConfig) {
    return SAME;
  }

  let distName = fallbackConfig;
  switch (typeof fallbackConfig) {
    case 'string':
      break;

    case 'object':
      distName = fallbackConfig.dist_name;
      if (!distName) {
        THROW(`Missing fallback var distribution name: ${JSON.stringify(fallbackConfig)}`);
      }
      break;

    case 'function':
      // TODO: pass on index or name?
      return fallbackConfig(varIndex1, varIndex2, space);

    default:
      THROW('Unexpected fallback config', fallbackConfig);
  }

  switch (distName) {
    case 'size':
      return distribution_varByMinSize(space, varIndex1, varIndex2);

    case 'min':
      return distribution_varByMin(space, varIndex1, varIndex2);

    case 'max':
      return distribution_varByMax(space, varIndex1, varIndex2);

    case 'markov':
      return distribution_varByMarkov(space, varIndex1, varIndex2, fallbackConfig);

    case 'list':
      return distribution_varByList(space, varIndex1, varIndex2, fallbackConfig);

    case 'throw':
      return THROW('nope');
  }

  return THROW(`Unknown var dist fallback name: ${distName}`);
}

function distribution_varThrow(s) {
  return THROW(s);
}

// BODY_STOP

export default distribution_getNextVar;
export {
  BETTER,
  SAME,
  WORSE,

  // __REMOVE_BELOW_FOR_DIST__
  // for testing
  distribution_varByList,
  distribution_varByMax,
  distribution_varByMarkov,
  distribution_varByMin,
  distribution_varByMinSize,
  distribution_varThrow,
  distribution_varFallback,
  // __REMOVE_ABOVE_FOR_DIST__
};
