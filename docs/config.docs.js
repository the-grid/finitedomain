/**
 * @private Do not read any property from this object outside of `finitedomain`. Expose required data on Solver instead.
 * @typedef {Object} $finitedomain_config
 * @property {$var_strat_config} varStratConfig Defaults to a naive strategy
 * @property {string} valueStratName
 * @property {string[]|string} targetedVars='all' Search stops when these are solved.
 * @property {$var_strat_overrides} varStratOverrides Can apply a specific $var_strat_config per var
 * @property {string[]} [priority_list] Ordered list of var names to process first. Set through var distribution options
 * @property {Function} [timeout_callback] When this func returns true the search is aborted immediately. For timing out
 * @property {Object} constant_cache Any (initial) var that is solved is logged in here. May refactor this away soon.
 * @property {string[]} all_var_names Should at the start of a search contain the names of _all_ vars. "varIndex" maps to this. space._vardoms maps 1:1 to this.
 * @property {$trie} _var_names_trie
 * @property {$constraint[]} all_constraints Abstract constraints, higher level objects, all propagators are generated from these. Matches Solver input closer.
 * @property {$propagator[]} _propagators
 * @property {Object.<number,number[]>} _varToPropagators Runtime mapping from var index to a list of constraint indexes that uses that var. Pregenerated.
 *
 * This is the base model for a search. The root space
 * (search node) will is based on and initialized from
 * a $config.
 * Note that the state of a config may not be "sound".
 */

/**
 * @typedef {$finitedomain_config} $config
 *
 * Unnamespaced alias for finitedomain repo
 */
