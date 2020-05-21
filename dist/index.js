"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const javascript_obfuscator_1 = __importDefault(require("javascript-obfuscator"));
const webpack_sources_1 = require("webpack-sources");
const multimatch_1 = __importDefault(require("multimatch"));
const transferSourceMap = require("multi-stage-sourcemap").transfer;
class WebpackObfuscator {
    constructor(options = {}, excludes) {
        this.options = options;
        this.excludes = [];
        this.excludes = this.excludes.concat(excludes || []);
    }
    apply(compiler) {
        const isDevServer = process.argv.find(v => v.includes('webpack-dev-server'));
        if (isDevServer) {
            console.info('JavascriptObfuscator is disabled on webpack-dev-server as the reloading scripts ', 'and the obfuscator can interfere with each other and break the build');
            return;
        }
        const pluginName = this.constructor.name;
        compiler.hooks.emit.tap(pluginName, (compilation) => {
            let identifiersPrefixCounter = 0;
            const sourcemapOutput = {};
            compilation.chunks.forEach(chunk => {
                chunk.files.forEach((fileName) => {
                    if (this.options.sourceMap && fileName.toLowerCase().endsWith('.map')) {
                        let srcName = fileName.toLowerCase().substr(0, fileName.length - 4);
                        if (!this.shouldExclude(srcName)) {
                            const transferredSourceMap = transferSourceMap({
                                fromSourceMap: sourcemapOutput[srcName],
                                toSourceMap: compilation.assets[fileName].source()
                            });
                            const finalSourcemap = JSON.parse(transferredSourceMap);
                            finalSourcemap['sourcesContent'] = JSON.parse(compilation.assets[fileName].source())['sourcesContent'];
                            compilation.assets[fileName] = new webpack_sources_1.RawSource(JSON.stringify(finalSourcemap));
                        }
                        return;
                    }
                    if (!fileName.toLowerCase().endsWith('.js') || this.shouldExclude(fileName)) {
                        return;
                    }
                    const asset = compilation.assets[fileName];
                    const { inputSource, inputSourceMap } = this.extractSourceAndSourceMap(asset);
                    const { obfuscatedSource, obfuscationSourceMap } = this.obfuscate(inputSource, fileName, identifiersPrefixCounter);
                    if (this.options.sourceMap && inputSourceMap) {
                        sourcemapOutput[fileName] = obfuscationSourceMap;
                    }
                    compilation.assets[fileName] = new webpack_sources_1.RawSource(obfuscatedSource);
                    identifiersPrefixCounter++;
                });
            });
        });
    }
    shouldExclude(filePath) {
        return multimatch_1.default(filePath, this.excludes).length > 0;
    }
    extractSourceAndSourceMap(asset) {
        if (asset.sourceAndMap) {
            const { source, map } = asset.sourceAndMap();
            return { inputSource: source, inputSourceMap: map };
        }
        else {
            return {
                inputSource: asset.source(),
                inputSourceMap: asset.map()
            };
        }
    }
    obfuscate(javascript, fileName, identifiersPrefixCounter) {
        const obfuscationResult = javascript_obfuscator_1.default.obfuscate(javascript, Object.assign({ identifiersPrefix: `${WebpackObfuscator.baseIdentifiersPrefix}${identifiersPrefixCounter}`, sourceMapFileName: fileName + '.map' }, this.options));
        return {
            obfuscatedSource: obfuscationResult.getObfuscatedCode(),
            obfuscationSourceMap: obfuscationResult.getSourceMap()
        };
    }
}
WebpackObfuscator.baseIdentifiersPrefix = 'a';
module.exports = WebpackObfuscator;
