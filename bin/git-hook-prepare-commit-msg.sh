#!/bin/bash

# prepend title length hint
# check if first line is empty, no hint for `git commit -m 'foo'` etc
CURRENT_COMMIT_MSG=`cat $1`
if [[ ${CURRENT_COMMIT_MSG:0:1} == $'\n' ]]; then
  echo "





#######################################################################| <-- github truncs title after the pipe (72ch)
  $(cat $1)
  " > $1
fi

# note: dont append it in an else because that may slip through
# the comment scrubber and end up in the actual commit message
