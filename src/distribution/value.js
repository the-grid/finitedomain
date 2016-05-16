/*
The functions in this file are supposed to determine the next
value while solving a Space. The functions are supposed to
return the new domain for some given fdvar. If there's no new
choice left it should return undefined to signify the end.
*/

import {
  NO_SUCH_VALUE,

  ASSERT,
  THROW,
} from '../helpers';

import {
  domain_containsValue,
  domain_createValue,
  domain_createRange,
  domain_getValueOfFirstContainedValueInList,
  domain_intersection,
  domain_isRejected,
  domain_max,
  domain_min,
  domain_numarr,
  domain_removeNextFromList,
} from '../domain';

import distribution_markovSampleNextFromDomain from './markov';

import {
  markov_createLegend,
  markov_createProbVector,
} from '../markov';

import {
  fdvar_isRejected,
  fdvar_isSolved,
  fdvar_isUndetermined,
  fdvar_lowerBound,
  fdvar_middleElement,
  fdvar_upperBound,
} from '../fdvar';

// BODY_START

const FIRST_CHOICE = 0;
const SECOND_CHOICE = 1;
const NO_CHOICE = undefined;

const MATH_RANDOM = Math.random;

function distribute_getNextDomainForVar(space, fdvar) {
  if (fdvar_isSolved(fdvar)) {
    // TOFIX: prevent this case at call sites (var picker)... there is no need for it here
    return; // this var is solved but apparently that did not suffice. continue with next var
  }

  let choiceIndex = space.next_distribution_choice++;
  let configNextValueFunc = space.config.next_value_func;
  let varName = fdvar.id;

  ASSERT(!fdvar_isRejected(fdvar), 'fdvar should not be rejected', varName, fdvar.dom, fdvar);

  // each var can override the value distributor
  let configVarDistOptions = space.config.var_dist_options;
  let valueDistributorName = configVarDistOptions[varName] && configVarDistOptions[varName].distributor_name;
  if (valueDistributorName) configNextValueFunc = valueDistributorName;

  if (typeof configNextValueFunc === 'function') return configNextValueFunc;
  return _distribute_getNextDomainForVar(configNextValueFunc, space, fdvar, choiceIndex);
}

function _distribute_getNextDomainForVar(valueFuncName, space, fdvar, choiceIndex) {
  switch (valueFuncName) {
    case 'max':
      return distribution_valueByMax(fdvar, choiceIndex);

    case 'markov':
      return distribution_valueByMarkov(space, fdvar, choiceIndex);

    case 'mid':
      return distribution_valueByMid(fdvar, choiceIndex);

    case 'min':
      return distribution_valueByMin(fdvar, choiceIndex);

    case 'minMaxCycle':
      return distribution_valueByMinMaxCycle(space, fdvar, choiceIndex);

    case 'list':
      return distribution_valueByList(space, fdvar, choiceIndex);

    case 'naive':
      return domain_createValue(fdvar_lowerBound(fdvar));

    case 'splitMax':
      return distribution_valueBySplitMax(fdvar, choiceIndex);

    case 'splitMin':
      return distribution_valueBySplitMin(fdvar, choiceIndex);

    case 'throw':
      return ASSERT(false, 'not expecting to pick this distributor');
  }

  THROW('unknown next var func', valueFuncName);
}

/**
 * Attempt to solve by setting fdvar to values in the order
 * given as a list. This may also be a function which should
 * return a new domain given the space, fdvar, and choice index.
 *
 * @param {Space} space
 * @param {Fdvar} fdvar
 * @param {number} choiceIndex
 * @returns {$domain} The new domain for this fdvar in the next space TOFIX: support small domains
 */
