'use strict';

const path = require('path');
const WebpackObfuscatorPlugin = require('../../dist/index');

module.exports = {
    entry: {
        'index': './test/input/index.js',
        'index-excluded': './test/input/index-excluded.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: 'post',
                exclude: [
                    path.resolve(__dirname, '../input/index-excluded')
                ],
                use: {
                    loader: WebpackObfuscatorPlugin.loader,
                    options: {
                        disableConsoleOutput: false,
                        sourceMap: true,
                        sourceMapMode: 'separate',
                        stringArray: true,
                        stringArrayThreshold: 1
                    }
                }
            }
        ]
    },
    devtool: 'source-map',
    target: 'web',
    resolve: {
        extensions: ['.js']
    },
    output: {
        path: __dirname + '/../output',
        filename: '[name].js'
    }
};