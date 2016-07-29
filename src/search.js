import {
  NO_SUCH_VALUE,
  ASSERT,
} from './helpers';
import {
  space_createClone,
  space_updateUnsolvedVarList,
  space_propagate,
} from './space';
import {
  domain_any_isSolved,
} from './domain';
import distribution_getNextVar from './distribution/var';
import distribute_getNextDomainForVar from './distribution/value';

// BODY_START

/**
 * Depth first search.
 *
 * Traverse the search space in DFS order and return the first (next) solution
 *
 * state.space must be the starting space. The object is used to store and
 * track continuation information from that point onwards.
 *
 * On return, state.status contains either 'solved' or 'end' to indicate
 * the status of the returned solution. Also state.more will be true if
 * the search can continue and there may be more solutions.
 *
 * @param {Object} state
 * @property {$space} state.space Root space if this is the start of searching
 * @property {boolean} [state.more] Are there spaces left to investigate after the last solve?
 * @property {$space[]} [state.stack]=[state,space] The search stack as initialized by this class
 * @property {Function} [state.is_solved] Custom function to tell us whether a space is solved
 * @property {Function} [state.next_choice] Custom function to create new space (-> searching nodes)
 * @property {string} [state.status] Set to 'solved' or 'end'
 */
function search_depthFirst(state) {
  let isStart = !state.stack || state.stack.length === 0;
  if (isStart) {
    // If no stack argument, then search begins with state.space
    if (state.stack) {
      state.stack.push(state.space);
    } else {
      state.stack = [state.space];
    }
  }

  // this function clones the current space and then restricts an unsolved
  // var in the clone to see whether this breaks anything. The loop below
  // keeps doing this until something breaks or all target vars are solved.
  let createNextSpaceNode = state.next_choice || search_defaultSpaceFactory;
  let stack = state.stack;

  while (stack.length > 0) {
    let solved = search_depthFirstLoop(stack[stack.length - 1], stack, state, createNextSpaceNode);
    if (solved) return;
  }

  // Failed space and no more options to explore.
  state.status = 'end';
  state.more = false;
}

/**
 * One search step of the given space
 *
 * @param {$space} space
 * @param {$space[]} stack
 * @param {Object} state See search_depthFirst
 * @param {Function} createNextSpaceNode Clones the current space and reduces one var in the new space
 * @returns {boolean}
 */
function search_depthFirstLoop(space, stack, state, createNextSpaceNode) {
  let rejected = space_propagate(space);
  if (rejected) {
    _search_onReject(state, space, stack);
    return false;
  }

  let solved = space_updateUnsolvedVarList(space);
  if (solved) {
    _search_onSolve(state, space, stack);
    return true;
  }

  let next_space = createNextSpaceNode(space, state);
  if (next_space) {
    // Now this space is neither solved nor failed but since
    // no constraints are rejecting we must look further.
    // Push on to the stack and explore further.
    stack.push(next_space);
  } else {
    // Finished exploring branches of this space. Continue with the previous spaces.
    // This is a stable space, but isn't a solution. Neither is it a failed space.
    space.stable_children++;
    stack.pop();
  }
  return false;
}

/**
 * Create a new Space based on given Space which basically
 * serves as a child node in a search graph. The space is
 * cloned and in the clone one variable is restricted
 * slightly further. This clone is then returned.
 * This takes various search and distribution strategies
 * into account.
 *
 * @param {$space} space
 * @returns {$space|undefined} a clone with small modification or nothing if this is an unsolved leaf node
 */
function search_defaultSpaceFactory(space) {
  let varIndex = distribution_getNextVar(space);

  if (varIndex !== NO_SUCH_VALUE) {
    ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
    ASSERT(varIndex >= 0, 'VAR_INDEX_SHOULD_BE_POSITIVE');

    let domain = space.vardoms[varIndex];
    if (!domain_any_isSolved(domain)) {
      let choice = space.next_distribution_choice++;
      let nextDomain = distribute_getNextDomainForVar(space, varIndex, choice);
      if (nextDomain) {
        let clone = space_createClone(space);
        clone.updatedVarIndex = varIndex;
        clone.vardoms[varIndex] = nextDomain;
        return clone;
      }
    }
  }

  // space is an unsolved leaf node, return undefined
}

/**
 * When search fails this function is called
 *
 *
 * @param {Object} state The search state data
 * @param {$space} space The search node to fail
 * @param {$space[]} stack See state.stack
 */
function _search_onReject(state, space, stack) {
  // Some propagators failed so this is now a failed space and we need
  // to pop the stack and continue from above. This is a failed space.
  space.failed = true;
  stack.pop();
}

/**
 * When search finds a solution this function is called
 *
 * @param {Object} state The search state data
 * @param {Space} space The search node to fail
 * @param {Space[]} stack See state.stack
 */
function _search_onSolve(state, space, stack) {
  stack.pop();
  state.status = 'solved';
  state.space = space; // is this so the solution can be read from it?
  state.more = stack.length > 0;
}

// BODY_STOP

export default search_depthFirst;
