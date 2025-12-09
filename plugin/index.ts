"use strict";

import { Compiler, Compilation, sources } from 'webpack';
import JavaScriptObfuscator, { ObfuscatorOptions, IProApiConfig, TProApiProgressCallback } from 'javascript-obfuscator';
import multimatch from 'multimatch';
import { RawSourceMap } from 'source-map';
const transferSourceMap = require("multi-stage-sourcemap").transfer;

export type WebpackObfuscatorOptions = Omit<
    ObfuscatorOptions,
    | 'inputFileName'
    | 'sourceMapBaseUrl'
    | 'sourceMapFileName'
    | 'sourceMapMode'
    | 'sourceMapSourcesMode'
>;

// Re-export types for external use
export type { IProApiConfig, TProApiProgressCallback };

/**
 * JavaScript Obfuscator plugin
 */
export class WebpackObfuscatorPlugin {
    /**
     * @type {string}
     */
    public static readonly loader = require.resolve('../loader');

    /**
     * @type {string[]}
     */
    private static allowedExtensions: string[] = [
        '.js',
        '.mjs'
    ];

    /**
     * @type {string}
     */
    private static readonly baseIdentifiersPrefix: string = 'a';

    public excludes: string[] = [];
    public proApiConfig?: IProApiConfig;
    public onProgress?: TProApiProgressCallback;

    constructor(
        public options: WebpackObfuscatorOptions = {},
        excludes?: string | string[],
        proApiConfig?: IProApiConfig,
        onProgress?: TProApiProgressCallback
    ) {
        this.excludes = this.excludes.concat(excludes || []);
        this.proApiConfig = proApiConfig;
        this.onProgress = onProgress;
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

        compiler.hooks.compilation.tap(pluginName, (compilation: Compilation) => {
            // Use tapPromise for async processing
            compilation.hooks.processAssets.tapPromise(
                {
                    name: 'WebpackObfuscator',
                    stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING
                },
                async (assets) => {
                    let identifiersPrefixCounter: number = 0;
                    const sourcemapOutput: {[index:string]: string} = {};

                    // Collect all files to process
                    const filesToProcess: Array<{
                        chunk: any;
                        fileName: string;
                        isSourceMap: boolean;
                    }> = [];

                    compilation.chunks.forEach(chunk => {
                        chunk.files.forEach((fileName: string) => {
                            const isSourceMap = Boolean(this.options.sourceMap) && fileName.toLowerCase().endsWith('.map');
                            filesToProcess.push({ chunk, fileName, isSourceMap });
                        });
                    });

                    // Process source maps after JS files, so we need to separate them
                    const jsFiles = filesToProcess.filter(f => !f.isSourceMap);
                    const mapFiles = filesToProcess.filter(f => f.isSourceMap);

                    // Process JS files first
                    for (const { fileName } of jsFiles) {
                        const isValidExtension = WebpackObfuscatorPlugin
                            .allowedExtensions
                            .some((extension: string) => fileName.toLowerCase().endsWith(extension));

                        if (!isValidExtension || this.shouldExclude(fileName)) {
                            continue;
                        }

                        const asset = compilation.assets[fileName];
                        const { inputSource, inputSourceMap } = this.extractSourceAndSourceMap(asset);

                        const { obfuscatedSource, obfuscationSourceMap } = await this.obfuscate(
                            inputSource,
                            fileName,
                            identifiersPrefixCounter
                        );

                        if (this.options.sourceMap && inputSourceMap) {
                            sourcemapOutput[fileName] = obfuscationSourceMap;

                            const transferredSourceMap = transferSourceMap({
                                fromSourceMap: obfuscationSourceMap,
                                toSourceMap: inputSourceMap
                            });
                            const finalSourcemap = JSON.parse(transferredSourceMap);

                            // @ts-ignore Wrong types
                            assets[fileName] = new sources.SourceMapSource(
                                obfuscatedSource,
                                fileName,
                                finalSourcemap
                            );
                        } else {
                            assets[fileName] = new sources.RawSource(obfuscatedSource, false);
                        }

                        identifiersPrefixCounter++;
                    }

                    // Process source map files
                    for (const { fileName } of mapFiles) {
                        let srcName = fileName.toLowerCase().substr(0, fileName.length - 4);

                        if (!this.shouldExclude(srcName)) {
                            const transferredSourceMap = transferSourceMap({
                                fromSourceMap: sourcemapOutput[srcName],
                                toSourceMap: compilation.assets[fileName].source()
                            });
                            const finalSourcemap = JSON.parse(transferredSourceMap);
                            assets[fileName] = new sources.RawSource(JSON.stringify(finalSourcemap), false);
                        }
                    }
                }
            );
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

    private async obfuscate(
        javascript: string,
        fileName: string,
        identifiersPrefixCounter: number
    ): Promise<{ obfuscatedSource: string, obfuscationSourceMap: string }> {
        const obfuscatorOptions = {
            identifiersPrefix: `${WebpackObfuscatorPlugin.baseIdentifiersPrefix}${identifiersPrefixCounter}`,
            inputFileName: fileName,
            sourceMapMode: 'separate' as const,
            sourceMapFileName: fileName + '.map',
            ...this.options
        };

        // Use obfuscatePro if proApiConfig is provided, otherwise use sync obfuscate
        if (this.proApiConfig) {
            const obfuscationResult = await JavaScriptObfuscator.obfuscatePro(
                javascript,
                obfuscatorOptions,
                this.proApiConfig,
                this.onProgress
            );

            return {
                obfuscatedSource: obfuscationResult.getObfuscatedCode(),
                obfuscationSourceMap: obfuscationResult.getSourceMap()
            };
        } else {
            const obfuscationResult = JavaScriptObfuscator.obfuscate(
                javascript,
                obfuscatorOptions
            );

            return {
                obfuscatedSource: obfuscationResult.getObfuscatedCode(),
                obfuscationSourceMap: obfuscationResult.getSourceMap()
            };
        }
    }
}
