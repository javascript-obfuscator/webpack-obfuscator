"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var JavaScriptObfuscator = require('javascript-obfuscator');
var RawSource = require("webpack-sources").RawSource;
var SourceMapSource = require("webpack-sources").SourceMapSource;
var multimatch = require('multimatch');
var transferSourceMap = require("multi-stage-sourcemap").transfer;
var WebpackObfuscator = (function () {
    function WebpackObfuscator(options, excludes) {
        this.options = {};
        this.options = options || {};
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
                    if (!/\.js($|\?)/i.test(file) || _this.shouldExclude(file, _this.excludes)) {
                        return;
                    }
                    var asset = compilation.assets[file], input, inputSourceMap;
                    if (_this.options.sourceMap !== false) {
                        if (asset.sourceAndMap) {
                            var sourceAndMap = asset.sourceAndMap();
                            inputSourceMap = sourceAndMap.map;
                            input = sourceAndMap.source;
                        }
                        else {
                            inputSourceMap = asset.map();
                            input = asset.source();
                        }
                        if (inputSourceMap) {
                            _this.options.sourceMap = true;
                        }
                    }
                    else {
                        input = asset.source();
                    }
                    var obfuscationResult = JavaScriptObfuscator.obfuscate(input, _this.options);
                    if (_this.options.sourceMap) {
                        var obfuscationSourceMap = obfuscationResult.getSourceMap(), transferredSourceMap = transferSourceMap({
                            fromSourceMap: obfuscationSourceMap,
                            toSourceMap: inputSourceMap
                        });
                        compilation.assets[file] = new SourceMapSource(obfuscationResult.toString(), file, JSON.parse(transferredSourceMap), asset.source(), inputSourceMap);
                    }
                    else {
                        compilation.assets[file] = new RawSource(obfuscationResult.toString());
                    }
                });
                callback();
            });
        });
    };
    WebpackObfuscator.prototype.shouldExclude = function (filePath, excludes) {
        return multimatch(filePath, excludes).length > 0;
    };
    return WebpackObfuscator;
}());
module.exports = WebpackObfuscator;
