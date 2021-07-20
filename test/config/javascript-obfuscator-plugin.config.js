'use strict';

const webpack = require('webpack');
const WebpackObfuscatorPlugin = require('../../dist/index');

module.exports = {
    mode: 'production',
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
        new webpack.DefinePlugin({
            'process.env.SOME_VAR': JSON.stringify('some-value'),
        }),
        new WebpackObfuscatorPlugin({
            disableConsoleOutput: false,
            sourceMap: true
        }, ['index-excluded*'])
    ],
    output: {
        path: __dirname + '/../output',
        filename: '[name].js'
    }
};