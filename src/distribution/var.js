import {
  ASSERT,
  THROW,
} from '../helpers';

import {
  fdvar_size,
  fdvar_upperBound,
} from '../fdvar';

import {
  domain_isDetermined,
  domain_min,
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
  let fdvars = space.vars;

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
        configVarFilter = function(fdvar) { return !domain_isDetermined(fdvar.dom); }; // TODO: fix this mess. maybe even eliminate it completely if we dont use the function path
        break;
      default:
        THROW('unknown var filter', configVarFilter);
    }
  }

  return _distribution_varFindBest(fdvars, targetVars, isBetterVar, configVarFilter, configNextVarFunc, space);
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
 * @param {Fdvar[]} fdvars
 * @param {string[]} names A subset of names that are properties on fdvars
 * @param {Function(fdvar,fdvar)} [fitnessFunc] Given two fdvars returns true iif the first var is better than the second var
 * @param {Function(fdvar)} [filterFunc] If given only consider vars where this function returns true
 * @param {string|Object} configNextVarFunc From Space; either the name of the dist or specific options for a var dist
 * @param {Space} space
 * @returns {Fdvar}
 */
function _distribution_varFindBest(fdvars, names, fitnessFunc, filterFunc, configNextVarFunc, space) {
  let best = '';
  for (let i = 0; i < names.length; i++) {
    let name = names[i];
    let fdvar = fdvars[name];
    ASSERT(fdvar, 'expecting each name to have an fdvar', name);
    // TOFIX: if the name is the empty string this could lead to a problem. Must eliminate the empty string as var name

    if (!filterFunc || filterFunc(fdvar)) {
      if (!best || (fitnessFunc && BETTER === fitnessFunc(fdvar, best, space, configNextVarFunc))) {
        best = fdvar;
      }
    }
  }
  return best;
}

//#####
// preset fitness functions
//#####

function distribution_varByMinSize(v1, v2) {
  let n = fdvar_size(v1) - fdvar_size(v2);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMin(v1, v2) {
  let n = domain_min(v1.dom) - domain_min(v2.dom);
  if (n < 0) return BETTER;
  if (n > 0) return WORSE;
  return SAME;
}

function distribution_varByMax(v1, v2) {
  let n = fdvar_upperBound(v1) - fdvar_upperBound(v2);
  if (n > 0) return BETTER;
  if (n < 0) return WORSE;
  return SAME;
}

function distribution_varByMarkov(v1, v2, space, configNextVarFunc) {
  // v1 is only, but if so always, better than v2 if v1 is a markov var
  if (space.config.var_dist_options[v1.id] && space.config.var_dist_options[v1.id].distributor_name === 'markov') {
    return BETTER;
  }
  if (space.config.var_dist_options[v2.id] && space.config.var_dist_options[v2.id].distributor_name === 'markov') {
    return WORSE;
  }

  return distribution_varFallback(v1, v2, space, configNextVarFunc.fallback_config);
}

function distribution_varByList(v1, v2, space, configNextVarFunc) {
  // note: config.priority_hash is compiled by Solver#prepare from given priority_list
  // if in the list, lowest prio can be 1. if not in the list, prio will be undefined
  let hash = configNextVarFunc.priority_hash;

  // if v1 or v2 is not in the list they will end up as undefined
  let p1 = hash[v1.id];
  let p2 = hash[v2.id];

  ASSERT(p1 !== 0, 'index 0 should never be used');
  ASSERT(p2 !== 0, 'index 0 should never be used');

  if (!p1 && !p2) {
    // either p1 and p2 both dont exist on the list, or ... well no that's it
    return distribution_varFallback(v1, v2, space, configNextVarFunc.fallback_config);
  }

  // invert this operation? ("deprioritizing").
  let { inverted } = configNextVarFunc;

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
  ASSERT(false, 'not expecting to reach here', p1, p2, v1, v2, hash);
  return SAME;
}

function distribution_varFallback(v1, v2, space, fallbackConfig) {
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
      return fallbackConfig(v1, v2, space);

    default:
      THROW('Unexpected fallback config', fallbackConfig);
  }

  switch (distName) {
    case 'size':
      return distribution_varByMinSize(v1, v2);

    case 'min':
      return distribution_varByMin(v1, v2);

    case 'max':
      return distribution_varByMax(v1, v2);

    case 'markov':
      return distribution_varByMarkov(v1, v2, space, fallbackConfig);

    case 'list':
      return distribution_varByList(v1, v2, space, fallbackConfig);

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
