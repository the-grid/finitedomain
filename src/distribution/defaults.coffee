# Distribution strategies

module.exports = do ->

  {
    THROW
  } = require '../helpers'

  # BODY_START

  PRESETS =
    'default':
      var: 'naive'
      val: 'min'

    # The native distribution strategy simply steps through all
    # undetermined variables.
    'naive':
      var: 'naive'
      val: 'min'

    # The "fail first" strategy branches on the variable with the
    # smallest domain size.
    'fail_first':
      var: 'size'
      val: 'min'

    # The "domain splitting" strategy where each domain is roughly
    # halved in each step. The 'varname' argument can be either a
    # single fdvar name or an array of names or an object whose
    # values are fdvar names.
    'split':
      var: 'size'
      val: 'splitMin'

  distribution_get_defaults = (name) ->
    if PRESETS[name]
      return PRESETS[name]
    THROW "distribution.get_defaults: Unknown preset: #{name}"
    return

  # BODY_STOP

  return {
    distribution_get_defaults
  }
