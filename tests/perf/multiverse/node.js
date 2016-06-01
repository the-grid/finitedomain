// ./node_modules/.bin/babel-node node.js

var config = require('./config');
var perf = require('../perf');
perf(config, 1);
