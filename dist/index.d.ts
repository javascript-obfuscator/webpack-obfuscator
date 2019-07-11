import { Compiler } from 'webpack';
import { TInputOptions as JavascriptObfuscatorOptions } from 'javascript-obfuscator/src/types/options/TInputOptions';
declare class WebpackObfuscator {
    options: JavascriptObfuscatorOptions;
    excludes: string[];
    constructor(options?: JavascriptObfuscatorOptions, excludes?: string | string[]);
    apply(compiler: Compiler): void;
    private shouldExclude;
    private extractSourceAndSourceMap;
    private obfuscate;
}
export = WebpackObfuscator;
