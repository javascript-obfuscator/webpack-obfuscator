"use strict";

declare let module: any;
declare let require: any;

let multimatch: any = require('multimatch'),
    JavaScriptObfuscator = require('javascript-obfuscator');

class WebpackObfuscator {
    public options: any = {};
    public excludes: string[];

    private PLUGIN_NAME: string = 'webpack-obfuscator';

    /**
     * @param options
     * @param excludes
     */
    constructor (options: any, excludes: string|string[]) {
        this.options = options;
        this.excludes = typeof excludes === 'string' ? [excludes] : excludes || [];
    }

    /**
     * @param compiler
     */
    public apply (compiler: any): void {
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
                    let asset = compilation.assets[file];

                    compilation.assets[file] = JavaScriptObfuscator.obfuscate(asset.source(), this.options);
                });

                callback();
            });
        });
    }

    /**
     * @param filePath
     * @param excludes
     * @returns {boolean}
     */
    private shouldExclude (filePath: string, excludes: string[]): boolean {
        for (let exclude of excludes) {
            if (multimatch(filePath, exclude).length > 0) {
                return true;
            }
        }

        return false;
    }
}

module.exports = WebpackObfuscator;
