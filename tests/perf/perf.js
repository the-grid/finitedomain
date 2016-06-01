/*
node from repl:

./node_modules/.bin/babel-node

var config = require('./tests/perf/gridsolver/config');
var perf = require('./tests/perf/perf');
perf(config, 50000);

*/

var Solver = (typeof require === 'function') ? require(__dirname + '/../../src/solver').default : exports.default;

var perf = module.exports = function perf(config, max) {
  let solver = new Solver({config});
  console.log('start profile');
  console.profile && console.profile('gridsolving');
  solver.solve({log: 1, max: max, vars: solver.config.all_var_names});
  console.profileEnd && console.profileEnd('gridsolving');
  console.log('stop profile');
}
