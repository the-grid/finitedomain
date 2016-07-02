/*
node from repl:

var config = require('./tests/perf/gridsolver/config');
var perf = require('./tests/perf/perf');
perf(config, 1);

*/

// run this from any of the subdirs (`./composer/node.js`)
var Solver = (typeof require === 'function') ? require(__dirname + '/../../dist/browser').default : exports.default;

var perf = module.exports = function perf(config, max) {

  if (config.callbackTimeoutMax) {
    var counter = config.callbackTimeoutMax;
    config.timeout_callback = function() {
      if (--counter < 0) {
        console.log('ABORTING');
        return true;
      }
      return false;
    };
  }

  var solver = new Solver({config: config});
  console.log('start profile');
  console.time('stop profile');
  console.profile && console.profile('gridsolving');
  solver.solve({log: 1, max: max, vars: solver.config.all_var_names});
  console.profileEnd && console.profileEnd('gridsolving');
  console.timeEnd('stop profile');
}
