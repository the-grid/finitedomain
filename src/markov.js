// markov helper functions

import {
  THROW,
} from './helpers';
import {
  domain_any_toList,
  domain_num_isValue,
} from './domain';

// BODY_START

/**
 * If a row has no boolean condition, return it.
 * If the boolean condition of a row is 1, return it.
 * If no row meets these conditions, return the last row.
 *
 * @param {$space} space
 * @param {?} matrix
 * @returns {*}
 */
function markov_getNextRowToSolve(space, matrix) {
  let vardoms = space.vardoms;
  for (let i = 0; i < matrix.length; i++) {
    var row = matrix[i];
    let boolDomain = vardoms[row.booleanId];
    if (boolDomain === undefined || domain_num_isValue(boolDomain, 1)) {
      break;
    }
  }
  return row;
}

function markov_createLegend(merge, inputLegend, domain) {
  if (merge) {
    return markov_mergeDomainAndLegend(inputLegend, domain);
  }
  return inputLegend;
}

function markov_mergeDomainAndLegend(inputLegend, domain) {
  let legend;
  if (inputLegend) {
    legend = inputLegend.slice(0);
  } else {
    legend = [];
  }

  let listed = domain_any_toList(domain);
  for (let i = 0; i < listed.length; ++i) {
    let val = listed[i];
    if (legend.indexOf(val) < 0) {
      legend.push(val);
    }
  }

  return legend;
}

function markov_createProbVector(space, matrix, expandVectorsWith, valueCount) {
  let row = markov_getNextRowToSolve(space, matrix);
  let probVector = row.vector;

  if (expandVectorsWith != null) { // could be 0
    probVector = probVector ? probVector.slice(0) : [];
    let delta = valueCount - probVector.length;

    if (delta > 0) {
      for (let i = 0; i < delta; ++i) {
        probVector.push(expandVectorsWith);
      }
    }

    return probVector;
  }

  if (!probVector || probVector.length !== valueCount) {
    THROW('E_EACH_MARKOV_VAR_MUST_HAVE_PROB_VECTOR_OR_ENABLE_EXPAND_VECTORS');
  }
  return probVector;
}

// BODY_STOP

export {
  markov_createLegend,
  markov_createProbVector,
};
