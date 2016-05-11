#!/bin/bash

echo "### Running isparta (es6 code coverage) from ${PWD}"

# Enable expanding foo/**/*.js to find all .js files recursively,
# otherwise it will only find js files in current dir. For details
# see http://wiki.bash-hackers.org/syntax/expansion/globs
shopt -s globstar

node_modules/babel-cli/bin/babel-node.js  \
  node_modules/.bin/isparta               \
    cover                                 \
    --root src                            \
    --config config/istanbul.js           \
    node_modules/mocha/bin/_mocha         \
      --                                  \
      tests/specs/**/*.js                 \
;

if [ $? != 0 ]; then
  echo "
Meh. Something went wrong.
If this is \`npm test\` (or through npm install or something) try this first:
:: grunt test
and otherwise try running this to get more output (Istanbul suppresses most error output):
:: node_modules/babel-cli/bin/babel-node.js ./node_modules/mocha/bin/_mocha tests/specs
All the best to ya :)
"
  # dont consume the exit code :)
  exit 1
fi
