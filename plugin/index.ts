"use strict";

import { Compiler, compilation } from 'webpack';
import JavaScriptObfuscator, { ObfuscatorOptions } from 'javascript-obfuscator';
import { RawSource } from 'webpack-sources';
import multimatch from 'multimatch';
import { RawSourceMap } from 'source-map';
const transferSourceMap = require("multi-stage-sourcemap").transfer;

/**
 * JavaScript Obfuscator plugin
 */
export class WebpackObfuscatorPlugin {
    /**
     * @type {string}
     */
    private static readonly baseIdentifiersPrefix: string = 'a';

    public excludes: string[] = [];

    constructor(
        public options: ObfuscatorOptions = {},
        excludes?: string | string[]
    ) {
        this.excludes = this.excludes.concat(excludes || []);
    }

    public apply(compiler: Compiler): void {
        const isDevServer = process.argv.find(v => v.includes('webpack-dev-server'));

        if (isDevServer) {
            console.info(
                'JavascriptObfuscator is disabled on webpack-dev-server as the reloading scripts ',
                'and the obfuscator can interfere with each other and break the build');
            return;
        }

        const pluginName = this.constructor.name;

        compiler.hooks.emit.tap(pluginName, (compilation: compilation.Compilation) => {
            let identifiersPrefixCounter: number = 0;
            const sourcemapOutput: {[index:string]: string} = {};

            compilation.chunks.forEach(chunk => {
                chunk.files.forEach((fileName: string) => {
                    if (this.options.sourceMap && fileName.toLowerCase().endsWith('.map')) {
                        let srcName = fileName.toLowerCase().substr(0, fileName.length - 4);

                        if (!this.shouldExclude(srcName)) {
                            const transferredSourceMap = transferSourceMap({
                                fromSourceMap: sourcemapOutput[srcName],
                                toSourceMap: compilation.assets[fileName].source()
                            });
                            const finalSourcemap = JSON.parse(transferredSourceMap);

                            finalSourcemap['sourcesContent'] = JSON.parse(compilation.assets[fileName].source())['sourcesContent'];
                            compilation.assets[fileName] = new RawSource(JSON.stringify(finalSourcemap));
                        }

                        return;
                    }

                    if (!fileName.toLowerCase().endsWith('.js') || this.shouldExclude(fileName)) {
                        return;
                    }

                    const asset = compilation.assets[fileName]
                    const { inputSource, inputSourceMap } = this.extractSourceAndSourceMap(asset);
                    const { obfuscatedSource, obfuscationSourceMap } = this.obfuscate(inputSource, fileName, identifiersPrefixCounter);

                    if (this.options.sourceMap && inputSourceMap) {
                        sourcemapOutput[fileName] = obfuscationSourceMap;
                    }

                    compilation.assets[fileName] = new RawSource(obfuscatedSource);
                    identifiersPrefixCounter++;
                });
            });
        });
    }

    private shouldExclude(filePath: string): boolean {
        return multimatch(filePath, this.excludes).length > 0
    }

    private extractSourceAndSourceMap(asset: any): { inputSource: string, inputSourceMap: RawSourceMap } {
        if (asset.sourceAndMap) {
            const { source, map } = asset.sourceAndMap();
            return { inputSource: source, inputSourceMap: map };
        } else {
            return {
                inputSource: asset.source(),
                inputSourceMap: asset.map()
            }
        }
    }

    private obfuscate(
        javascript: string,
        fileName: string,
        identifiersPrefixCounter: number
    ): { obfuscatedSource: string, obfuscationSourceMap: string } {
        const obfuscationResult = JavaScriptObfuscator.obfuscate(
            javascript,
            {
                identifiersPrefix: `${WebpackObfuscatorPlugin.baseIdentifiersPrefix}${identifiersPrefixCounter}`,
                sourceMapFileName: fileName + '.map',
                ...this.options
            }
        );

        return {
            obfuscatedSource: obfuscationResult.getObfuscatedCode(),
            obfuscationSourceMap: obfuscationResult.getSourceMap()
        }
    }
}