function distribution_valueByList(space, fdvar, choiceIndex) {
  ASSERT(typeof choiceIndex === 'number', 'choiceIndex should be a number');
  ASSERT(fdvar_isUndetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar);

  let configVarDistOptions = space.config.var_dist_options;
  ASSERT(configVarDistOptions, 'space should have config.var_dist_options');
  ASSERT(configVarDistOptions[fdvar.id], 'there should be distribution options available for every var', fdvar);
  ASSERT(configVarDistOptions[fdvar.id].list, 'there should be a distribution list available for every var', fdvar);
  let fdvarDistOptions = configVarDistOptions[fdvar.id];
  let listSource = fdvarDistOptions.list;

  let { fallback_dist_name: fallbackDistName } = fdvarDistOptions;
  ASSERT(fallbackDistName !== 'list', 'prevent recursion loops');

  let list = listSource;
  if (typeof listSource === 'function') {
    // Note: callback should return the actual list
    list = listSource(space, fdvar.id, choiceIndex);
  }

  let domain = fdvar.dom;

  switch (choiceIndex) {
    case FIRST_CHOICE:
      let nextValue = domain_getValueOfFirstContainedValueInList(domain, list);
      if (nextValue === NO_SUCH_VALUE) {
        if (fallbackDistName) {
          return _distribute_getNextDomainForVar(fallbackDistName, space, fdvar, choiceIndex);
        }
        return NO_CHOICE;
      }
      return domain_createValue(nextValue);

    case SECOND_CHOICE:
      let newDomain = domain_removeNextFromList(fdvar.dom, list);
      // note: d can be a new array-domain, a new small-domain, or NO_SUCH_VALUE (-1)
      if (newDomain === NO_SUCH_VALUE && fallbackDistName) {
        return _distribute_getNextDomainForVar(fallbackDistName, space, fdvar, choiceIndex);
      }
      return newDomain;
  }

  ASSERT(typeof choiceIndex === 'number', 'should be a number');
  ASSERT(choiceIndex === 2, 'should not keep calling this func after the last choice');
  return NO_CHOICE;
}

/**
 * Searches through a var's values from min to max.
 * For each value in the domain it first attempts just
 * that value, then attempts the domain without this value.
 *
 * @param {Fdvar} fdvar
 * @param {number} choiceIndex
 * @returns {number[]} The new domain this fdvar should get in the next space
 */
function distribution_valueByMin(fdvar, choiceIndex) {
  ASSERT(typeof choiceIndex === 'number', 'choiceIndex should be a number');
  ASSERT(fdvar_isUndetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar);

  switch (choiceIndex) {
    case FIRST_CHOICE:
      return domain_createValue(fdvar_lowerBound(fdvar));

    case SECOND_CHOICE:
      // Cannot lead to empty domain because lo can only be SUP if
      // domain was solved and we assert it wasn't.
      // note: must use some kind of intersect here (there's a test if you mess this up :)
      // TOFIX: improve performance, this can be done more efficiently directly
      let domain = domain_intersection(fdvar.dom, domain_createRange(fdvar_lowerBound(fdvar) + 1, fdvar_upperBound(fdvar)));
      return domain_numarr(domain);
  }

  ASSERT(typeof choiceIndex === 'number', 'should be a number');
  ASSERT(choiceIndex === 2, 'should not keep calling this func after the last choice');
  return NO_CHOICE;
}

/**
 * Searches through a var's values from max to min.
 * For each value in the domain it first attempts just
 * that value, then attempts the domain without this value.
 *
 * @param {Fdvar} fdvar
 * @param {number} choiceIndex
 * @returns {number[]} The new domain this fdvar should get in the next space
 */
function distribution_valueByMax(fdvar, choiceIndex) {
  ASSERT(typeof choiceIndex === 'number', 'choiceIndex should be a number');
  ASSERT(fdvar_isUndetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar);

  switch (choiceIndex) {
    case FIRST_CHOICE:
      return domain_createValue(fdvar_upperBound(fdvar));

    case SECOND_CHOICE:
      // Cannot lead to empty domain because hi can only be SUB if
      // domain was solved and we assert it wasn't.
      // note: must use some kind of intersect here (there's a test if you mess this up :)
      // TOFIX: improve performance, this can be done more efficiently directly
      let domain = domain_intersection(fdvar.dom, domain_createRange(fdvar_lowerBound(fdvar), fdvar_upperBound(fdvar) - 1));
      return domain_numarr(domain);
  }

  ASSERT(typeof choiceIndex === 'number', 'should be a number');
  ASSERT(choiceIndex === 2, 'should not keep calling this func after the last choice');
  return NO_CHOICE;
}

