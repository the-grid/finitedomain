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
  domain_isSolved,
} from './domain';
import distribution_getNextVarIndex from './distribution/var';
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
 * @property {string} [state.status] Set to 'solved' or 'end'
 * @param {$config} config
 */
function search_depthFirst(state, config) {
  let stack = state.stack;

  // the stack only contains stable spaces. the first space is not
  // stable so we propagate it first and before putting it on the stack.
  let isStart = !stack || stack.length === 0;
  if (isStart) {
    if (!stack) stack = state.stack = [];
    let solved = search_depthFirstLoop(state.space, config, stack, state);
    if (solved) return;
  }

  while (stack.length > 0) {
    // take the top space and generate the next offspring, if any
    let childSpace = search_createNextSpace(stack[stack.length - 1], config);
    if (childSpace) {
      // stabilize the offspring and put it on the stack
      let solved = search_depthFirstLoop(childSpace, config, stack, state);
      if (solved) return;
    } else {
      // remove the space, it has no more children. this is a dead end.
      stack.pop();
    }
  }

  // there are no more spaces to explore and therefor no further solutions to be found.
  state.status = 'end';
  state.more = false;
}

/**
 * One search step of the given space
 *
 * @param {$space} space
 * @param {$config} config
 * @param {$space[]} stack
 * @param {Object} state See search_depthFirst
 * @returns {boolean}
 */
function search_depthFirstLoop(space, config, stack, state) {
  let rejected = space_propagate(space, config);

  return search_afterPropagation(rejected, space, config, stack, state);
}

/**
 * Process a propagated space and the result. If it rejects, discard the
 * space. If it passed, act accordingly. Otherwise determine whether the
 * space has children. If so queue them. Otherwise discard the space.
 *
 * @param {boolean} rejected Did the propagation end due to a rejection?
 * @param {$space} space
 * @param {$config} config
 * @param {$space[]} stack
 * @param {Object} state See search_depthFirst
 * @returns {boolean|undefined}
 */
function search_afterPropagation(rejected, space, config, stack, state) {
  if (rejected) {
    _search_onReject(state, space, stack);
    return false;
  }

  let solved = space_updateUnsolvedVarList(space, config);
  if (solved) {
    _search_onSolve(state, space, stack);
    return true;
  }

  // put on the stack so the next loop can branch off it
  stack.push(space);

  return undefined; // neither solved nor rejected
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
 * @param {$config} config
 * @returns {$space|undefined} a clone with small modification or nothing if this is an unsolved leaf node
 */
function search_createNextSpace(space, config) {
  let varIndex = distribution_getNextVarIndex(space, config);
  ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
  ASSERT(varIndex >= 0, 'VAR_INDEX_SHOULD_BE_POSITIVE');

  if (varIndex !== NO_SUCH_VALUE) {
    let domain = space.vardoms[varIndex];
    if (!domain_isSolved(domain)) {
      let choice = space.next_distribution_choice++;
      let nextDomain = distribute_getNextDomainForVar(space, config, varIndex, choice);
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
}

/**
 * When search finds a solution this function is called
 *
 * @param {Object} state The search state data
 * @param {Space} space The search node to fail
 * @param {Space[]} stack See state.stack
 */
function _search_onSolve(state, space, stack) {
  state.status = 'solved';
  state.space = space; // is this so the solution can be read from it?
  state.more = stack.length > 0;
}

// BODY_STOP

export default search_depthFirst;
export {
  search_afterPropagation,
  search_createNextSpace,
};
