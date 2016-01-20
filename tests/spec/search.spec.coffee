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

  {
    Space
  } = FD.Space

  {
    depth_first: depth_first_search
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

      space = new Space

      # branch vars
      branchVars = ['A', 'C', 'B', 'D']
      space.decl branchVars, spec_d_create_bool()

      # path vars
      Avars = ['A1', 'A2', 'A3']
      Bvars = ['B1', 'B2', 'B3']
      Cvars = ['C1', 'C2', 'C3']
      Dvars = ['D1', 'D2', 'D3']
      pathVars = [].concat Avars, Bvars, Cvars, Dvars
      space.decl pathVars, spec_d_create_bool()

      # path to branch binding
      space.sum Avars, 'A'
      space.sum Bvars, 'B'
      space.sum Cvars, 'C'
      space.sum Dvars, 'D'

      # root branches must be on
      space.eq 'A', space.decl_value 1
      space.eq 'C', space.decl_value 1

      # child-parent binding
      space.eq 'B', 'A2'
      space.eq 'D', 'C2'

      # D & B counterpoint
      space.decl 'BsyncD', spec_d_create_bool()
      space.reified 'eq', 'B', 'D', 'BsyncD'
      BD1 = space.reified 'eq', 'B1', 'D1'
      space.gte BD1, 'BsyncD'
      BD2 = space.reified 'eq', 'B2', 'D2'
      space.gte BD2, 'BsyncD'
      BD3 = space.reified 'eq', 'B3', 'D3'
      space.gte BD3, 'BsyncD'

      space.set_defaults 'fail_first'
      space.set_options targeted_var_names: pathVars

      state =
        space: space
        more: true

      count = 0
      console.time 'TIME'
      while state.more
        depth_first_search state
        break if state.status is 'end'
        count++
      console.timeEnd 'TIME'
      console.log "iterations: #{count}"

      expect(count).to.equal 19
