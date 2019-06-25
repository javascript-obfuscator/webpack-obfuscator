#!/bin/sh

git config --global user.email "travis@travis-ci.org"
git config --global user.name "Travis CI"

sed -i '/dist/d' .gitignore
git add dist/*
git commit --message "Travis build: $TRAVIS_BUILD_NUMBER"

git remote add origin https://${GH_TOKEN}@github.com/mauricedoepke/webpack-obfuscator.git > /dev/null 2>&1
git push --quiet --set-upstream origin master 