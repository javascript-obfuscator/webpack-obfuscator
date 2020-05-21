'use strict';

const JavaScriptObfuscator = require('../../dist/index');

module.exports = {
    entry: {
        'index': './test/input/index.js',
        'index-excluded': './test/input/index-excluded.js'
    },
    devtool: 'source-map',
    target: 'web',
    resolve: {
        extensions: ['.js']
    },
    plugins: [
        new JavaScriptObfuscator({
            disableConsoleOutput: false,
            sourceMap: true,
            sourceMapMode: 'separate'
        }, ['index-excluded*'])
    ],
    output: {
        path: __dirname + '/../output',
        filename: '[name].js'
    }
};