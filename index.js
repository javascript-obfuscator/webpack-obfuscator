"use strict";
let JavaScriptObfuscator = require('javascript-obfuscator'), multimatch = require('multimatch'), RawSource = require('webpack-core/lib/RawSource');
class WebpackObfuscator {
    constructor(options, excludes) {
        this.options = {};
        this.PLUGIN_NAME = 'webpack-obfuscator';
        this.options = options;
        this.excludes = typeof excludes === 'string' ? [excludes] : excludes || [];
    }
    apply(compiler) {
        compiler.plugin('compilation', (compilation) => {
            compilation.plugin("optimize-chunk-assets", (chunks, callback) => {
                let files = [];
                chunks.forEach((chunk) => {
                    chunk['files'].forEach((file) => {
                        files.push(file);
                    });
                });
                compilation.additionalChunkAssets.forEach((file) => {
                    files.push(file);
                });
                files.forEach((file) => {
                    let asset = compilation.assets[file];
                    compilation.assets[file] = new RawSource(JavaScriptObfuscator.obfuscate(asset.source(), this.options));
                });
                callback();
            });
        });
    }
    shouldExclude(filePath, excludes) {
        for (let exclude of excludes) {
            if (multimatch(filePath, exclude).length > 0) {
                return true;
            }
        }
        return false;
    }
}
module.exports = WebpackObfuscator;