/**
 * Searches through a var's values by taking the middle value.
 * This version targets the value closest to `(max-min)/2`
 * For each value in the domain it first attempts just
 * that value, then attempts the domain without this value.
 *
 * @param {Fdvar} fdvar
 * @param {number} choiceIndex
 * @returns {number[]} The new domain this fdvar should get in the next space
 */
function distribution_valueByMid(fdvar, choiceIndex) {
  ASSERT(typeof choiceIndex === 'number', 'choiceIndex should be a number');
  ASSERT(fdvar_isUndetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar);

  let middle = fdvar_middleElement(fdvar);

  switch (choiceIndex) {
    case FIRST_CHOICE:
      return domain_createValue(middle);

    case SECOND_CHOICE:
      let lo = fdvar_lowerBound(fdvar);
      let hi = fdvar_upperBound(fdvar);
      let arr = [];
      if (middle > lo) {
        arr.push(lo, middle - 1);
      }
      if (middle < hi) {
        arr.push(middle + 1, hi);
      }

      // Note: fdvar is not determined so the operation cannot fail
      // note: must use some kind of intersect here (there's a test if you mess this up :)
      // TOFIX: improve performance, this cant fail so constrain is not needed (but you must intersect!)
      let domain = domain_intersection(fdvar.dom, arr);
      return domain_numarr(domain);
  }

  ASSERT(typeof choiceIndex === 'number', 'should be a number');
  ASSERT(choiceIndex === 2, 'should not keep calling this func after the last choice');
  return NO_CHOICE;
}

/**
 * Search a domain by splitting it up through the (max-min)/2 middle.
 * First simply tries the lower half, then tries the upper half.
 *
 * @param {Fdvar} fdvar
 * @param {number} choiceIndex
 * @returns {number[]} The new domain this fdvar should get in the next space
 */
function distribution_valueBySplitMin(fdvar, choiceIndex) {
  ASSERT(typeof choiceIndex === 'number', 'choiceIndex should be a number');
  ASSERT(fdvar_isUndetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar);

  let domain = fdvar.dom;
  let min = domain_min(domain);
  let max = domain_max(domain);
  let mmhalf = min + Math.floor((max - min) / 2);

  switch (choiceIndex) {
    case FIRST_CHOICE:
      // Note: fdvar is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      // TOFIX: can do this more optimal if coding it out explicitly
      domain = domain_intersection(fdvar.dom, domain_createRange(min, mmhalf));
      return domain_numarr(domain);

    case SECOND_CHOICE:
      // Note: fdvar is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      // TOFIX: can do this more optimal if coding it out explicitly
      domain = domain_intersection(fdvar.dom, domain_createRange(mmhalf + 1, max));
      return domain_numarr(domain);
  }

  ASSERT(typeof choiceIndex === 'number', 'should be a number');
  ASSERT(choiceIndex === 2, 'should not keep calling this func after the last choice', choiceIndex, fdvar);
  return NO_CHOICE;
}

/**
 * Search a domain by splitting it up through the (max-min)/2 middle.
 * First simply tries the upper half, then tries the lower half.
 *
 * @param {Fdvar} fdvar
 * @param {number} choiceIndex
 * @returns {number[]} The new domain this fdvar should get in the next space
 */
