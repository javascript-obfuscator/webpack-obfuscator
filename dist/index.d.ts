import { Compiler } from 'webpack';
import { IOptions as JavaScriptObfuscatorOptions } from 'javascript-obfuscator/src/interfaces/options/IOptions';
declare class WebpackObfuscator {
    options: Partial<JavaScriptObfuscatorOptions>;
    excludes: string[];
    constructor(options: Partial<JavaScriptObfuscatorOptions>, excludes?: string | string[]);
    apply(compiler: Compiler): void;
    private shouldExclude;
    private extractSourceAndSourceMap;
    private obfuscate;
}
export = WebpackObfuscator;
