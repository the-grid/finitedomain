#!/usr/bin/env node

// to run: grunt distperf && tests/perf/curator/node.js

var config = require('./config');
var perf = require('../perf');
perf(config, 1);
