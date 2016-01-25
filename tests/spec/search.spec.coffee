if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_bool
    spec_d_create_range
    spec_d_create_ranges
  } = require '../fixtures/domain.spec'

{expect, assert} = chai
FD = finitedomain

describe "search.spec", ->

  unless FD.__DEV_BUILD
    return

  {
    space_add_var
    space_add_vars_domain
    space_create_root
    space_eq
    space_gte
    space_reified
    space_set_defaults
    space_set_options
    space_sum
  } = FD.space

  {
    search_depth_first
  } = FD.search

  describe 'depth first search', ->

    it 'should solve 4 branch 2 level example (binary)', ->

      ###
      A
        1
        2 - B
        3     1
              2
              3
      C
        1
        2 - D
        3     1
              2
              3
      ###

      space = space_create_root()

      # branch vars
      branchVars = ['A', 'C', 'B', 'D']
      space_add_vars_domain space, branchVars, 0, 1

      # path vars
      Avars = ['A1', 'A2', 'A3']
      Bvars = ['B1', 'B2', 'B3']
      Cvars = ['C1', 'C2', 'C3']
      Dvars = ['D1', 'D2', 'D3']
      pathVars = [].concat Avars, Bvars, Cvars, Dvars
      space_add_vars_domain space, pathVars, 0, 1

      # path to branch binding
      space_sum space, Avars, 'A'
      space_sum space, Bvars, 'B'
      space_sum space, Cvars, 'C'
      space_sum space,Dvars, 'D'

      # root branches must be on
      space_eq space, 'A', 1
      space_eq space, 'C', 1

      # child-parent binding
      space_eq space, 'B', 'A2'
      space_eq space, 'D', 'C2'

      # D & B counterpoint
      space_add_var space, 'BsyncD', 0, 1
      space_reified space, 'eq', 'B', 'D', 'BsyncD'
      BD1 = space_reified space, 'eq', 'B1', 'D1'
      space_gte space, BD1, 'BsyncD'
      BD2 = space_reified space, 'eq', 'B2', 'D2'
      space_gte space, BD2, 'BsyncD'
      BD3 = space_reified space, 'eq', 'B3', 'D3'
      space_gte space, BD3, 'BsyncD'

      space_set_defaults space, 'fail_first'
      space_set_options space, targeted_var_names: pathVars

      state =
        space: space
        more: true

      count = 0
      console.time 'TIME'
      while state.more
        search_depth_first state
        break if state.status is 'end'
        count++
      console.timeEnd 'TIME'
      console.log "iterations: #{count}"

      expect(count).to.equal 19
