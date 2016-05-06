#!/bin/bash

echo "### Running eslint from ${PWD} with dev config"

# Enable expanding foo/**/*.js to find all .js files recursively,
# otherwise it will only find js files in current dir. For details
# see http://wiki.bash-hackers.org/syntax/expansion/globs
shopt -s globstar

# you can use one of these debugs to get more output from
# eslint (note: make it immediately preceed the `eslint` line)
#DEBUG=eslint:config                       \
#DEBUG=eslint:*                            \
#DEBUG=eslint:cli-engine                   \

node_modules/eslint/bin/eslint.js         \
  -c config/eslintrc.ds.dev.js            \
  src/**/*.js                             \
  tests/specs/**/*.js                     \
;

if [ "$?" = "0" ]; then
  echo "## Clean exit"
else
  echo "## Nonzero exit!! THIS WILL BE BLOCKED BY TRAVIS. Must fix problems reported above first."
fi
# suppress non-zero exit code
