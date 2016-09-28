/*
The functions in this file are supposed to determine the next
value while solving a Space. The functions are supposed to
return the new domain for some given var index. If there's no
new choice left it should return undefined to signify the end.
*/

import {
  EMPTY,
  NO_SUCH_VALUE,

  ASSERT,
  ASSERT_NUMSTRDOM,
  THROW,
} from '../helpers';

import {
  domain_appendRange,
  domain_containsValue,
  domain_createValue,
  domain_createRange,
  domain_getValueOfFirstContainedValueInList,
  domain_intersection,
  domain_isRejected,
  domain_isUndetermined,
  domain_max,
  domain_middleElement,
  domain_min,
  domain_removeNextFromList,
} from '../domain';

import distribution_markovSampleNextFromDomain from './markov';

import {
  markov_createLegend,
  markov_createProbVector,
} from '../markov';

// BODY_START

const FIRST_CHOICE = 0;
const SECOND_CHOICE = 1;
const THIRD_CHOICE = 2;
const NO_CHOICE = undefined;

const MATH_RANDOM = Math.random;

function distribute_getNextDomainForVar(space, config, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(domain_isUndetermined(space.vardoms[varIndex]), 'CALLSITE_SHOULD_PREVENT_DETERMINED'); // TODO: test

  let valueStrategy = config.valueStratName;

  // each var can override the value distributor
  let configVarDistOptions = config.var_dist_options;
  let varName = config.all_var_names[varIndex];
  ASSERT(typeof varName === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  let valueDistributorName = configVarDistOptions[varName] && configVarDistOptions[varName].valtype;
  if (valueDistributorName) valueStrategy = valueDistributorName;

  if (typeof valueStrategy === 'function') return valueStrategy;
  return _distribute_getNextDomainForVar(valueStrategy, space, config, varIndex, choiceIndex);
}

function _distribute_getNextDomainForVar(stratName, space, config, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'EXPECTING_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');

  switch (stratName) {
    case 'max':
      return distribution_valueByMax(space, varIndex, choiceIndex);

    case 'markov':
      return distribution_valueByMarkov(space, config, varIndex, choiceIndex);

    case 'mid':
      return distribution_valueByMid(space, varIndex, choiceIndex);

    case 'min':
      return distribution_valueByMin(space, varIndex, choiceIndex);

    case 'minMaxCycle':
      return distribution_valueByMinMaxCycle(space, varIndex, choiceIndex);

    case 'list':
      return distribution_valueByList(space, config, varIndex, choiceIndex);

    case 'naive':
      ASSERT_NUMSTRDOM(space.vardoms[varIndex]);
      ASSERT(space.vardoms[varIndex], 'NON_EMPTY_DOMAIN_EXPECTED');
      return domain_createValue(domain_min(space.vardoms[varIndex]));

    case 'splitMax':
      return distribution_valueBySplitMax(space, varIndex, choiceIndex);

    case 'splitMin':
      return distribution_valueBySplitMin(space, varIndex, choiceIndex);

    case 'throw':
      return ASSERT(false, 'not expecting to pick this distributor');
  }

  THROW('unknown next var func', stratName);
}

/**
 * Attempt to solve by setting var domain to values in the order
 * given as a list. This may also be a function which should
 * return a new domain given the space, var index, and choice index.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain for this var index in the next space TOFIX: support small domains
 */
