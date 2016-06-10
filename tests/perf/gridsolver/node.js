#!/usr/bin/env node

var config = require('./config');
var perf = require('../perf');
perf(config, 50000);
