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
import distribution_getNextVarIndex from './distribution/var';
import distribute_getNextDomainForVar from './distribution/value';

import {
  domt_duplicateNode,
  domt_replaceDomain,
} from './domt';

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
  let isStart = !state.stack || state.stack.length === 0;
  if (isStart) {
    // If no stack argument, then search begins with state.space
    if (state.stack) {
      state.stack.push(state.space);
    } else {
      state.stack = [state.space];
    }
  }

  let stack = state.stack;
  while (stack.length > 0) {
    let solved = search_depthFirstLoop(stack[stack.length - 1], config, stack, state);
    if (solved) return;
  }

  // Failed space and no more options to explore.
  state.status = 'end';
  state.more = false;
}
//let steps = 0;
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
  // we backtrack, update the last node in the data model with the previous space
  // I don't like doing it this way but what else?
  config._front.lastNodeIndex = space.frontNodeIndex;
  config._domt.lastNodeIndex = space._domtNodeIndex;

  //++steps;
  //console.log('step', steps, 'of 2455 ('+(steps/24.55).toPrecision(2)+'%) last node size:', config._domt.buffer[config._domt.lastNodeIndex], 'propsteps:', config._steps - ssteps);

  let rejected = space_propagate(space, config);

  // tmp
  // copy domain state from this space, now, to the domt

  // ok domains could actually expand meaning we'd need to move them in the struct
  // that's fine because the only time when this may happen is when the node is the last
  // it may lead to a few inefficiencies but we can fix that by sealing the node next time we dupe it. or just leave it as is.

  let vardoms = space.vardoms;
  for (let i = 0, len = vardoms.length; i < len; ++i) {
    domt_replaceDomain(config._domt, space._domtNodeIndex, i, vardoms[i]);
  }

  //console.log('last index before clone:', config._domt.lastNodeIndex);
  //_domt_debug(config._domt, config._domt.lastNodeIndex, 0, false, 'search_depthFirstLoop');

  if (rejected) {
    //_domt_debug(config._domt, 0, config._domt.lastNodeIndex, false, 'on_fail');

    _search_onReject(state, space, stack);
    return false;
  }

  let solved = space_updateUnsolvedVarList(space, config);
  if (solved) {
    //_domt_debug(config._domt, true);

    _search_onSolve(state, space, stack);
    return true;
  }

  let next_space = search_createNextSpace(space, config);
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
 * @param {$config} config
 * @returns {$space|undefined} a clone with small modification or nothing if this is an unsolved leaf node
 */
function search_createNextSpace(space, config) {
  let varIndex = distribution_getNextVarIndex(space, config);

  if (varIndex !== NO_SUCH_VALUE) {
    ASSERT(typeof varIndex === 'number', 'VAR_INDEX_SHOULD_BE_NUMBER');
    ASSERT(varIndex >= 0, 'VAR_INDEX_SHOULD_BE_POSITIVE');

    let domain = space.vardoms[varIndex];
    if (!domain_any_isSolved(domain)) {
      let choice = space.next_distribution_choice++;
      let nextDomain = distribute_getNextDomainForVar(space, config, varIndex, choice);
      if (nextDomain) {
        let clone = space_createClone(space);

        domt_duplicateNode(config._domt);
        clone._domtNodeIndex = config._domt.lastNodeIndex;
        //console.log('last index of clone:', config._domt.lastNodeIndex);
        //_domt_debug(config._domt, config._domt.lastNodeIndex, 0, false, 'search_createNextSpace');

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
