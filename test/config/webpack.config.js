'use strict';

const JavaScriptObfuscator = require('../../index');

module.exports = {
    entry: {
        'index': './test/input/index.js'
    },
    devtool: 'source-map',
    target: 'web',
    resolve: {
        extensions: ['', '.js']
    },
    plugins: [
        new JavaScriptObfuscator({
            disableConsoleOutput: false
        })
    ],
    output: {
        path: 'test/output',
        filename: 'output.js'
    }
};