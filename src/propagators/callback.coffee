module.exports = (FD) ->
  {
    REJECTED
    ZERO_CHANGES
  } = FD.helpers

  {
    propagator_create
  } = FD.Propagator

  # Given function should be called each step, passing on the current variables and
  # space, and return whether their state is acceptable or not. Rejects when not.
  # The callback call will block the FD search (or at least the current "thread").

  callback_stepper = (propagator, func) ->
    # the callback should return `false` if the state should be rejected, `true` otherwise
    # (slice at 1 because first element is from_space)
    vars = propagator.propdata.slice 1
    if func vars, propagator.from_space
      return ZERO_CHANGES
    return REJECTED

  propagator_create_callback = (space, var_names, callback) ->
    return propagator_create space, var_names, ->
      return callback_stepper @, callback

  FD.propagators.propagator_create_callback = propagator_create_callback
