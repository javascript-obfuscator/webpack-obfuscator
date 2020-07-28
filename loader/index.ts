"use strict";

import JavaScriptObfuscator  from 'javascript-obfuscator';
import estraverse from 'estraverse';
import * as ESTree from 'estree';
import loaderUtils from 'loader-utils';
import * as acorn from 'acorn';

class WebpackObfuscatorLoaderHelper {
    /**
     * @type {acorn.Options['sourceType'][]}
     */
    private static readonly sourceTypes: acorn.Options['sourceType'][] = [
        'script',
        'module'
    ];

    /**
     * @param {string} sourceCode
     * @returns {string}
     */
    public static getCommentedSource (sourceCode: string): string {
        // Parses source code and collects require expression nodes
        const entries: {
            start: number;
            end: number;
        }[] = [];
        const astTree: ESTree.Program = WebpackObfuscatorLoaderHelper.parseCode(sourceCode);

        estraverse.traverse(astTree, {
            enter: (node: ESTree.Node): void => {
                if (WebpackObfuscatorLoaderHelper.isRequire(node) && node.start && node.end) {
                    entries.push({
                        start: node.start,
                        end: node.end,
                    });
                }
            }
        });

        // Wraps requires in conditional comments
        let commentedSource: string = sourceCode.slice();

        entries
            .sort((a, b) => b.end - a.end)
            .forEach((n) => {
                const before = commentedSource.slice(0, n.start);
                const mid = commentedSource.slice(n.start, n.end);
                const after = commentedSource.slice(n.end);

                commentedSource = `${before}/* javascript-obfuscator:disable */${mid}/* javascript-obfuscator:enable */${after}`;
            });

        return commentedSource;
    }

    /**
     * @param {string} sourceCode
     * @returns {ESTree.Program}
     */
    private static parseCode (sourceCode: string): ESTree.Program {
        const sourceTypeLength: number = WebpackObfuscatorLoaderHelper.sourceTypes.length;

        for (let i: number = 0; i < sourceTypeLength; i++) {
            try {
                return WebpackObfuscatorLoaderHelper.parseType(sourceCode, WebpackObfuscatorLoaderHelper.sourceTypes[i]);
            } catch (error) {
                if (i < sourceTypeLength - 1) {
                    continue;
                }

                throw new Error(error);
            }
        }

        throw new Error('Acorn parsing error');
    }

    /**
     * @param {string} sourceCode
     * @param {acorn.Options["sourceType"]} sourceType
     * @returns {Program}
     */
    private static parseType (
        sourceCode: string,
        sourceType: acorn.Options['sourceType']
    ): ESTree.Program {
        const config: acorn.Options = {sourceType};

        return <any>acorn.parse(sourceCode, config);
    }

    /**
     * @param {ESTree.Node} node
     * @returns {boolean}
     */
    private static isRequire (node: ESTree.Node) {
        return node.type === 'CallExpression'
            && node.callee.type === 'Identifier'
            && node.callee.name === 'require';
    }
}

/**
 * JavaScript Obfuscator loader based on `obfuscator-loader` package
 */
function Loader (sourceCode: string) {
    // Obfuscates commented source code
    // @ts-ignore
    const options = loaderUtils.getOptions(this) || {};
    const commentedSourceCode: string = WebpackObfuscatorLoaderHelper.getCommentedSource(sourceCode);
    const obfuscationResult = JavaScriptObfuscator.obfuscate(commentedSourceCode, options);

    return obfuscationResult.getObfuscatedCode();
}

export = Loader;
