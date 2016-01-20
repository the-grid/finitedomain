FD = {
  __DEV_BUILD: false
  distribution:
    markov: require './distribution/markov'
    value: require './distribution/value'
    var: require './distribution/var'
    distribute: require './distribution/distribute'
  propagators:
    callback: require './propagators/callback'
    eq: require './propagators/eq'
    lt: require './propagators/lt'
    lte: require './propagators/lte'
    markov: require './propagators/markov'
    neq: require './propagators/neq'
    prop_is_solved: require './propagators/prop_is_solved'
    reified: require './propagators/reified'
    ring: require './propagators/ring'
    scale_div: require './propagators/scale_div'
    scale_mul: require './propagators/scale_mul'
    stepper_comparison: require './propagators/stepper_comparison'
    stepper_any: require './propagators/stepper_any'
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


REMOVE_ASSERTS_START = 1

# for tests; if absent will skip certain tests because
# certain private functions are not exposed in the dist
# build so we cant test them explicitly. c'est la vie.
FD.__DEV_BUILD = true

REMOVE_ASSERTS_STOP = 1



module.exports = FD
