"use strict";
var JavaScriptObfuscator = require('javascript-obfuscator'), multimatch = require('multimatch'), RawSource = require('webpack-core/lib/RawSource');
var WebpackObfuscator = (function () {
    function WebpackObfuscator(options, excludes) {
        this.options = {};
        this.PLUGIN_NAME = 'webpack-obfuscator';
        this.options = options;
        this.excludes = typeof excludes === 'string' ? [excludes] : excludes || [];
    }
    WebpackObfuscator.prototype.apply = function (compiler) {
        var _this = this;
        compiler.plugin('compilation', function (compilation) {
            compilation.plugin("optimize-chunk-assets", function (chunks, callback) {
                var files = [];
                chunks.forEach(function (chunk) {
                    chunk['files'].forEach(function (file) {
                        files.push(file);
                    });
                });
                compilation.additionalChunkAssets.forEach(function (file) {
                    files.push(file);
                });
                files.forEach(function (file) {
                    if (_this.shouldExclude(file, _this.excludes)) {
                        return;
                    }
                    var asset = compilation.assets[file];
                    compilation.assets[file] = new RawSource(JavaScriptObfuscator.obfuscate(asset.source(), _this.options));
                });
                callback();
            });
        });
    };
    WebpackObfuscator.prototype.shouldExclude = function (filePath, excludes) {
        for (var _i = 0, excludes_1 = excludes; _i < excludes_1.length; _i++) {
            var exclude = excludes_1[_i];
            if (multimatch(filePath, exclude).length > 0) {
                return true;
            }
        }
        return false;
    };
    return WebpackObfuscator;
}());
module.exports = WebpackObfuscator;