function distribution_valueByList(space, config, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(config._class === '$config', 'EXPECTING_CONFIG');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  let varName = config.all_var_names[varIndex];
  ASSERT(typeof varName === 'string', 'VAR_NAME_SHOULD_BE_STRING');
  ASSERT(domain_isUndetermined(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  let configVarDistOptions = config.var_dist_options;
  ASSERT(configVarDistOptions, 'space should have config.var_dist_options');
  ASSERT(configVarDistOptions[varName], 'there should be distribution options available for every var', varName);
  ASSERT(configVarDistOptions[varName].list, 'there should be a distribution list available for every var', varName);
  let varDistOptions = configVarDistOptions[varName];
  let listSource = varDistOptions.list;

  let fallbackDistName = varDistOptions.fallback_dist_name;
  ASSERT(fallbackDistName !== 'list', 'prevent recursion loops');

  let list = listSource;
  if (typeof listSource === 'function') {
    // Note: callback should return the actual list
    list = listSource(space, varName, choiceIndex);
  }

  switch (choiceIndex) {
    case FIRST_CHOICE:
      let nextValue = domain_getValueOfFirstContainedValueInList(domain, list);
      if (nextValue === NO_SUCH_VALUE) {
        if (fallbackDistName) {
          return _distribute_getNextDomainForVar(fallbackDistName, space, config, varIndex, choiceIndex);
        }
        return NO_CHOICE;
      }
      return domain_createValue(nextValue);

    case SECOND_CHOICE:
      let newDomain = domain_removeNextFromList(domain, list);
      if (newDomain === NO_SUCH_VALUE && fallbackDistName) {
        return _distribute_getNextDomainForVar(fallbackDistName, space, config, varIndex, choiceIndex);
      }
      return newDomain;
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
}

/**
 * Searches through a var's values from min to max.
 * For each value in the domain it first attempts just
 * that value, then attempts the domain without this value.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */
function distribution_valueByMin(space, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NUMSTRDOM(domain);
  ASSERT(domain_isUndetermined(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE:
      return domain_createValue(domain_min(domain));

    case SECOND_CHOICE:
      // Cannot lead to empty domain because lo can only be SUP if
      // domain was solved and we assert it wasn't.
      // note: must use some kind of intersect here (there's a test if you mess this up :)
      // TOFIX: improve performance, this can be done more efficiently directly
      return domain_intersection(domain, domain_createRange(domain_min(domain) + 1, domain_max(domain)));
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
}

/**
 * Searches through a var's values from max to min.
 * For each value in the domain it first attempts just
 * that value, then attempts the domain without this value.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */
function distribution_valueByMax(space, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NUMSTRDOM(domain);
  ASSERT(domain_isUndetermined(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE:
      return domain_createValue(domain_max(domain));

    case SECOND_CHOICE:
      // Cannot lead to empty domain because hi can only be SUB if
      // domain was solved and we assert it wasn't.
      // note: must use some kind of intersect here (there's a test if you mess this up :)
      // TOFIX: improve performance, this can be done more efficiently directly
      let lo = domain_min(domain);
      let hi = domain_max(domain);
      let targetDomain = domain_createRange(lo, hi - 1);
      return domain_intersection(domain, targetDomain);
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
}

/**
 * Searches through a var's values by taking the middle value.
 * This version targets the value closest to `(max-min)/2`
 * For each value in the domain it first attempts just
 * that value, then attempts the domain without this value.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */
function distribution_valueByMid(space, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NUMSTRDOM(domain);
  ASSERT(domain_isUndetermined(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  let middle = domain_middleElement(domain);

  switch (choiceIndex) {
    case FIRST_CHOICE:
      return domain_createValue(middle);

    case SECOND_CHOICE:
      let lo = domain_min(domain);
      let hi = domain_max(domain);

      let domainMask = EMPTY;
      if (middle > lo) {
        domainMask = domain_appendRange(domainMask, lo, middle - 1);
      }
      if (middle < hi) {
        domainMask = domain_appendRange(domainMask, middle + 1, hi);
      }

      // Note: domain is not determined so the operation cannot fail
      // note: must use some kind of intersect here (there's a test if you mess this up :)
      // TOFIX: improve performance, this cant fail so constrain is not needed (but you must intersect!)
      return domain_intersection(domain, domainMask);
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
}

/**
 * Search a domain by splitting it up through the (max-min)/2 middle.
 * First simply tries the lower half, then tries the upper half.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */
function distribution_valueBySplitMin(space, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NUMSTRDOM(domain);
  ASSERT(domain_isUndetermined(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  let min = domain_min(domain);
  let max = domain_max(domain);
  let mmhalf = min + Math.floor((max - min) / 2);

  switch (choiceIndex) {
    case FIRST_CHOICE: {
      // Note: domain is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      // TOFIX: can do this more optimal if coding it out explicitly
      return domain_intersection(domain, domain_createRange(min, mmhalf));
    }

    case SECOND_CHOICE: {
      // Note: domain is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      // TOFIX: can do this more optimal if coding it out explicitly
      return domain_intersection(domain, domain_createRange(mmhalf + 1, max));
    }
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
}

/**
 * Search a domain by splitting it up through the (max-min)/2 middle.
 * First simply tries the upper half, then tries the lower half.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */
function distribution_valueBySplitMax(space, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NUMSTRDOM(domain);
  ASSERT(domain_isUndetermined(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  let min = domain_min(domain);
  let max = domain_max(domain);
  let mmhalf = min + Math.floor((max - min) / 2);

  switch (choiceIndex) {
    case FIRST_CHOICE: {
      // Note: domain is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      // TOFIX: can do this more optimal if coding it out explicitly
      return domain_intersection(domain, domain_createRange(mmhalf + 1, max));
    }

    case SECOND_CHOICE: {
      // Note: domain is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      // TOFIX: can do this more optimal if coding it out explicitly
      return domain_intersection(domain, domain_createRange(min, mmhalf));
    }
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
}

/**
 * Applies distribution_valueByMin and distribution_valueByMax alternatingly
 * depending on the position of the given var in the list of vars.
 *
 * @param {$space} space
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */
function distribution_valueByMinMaxCycle(space, varIndex, choiceIndex) {
  if (_isEven(varIndex)) {
    return distribution_valueByMin(space, varIndex, choiceIndex);
  } else {
    return distribution_valueByMax(space, varIndex, choiceIndex);
  }
}

/**
 * @param {number} n
 * @returns {boolean}
 */
function _isEven(n) { return n % 2 === 0; }

/**
 * Search a domain by applying a markov chain to determine an optimal value
 * checking path.
 *
 * @param {$space} space
 * @param {$config} config
 * @param {number} varIndex
 * @param {number} choiceIndex
 * @returns {$domain|undefined} The new domain this var index should get in the next space
 */
function distribution_valueByMarkov(space, config, varIndex, choiceIndex) {
  ASSERT(space._class === '$space', 'SPACE_SHOULD_BE_SPACE');
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(typeof choiceIndex === 'number', 'CHOICE_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];
  ASSERT_NUMSTRDOM(domain);
  ASSERT(domain_isUndetermined(domain), 'DOMAIN_SHOULD_BE_UNDETERMINED');

  switch (choiceIndex) {
    case FIRST_CHOICE: {
      // THIS IS AN EXPENSIVE STEP!

      let varName = config.all_var_names[varIndex];
      ASSERT(typeof varName === 'string', 'VAR_NAME_SHOULD_BE_STRING');
      let configVarDistOptions = config.var_dist_options;
      ASSERT(configVarDistOptions, 'space should have config.var_dist_options');
      let distOptions = configVarDistOptions[varName];
      ASSERT(distOptions, 'markov vars should have  distribution options');
      let expandVectorsWith = distOptions.expandVectorsWith;
      ASSERT(distOptions.matrix, 'there should be a matrix available for every var');
      ASSERT(distOptions.legend || (expandVectorsWith != null), 'every var should have a legend or expandVectorsWith set');

      let random = distOptions.random || MATH_RANDOM;
      ASSERT(typeof random === 'function', 'RNG_SHOULD_BE_FUNCTION');

      // note: expandVectorsWith can be 0, so check with null
      let values = markov_createLegend(expandVectorsWith != null, distOptions.legend, domain);
      let valueCount = values.length;
      if (!valueCount) {
        return NO_CHOICE;
      }

      let probabilities = markov_createProbVector(space, distOptions.matrix, expandVectorsWith, valueCount);
      let value = distribution_markovSampleNextFromDomain(domain, probabilities, values, random);
      if (value == null) {
        return NO_CHOICE;
      }

      ASSERT(domain_containsValue(domain, value), 'markov picks a value from the existing domain so no need for a constrain below');
      space._markov_last_value = value;

      return domain_createValue(value);
    }

    case SECOND_CHOICE: {
      ASSERT((space._markov_last_value != null), 'should have cached previous value');
      let lastValue = space._markov_last_value;
      let lo = domain_min(domain);
      let hi = domain_max(domain);

      let domainMask = EMPTY;
      if (lastValue > lo) {
        domainMask = domain_appendRange(domainMask, lo, lastValue - 1);
      }
      if (lastValue < hi) {
        domainMask = domain_appendRange(domainMask, lastValue + 1, hi);
      }

      // Note: domain is not determined so the operation cannot fail
      // note: must use some kind of intersect here (there's a test if you mess this up :)
      // TOFIX: improve performance, needs domain_remove but _not_ the inline version because that's sub-optimal
      let newDomain = domain_intersection(domain, domainMask);
      if (domain_isRejected(newDomain)) return NO_CHOICE;
      return newDomain;
    }
  }

  ASSERT(choiceIndex === THIRD_CHOICE, 'SHOULD_NOT_CALL_MORE_THAN_TRHICE');
  return NO_CHOICE;
}

// BODY_STOP

export default distribute_getNextDomainForVar;
export {
  FIRST_CHOICE,
  SECOND_CHOICE,
  THIRD_CHOICE,
  NO_CHOICE,

  // __REMOVE_BELOW_FOR_DIST__
  // for testing:
  _distribute_getNextDomainForVar,
  distribution_valueByList,
  distribution_valueByMarkov,
  distribution_valueByMax,
  distribution_valueByMid,
  distribution_valueByMin,
  distribution_valueByMinMaxCycle,
  distribution_valueBySplitMax,
  distribution_valueBySplitMin,
  // __REMOVE_ABOVE_FOR_DIST__
};
