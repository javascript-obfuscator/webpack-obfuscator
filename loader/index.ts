"use strict";

import JavaScriptObfuscator, {ObfuscatorOptions} from 'javascript-obfuscator';
import loaderUtils from 'loader-utils';

/**
 * JavaScript Obfuscator loader based on `obfuscator-loader` package
 */
function Loader (sourceCode: string) {
    // Obfuscates commented source code
    // @ts-ignore
    const options  = loaderUtils.getOptions<ObfuscatorOptions>(this) || {};
    const obfuscationResult = JavaScriptObfuscator.obfuscate(
        sourceCode,
        {
            ...options,
            ignoreRequireImports: true
        }
    );

    return obfuscationResult.getObfuscatedCode();
}

export = Loader;
