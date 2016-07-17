"use strict";

let JavaScriptObfuscator = require('javascript-obfuscator'),
    multimatch: any = require('multimatch'),
    RawSource: any = require('webpack-core/lib/RawSource');

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
                    if (this.shouldExclude(file, this.excludes)) {
                        return;
                    }

                    let asset = compilation.assets[file];

                    compilation.assets[file] = new RawSource(JavaScriptObfuscator.obfuscate(asset.source(), this.options));
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
