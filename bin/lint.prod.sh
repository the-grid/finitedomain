#!/bin/bash

echo "### Running eslint from ${PWD} with prod config"

# Enable expanding foo/**/*.js to find all .js files recursively,
# otherwise it will only find js files in current dir. For details
# see http://wiki.bash-hackers.org/syntax/expansion/globs
shopt -s globstar

node_modules/eslint/bin/eslint.js         \
  -c config/eslintrc.ds.dist.js           \
  src/**/*.js                             &&

# also apply dev rules to specs because we do want to enforce lint on specs too
node_modules/eslint/bin/eslint.js         \
  -c config/eslintrc.ds.dev.js            \
  tests/specs/**/*.js                     \
;

# keep exit code as is. will block tests and signal npm a not-ok