function distribution_valueBySplitMax(fdvar, choiceIndex) {
  ASSERT(typeof choiceIndex === 'number', 'choiceIndex should be a number');
  ASSERT(fdvar_isUndetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar);

  let domain = fdvar.dom;
  let min = domain_min(domain);
  let max = domain_max(domain);
  let mmhalf = min + Math.floor((max - min) / 2);

  switch (choiceIndex) {
    case FIRST_CHOICE:
      // Note: fdvar is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      // TOFIX: can do this more optimal if coding it out explicitly
      domain = domain_intersection(fdvar.dom, domain_createRange(mmhalf + 1, max));
      return domain_numarr(domain);

    case SECOND_CHOICE:
      // Note: fdvar is not determined so the operation cannot fail
      // Note: this must do some form of intersect, though maybe not constrain
      // TOFIX: can do this more optimal if coding it out explicitly
      domain = domain_intersection(fdvar.dom, domain_createRange(min, mmhalf));
      return domain_numarr(domain);
  }

  ASSERT(typeof choiceIndex === 'number', 'should be a number');
  ASSERT(choiceIndex === 2, 'should not keep calling this func after the last choice');
  return NO_CHOICE;
}

/**
 * Applies distribution_valueByMin and distribution_valueByMax alternatingly
 * depending on the position of the given var in the list of vars.
 *
 * @param {Space} space
 * @param {Fdvar} fdvar
 * @param {number} choiceIndex
 * @returns {number[]} The new domain this fdvar should get in the next space
 */
function distribution_valueByMinMaxCycle(space, fdvar, choiceIndex) {
  if (_isEven(space.config.all_var_names.indexOf(fdvar.id))) {
    return distribution_valueByMin(fdvar, choiceIndex);
  } else {
    return distribution_valueByMax(fdvar, choiceIndex);
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
 * @param {Space} space
 * @param {Fdvar} fdvar
 * @param {number} choiceIndex
 * @returns {number[]} The new domain this fdvar should get in the next space
 */
function distribution_valueByMarkov(space, fdvar, choiceIndex) {
  ASSERT(typeof choiceIndex === 'number', 'choiceIndex should be a number');
  ASSERT(fdvar_isUndetermined(fdvar), 'caller should ensure fdvar isnt determined', fdvar.id, fdvar.dom, fdvar);

  switch (choiceIndex) {
    case FIRST_CHOICE: {
      // THIS IS AN EXPENSIVE STEP!

      let domain = fdvar.dom;
      let varName = fdvar.id;

      let configVarDistOptions = space.config.var_dist_options;
      ASSERT(configVarDistOptions, 'space should have config.var_dist_options');
      let distOptions = configVarDistOptions[varName];
      ASSERT(distOptions, 'markov vars should have  distribution options', JSON.stringify(fdvar));
      let expandVectorsWith = distOptions.expandVectorsWith;
      ASSERT(distOptions.matrix, 'there should be a matrix available for every var'/*, distOptions.matrix || JSON.stringify(fdvar), distOptions.matrix || JSON.stringify(configVarDistOptions[varName]) */);
      ASSERT(distOptions.legend || (expandVectorsWith != null), 'every var should have a legend or expandVectorsWith set'/*, distOptions.legend || (expandVectorsWith != null) || JSON.stringify(fdvar) || distOptions.legend || (expandVectorsWith != null) || JSON.stringify(distOptions)*/);

      let random = distOptions.random || MATH_RANDOM;

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
      let lo = fdvar_lowerBound(fdvar);
      let hi = fdvar_upperBound(fdvar);
      let arr = [];
      if (lastValue > lo) {
        arr.push(lo, lastValue - 1);
      }
      if (lastValue < hi) {
        arr.push(lastValue + 1, hi);
      }

      // Note: fdvar is not determined so the operation cannot fail
      // note: must use some kind of intersect here (there's a test if you mess this up :)
      // TOFIX: improve performance, needs domain_remove but _not_ the inline version because that's sub-optimal
      let domain = domain_intersection(fdvar.dom, arr);
      if (domain_isRejected(domain)) return NO_CHOICE;
      return domain_numarr(domain);
    }
  }

  ASSERT(typeof choiceIndex === 'number', 'should be a number');
  ASSERT(choiceIndex === 1 || choiceIndex === 2, 'should not keep calling this func after the last choice');
  return NO_CHOICE;
}

// BODY_STOP

export default distribute_getNextDomainForVar;
export {
  FIRST_CHOICE,
  SECOND_CHOICE,

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
