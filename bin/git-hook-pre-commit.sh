#!/bin/bash

# You can force accept a broken commit by setting environment var FORCE_BROKEN to force, eg:
# FORCE_BROKEN_COMMIT=1 git commit -a

echo "pre-commit: Running \`npm test\`, silently. Please hold on..."

# note: npm --silent only squashes npm error output, i dont want any output at this point...
npm test > /dev/null 2>&1

if [ $? != 0 ]; then
  if [ "$FORCE_BROKEN_COMMIT" ]; then
    echo "FORCING BROKEN COMMIT"
  else
    echo "
Woops... It seems \`npm test\` failed somehow. Please resolve any issues before committing.
Prefix your commit command line with \`FORCE_BROKEN_COMMIT=1\` if you want to force this anyways, for temporary commits.
If you want to do a partial commit make sure to stash other changes before committing.
- \`git stash -k\` will not stash staged changed (stuff from \`git add\` / \`git diff --cached\`)
- \`git stash -u\` will also stash new files
- \`git stash -uk\` will stash new files and ignore staged changed
In a bright future this script will do this for you before applying tests, but not yet.
"
    exit 1
  fi
else
  if [ "$FORCE_BROKEN_COMMIT" ]; then
    echo "
Build not broken. Aborting because you seem to expect a broken build.
"
    exit 1
  fi
fi
