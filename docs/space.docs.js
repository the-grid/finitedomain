/**
 * @typedef {Object} $space
 * @property {$domain[]} vardoms Maps 1:1 to config.all_var_names
 * @property {number[]} _unsolved Maps to config.all_var_names and are the var indexes that are not solved in this space
 * @property {number} next_distribution_choice Current decision in search node
 * @property {number} updatedVarIndex=-1 varIndex that was updated when creating this space (-1 for root)
 * @property {number} _lastChosenValue=-1 The value selected in the previous choice in the value distributor
 *
 * A Space is basically a search node in the search graph that finitedomain excavates.
 * It has a central config which contains all the variables and some initialization
 * data for the root space (-> start of the search) as well as generated
 * precomputations derived from the config (var indexes and so forth).
 * Each space holds the list of current domains for all vars and a list of vars that are
 * unsolved. That last list is an optimization preventing large loops down the line. Solved
 * vars can only reject but will never grow (become unsolved) otherwise. The end goal of
 * the solver is to shrink `_unsolved` to empty.
 * Note that propagators can be stale yet unsolved and this is not the same as solved in
 * this context. Solved propagators can't get unsolved but we don't track them at the moment.
 */
