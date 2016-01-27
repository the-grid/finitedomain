module.exports = do ->

  {
    ASSERT
    ASSERT_SPACE
  } = require './helpers'

  {
    space_create_clone
    space_get_root
    space_is_solved
    space_propagate
  } = require './space'

  {
    distribution_get_next_var
  } = require './distribution/var'

  {
    distribute_get_next_domain_for_var
  } = require './distribution/value'

  # BODY_START

  # Depth first search.
  #
  # Traverse the search space in DFS order and return the first (next) solution
  #
  # state.space must be the starting space. The object is used to store and
  # track continuation information from that point onwards.
  #
  # On return, state.status contains either 'solved' or 'end' to indicate
  # the status of the returned solution. Also state.more will be true if
  # the search can continue and there may be more solutions.
  #
  # @param {Object} state
  # @property {Space} state.space Root space if this is the start of searching
  # @property {boolean} [state.more] Are there spaces left to investigate after the last solve?
  # @property {Space[]} [state.stack]=[state,space] The search stack as initialized by this class
  # @property {Function} [state.is_solved] Custom function to tell us whether a space is solved
  # @property {Function} [state.next_choice] Custom function to create new space (-> searching nodes)
  # @property {string} [state.status] Set to 'solved' or 'end'

  search_depth_first = (state) ->
    is_start = !state.stack or state.stack.length is 0
    if is_start
      ASSERT_SPACE state.space
      # If no stack argument, then search begins with state.space
      if state.stack
        state.stack.push state.space
      else
        state.stack = [state.space]

    # this function clones the current space and then restricts an unsolved
    # var in the clone to see whether this breaks anything. The loop below
    # keeps doing this until something breaks or all target vars are solved.
    create_next_space_node = state.next_choice or _search_default_space_factory

    space = state.space
    stack = state.stack

    while stack.length > 0
      space = stack[stack.length - 1]
      ASSERT_SPACE space

      unless space_propagate space
        _search_on_reject state, space, stack

      else if space_is_solved space
        _search_on_solve state, space, stack
        return

      else if next_space = create_next_space_node space, state
        ASSERT_SPACE next_space
        # Now this space is neither solved nor failed but since
        # no constraints are rejecting we must look further.
        # Push on to the stack and explore further.
        stack.push next_space
      else
        # Finished exploring branches of this space. Continue with the previous spaces.
        # This is a stable space, but isn't a solution. Neither is it a failed space.
        space.stable_children++
        stack.pop()

    # Failed space and no more options to explore.
    state.status = 'end'
    state.more = false
    return

  # Create a new Space based on given Space which basically
  # serves as a child node in a search graph. The space is
  # cloned and in the clone one variable is restricted
  # slightly further. This clone is then returned.
  # This takes various search and distribution strategies
  # into account.
  #
  # @param {Space} space
  # @returns {Space} a clone with small modification

  _search_default_space_factory = (space) ->
    # all config should be read from root. sub-nodes dont clone this data
    root_space = space_get_root space

    target_vars = _search_get_vars_unfiltered root_space, space
    fdvar = distribution_get_next_var root_space, space, target_vars
    if fdvar
      next_domain = distribute_get_next_domain_for_var root_space, space, fdvar
      if next_domain
        clone = space_create_clone space
        clone.vars[fdvar.id].dom = next_domain
        return clone

    return # space is an unsolved leaf node

  # Return all the targeted variables without filtering them first.
  # The filter can only be applied later because it may be overridden
  # by an fdvar-specific config.
  # One of the returned fdvar names will be picked to restrict.
  #
  # @param {Space} root_space Root of the search graph (config is read from this space)
  # @param {Space} space The current node, can be the root_space
  # @returns {string[]} The names of targeted fdvars on given space

  _search_get_vars_unfiltered = (root_space, space) ->
    config_targeted_vars = root_space.config_targeted_vars

    if config_targeted_vars is 'all'
      return space.unsolved_var_names

    if config_targeted_vars instanceof Array
      return config_targeted_vars

    ASSERT typeof config_targeted_vars is 'function', 'config_targeted_vars should be a func at this point', config_targeted_vars
    return config_target_vars space

  # When search fails this function is called
  #
  # @param {Object} state The search state data
  # @param {Space} space The search node to fail
  # @param {Space[]} stack See state.stack

  _search_on_reject = (state, space, stack) ->
    # Some propagators failed so this is now a failed space and we need
    # to pop the stack and continue from above. This is a failed space.
    space.failed = true
    stack.pop()
    return

  # When search finds a solution this function is called
  #
  # @param {Object} state The search state data
  # @param {Space} space The search node to fail
  # @param {Space[]} stack See state.stack

  _search_on_solve = (state, space, stack) ->
    stack.pop()
    state.status = 'solved'
    state.space = space # is this so the solution can be read from it?
    state.more = stack.length > 0
    return

  # BODY_STOP

  return {
    search_depth_first

    # __REMOVE_BELOW_FOR_DIST__
    # for testing
    _default_space_factory: _search_default_space_factory
    # __REMOVE_ABOVE_FOR_DIST__
  }
