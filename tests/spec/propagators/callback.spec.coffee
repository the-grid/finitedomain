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

  describe 'integration tests', ->
    {
      space: Space
    } = FD

    {
      NO_SUCH_VALUE
    } = FD.helpers

    {
      _domain_get_value: domain_get_value
    } = FD.Domain

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

      space = new Space

      # some criteria to search for. callback will reject all but one.
      # (could also work with [0,255] but just takes longer...)
      [tr, tg, tb] = [2, 120, 201]
      space.decl 'R', spec_d_create_range 0, 3
      space.decl 'G', spec_d_create_range 119, 121
      space.decl 'B', spec_d_create_range 200, 203
      space.decl 'T', spec_d_create_range tr + tg + tb, tr + tg + tb
      space.sum ['R', 'G', 'B'], 'T'
      space.callback ['R', 'G', 'B'], cb

      space.set_options FD.distribution.get_defaults 'naive'
      space.set_options targeted_var_names: ['R', 'G', 'B']

      state = {space, more: true}
      count = 0
      while state.more and state.status isnt 'end'
        FD.search.depth_first state
        ++count
      # note: there are a few solutions for the sum(), but only one passes the callback
      expect(count).to.equal 2 # since it keeps searching, add +1 for the last one that fails
