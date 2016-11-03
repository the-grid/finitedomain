/**
 * @private Do not read any property from this object outside of `finitedomain`. Expose required data on Solver instead.
 * @typedef {Object} $config
 * @property {string[]} allVarNames Should at the start of a search contain the names of _all_ vars. "varIndex" maps to this. space._vardoms maps 1:1 to this.
 * @property {$trie} _varNamesTrie
 * @property {$var_strat_config} varStratConfig Defaults to a naive strategy
 * @property {string} valueStratName
 * @property {string[]|string} targetedVars='all' Search stops when these are solved.
 * @property {Object} varDistOptions
 * @property {Function} [timeoutCallback] When this func returns true the search is aborted immediately. For timing out
 * @property {string} [rngCode] When set this is used to initialize `_defaultRng = Function(rngCode)`. Needed for serializability like with webworkers or export to DSL.
 * @property {Function} [_defaultRng] If unset at init time it will be initialized to `rngCode ? Function(rngCode) : Math.random`. Prefer the rngCode for serializability.
 * @property {$constraint[]} allConstraints Abstract constraints, higher level objects, all propagators are generated from these. Matches Solver input closer.
 * @property {Object} constantCache Any (initial) var that is solved is logged in here. May refactor this away soon.
 * @property {$domain} initialDomains The root space will clone a vardoms from this list
 * @property {$propagator[]} _propagators Generated from the constraints
 * @property {Object.<number,number[]>} _varToPropagators Runtime mapping from var index to a list of constraint indexes that uses that var. Pregenerated.
 * @property {number[] _constrainedAway List of var indexes that were optimized away. Tracking them because they may need to become solved anyways.
 *
 * This is the immutable model for a search. The root space
 * (search node) will is based on and initialized from
 * a $config. The config should only contain immutable data
 * during a search.
 */
