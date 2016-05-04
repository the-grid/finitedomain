#!/usr/bin/env bash

# Have to temporary mover away gruntfile.coffee because I cant seem to get it ignored.
mv gruntfile.coffee gr.tmp

node_modules/.bin/mocha --recursive --compilers coffee:coffee-script/register --require coffee-coverage/register-istanbul tests/specs/
node_modules/.bin/istanbul report

mv gr.tmp gruntfile.coffee
rm -r coverage # temporary coverage json
