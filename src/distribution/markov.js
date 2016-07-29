/*
Markov Distribution Helpers
======================================================================

Helpers for Markov-style probabilistic value & var distributions.

const markov = {
  legend: ['small', 'med', 'large'],
  matrix: [{
    vector: [.5, 1, 1],
    condition: function (S, varId) {
      var prev = S.readMatrix(varId, S.cursor() - 1)
      return S.isEqual(prev, 'small');
    },
  }, {
    vector: [1, 1, 1],
    condition: function () { return true; },
  },
  ],
};

const markov = {
  legend: ['small', 'med', 'large'],
  matrix: [{
    vector: [.5, 1, 1],
    condition: function (S, varId) {
      var prev = S.readMatrix(varId, S.cursor() - 1);
      var result = {
        value: S.isEqual(prev, 'small'),
        deps: ...,
      };
      return result;
    },
  }, {
    vector: [1, 1, 1],
    condition: function () { return true; },
  }],
};

Inhomogenous Markov chains [see](https://cw.fel.cvut.cz/wiki/_media/courses/a6m33bin/markov-chains-2.pdf)

in an inhomogeneous Markov model, we can have different distributions at different positions in the sequence

https://en.wikipedia.org/wiki/Markov_chain#Music

*/

import {
  ASSERT,
} from '../helpers';

import {
  domain_any_containsValue,
} from '../domain';

// BODY_START

/**
 * Given a domain, probability vector, value legend, and rng
 * function; return one of the values in the value legend
 * according to the outcome of the rng and considering the
 * prob weight of each value in the legend.
 * The rng should be normalized (returning values from 0 including
 * up to but not including 1), unless the argument says otherwise
 * (that is used for testing only, to get around rounding errors).
 *
 * @param {$domain} domain A regular domain. It's values only determine whether a legend value can be used, it may have values that can never be picked. It's only a filter mask.
 * @param {number[]} probVector List of probabilities, maps 1:1 to val_legend.
 * @param {number[]} valLegend List of values eligible for picking. Maps 1:1 to prob_vector. Only values in the current domain are actually eligible.
 * @param {Function} randomFunc
 * @param {boolean} [rngIsNormalized=true] Is 0<=rng()<1 or 0<=rng()<total_prob ? The latter is only used for testing to avoid rounding errors.
 * @return {number | undefined}
 */
function distribution_markovSampleNextFromDomain(domain, probVector, valLegend, randomFunc, rngIsNormalized = true) {
  ASSERT(!!valLegend, 'A_SHOULD_HAVE_VAL_LEGEND');
  ASSERT(probVector.length <= valLegend.length, 'A_PROB_VECTOR_SIZE_SHOULD_BE_LTE_LEGEND');

  // make vector & legend for available values only
  let filteredLegend = [];
  let cumulativeFilteredProbVector = [];
  let totalProb = 0;
  for (let index = 0; index < probVector.length; index++) {
    let prob = probVector[index];
    if (prob > 0) {
      let value = valLegend[index];
      if (domain_any_containsValue(domain, value)) {
        totalProb += prob;
        cumulativeFilteredProbVector.push(totalProb);
        filteredLegend.push(value);
      }
    }
  }

  // no more values left to search
  if (cumulativeFilteredProbVector.length === 0) {
    return;
  }

  // only one value left
  if (cumulativeFilteredProbVector.length === 1) {
    return filteredLegend[0];
  }

  // TOFIX: could set `cumulativeFilteredProbVector[cumulativeFilteredProbVector.length-1] = 1` here...

  return _distribution_markovRoll(randomFunc, totalProb, cumulativeFilteredProbVector, filteredLegend, rngIsNormalized);
}

/**
 * @private
 * @param {Function} rng A function ("random number generator"), which is usually normalized, but in tests may not be
 * @param {number} totalProb
 * @param {number[]} cumulativeProbVector Maps 1:1 to the value legend. `[prob0, prob0+prob1, prob0+prob1+prob2, etc]`
 * @param {number[]} valueLegend
 * @param {boolean} rngIsNormalized
 * @returns {number}
 */
function _distribution_markovRoll(rng, totalProb, cumulativeProbVector, valueLegend, rngIsNormalized) {
  let rngRoll = rng();
  let probVal = rngRoll;
  if (rngIsNormalized) { // 0 <= rng < 1
    // roll should yield; 0<=value<1
    ASSERT(rngRoll >= 0, 'RNG_SHOULD_BE_NORMALIZED');
    ASSERT(rngRoll < 1, 'RNG_SHOULD_BE_NORMALIZED');
    probVal = rngRoll * totalProb;
  }
  // else 0 <= rng < totalProb (mostly to avoid precision problems in tests)
  ASSERT(!rngIsNormalized || rngRoll < totalProb, 'bad test: roll is higher than total prob (cannot used unnormalized roll if domain filters out options!)', rngRoll, totalProb, probVal);

  for (var index = 0; index < cumulativeProbVector.length; index++) {
    // note: if first element is 0.1 and roll is 0.1 this will pick the
    // SECOND item. by design. so prob domains are `[x, y)`
    let prob = cumulativeProbVector[index];
    if (prob > probVal) {
      break;
    }
  }

  return valueLegend[index];
}

// BODY_STOP

export default distribution_markovSampleNextFromDomain;
