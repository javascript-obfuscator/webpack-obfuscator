"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var javascript_obfuscator_1 = require("javascript-obfuscator");
var webpack_sources_1 = require("webpack-sources");
var multimatch_1 = __importDefault(require("multimatch"));
var transferSourceMap = require("multi-stage-sourcemap").transfer;
var WebpackObfuscator = (function () {
    function WebpackObfuscator(options, excludes) {
        this.options = options;
        this.excludes = [];
        this.options = options;
        this.excludes = this.excludes.concat(excludes || []);
    }
    WebpackObfuscator.prototype.apply = function (compiler) {
        var _this = this;
        var isDevServer = process.argv.find(function (v) { return v.includes('webpack-dev-server'); });
        if (isDevServer) {
            console.info('JavascriptObfuscator is disabled on webpack-dev-server as the reloading scripts ', 'and the obfuscator can interfere with each other and break the build');
            return;
        }
        var pluginName = this.constructor.name;
        compiler.hooks.emit.tap(pluginName, function (compilation) {
            for (var fileName in compilation.assets) {
                if (fileName.toLowerCase().endsWith('.js') || _this.shouldExclude(fileName)) {
                    return;
                }
                var asset = compilation.assets[fileName];
                var _a = _this.extractSourceAndSourceMap(asset), inputSource = _a.inputSource, inputSourceMap = _a.inputSourceMap;
                var _b = _this.obfuscate(inputSource), obfuscatedSource = _b.obfuscatedSource, obfuscationSourceMap = _b.obfuscationSourceMap;
                if (_this.options.sourceMap && inputSourceMap) {
                    var transferredSourceMap = transferSourceMap({
                        fromSourceMap: obfuscationSourceMap,
                        toSourceMap: inputSource
                    });
                    compilation.assets[fileName] = new webpack_sources_1.SourceMapSource(obfuscatedSource, fileName, transferredSourceMap, inputSource, inputSourceMap);
                }
                else {
                    compilation.assets[fileName] = new webpack_sources_1.RawSource(obfuscatedSource);
                }
            }
        });
    };
    WebpackObfuscator.prototype.shouldExclude = function (filePath) {
        return multimatch_1.default(filePath, this.excludes).length > 0;
    };
    WebpackObfuscator.prototype.extractSourceAndSourceMap = function (asset) {
        if (asset.sourceAndMap) {
            var _a = asset.sourceAndMap(), inputSource = _a.inputSource, inputSourceMap = _a.inputSourceMap;
            return { inputSource: inputSource, inputSourceMap: inputSourceMap };
        }
        else {
            return {
                inputSource: asset.source(),
                inputSourceMap: asset.map()
            };
        }
    };
    WebpackObfuscator.prototype.obfuscate = function (javascript) {
        var obfuscationResult = javascript_obfuscator_1.JavaScriptObfuscator.obfuscate(javascript, this.options);
        return {
            obfuscatedSource: obfuscationResult.toString(),
            obfuscationSourceMap: obfuscationResult.getSourceMap()
        };
    };
    return WebpackObfuscator;
}());
module.exports = WebpackObfuscator;
