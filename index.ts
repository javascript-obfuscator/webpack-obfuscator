"use strict";

let JavaScriptObfuscator: any = require('javascript-obfuscator'),
    RawSource: any = require("webpack-sources").RawSource,
    SourceMapSource: any = require("webpack-sources").SourceMapSource,
    multimatch: any = require('multimatch'),
    transferSourceMap = require("multi-stage-sourcemap").transfer;

class WebpackObfuscator {
    public options: any = {};
    public excludes: string[];

    /**
     * @param options
     * @param excludes
     */
    constructor (options: any, excludes: string|string[]) {
        this.options = options || {};
        this.excludes = typeof excludes === 'string' ? [excludes] : excludes || [];
    }

    /**
     * @param compiler
     */
    public apply (compiler: any): void {
        compiler.plugin('compilation', (compilation: any) => {
            compilation.plugin("optimize-chunk-assets", (chunks: any[], callback: () => void) => {
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
                    if (!/\.js($|\?)/i.test(file) || this.shouldExclude(file, this.excludes)) {
                        return;
                    }

                    let asset = compilation.assets[file],
                        input, inputSourceMap;

                    if (this.options.sourceMap !== false) {
                    	if (asset.sourceAndMap) {
                    		let sourceAndMap = asset.sourceAndMap();
                    		inputSourceMap = sourceAndMap.map;
                    		input = sourceAndMap.source;
                    	} else {
                    		inputSourceMap = asset.map();
                    		input = asset.source();
                    	}

                        if (inputSourceMap) {
                            this.options.sourceMap = true;
                        }
                    } else {
                    	input = asset.source();
                    }

                    let obfuscationResult: any = JavaScriptObfuscator.obfuscate(
                        input,
                        this.options
                    );

                    if (this.options.sourceMap) {
                        let obfuscationSourceMap: any = obfuscationResult.getSourceMap(),
                            transferredSourceMap: any = transferSourceMap({
                                fromSourceMap: obfuscationSourceMap,
                                toSourceMap: inputSourceMap
                            });

                        compilation.assets[file] = new SourceMapSource(
                            obfuscationResult.toString(),
                            file,
                            JSON.parse(transferredSourceMap),
                            asset.source(),
                            inputSourceMap
                        );
                    } else {
                        compilation.assets[file] = new RawSource(obfuscationResult.toString());
                    }
                });

                callback();
            });
        });
    }

    /**
     * @param filePath
     * @param excludes
     * @returns {boolean}
     */
    private shouldExclude (filePath: string, excludes: string[]): boolean {
        for (let exclude of excludes) {
            if (multimatch(filePath, exclude).length > 0) {
                return true;
            }
        }

        return false;
    }
}

module.exports = WebpackObfuscator;
