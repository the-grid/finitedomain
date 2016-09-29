/**
 * @typedef {Object} +
 * @property {string} $var_strat_config.type One of the hardcoded names for var distribution strategies
 * @property {string} $var_strat_config.priorityByName When type=list, this is an ordered list of var names. Unmentioned names go implicitly and unordered last.
 * @property {string} $var_strat_config._priorityByIndex Compiled hash of index:prio. Higher is better (unless inverted). Available when running.
 * @property {string} $var_strat_config.inverted=false Inverts order of list. Unmentioned names still go implicitly and unordered last, regardless.
 * @property {$var_strat_config} [$var_strat_config.fallback] Recursive fallback if current strategy can't decide.
 */
