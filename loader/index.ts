"use strict";

import JavaScriptObfuscator, { ObfuscatorOptions, IProApiConfig, TProApiProgressCallback } from 'javascript-obfuscator';
import * as path from 'path';

type WebpackObfuscatorLoaderOptions = Omit<
    ObfuscatorOptions,
    | 'inputFileName'
    | 'sourceMapBaseUrl'
    | 'sourceMapFileName'
    | 'sourceMapMode'
    | 'sourceMapSourcesMode'
> & {
    /** Pro API configuration for async obfuscation */
    proApiConfig?: IProApiConfig;
    /** Progress callback for tracking obfuscation progress */
    onProgress?: TProApiProgressCallback;
};

/**
 * JavaScript Obfuscator loader based on `obfuscator-loader` package
 * Supports both sync (obfuscate) and async (obfuscatePro) modes
 */
async function Loader(this: any, sourceCode: string): Promise<void> {
    const context = this;
    const callback = context.async();

    try {
        const relativePathOfModule = path.relative(context.rootContext, context.resourcePath);
        const options = (context.getOptions() || {}) as WebpackObfuscatorLoaderOptions;

        // Extract proApiConfig and onProgress from options
        const { proApiConfig, onProgress, ...obfuscatorOptions } = options;

        if (obfuscatorOptions.vmObfuscation) {
            console.warn(
                '\x1b[33m[webpack-obfuscator] `vmObfuscation` option is heavily not recommended ' +
                'when used with the loader. Each source file will contain a separate VM runtime, ' +
                'which significantly increases code size and slows down execution. ' +
                'Use the webpack-obfuscator plugin instead, which bundles a single VM runtime.\x1b[0m'
            );
        }

        const finalOptions = {
            ...obfuscatorOptions,
            ignoreRequireImports: true,
            inputFileName: relativePathOfModule,
            sourceMapMode: 'separate' as const
        };

        let obfuscationResult;

        // Use obfuscatePro if proApiConfig is provided, otherwise use sync obfuscate
        if (proApiConfig) {
            obfuscationResult = await JavaScriptObfuscator.obfuscatePro(
                sourceCode,
                finalOptions,
                proApiConfig,
                onProgress
            );
        } else {
            obfuscationResult = JavaScriptObfuscator.obfuscate(
                sourceCode,
                finalOptions
            );
        }

        callback(null, obfuscationResult.getObfuscatedCode(), obfuscationResult.getSourceMap());
    } catch (error) {
        callback(error as Error);
    }
}

module.exports = Loader;
