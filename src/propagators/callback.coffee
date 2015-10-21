module.exports = (FD) ->
  {
    REJECTED
    ZERO_CHANGES
  } = FD.helpers

  # Given function should be called each step, passing on the current variables and
  # space, and return whether their state is acceptable or not. Rejects when not.
  # The callback call will block the FD search (or at least the current "thread").

  callback_step_bare = (space, var_names, func) ->
    # the callback should return `false` if the state should be rejected, `true` otherwise
    if func space, var_names
      return ZERO_CHANGES
    return REJECTED

  FD.propagators.callback_step_bare = callback_step_bare
