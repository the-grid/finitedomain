import {
  NO_CHANGES,
  REJECTED,

  ASSERT,
} from '../helpers';

import {
  domain_isSolved,
  domain_min,
} from '../domain';

import {
  markov_createLegend,
  markov_createProbVector,
} from '../markov';

// BODY_START

/**
 * Markov uses a special system for trying values. The domain doesn't
 * govern the list of possible values, only acts as a mask for the
 * current node in the search tree (-> space). But since FD will work
 * based on this domain anyways we will need this extra step to verify
 * whether a solved var is solved to a valid value in current context.
 *
 * Return REJECTED if that is the value is invalid, else NO_CHANGES.
 * Every markov variable should have a propagator. Perhaps later
 * there can be one markov propagator that checks all markov vars.
 *
 * @param {Space} space
 * @param {string} varName
 * @returns {*}
 */
function propagator_markovStepBare(space, varName) {
  // THIS IS VERY EXPENSIVE IF expandVectorsWith IS ENABLED

  ASSERT(typeof varName === 'string', 'arg should be a string', varName);

  let fdvar = space.vars[varName];

  if (!domain_isSolved(fdvar.dom)) {
    return NO_CHANGES;
  }

  let value = domain_min(fdvar.dom); // note: solved so lo=hi=value

  let configVarDistOptions = space.config.var_dist_options;
  let distributionOptions = configVarDistOptions[varName];

  ASSERT(distributionOptions, 'var should have a config', varName, distributionOptions || JSON.stringify(configVarDistOptions));
  ASSERT(distributionOptions.distributor_name === 'markov', 'var should be a markov var', distributionOptions.distributor_name);

  let expandVectorsWith = distributionOptions.expandVectorsWith;
  ASSERT(distributionOptions.matrix, 'there should be a matrix available for every var', distributionOptions.matrix || JSON.stringify(fdvar), distributionOptions.matrix || JSON.stringify(distributionOptions));
  ASSERT(distributionOptions.legend || (expandVectorsWith != null), 'every var should have a legend or expandVectorsWith set', distributionOptions.legend || (expandVectorsWith != null) || JSON.stringify(fdvar), distributionOptions.legend || (expandVectorsWith != null) || JSON.stringify(distributionOptions));

  // note: expandVectorsWith can be 0, so check with null
  let values = markov_createLegend(expandVectorsWith != null, distributionOptions.legend, fdvar.dom);
  let probabilities = markov_createProbVector(space, distributionOptions.matrix, expandVectorsWith, values.length);

  let pos = values.indexOf(value);
  if (pos >= 0 && pos < probabilities.length && probabilities[pos] !== 0) {
    return NO_CHANGES;
  }
  return REJECTED;
}

// BODY_STOP

export default propagator_markovStepBare;
