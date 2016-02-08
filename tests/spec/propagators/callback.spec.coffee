if typeof require is 'function'
  finitedomain = require '../../../src/index'
  chai = require 'chai'
  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_value
  } = require '../../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "propagators/callback.spec", ->

  unless FD.__DEV_BUILD
    return

  {
    config_set_options
    config_set_defaults
  } = FD.config

  {
    space_add_vars
  } = FD.space

  {
    propagator_add_callback
    propagator_add_sum
  } = FD.propagator

  describe 'integration tests', ->

    {
      space_add_var
      space_create_root
    } = FD.space

    {
      NO_SUCH_VALUE
    } = FD.helpers

    {
      _domain_get_value: domain_get_value
    } = FD.domain

    {
      search_depth_first
    } = FD.search

    {
      distribution_get_defaults
    } = FD.distribution.defaults

    it 'should be able to access the var names array', ->

      cb = (space, var_names) ->

        vars = space.vars

        rv = domain_get_value vars[var_names[0]].dom
        gv = domain_get_value vars[var_names[1]].dom
        bv = domain_get_value vars[var_names[2]].dom

        if rv is NO_SUCH_VALUE or gv is NO_SUCH_VALUE or bv is NO_SUCH_VALUE
          return true # at least one domain isnt a single value; keep searching

        # exact match now
        return rv is tr and gv is tg and bv is tb

      space = space_create_root()

      # some criteria to search for. callback will reject all but one.
      # (could also work with [0,255] but just takes longer...)
      [tr, tg, tb] = [2, 120, 201]
      space_add_vars space,
        ['R', 0, 3]
        ['G', 119, 121]
        ['B', 200, 203]
        ['T', tr + tg + tb, tr + tg + tb]

      propagator_add_sum space, ['R', 'G', 'B'], 'T'
      propagator_add_callback space, ['R', 'G', 'B'], cb

      config_set_defaults space.config, 'naive'
      config_set_options space.config, targeted_var_names: ['R', 'G', 'B']

      state = {space, more: true}
      count = 0
      while state.more and state.status isnt 'end'
        search_depth_first state
        ++count
      # note: there are a few solutions for the sum(), but only one passes the callback
      expect(count).to.equal 2 # since it keeps searching, add +1 for the last one that fails
