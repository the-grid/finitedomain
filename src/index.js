// TOFIX: we'll need to fix this file proper
let TEST_TARGET = 'dev';
if (process.env.TEST_TARGET) {
  TEST_TARGET = process.env.TEST_TARGET;
}

switch (TEST_TARGET) {
  case 'dist':
    console.log('Including final dist (finitedomain.min)');
    var FD = require('../dist/finitedomain.min');
    break;
  case 5:
  case 'min':
    console.log('Including the minified dist build (5.finitedomain.dist.min)');
    FD = require('../build/5.finitedomain.dist.min');
    break;
  case 4:
  case 'perf':
    console.log('Including the unminified dist build (4.finitedomain.dist.perf_stripped)');
    FD = require('../build/4.finitedomain.dist.perf_stripped');
    break;
  case 3:
  case 'concat':
    console.log('Including the dev concat build (3.finitedomain.dist.coffeed)');
    FD = require('../build/3.finitedomain.dist.coffeed');
    break;
  case 0:
  case 'dev':
    console.log('Including from raw src');
    FD = {
      __DEV_BUILD: true,
      distribution: {
        defaults: require('./distribution/defaults'),
        markov: require('./distribution/markov'),
        value: require('./distribution/value'),
        var: require('./distribution/var')
      },
      propagators: {
        callback: require('./propagators/callback'),
        eq: require('./propagators/eq'),
        lt: require('./propagators/lt'),
        lte: require('./propagators/lte'),
        markov: require('./propagators/markov'),
        neq: require('./propagators/neq'),
        propagator_is_solved: require('./propagators/is_solved'),
        reified: require('./propagators/reified'),
        ring: require('./propagators/ring'),
        step_comparison: require('./propagators/step_comparison'),
        step_any: require('./propagators/step_any')
      },
      config: require('./config'),
      domain: require('./domain'),
      fdvar: require('./fdvar'),
      helpers: require('./helpers'),
      markov: require('./markov'),
      propagator: require('./propagator'),
      space: require('./space'),
      search: require('./search'),
      Solver: require('./solver').Solver
    };
    break;
  default:
    throw new Error('unknown type to include');
}

export default FD;
