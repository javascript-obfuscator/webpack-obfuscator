#!/bin/sh

git config --global user.email "travis@travis-ci.org"
git config --global user.name "Travis CI"

git add -f dist/*
git commit -m "Travis Build: $TRAVIS_BUILD_NUMBER" -m "[skip ci]"

git remote rm origin
# Add new "origin" with access token in the git URL for authentication
git remote add origin https://mauricedoepke:${GH_TOKEN}@github.com/mauricedoepke/webpack-obfuscator.git > /dev/null 2>&1
git push origin master --quiet