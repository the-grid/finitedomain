TEST_TARGET = 'dev'
# TOFIX: figure out a way to pass data from the grunt config to here
if process.argv[2] is 'dist' # grunt dist
  TEST_TARGET = 'min'
if process.argv[2] is 'perf' # grunt perf
  TEST_TARGET = 'min'

switch TEST_TARGET
  when 'dist'
    console.log 'Including final dist (finitedomain.min)'
    FD = require '../dist/finitedomain.min'
  when 5, 'min'
    console.log 'Including the minified dist build (5.finitedomain.dist.min)'
    FD = require '../build/5.finitedomain.dist.min'
  when 4, 'perf'
    console.log 'Including the unminified dist build (4.finitedomain.dist.perf_stripped)'
    FD = require '../build/4.finitedomain.dist.perf_stripped'
  when 3, 'concat'
    console.log 'Including the dev concat build (3.finitedomain.dist.coffeed)'
    FD = require '../build/3.finitedomain.dist.coffeed'
  when 0, 'dev'
    console.log 'Including from raw src'
    FD =
      __DEV_BUILD: true
      distribution:
        defaults: require './distribution/defaults'
        markov: require './distribution/markov'
        value: require './distribution/value'
        var: require './distribution/var'
      propagators:
        callback: require './propagators/callback'
        eq: require './propagators/eq'
        lt: require './propagators/lt'
        lte: require './propagators/lte'
        markov: require './propagators/markov'
        neq: require './propagators/neq'
        propagator_is_solved: require './propagators/is_solved'
        reified: require './propagators/reified'
        ring: require './propagators/ring'
        scale_div: require './propagators/scale_div'
        scale_mul: require './propagators/scale_mul'
        step_comparison: require './propagators/step_comparison'
        step_any: require './propagators/step_any'
      bvar: require './bvar'
      domain: require './domain'
      fdvar: require './fdvar'
      helpers: require './helpers'
      markov: require './markov'
      Space: require './space'
      search: require './search'
      Solver: require('./solver').Solver
      PathSolver: require('./solver_path').PathSolver
  else
    throw new Error 'unknown type to include'

module.exports = FD
