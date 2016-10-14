#!/bin/bash

CMESSAGE=`cat $1`

COVERAGE=""
SUMMARY=""
PREFIX=""

if [ -z "$FORCE_BROKEN_COMMIT" ]; then # exit unless force committing because coverage failed
  echo "Appending code coverage metrics to your commit message, please hold on..."

  COVERAGE=$(npm run coverage 2>&1)
  SUMMARY=$(echo "$COVERAGE" | grep -B0 -A5 'Coverage summary')
  UGLIFY=$(grunt distq)
  SIZE=$(echo "$UGLIFY" | grep -B0 -A0 'gzip')
fi

if [ "$SUMMARY" ]; then
  # Shorten the width of the summary to clean it up in github UI
  SUMMARY=${SUMMARY//$'===============\n'/$'\n'}
  SUMMARY=${SUMMARY/%$'==============='/$'\n'}

  # Prepend some padding
  SUMMARY="

$SUMMARY
"
  SIZE="
$SIZE
"

# otherwise the empty summary (most likely) means tests failed, but maybe not
else
  echo "- Coverage summary NOT found"
  NOTERROR=$(echo "$COVERAGE" | grep 'No coverage information was collected')
  if [ "$NOTERROR" ]; then # if code coverage didnt catch anything then ignore this problem
    echo "- Nothing collected. New repo? Missing tests?
- Commit accepted but please double check."
  elif [ -z "$FORCE_BROKEN_COMMIT" ]; then # exit unless force committing because coverage failed
    echo "- Something went wrong getting the code coverage summary.
- Try to run \`npm run coverage\` to see what's up."
    exit 1
  elif [[ ${CMESSAGE:0:1} != $'\n' ]]; then # dont prepend title if no title was found (allows git to abort an empty message)
    PREFIX="[BROKEN FORCED] "
    echo "- Cannot append coverage summary because build is (intentionally) broken..."
  else
    # note: can improve this detection because git doesnt care about leading empty lines...
    echo "- Coverage failed, no title set, letting git abort because empty message..."
  fi
fi

echo "$PREFIX$CMESSAGE$SUMMARY$SIZE" > $1

echo "$SUMMARY$SIZE"
