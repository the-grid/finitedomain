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
var preSolver = require(__dirname + '/../../dist/browser').default;

var perf = module.exports = function perf(dsl, max, _waited) {

  if (typeof location === 'object' && location.href.indexOf('wait=1') >= 0 && !_waited) {
    console.log('delaying start by five seconds');
    return setTimeout(function(){ perf(dsl, max, true); }, 5000);
  }

  console.log('start test');
  console.time('test runtime');
  if (typeof location !== 'object' || location.href.indexOf('perf=0') < 0) console.profile && console.profile('pfd perf');
  preSolver(dsl);
  //{
  //  log: 1,
  //  max: max,
  //  vars: solver.config.allVarNames,
  //  _debug: false,
  //  _tostring: false, // requires dsl build
  //  exportBare: false, // does not require dsl build
  //});
  if (typeof location !== 'object' || location.href.indexOf('perf=0') < 0) console.profileEnd && console.profileEnd('pfd perf');
  console.timeEnd('test runtime');
};
