/**
 * @typedef {Object.<{key:$val_strat_config}>} $val_strat_configs
 *
 * Each var in this object gets a value distribution strategy override as specified by the object.
 */

/**
 * @typedef {Object} $val_strat_config
 * @property {string} valtype Value distribution type override for by name of the key
 * // valtype=markov:
 * @property {$matrix_row[]} matrix The first row in order for which the boolean is not off will be used
 * @property {number[]} legend Determines which values are valid at all. The domain acts like a mask on this.
 * @property {Function} random Seeded randomizer function passed on by external party
 * // valtype=list:
 * @property {number[]} list In order, pick these values first
 */

/**
 * @typedef {Object} $matrix_row
 * @property {number[]} vector
 * @property {number} [booleanId] Determines whether the row should be considered at all
 */