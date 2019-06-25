"use strict";

import { Compiler, compilation } from 'webpack';
import { JavaScriptObfuscator } from 'javascript-obfuscator';
import { IOptions as JavaScriptObfuscatorOptions } from 'javascript-obfuscator/src/interfaces/options/IOptions';
import { RawSource, SourceMapSource } from 'webpack-sources';
import multimatch from 'multimatch';
import { RawSourceMap } from 'source-map';
const transferSourceMap = require("multi-stage-sourcemap").transfer;

class WebpackObfuscator {

    public excludes: string[] = [];

    constructor(
        public options: Partial<JavaScriptObfuscatorOptions>,
        excludes?: string | string[]
    ) {
        this.options = options;
        this.excludes = this.excludes.concat(excludes || []);
    }

    public apply(compiler: Compiler): void {
        const pluginName = this.constructor.name;

        compiler.hooks.emit.tap(pluginName, (compilation: compilation.Compilation) => {
            for (const fileName in compilation.assets) {
                if (fileName.toLowerCase().endsWith('.js') || this.shouldExclude(fileName)) {
                    return;
                }

                const asset = compilation.assets[fileName]
                const { inputSource, inputSourceMap } = this.extractSourceAndSourceMap(asset);
                const { obfuscatedSource, obfuscationSourceMap } = this.obfuscate(inputSource);

                if (this.options.sourceMap && inputSourceMap) {
                    const transferredSourceMap = transferSourceMap({
                        fromSourceMap: obfuscationSourceMap,
                        toSourceMap: inputSource
                    });

                    compilation.assets[fileName] = new SourceMapSource(
                        obfuscatedSource,
                        fileName,
                        transferredSourceMap,
                        inputSource,
                        inputSourceMap
                    );
                } else {
                    compilation.assets[fileName] = new RawSource(obfuscatedSource);
                }
            }
        });
    }

    private shouldExclude(filePath: string): boolean {
        return multimatch(filePath, this.excludes).length > 0
    }

    private extractSourceAndSourceMap(asset: any): { inputSource: string, inputSourceMap: RawSourceMap } {
        if (asset.sourceAndMap) {
            const { inputSource, inputSourceMap } = asset.sourceAndMap();
            return { inputSource, inputSourceMap };
        } else {
            return {
                inputSource: asset.source(),
                inputSourceMap: asset.map()
            }
        }
    }

    private obfuscate(javascript: string): { obfuscatedSource: string, obfuscationSourceMap: string } {
        //use any here, as the JavaScriptObfuscator seem to get this one wrong
        const obfuscationResult: any = JavaScriptObfuscator.obfuscate(
            javascript,
            this.options
        );

        return {
            obfuscatedSource: obfuscationResult.toString(),
            obfuscationSourceMap: obfuscationResult.getSourceMap()
        }
    }
}

export = WebpackObfuscator;