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
    search: Search
    space: Space
  } = FD

  {
    depth_first: depth_first_search
  } = Search

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

      S = new Space

      # branch vars
      branchVars = ['A', 'C', 'B', 'D']
      S.decl branchVars, spec_d_create_bool()

      # path vars
      Avars = ['A1', 'A2', 'A3']
      Bvars = ['B1', 'B2', 'B3']
      Cvars = ['C1', 'C2', 'C3']
      Dvars = ['D1', 'D2', 'D3']
      pathVars = [].concat Avars, Bvars, Cvars, Dvars
      S.decl pathVars, spec_d_create_bool()

      # path to branch binding
      S.sum Avars, 'A'
      S.sum Bvars, 'B'
      S.sum Cvars, 'C'
      S.sum Dvars, 'D'

      # root branches must be on
      S.eq 'A', S.decl_value 1
      S.eq 'C', S.decl_value 1

      # child-parent binding
      S.eq 'B', 'A2'
      S.eq 'D', 'C2'

      # D & B counterpoint
      S.decl 'BsyncD', spec_d_create_bool()
      S.reified 'eq', 'B', 'D', 'BsyncD'
      S.gte(
        S.reified 'eq', 'B1', 'D1'
        'BsyncD'
      )
      S.gte(
        S.reified 'eq', 'B2', 'D2'
        'BsyncD'
      )
      S.gte(
        S.reified 'eq', 'B3', 'D3'
        'BsyncD'
      )

      S.set_defaults 'fail_first'
      S.set_options targeted_var_names: pathVars

      state = {space: S, more: true}

      count = 0
      console.time 'TIME'
      while state.more
        depth_first_search state
        break if state.status is 'end'
        count++
      console.timeEnd 'TIME'
      console.log "iterations: #{count}"

      expect(count).to.equal 19
