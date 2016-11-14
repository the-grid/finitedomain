import {
  ASSERT,
  ASSERT_NORDOM,
  THROW,
} from '../helpers';

import {
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
 * @param {$config} config
 * @returns {number}
 */
function distribution_getNextVarIndex(space, config) {
  let varStratConfig = config.varStratConfig;
  let isBetterVarFunc = distribution_getFunc(varStratConfig.type);

  let varIndex = _distribution_varFindBest(space, config, isBetterVarFunc, varStratConfig);
  return varIndex;
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
 *
 * @param {$space} space
 * @param {$config} config
 * @param {Function($space, currentIndex, bestIndex, Function)} [fitnessFunc] Given two var indexes returns true iif the first var is better than the second var
 * @param {Object} varStratConfig
 * @returns {number} The varIndex of the next var or NO_SUCH_VALUE
 */
function _distribution_varFindBest(space, config, fitnessFunc, varStratConfig) {
  let i = 0;
  let unsolvedVarIndexes = space._unsolved;

  let bestVarIndex = unsolvedVarIndexes[i++];

  if (fitnessFunc) {
    for (let len = unsolvedVarIndexes.length; i < len; i++) {
      let varIndex = unsolvedVarIndexes[i];
      ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
      ASSERT(space.vardoms[varIndex] !== undefined, 'expecting each varIndex to have an domain', varIndex);

      if (BETTER === fitnessFunc(space, config, varIndex, bestVarIndex, varStratConfig)) {
        bestVarIndex = varIndex;
      }
    }
  }

  ASSERT(typeof bestVarIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(bestVarIndex >= 0, 'VAR_INDEX_SHOULD_BE_POSITIVE');
  return bestVarIndex;
}

//#####
// preset fitness functions
//#####

function distribution_varByMinSize(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  let n = domain_size(space.vardoms[varIndex1]) - domain_size(space.vardoms[varIndex2]);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMin(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT_NORDOM(space.vardoms[varIndex1]);
  ASSERT_NORDOM(space.vardoms[varIndex2]);
  ASSERT(space.vardoms[varIndex1] && space.vardoms[varIndex2], 'EXPECTING_NON_EMPTY');

  let n = domain_min(space.vardoms[varIndex1]) - domain_min(space.vardoms[varIndex2]);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMax(space, config, varIndex1, varIndex2) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  let n = domain_max(space.vardoms[varIndex1]) - domain_max(space.vardoms[varIndex2]);
  if (n > 0) return BETTER;
  if (n < 0) return WORSE;
  return SAME;
}

function distribution_varByMarkov(space, config, varIndex1, varIndex2, varStratConfig) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  let distOptions = config.varDistOptions;

  // v1 is only, but if so always, better than v2 if v1 is a markov var

  let varName1 = config.allVarNames[varIndex1];
  ASSERT(typeof varName1 === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  if (distOptions[varName1] && distOptions[varName1].valtype === 'markov') {
    return BETTER;
  }

  let varName2 = config.allVarNames[varIndex2];
  ASSERT(typeof varName2 === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  if (distOptions[varName2] && distOptions[varName2].valtype === 'markov') {
    return WORSE;
  }

  return distribution_varFallback(space, config, varIndex1, varIndex2, varStratConfig.fallback);
}

function distribution_varByList(space, config, varIndex1, varIndex2, varStratConfig) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  // note: config._priorityByIndex is compiled by Solver#prepare from given priorityByName
  // if in the list, lowest prio can be 1. if not in the list, prio will be undefined
  let hash = varStratConfig._priorityByIndex;

  // if v1 or v2 is not in the list they will end up as undefined
  let p1 = hash[varIndex1];
  let p2 = hash[varIndex2];

  ASSERT(p1 !== 0, 'SHOULD_NOT_USE_INDEX_ZERO');
  ASSERT(p2 !== 0, 'SHOULD_NOT_USE_INDEX_ZERO');

  if (!p1 && !p2) { // neither has a priority
    return distribution_varFallback(space, config, varIndex1, varIndex2, varStratConfig.fallback);
  }

  // invert this operation? ("deprioritizing").
  let inverted = varStratConfig.inverted;

  // if inverted being on the list makes it worse than not.

  if (!p2) {
    if (inverted) return WORSE;
    return BETTER;
  }
  if (!p1) {
    if (inverted) return BETTER;
    return WORSE;
  }

  // the higher the p, the higher the prio. (the input array is compiled that way)
  // if inverted then low p is higher prio

  if (p1 > p2) {
    if (inverted) return WORSE;
    return BETTER;
  }

  ASSERT(p1 < p2, 'A_CANNOT_GET_SAME_INDEX_FOR_DIFFERENT_NAME');
  if (inverted) return BETTER;
  return WORSE;
}

function distribution_varFallback(space, config, varIndex1, varIndex2, fallbackConfig) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex1 === 'number', 'INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof varIndex2 === 'number', 'INDEX_SHOULD_BE_NUMBER');

  if (!fallbackConfig) {
    return SAME;
  }

  let distName = fallbackConfig.type;
  switch (distName) {
    case 'size':
      return distribution_varByMinSize(space, config, varIndex1, varIndex2);

    case 'min':
      return distribution_varByMin(space, config, varIndex1, varIndex2);

    case 'max':
      return distribution_varByMax(space, config, varIndex1, varIndex2);

    case 'markov':
      return distribution_varByMarkov(space, config, varIndex1, varIndex2, fallbackConfig);

    case 'list':
      return distribution_varByList(space, config, varIndex1, varIndex2, fallbackConfig);

    case 'throw':
      return THROW('nope');
  }

  return THROW(`Unknown var dist fallback name: ${distName}`);
}

// BODY_STOP

export default distribution_getNextVarIndex;
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
  distribution_varFallback,
  // __REMOVE_ABOVE_FOR_DIST__
};
