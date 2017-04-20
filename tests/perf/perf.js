/*
node from repl (make correct browser dist first):

var config = require('./tests/perf/curator/config');
var perf = require('./tests/perf/perf');
perf(config, 1);

from cli:

grunt distperf && tests/perf/curator/node.js
grunt distdsl && tests/perf/curator-dsl/node.js

*/

// run this from any of the subdirs (`./curator-dsl/node.js`)
var Solver = (typeof require === 'function') ? require(__dirname + '/../../dist/browser').default : exports.default;

var perf = module.exports = function perf(config, max, _waited) {

  if (typeof location === 'object' && location.href.indexOf('wait=1') >= 0 && !_waited) {
    console.log('delaying start by five seconds');
    return setTimeout(function(){ perf(config, max, true); }, 5000);
  }

  if (config.callbackTimeoutMax) {
    var counter = config.callbackTimeoutMax;
    config.timeoutCallback = function() {
      if (--counter < 0) {
        console.log('ABORTING');
        return true;
      }
      return false;
    };
  }

  console.log('<TEST>');
  console.time('</TEST>');

  let solver;
  if (typeof config === 'string') {
    console.log('Test type: DSL');
    solver = new Solver({log: 1}).imp(config);
  } else {
    console.log('Test type: Legacy');
    solver = new Solver({config: config, log: 1});
  }

  if (typeof location !== 'object' || location.href.indexOf('perf=0') < 0) console.profile && console.profile('fd perf');
  solver.solve({
    log: 1,
    max: max,
    vars: 'all',
    _debug: false,
    _tostring: false,
    exportBare: false,
  });
  if (typeof location !== 'object' || location.href.indexOf('perf=0') < 0) console.profileEnd && console.profileEnd('fd perf');

  console.timeEnd('</TEST>');
};
