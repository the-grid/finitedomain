#!/usr/bin/env node

// to run: grunt distdsl && tests/perf/mvshort/node.js

var dsl = require('./dsl');
var perf = require('../perf');
perf(dsl, 1);
