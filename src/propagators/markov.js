import {
  EMPTY,
  NO_CHANGES,
  REJECTED,

  ASSERT,
  ASSERT_NUMSTRDOM,
} from '../helpers';

import {
  domain_any_isSolved,
  domain_any_min,
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
 * @param {$space} space
 * @param {number} varIndex
 * @returns {$fd_changeState}
 */
function propagator_markovStepBare(space, varIndex) {
  // THIS IS VERY EXPENSIVE IF expandVectorsWith IS ENABLED

  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');

  let domain = space.vardoms[varIndex];

  ASSERT_NUMSTRDOM(domain);
  ASSERT(domain, 'SHOULD_NOT_BE_REJECTED');

  if (!domain_any_isSolved(domain)) {
    return NO_CHANGES;
  }

  let value = domain_any_min(domain); // note: solved so lo=hi=value

  let configVarDistOptions = space.config.var_dist_options;
  let distributionOptions = configVarDistOptions[space.config.all_var_names[varIndex]];

  ASSERT(distributionOptions, 'var should have a config', varIndex, distributionOptions || JSON.stringify(configVarDistOptions));
  ASSERT(distributionOptions.valtype === 'markov', 'var should be a markov var', distributionOptions.valtype);

  let expandVectorsWith = distributionOptions.expandVectorsWith;
  ASSERT(distributionOptions.matrix, 'there should be a matrix available for every var');
  ASSERT(distributionOptions.legend || (expandVectorsWith != null), 'every var should have a legend or expandVectorsWith set');

  // note: expandVectorsWith can be 0, so check with null
  let values = markov_createLegend(expandVectorsWith != null, distributionOptions.legend, domain); // TODO: domain is a value, can this be optimized? is that worth the effort? (profile this)
  let probabilities = markov_createProbVector(space, distributionOptions.matrix, expandVectorsWith, values.length);

  let pos = values.indexOf(value);
  if (pos >= 0 && pos < probabilities.length && probabilities[pos] !== 0) {
    return NO_CHANGES;
  }

  space.vardoms[varIndex] = EMPTY;
  return REJECTED;
}

// BODY_STOP

export default propagator_markovStepBare;
