// markov helper functions

import {
  domain_toList,
} from './domain';

import {
  fdvar_isValue,
} from './fdvar';

// BODY_START

/**
 * If a row has no boolean condition, return it.
 * If the boolean condition of a row is 1, return it.
 * If no row meets these conditions, return the last row.
 *
 * @param {Space} space
 * @param {?} matrix
 * @returns {*}
 */
function markov_getNextRowToSolve(space, matrix) {
  let { vars } = space;
  for (let i = 0; i < matrix.length; i++) {
    var row = matrix[i];
    let boolVar = vars[row.booleanId];
    if (!boolVar || fdvar_isValue(boolVar, 1)) {
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
  if (inputLegend) {
    var legend = inputLegend.slice(0);
  } else {
    var legend = [];
  }

  let listed = domain_toList(domain);
  for (let i = 0; i < listed; ++i) {
    let val = listed[i];
    if (legend.indexOf(val) < 0) {
      legend.push(val);
    }
  }

  return legend;
}

function markov_createProbVector(space, matrix, expandVectorsWith, valueCount) {
  let row = markov_getNextRowToSolve(space, matrix);

  if (expandVectorsWith != null) { // could be 0
    var probVector = row.vector && row.vector.slice(0) || [];
    let delta = valueCount - probVector.length;

    if (delta > 0) {
      for (let i = 0; i < delta; ++i) {
        probVector.push(expandVectorsWith);
      }
    }

    return probVector;
  }

  var probVector = row.vector;
  if (!probVector) {
    THROW("distribution_value_by_markov error, each markov var must have a prob vector or use `expandVectorsWith:{Number}`");
  }
  if (probVector.length !== valueCount) {
    THROW("distribution_value_by_markov error, vector must be same length of legend or use `expandVectorsWith:{Number}`");
  }
  return probVector;
}

// BODY_STOP

export {
  markov_createLegend,
  markov_createProbVector,
};
