#!/bin/sh

git config --global user.email "travis@travis-ci.org"
git config --global user.name "Travis CI"

git checkout -b master
git add dist/*
git commit --message "Travis build: $TRAVIS_BUILD_NUMBER"

git remote add origin https://${GH_TOKEN}@github.com/MVSE-outreach/resources.git > /dev/null 2>&1
git push --quiet --set-upstream origin master 