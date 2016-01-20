module.exports = do ->

  {
    ASSERT
    ASSERT_SPACE
  } = require './helpers'

  {
    distribution_get_next_var
  } = require './distribution/var'

  {
    distribute_get_next_domain_for_var
  } = require './distribution/value'

  # Depth first search.
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

  depth_first = (state) ->
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
    create_next_space_node = state.next_choice or default_space_factory

    space = state.space
    stack = state.stack

    while stack.length > 0
      space = stack[stack.length - 1]
      ASSERT_SPACE space

      unless space.propagate()
        on_reject state, space, stack

      else if space.is_solved space
        # TOFIX: the "next" space is not made now, so if search continues does it do so properly?
        on_solve state, space, stack
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

  default_space_factory = (space) ->
    # all config should be read from root. sub-nodes dont clone this data
    root_space = space.get_root()

    target_vars = _get_vars_unfiltered root_space, space
    fdvar = distribution_get_next_var root_space, space, target_vars
    if fdvar
      next_domain = distribute_get_next_domain_for_var root_space, space, fdvar
      if next_domain
        clone = space.clone()
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

  _get_vars_unfiltered = (root_space, space) ->
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

  on_reject = (state, space, stack) ->
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

  on_solve = (state, space, stack) ->
    stack.pop()
    state.status = 'solved'
    state.space = space # is this so the solution can be read from it?
    state.more = stack.length > 0
    return

  return {
    depth_first

    # for testing
    _default_space_factory: default_space_factory
  }

# fly or die what do we do with this code?
#
#  Search.solve_for_variables = (var_names) ->
#    if var_names
#      return (S) ->
#        for var_name in var_names
#          unless fdvar_is_solved S.vars[var_name]
#            return false
#        return true
#    else
#      return (S) ->
#        S.is_solved()
#
#  # @public (this func is used outside of multiverse)
#
#  Search.solve_for_propagators = (space) ->
#    for prop_details in space._propagators
#      ASSERT_PROPAGATOR prop_details
#      for var_name in prop_details[PROP_VAR_NAMES]
#        unless fdvar_is_solved space.vars[var_name]
#          return false
#    return true
#
#
#  # Branch and bound search
#  # WARNING: Untested!
#  # TODO: Test this function and once the tests pass, remove the above warning.
#  #
#  # Finds the "best" solution according to the given ordering function.
#  # The `state` parameter is similar to the `depth_first` search function.
#  # It is expected to be an object such that `state.space` gives the space
#  # from which to search for the best solution.
#  #
#  # The `state` is also what is returned by `branch_and_bound` and `state.space`
#  # will be the space with the best solution found during the search. When a
#  # solution exists, `state.status` will be the string "solved".
#  #
#  # The `ordering` argument is expected to be a function of the form
#  #       function (space, a_solution) { ... }
#  # where the `space` argument is the space into which the ordering function
#  # should inject the new constraints for the ordering, and `a_solution` is
#  # an object whose keys are root finite domain variable names and whose
#  # values are the solved values of those variables. The return value of
#  # the ordering function is irrelevant.
#  #
#  # There are two ways to use the branch_and_bound function -
#  #    1. In one shot mode where a single call will give you the best
#  #       solution that it can find, if a solution exists at all.
#  #
#  #    2. In "single step" mode, indicated by setting `state.single_step` to `true`.
#  #       In this mode, the function will return whenever it finds a solved space
#  #       and `state.more` will indicate whether there may be any more solutions
#  #       to look at. In this mode, every call will result in a solution that is
#  #       "better" than the one found before it, due to the `ordering` function.
#  #
#  #       Note that if `state.more` is `false`, then definitely there are no
#  #       more solutions to look at, but if it is `true`, there *may* be more
#  #       solutions to look at. If a subsequent search turns up empty, it is
#  #       indicated by `state.status` being set to the string "end".
#  #
#
#  Search.branch_and_bound = (state, ordering) ->
#    console.log 'fixme'
#    throw new Error 'fixme'
#    bestSolution = state.best
#
#    # If no stack argument, then search begins with this space.
#    if !stack or stack.length is 0
#      ASSERT_SPACE state.space
#      # If no stack argument, then search begins with state.space
#      if state.stack
#        state.stack.push state.space
#      else
#        state.stack = [state.space]
#
#    stack = state.stack
#
#    choose_next_space = state.create_next_space_node or create_next_space_node
#    while stack.length > 0
#      space = stack[stack.length - 1]
#
#      # Wait for stability. Could throw a 'fail', in which case
#      # this becomes a failed space.
#      unless space.propagate()
#        on_reject state, space, stack
#        continue
#
#      if state.is_solved(space)
#        stack.pop()
#        state.status = 'solved'
#        state.space = space
#        state.more = stack.length > 0
#        # This space is now our "current best solution"
#        state.best = bestSolution = space
#        # We now try to find something better based on the given
#        # ordering.
#        if state.more
#          next_space = choose_next_space(stack[stack.length - 1], state)
#          while !next_space and stack.length > 0
#            stack.pop()
#            if stack.length > 0
#              next_space = choose_next_space(stack[stack.length - 1], state)
#            else
#              break
#          if next_space
#            # Constrain the search to be better than our current best solution.
#            ordering next_space, bestSolution.solution()
#            state.needs_constraining = false
#            stack.push next_space
#            # Continue the search. If we've been asked to
#            # single step, then just return the current state.
#            # the stack is already prepared so that the next call
#            # will initiate a search for a solution that is better
#            # than the one in state.space.
#            if state.single_step
#              return state
#            else
#              ++i
#              continue
#          else
#            # No more spaces to explore. We've already found
#            # the best solution that we can find in this tree.
#            state.more = false
#        # We have no more branches to explore.
#        # Return the best solution found so far.
#        return state
#
#      # Now this space is neither solved nor failed,
#      # therefore it is stable. (WARNING: Is this correct?)
#      next_space = choose_next_space(space, state)
#      if next_space
#        # Push on to the stack and explore further.
#        if state.needs_constraining and bestSolution
#          ordering next_space, bestSolution.solution()
#        state.needs_constraining = false
#        stack.push next_space
#      else
#        # Finished exploring branches of this space. Continue with the previous spaces.
#        # This is a stable space, but isn't a solution. Neither is it a failed space.
#        #
#        # TODO: Ideally, this condition should never occur and if it does, it is
#        # likely to be an error in the problem specification. Maybe I should
#        # throw up here?
#        space.stable_children++
#        stack.pop()
#        state.more = stack.length > 0
#        state.needs_constraining = true
#    # Failed space and no more options to explore.
#    state.status = if bestSolution then 'solved' else 'end'
#    state.more = false
#    # Note that state.space already contains the last - i.e. the "best" solution,
#    # If the original space passed to branch_and_bound actually has no solution,
#    # then state.space.failed will be true.
#    state
