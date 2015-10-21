
module.exports = (FD) ->
  {
    ASSERT_PROPAGATOR
    ASSERT_SPACE
  } = FD.helpers

  {
    PROP_VAR_NAMES
  } = FD.propagators

  {
    fdvar_is_solved
  } = FD.Var

  Search = FD.search = {}

  # A "class function" for making "is_solved" testers
  # for use during search.
  # A simple mechanism for branching down a search tree where the
  # choice points function and info about the number of choices
  # are both stored in the space itself. This doesn't have to be
  # the case, however, and you can roll your own strategy and
  # pass it in the "state.next_choice" field.
  #
  # This implementation stores information that is local to
  # a space in the space itself. That doesn't have to be the
  # case and the whole search state is passed in which you
  # can make use of for tracking purposes. For example, you can
  # have a stack of choice functions that you can use to recompute
  # a space at any depth by starting from the root and applying
  # the options in sequence to a clone of the root space.
  #
  # The implementation below suffices for the depth_first and
  # branch_and_bound search strategies.

  next_choice = (space, state) ->
    value_distributor = space.current_value_distributor
    unless value_distributor
      # The get_value_distributor call returns a function that when
      # called with a choice index will constrains a chosen variable
      # to a domain indexed by its value function.
      value_distributor = space.get_value_distributor space

      space.current_value_distributor = value_distributor
      space.next_distribution_choice = 0

    if value_distributor # see distribute/value.coffee
      return value_distributor space, space.next_distribution_choice++

  Search.solve_for_variables = (var_names) ->
    if var_names
      return (S) ->
        for var_name in var_names
          unless fdvar_is_solved S.vars[var_name]
            return false
        return true
    else
      return (S) ->
        S.is_solved()

  # @public (this func is used outside of multiverse)

  Search.solve_for_propagators = (space) ->
    for prop_details in space._propagators
      ASSERT_PROPAGATOR prop_details
      for var_name in prop_details[PROP_VAR_NAMES]
        unless fdvar_is_solved space.vars[var_name]
          return false
    return true

  # Initialize the state object for depth first search
  # and maybe others... :)

  # @param {Object} state
  # @property {Space} state.space
  # @property {boolean} [state.more]=false
  # @property {Space[]} [state.stack]=[state,space]
  # @property {Function} [state.is_solved]=Search.solve_for_variables()
  # @property {Function} [state.next_choice]=next_choice
  # @property {string} state.status No initial value, but after a search set to "solved" if state.space has a solution, or "end" when all search space has been exhausted without (further) solutions
  # @property {boolean} state.more No initial value but set to `true` if the stack is non-empty after a successful result. False otherwise.

  init_state_for_depth_first = (state) ->
    if !state.stack or state.stack.length == 0
      ASSERT_SPACE state.space
      # If no stack argument, then search begins with state.space
      state.stack = [state.space]

    unless state.is_solved
      # Set the default "solved" condition to be "all variables".
      state.is_solved = Search.solve_for_variables()

    unless state.next_choice
      # Set the default branch generator to the next_choice
      # function, which is a simple implementation of generating
      # branches from index 0 to N-1.
      state.next_choice = next_choice

    unless state.status
      state.status = '' # TODO: should it be initialized to something? like when continuing after a successful search

    unless typeof state.more is 'boolean'
      state.more = false # should this be set to false regardless? this is a new search...

    return # is unused

  # Depth first search.
  # state.space must be the starting space. The object is used to store and
  # track continuation information from that point onwards.
  #
  # On return, state.status contains either 'solved' or 'end' to indicate
  # the status of the returned solution. Also state.more will be true if
  # the search can continue and there may be more solutions.

  # @see init_state_for_depth_first for details on state object

  Search.depth_first = (state) ->
    init_state_for_depth_first state

    stack = state.stack
    choose_next_space = state.next_choice
    while stack.length > 0
      space = stack[stack.length - 1]
      # Wait for stability. Could throw a 'fail', in which case
      # this becomes a failed space.
      ASSERT_SPACE space
      unless space.propagate()
        # Some propagators failed so this is now a failed space and we need
        # to pop the stack and continue from above. This is a failed space.
        space.failed = true
        space.done()
        stack.pop()
        continue

      if state.is_solved(space)
        space.succeeded_children++
        space.done()
        stack.pop()
        state.status = 'solved'
        state.space = space
        state.more = stack.length > 0
        return state

      # Now this space is neither solved nor failed,
      # therefore it is stable. (WARNING: Is this correct?)
      next_space = choose_next_space space, state
      if next_space
        # Push on to the stack and explore further.
        stack.push next_space
      else
        # Finished exploring branches of this space. Continue with the previous spaces.
        # This is a stable space, but isn't a solution. Neither is it a failed space.
        space.stable_children++
        space.done()
        stack.pop()
        state.more = stack.length > 0
    # Failed space and no more options to explore.
    state.status = 'end'
    state.more = false
    state

  # Branch and bound search
  # WARNING: Untested!
  # TODO: Test this function and once the tests pass, remove the above warning.
  #
  # Finds the "best" solution according to the given ordering function.
  # The `state` parameter is similar to the `depth_first` search function.
  # It is expected to be an object such that `state.space` gives the space
  # from which to search for the best solution.
  #
  # The `state` is also what is returned by `branch_and_bound` and `state.space`
  # will be the space with the best solution found during the search. When a
  # solution exists, `state.status` will be the string "solved".
  #
  # The `ordering` argument is expected to be a function of the form
  #       function (space, a_solution) { ... }
  # where the `space` argument is the space into which the ordering function
  # should inject the new constraints for the ordering, and `a_solution` is
  # an object whose keys are root finite domain variable names and whose
  # values are the solved values of those variables. The return value of
  # the ordering function is irrelevant.
  #
  # There are two ways to use the branch_and_bound function -
  #    1. In one shot mode where a single call will give you the best
  #       solution that it can find, if a solution exists at all.
  #
  #    2. In "single step" mode, indicated by setting `state.single_step` to `true`.
  #       In this mode, the function will return whenever it finds a solved space
  #       and `state.more` will indicate whether there may be any more solutions
  #       to look at. In this mode, every call will result in a solution that is
  #       "better" than the one found before it, due to the `ordering` function.
  #
  #       Note that if `state.more` is `false`, then definitely there are no
  #       more solutions to look at, but if it is `true`, there *may* be more
  #       solutions to look at. If a subsequent search turns up empty, it is
  #       indicated by `state.status` being set to the string "end".
  #

  Search.branch_and_bound = (state, ordering) ->
    space = state.space
    stack = state.stack
    next_space = undefined
    choose_next_space = undefined
    bestSolution = state.best
    if state.error
      # If a search tree state with an error is passed in,
      # we throw up immediately.
      throw state
    # If no stack argument, then search begins with this space.
    if !stack or stack.length == 0
      stack = state.stack = [ space ]
    if !state.is_solved
      # Set the default "solved" condition to be "all variables".
      state.is_solved = Search.solve_for_variables()
    if !state.next_choice
      # Set the default branch generator to the next_choice
      # function, which is a simple implementation of generating
      # branches from index 0 to N-1.
      state.next_choice = next_choice
    choose_next_space = state.next_choice
    while stack.length > 0
      space = stack[stack.length - 1]
      # Wait for stability. Could throw a 'fail', in which case
      # this becomes a failed space.
      unless space.propagate()
        # Some propagators failed so this is now a failed space and we need
        # to pop the stack and continue from above. This is a failed space.
        space.failed = true
        space.done()
        stack.pop()
        continue

      if state.is_solved(space)
        space.succeeded_children++
        space.done()
        stack.pop()
        state.status = 'solved'
        state.space = space
        state.more = stack.length > 0
        # This space is now our "current best solution"
        state.best = bestSolution = space
        # We now try to find something better based on the given
        # ordering.
        if state.more
          next_space = choose_next_space(stack[stack.length - 1], state)
          while !next_space and stack.length > 0
            stack[stack.length - 1].done()
            stack.pop()
            if stack.length > 0
              next_space = choose_next_space(stack[stack.length - 1], state)
            else
              break
          if next_space
            # Constrain the search to be better than our current best solution.
            ordering next_space, bestSolution.solution()
            state.needs_constraining = false
            stack.push next_space
            # Continue the search. If we've been asked to
            # single step, then just return the current state.
            # the stack is already prepared so that the next call
            # will initiate a search for a solution that is better
            # than the one in state.space.
            if state.single_step
              return state
            else
              ++i
              continue
          else
            # No more spaces to explore. We've already found
            # the best solution that we can find in this tree.
            state.more = false
        # We have no more branches to explore.
        # Return the best solution found so far.
        return state

      # Now this space is neither solved nor failed,
      # therefore it is stable. (WARNING: Is this correct?)
      next_space = choose_next_space(space, state)
      if next_space
        # Push on to the stack and explore further.
        if state.needs_constraining and bestSolution
          ordering next_space, bestSolution.solution()
        state.needs_constraining = false
        stack.push next_space
      else
        # Finished exploring branches of this space. Continue with the previous spaces.
        # This is a stable space, but isn't a solution. Neither is it a failed space.
        #
        # TODO: Ideally, this condition should never occur and if it does, it is
        # likely to be an error in the problem specification. Maybe I should
        # throw up here?
        space.stable_children++
        space.done()
        stack.pop()
        state.more = stack.length > 0
        state.needs_constraining = true
    # Failed space and no more options to explore.
    state.status = if bestSolution then 'solved' else 'end'
    state.more = false
    # Note that state.space already contains the last - i.e. the "best" solution,
    # If the original space passed to branch_and_bound actually has no solution,
    # then state.space.failed will be true.
    state


  FD
