#!/usr/bin/env node

// to run: grunt distdsl && tests/perf/curator-dsl/node.js

var dsl = require('./dsl');
var perf = require('../perf');
perf(dsl, 1);
