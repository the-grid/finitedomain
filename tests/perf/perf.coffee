# workaround implicit local scope of node vs browser and coffee
w = {}
if typeof window isnt 'undefined'
  w = window

PROFILE = false # set to true to profile the slowest perf test here in a browser, devtools should auto-profile it here.

if typeof require is 'function'
  finitedomain = require '../../build/5.finitedomain.dist.min'
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
  PROFILE = location.href.indexOf('?profile') >= 0

{expect, assert} = chai

test = (desc, data, profile) ->
  it desc, (done) ->
    @timeout 20000

    new finitedomain.PathSolver({rawtree: data}).solve({log:1}, true)
    expect(true).to.be.true

    done()

if PROFILE

  describe 'profile one case', ->
    it 'starting one run, see console (profile tab too)', ->
      expect(true).to.be.true

  # for the browser
  if console.profile
    console.profile()
    new finitedomain.PathSolver({rawtree: w.o5}).solve({log:1, max: 10000}, true)
    console.profileEnd()
  else
    console.log 'browser does not support console.profile, you\'ll need to work around it ;)'

else
  describe 'pipeline stuff', ->
    # these are the main calls pipeline makes to FD. exported rawtree
    # from the PathSolver constructor as is and that's what you see here.

    test '1', w.o1
    test '2', w.o2
    test '3', w.o3
    test '4', w.o4
    test '5', w.o5
    test '6', w.o6
    test '7', w.o7
    test '8', w.o8
    test '9', w.o9
    test '10', w.o10
    test '11', w.o11
    test '12', w.o12
    test '13', w.o13

  describe 'repeat simple test', ->

    @timeout 60000 # 1min timeout

    # this data was exported from the "4.e) from-to - balanced h tracks" test in MultiverseJSON
    m = {rawtree: w.o15}

    for i in [0...10]
      it 'run', (done) ->
        new finitedomain.PathSolver(m).solve({log:1}, true)
        expect(true).to.be.true
        done()


