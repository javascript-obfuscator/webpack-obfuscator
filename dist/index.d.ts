import { Compiler } from 'webpack';
import { ObfuscatorOptions } from 'javascript-obfuscator';
declare class WebpackObfuscator {
    options: ObfuscatorOptions;
    private static readonly baseIdentifiersPrefix;
    excludes: string[];
    constructor(options?: ObfuscatorOptions, excludes?: string | string[]);
    apply(compiler: Compiler): void;
    private shouldExclude;
    private extractSourceAndSourceMap;
    private obfuscate;
}
export = WebpackObfuscator;
