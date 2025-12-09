"use strict";

import JavaScriptObfuscator, {ObfuscatorOptions} from 'javascript-obfuscator';
import loaderUtils from 'loader-utils';
import * as path from 'path';

type WebpackObfuscatorOptions = Omit<
    ObfuscatorOptions,
    | 'inputFileName'
    | 'sourceMapBaseUrl'
    | 'sourceMapFileName'
    | 'sourceMapMode'
    | 'sourceMapSourcesMode'
    >;

/**
 * JavaScript Obfuscator loader based on `obfuscator-loader` package
 */
function Loader (sourceCode: string) {
    // @ts-ignore
    const context = this;

    const relativePathOfModule = path.relative(context.rootContext, context.resourcePath);

    // Obfuscates commented source code
    const options  = loaderUtils.getOptions<WebpackObfuscatorOptions>(context) || {};
    const obfuscationResult = JavaScriptObfuscator.obfuscate(
        sourceCode,
        {
            ...options,
            ignoreRequireImports: true,
            inputFileName: relativePathOfModule,
            sourceMapMode: 'separate'
        }
    );

    context.callback(null, obfuscationResult.getObfuscatedCode(), obfuscationResult.getSourceMap());
}

export = Loader;
