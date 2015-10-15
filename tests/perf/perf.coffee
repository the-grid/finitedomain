if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  {
    spec_d_create_range
  } = require '../fixtures/domain.spec'

  # json files, basically. just large sets of input data. no need to clutter this page with them.
  o1 = require './o1'
  o2 = require './o2'
  o3 = require './o3'
  o4 = require './o4'
  o5 = require './o5'
  o6 = require './o6'
  o7 = require './o7'
  o8 = require './o8'
  o9 = require './o9'
  o10 = require './o10'
  o11 = require './o11'
  o12 = require './o12'
  o13 = require './o13'
  o15 = require './o15'

{expect, assert} = chai
FD = finitedomain

PathSolver = FD.PathSolver

describe 'perf', ->

  describe 'pipeline stuff', ->
    # these are the 16 main calls pipeline makes to FD. exported rawtree
    # from the PathSolver constructor as is and that's what you see here.

    it '1', ->
      m = {rawtree: o1}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '2', ->
      m = {rawtree: o2}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '3', ->
      m = {rawtree: o3}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '4', ->
      m = {rawtree: o4}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '5', ->
      m = {rawtree: o5}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '6', ->
      m = {rawtree: o6}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '7', ->
      m = {rawtree: o7}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '8', ->
      m = {rawtree: o8}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '9', ->
      m = {rawtree: o9}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '10', ->
      m = {rawtree: o10}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '11', ->
      m = {rawtree: o11}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '12', ->
      m = {rawtree: o12}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '13', ->
      m = {rawtree: o13}
      new FD.PathSolver(m).solve({log:1})
      expect(true).to.be.true

  describe 'repeat simple test', ->

    it 'repeat simple test 10x', ->
      # this data was exported from the "4.e) from-to - balanced h tracks" test in MultiverseJSON
      m = {rawtree: o15}

      for [0...10]
        new FD.PathSolver(m).solve({log:1})

      expect(true).to.be.true

###
 baseline in my machine:
 TODO: create an self updating graph for these stats to see perf over time
 note that the browser is considerably slower than this

      pipeline stuff
      - FD Solver Time: 66ms
      - FD solution count: 1000
      ✓ 1 (68ms)
      - FD Solver Time: 66ms
      - FD solution count: 1000
      ✓ 2 (67ms)
      - FD Solver Time: 0ms
      - FD solution count: 1
      ✓ 3
      - FD Solver Time: 0ms
      - FD solution count: 1
      ✓ 4
      - FD Solver Time: 1060ms
      - FD solution count: 1000
      ✓ 5 (1069ms)
      - FD Solver Time: 601ms
      - FD solution count: 1000
      ✓ 6 (604ms)
      - FD Solver Time: 0ms
      - FD solution count: 1
      ✓ 7
      - FD Solver Time: 0ms
      - FD solution count: 1
      ✓ 8
      - FD Solver Time: 100ms
      - FD solution count: 1000
      ✓ 10 (101ms)
      - FD Solver Time: 83ms
      - FD solution count: 1000
      ✓ 11 (84ms)
      - FD Solver Time: 0ms
      - FD solution count: 1
      ✓ 12
      - FD Solver Time: 0ms
      - FD solution count: 1
      ✓ 13
      - FD Solver Time: 37ms
      - FD solution count: 729
      ✓ 14 (38ms)
    repeat simple test
      - FD Solver Time: 798ms
      - FD solution count: 1000
      - FD Solver Time: 829ms
      - FD solution count: 1000
      - FD Solver Time: 819ms
      - FD solution count: 1000
      - FD Solver Time: 815ms
      - FD solution count: 1000
      - FD Solver Time: 813ms
      - FD solution count: 1000
      - FD Solver Time: 826ms
      - FD solution count: 1000
      - FD Solver Time: 818ms
      - FD solution count: 1000
      - FD Solver Time: 811ms
      - FD solution count: 1000
      - FD Solver Time: 819ms
      - FD solution count: 1000
      - FD Solver Time: 830ms
      - FD solution count: 1000
      ✓ repeat simple test 10x (8197ms)
###