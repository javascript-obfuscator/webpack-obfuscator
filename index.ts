"use strict";

import { Compiler } from 'webpack';

const JavaScriptObfuscator = require('javascript-obfuscator');
const RawSource = require("webpack-sources").RawSource;
const SourceMapSource = require("webpack-sources").SourceMapSource;
const multimatch = require('multimatch');
const transferSourceMap = require("multi-stage-sourcemap").transfer;

type TObject = {[key: string]: any};

class WebpackObfuscator {
    /**
     * @type {TObject}
     */
    public options: TObject = {};

    /**
     * @type {string}
     */
    public excludes: string[];

    /**
     * @param {TObject} options
     * @param {string | string[]} excludes
     */
    constructor (options: TObject, excludes: string|string[]) {
        this.options = options || {};
        this.excludes = this.prepareExcludes(excludes);
    }

    /**
     * @param {Compiler} compiler
     */
    public apply (compiler: Compiler): void {
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

    private prepareExcludes(inputExcludes: string|string[]): string[] {
        if (Array.isArray(inputExcludes)) {
            return inputExcludes;
        }

        if (typeof inputExcludes === 'string') {
            return [inputExcludes];
        }

        return [];
    }

    /**
     * @param filePath
     * @param excludes
     * @returns {boolean}
     */
    private shouldExclude (filePath: string, excludes: string[]): boolean {
        return multimatch(filePath, excludes).length > 0
    }
}

module.exports = WebpackObfuscator;
