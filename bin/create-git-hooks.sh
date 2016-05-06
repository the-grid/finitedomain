#!/bin/bash

echo "Symlinking pre-commit and commit-msg hooks from ${PWD}"

ln -s ../../bin/git-hook-pre-commit.sh .git/hooks/pre-commit
if [ $? = 0 ]; then
  echo ".git/hooks/pre-commit -> ../../bin/git-hook-pre-commit.sh"
fi

ln -s ../../bin/git-hook-commit-msg.sh .git/hooks/commit-msg
if [ $? = 0 ]; then
  echo ".git/hooks/commit-msg -> ../../bin/git-hook-commit-msg.sh"
fi

ln -s ../../bin/git-hook-prepare-commit-msg.sh .git/hooks/prepare-commit-msg
if [ $? = 0 ]; then
  echo ".git/hooks/prepare-commit-msg -> ../../bin/git-hook-prepare-commit-msg.sh"
fi
