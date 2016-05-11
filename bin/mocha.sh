#!/bin/bash

echo "### Running mocha from ${PWD} through Babel on tests/specs/"

# Enable expanding foo/**/*.js to find all .js files recursively,
# otherwise it will only find js files in current dir. For details
# see http://wiki.bash-hackers.org/syntax/expansion/globs
shopt -s globstar

node_modules/.bin/mocha                    \
  --compilers js:babel-core/register       \
  tests/specs/**/*.js                      \
;
