import {
  ASSERT,
  THROW,
} from '../helpers';

import {
  domain_isDetermined,
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
 * @param {Space} space
 * @param {Fdvar[]} targetVars
 * @returns {Fdvar}
 */
function distribution_getNextVar(space, targetVars) {
  let configNextVarFunc = space.config.next_var_func;

  // if it's a function it should return the name of the next var to process
  if (typeof configNextVarFunc === 'function') {
    return configNextVarFunc(space, targetVars);
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
        configVarFilter = function(domain) { return !domain_isDetermined(domain); }; // TODO: fix this mess. maybe even eliminate it completely if we dont use the function path
        break;
      default:
        THROW('unknown var filter', configVarFilter);
    }
  }

  return _distribution_varFindBest(space, targetVars, isBetterVar, configVarFilter, configNextVarFunc);
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
 * Return the best var name according to a fitness function
 * but only if the filter function is okay with it.
 *
 * @param {Space} space
 * @param {string[]} names A subset of names that are properties on fdvars
 * @param {Function(fdvar,fdvar)} [fitnessFunc] Given two fdvars returns true iif the first var is better than the second var
 * @param {Function(fdvar)} [filterFunc] If given only consider vars where this function returns true
 * @param {string|Object} configNextVarFunc From Space; either the name of the dist or specific options for a var dist
 * @returns {Fdvar}
 */
console.log('still need to fix oldvars in this one');
function _distribution_varFindBest(space, names, fitnessFunc, filterFunc, configNextVarFunc) {
  ASSERT(names.length, 'SHOULD_HAVE_VARS');
  let best = '';
  for (let i = 0; i < names.length; i++) {
    let name = names[i];

    ASSERT(space.oldvars[name], 'expecting each name to have an fdvar', name);
    // TOFIX: if the name is the empty string this could lead to a problem. Must eliminate the empty string as var name

    if (!filterFunc || filterFunc(space.oldvars[name].dom)) {
      if (!best || (fitnessFunc && BETTER === fitnessFunc(space, name, best, configNextVarFunc))) {
        best = name;
      }
    }
  }
  return space.oldvars[best];
}

//#####
// preset fitness functions
//#####

function distribution_varByMinSize(space, name1, name2) {
  ASSERT(space._class === 'space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof name1 === 'string', 'NAME_SHOULD_BE_STRING');
  ASSERT(typeof name2 === 'string', 'NAME_SHOULD_BE_STRING');

  let n = domain_size(space.oldvars[name1].dom) - domain_size(space.oldvars[name2].dom);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMin(space, name1, name2) {
  ASSERT(space._class === 'space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof name1 === 'string', 'NAME_SHOULD_BE_STRING');
  ASSERT(typeof name2 === 'string', 'NAME_SHOULD_BE_STRING');

  let n = domain_min(space.oldvars[name1].dom) - domain_min(space.oldvars[name2].dom);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMax(space, name1, name2) {
  ASSERT(space._class === 'space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof name1 === 'string', 'NAME_SHOULD_BE_STRING');
  ASSERT(typeof name2 === 'string', 'NAME_SHOULD_BE_STRING');

  let n = domain_max(space.oldvars[name1].dom) - domain_max(space.oldvars[name2].dom);
  if (n > 0) return BETTER;
  if (n < 0) return WORSE;
  return SAME;
}

function distribution_varByMarkov(space, name1, name2, configNextVarFunc) {
  let distOptions = space.config.var_dist_options;

  // v1 is only, but if so always, better than v2 if v1 is a markov var
  if (distOptions[name1] && distOptions[name1].distributor_name === 'markov') {
    return BETTER;
  }
  if (distOptions[name2] && distOptions[name2].distributor_name === 'markov') {
    return WORSE;
  }

  return distribution_varFallback(name1, name2, space, configNextVarFunc.fallback_config);
}

function distribution_varByList(space, name1, name2, configNextVarFunc) {
  ASSERT(typeof name1 === 'string', 'NAME_SHOULD_BE_STRING');
  ASSERT(typeof name2 === 'string', 'NAME_SHOULD_BE_STRING');
  ASSERT(space._class === 'space', 'EXPECTING_SPACE_WAS[' + space._class + ']');

  // note: config.priority_hash is compiled by Solver#prepare from given priority_list
  // if in the list, lowest prio can be 1. if not in the list, prio will be undefined
  let hash = configNextVarFunc.priority_hash;

  // if v1 or v2 is not in the list they will end up as undefined
  let p1 = hash[name1];
  let p2 = hash[name2];

  ASSERT(p1 !== 0, 'SHOULD_NOT_USE_INDEX_ZERO');
  ASSERT(p2 !== 0, 'SHOULD_NOT_USE_INDEX_ZERO');

  if (!p1 && !p2) {
    // either p1 and p2 both dont exist on the list, or ... well no that's it
    return distribution_varFallback(name1, name2, space, configNextVarFunc.fallback_config);
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

  ASSERT(p1 !== p2, 'cant have same indexes, would mean same item is compared');
  ASSERT(false, 'not expecting to reach here', p1, p2, name1, name2, hash);
  return SAME;
}

function distribution_varFallback(name1, name2, space, fallbackConfig) {
  ASSERT(typeof name1 === 'string', 'NAME_SHOULD_BE_STRING');
  ASSERT(typeof name2 === 'string', 'NAME_SHOULD_BE_STRING');

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
      return fallbackConfig(name1, name2, space);

    default:
      THROW('Unexpected fallback config', fallbackConfig);
  }

  switch (distName) {
    case 'size':
      return distribution_varByMinSize(space, name1, name2);

    case 'min':
      return distribution_varByMin(space, name1, name2);

    case 'max':
      return distribution_varByMax(space, name1, name2);

    case 'markov':
      return distribution_varByMarkov(space, name1, name2, fallbackConfig);

    case 'list':
      return distribution_varByList(space, name1, name2, fallbackConfig);

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
