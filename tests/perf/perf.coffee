# workaround implicit local scope of node vs browser and coffee
w = {}
if typeof window isnt 'undefined'
  w = window

if typeof require is 'function'
  finitedomain = require '../../src/index'
  chai = require 'chai'

  # json files, basically. just large sets of input data. no need to clutter this page with them.
  w.o1 = require './o1'
  w.o2 = require './o2'
  w.o3 = require './o3'
  w.o4 = require './o4'
  w.o5 = require './o5'
  w.o6 = require './o6'
  w.o7 = require './o7'
  w.o8 = require './o8'
  w.o9 = require './o9'
  w.o10 = require './o10'
  w.o11 = require './o11'
  w.o12 = require './o12'
  w.o13 = require './o13'
  w.o15 = require './o15'
else
  chai = window.chai
  finitedomain = window.finitedomain

{expect, assert} = chai
describe 'perf', ->

  describe 'pipeline stuff', ->
    # these are the 16 main calls pipeline makes to FD. exported rawtree
    # from the PathSolver constructor as is and that's what you see here.

    it '1', ->
      m = {rawtree: w.o1}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '2', ->
      m = {rawtree: w.o2}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '3', ->
      m = {rawtree: w.o3}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '4', ->
      m = {rawtree: w.o4}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '5', ->
      m = {rawtree: w.o5}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '6', ->
      m = {rawtree: w.o6}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '7', ->
      m = {rawtree: w.o7}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '8', ->
      m = {rawtree: w.o8}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '9', ->
      m = {rawtree: w.o9}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '10', ->
      m = {rawtree: w.o10}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '11', ->
      m = {rawtree: w.o11}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '12', ->
      m = {rawtree: w.o12}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

    it '13', ->
      m = {rawtree: w.o13}
      new finitedomain.PathSolver(m).solve({log:1})
      expect(true).to.be.true

  describe 'repeat simple test', ->

    it 'repeat simple test 10x', ->
      # this data was exported from the "4.e) from-to - balanced h tracks" test in MultiverseJSON
      m = {rawtree: w.o15}

      for [0...10]
        new finitedomain.PathSolver(m).solve({log:1})

      expect(true).to.be.true
