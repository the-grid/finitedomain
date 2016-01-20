FD = {
  __DEV_BUILD: false
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
  Solver: require './solver'
  PathSolver: require './path_solver'
}


({}.__REMOVE_BELOW_FOR_DIST__ = 1) && 1

# for tests; if absent will skip certain tests because
# certain private functions are not exposed in the dist
# build so we cant test them explicitly. c'est la vie.
FD.__DEV_BUILD = true

({}.__REMOVE_ABOVE_FOR_DIST__ = 1) && 1



module.exports = FD
