/**
 * @typedef {Object} $finitedomain_space
 * @property {$config} config
 * @property {$domain[]} vardoms Maps 1:1 to stato.allVarNames
 * @property {number[]} unsolvedVarIndexes Maps to stato.allVarNames
 * @property {number} next_distribution_choice Current decision in search node
 * @property {number} [updatedVarIndex=-1] varIndex that was updated when creating this space (-1 for root)
 *
 * A Space is basically a search node in the search graph that finitedomain excavates.
 * It has a central config which contains all the variables and some initialization
 * data for the root space (-> start of the search) and a stato which contains generated
 * precomputations derived from the config (var indexes and so forth).
 * Each space has a list of unsolved propagators and variables. This is an optimization
 * step because once a variable or propagator becomes _solved_ it can only reject but
 * never otherwise become unsolved. Note that propagators can be stale yet unsolved and
 * this is not the same as solved in this context. Solved propagators can't get unsolved.
 */

/**
 * @typedef {$finitedomain_space} $space
 *
 * Unnamespaced alias for finitedomain repo
 */
