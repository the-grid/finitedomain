/*
node from repl:

var config = require('./tests/perf/gridsolver/config');
var perf = require('./tests/perf/perf');
perf(config, 1);

*/

// run this from any of the subdirs (`./composer/node.js`)
var Solver = (typeof require === 'function') ? require(__dirname + '/../../dist/browser').default : exports.default;

var perf = module.exports = function perf(config, max, _waited) {

  if (typeof location === 'object' && location.href.indexOf('wait=1') >= 0 && !_waited) {
    console.log('delaying start by five seconds');
    return setTimeout(function(){ perf(config, max, true); }, 5000);
  }

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
  console.log('start test');
  console.time('test runtime');
  if (typeof location === 'object' && location.href.indexOf('perf=0') < 0) console.profile && console.profile('gridsolving');
  solver.solve({log: 1, max: max, vars: solver.config.all_var_names, _debug: false});
  if (typeof location === 'object' && location.href.indexOf('perf=0') < 0) console.profileEnd && console.profileEnd('gridsolving');
  console.timeEnd('test runtime');
};
