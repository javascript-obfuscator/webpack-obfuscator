'use strict';

const webpack = require('webpack');
const JavaScriptObfuscator = require('../../index');

module.exports = {
    entry: {
        'index': './test/input/index.js',
        'index1': './test/input/index1.js'
    },
    devtool: 'source-map',
    target: 'web',
    resolve: {
        extensions: ['.js']
    },
    plugins: [
        new JavaScriptObfuscator({
            disableConsoleOutput: false
        }, ['index1*'])
    ],
    output: {
        path: __dirname + 'test/output',
        filename: '[name].js'
    }
};