import webpack, { Configuration, Stats } from 'webpack';
import path from 'path';
import fs from 'fs';
import { WebpackObfuscatorPlugin } from '../plugin';

const outputDir = path.resolve(__dirname, 'temp-output-integration');

const runWebpack = (config: Configuration): Promise<{ stats: Stats; output: Record<string, string> }> => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const compiler = webpack(config);
        compiler.run((err, stats) => {
            if (err) {
                reject(err);
                return;
            }
            if (!stats) {
                reject(new Error('No stats returned'));
                return;
            }
            if (stats.hasErrors()) {
                reject(new Error(stats.toString()));
                return;
            }

            const output: Record<string, string> = {};
            const outputPath = config.output?.path || outputDir;

            if (fs.existsSync(outputPath)) {
                const files = fs.readdirSync(outputPath);
                for (const file of files) {
                    const filePath = path.join(outputPath, file);
                    if (fs.statSync(filePath).isFile()) {
                        output[file] = fs.readFileSync(filePath, 'utf-8');
                    }
                }
            }

            compiler.close(() => {
                resolve({ stats, output });
            });
        });
    });
};

beforeEach(() => {
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
});

afterAll(() => {
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }
});

describe('Integration Tests', () => {
    describe('plugin and loader combination', () => {
        it('should work when using both plugin and loader', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './index.js'
                },
                context: path.resolve(__dirname, 'input'),
                output: {
                    path: outputDir,
                    filename: '[name].js'
                },
                cache: false,
                optimization: {
                    minimize: false
                },
                module: {
                    rules: [
                        {
                            test: /\.js$/,
                            enforce: 'post',
                            exclude: [/node_modules/],
                            use: {
                                loader: WebpackObfuscatorPlugin.loader,
                                options: {
                                    stringArray: true,
                                    stringArrayThreshold: 0.5
                                }
                            }
                        }
                    ]
                },
                plugins: [
                    new WebpackObfuscatorPlugin({
                        compact: true
                    })
                ],
                target: 'web',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['main.js'].length).toBeGreaterThan(0);
        });
    });

    describe('code execution', () => {
        it('obfuscated code should be executable', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './nested.js'
                },
                context: path.resolve(__dirname, 'input'),
                output: {
                    path: outputDir,
                    filename: '[name].js',
                    library: {
                        type: 'commonjs2'
                    }
                },
                cache: false,
                optimization: {
                    minimize: false
                },
                plugins: [
                    new WebpackObfuscatorPlugin({
                        compact: false,
                        selfDefending: false
                    })
                ],
                target: 'node',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            // Basic check that the code is valid JavaScript
            expect(() => new Function(output['main.js'])).not.toThrow();
        });
    });

    describe('webpack features compatibility', () => {
        it('should work with DefinePlugin', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './index.js'
                },
                context: path.resolve(__dirname, 'input'),
                output: {
                    path: outputDir,
                    filename: '[name].js'
                },
                cache: false,
                optimization: {
                    minimize: false
                },
                plugins: [
                    new webpack.DefinePlugin({
                        'process.env.SOME_VAR': JSON.stringify('defined-value')
                    }),
                    new WebpackObfuscatorPlugin()
                ],
                target: 'web',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });

        it('should work with code splitting', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './index.js'
                },
                context: path.resolve(__dirname, 'input'),
                output: {
                    path: outputDir,
                    filename: '[name].js',
                    chunkFilename: '[name].chunk.js'
                },
                cache: false,
                optimization: {
                    minimize: false,
                    splitChunks: {
                        chunks: 'all',
                        minSize: 0
                    }
                },
                plugins: [
                    new WebpackObfuscatorPlugin()
                ],
                target: 'web',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });

        it('should work with different targets', async () => {
            const targets: Configuration['target'][] = ['web', 'node', 'webworker'];

            for (const target of targets) {
                // Clean output between runs
                if (fs.existsSync(outputDir)) {
                    fs.rmSync(outputDir, { recursive: true, force: true });
                }
                fs.mkdirSync(outputDir, { recursive: true });

                const config: Configuration = {
                    mode: 'production',
                    entry: {
                        'main': './nested.js'
                    },
                    context: path.resolve(__dirname, 'input'),
                    output: {
                        path: outputDir,
                        filename: '[name].js'
                    },
                    cache: false,
                    optimization: {
                        minimize: false
                    },
                    plugins: [
                        new WebpackObfuscatorPlugin()
                    ],
                    target,
                    resolve: {
                        extensions: ['.js']
                    }
                };

                const { output } = await runWebpack(config);
                expect(output['main.js']).toBeDefined();
            }
        });
    });

    describe('real-world scenarios', () => {
        it('should handle ES6 features in bundled code', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './index.js'
                },
                context: path.resolve(__dirname, 'input'),
                output: {
                    path: outputDir,
                    filename: '[name].js'
                },
                cache: false,
                optimization: {
                    minimize: false
                },
                plugins: [
                    new WebpackObfuscatorPlugin({
                        target: 'browser'
                    })
                ],
                target: 'web',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });

        it('should work with production mode minimization', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './index.js'
                },
                context: path.resolve(__dirname, 'input'),
                output: {
                    path: outputDir,
                    filename: '[name].js'
                },
                cache: false,
                optimization: {
                    minimize: true
                },
                plugins: [
                    new WebpackObfuscatorPlugin()
                ],
                target: 'web',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            // Code should be minified and obfuscated
            expect(output['main.js'].split('\n').length).toBeLessThan(10);
        });
    });

    describe('source map chain', () => {
        it('should properly chain source maps from loader to plugin', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './index.js'
                },
                context: path.resolve(__dirname, 'input'),
                output: {
                    path: outputDir,
                    filename: '[name].js'
                },
                devtool: 'source-map',
                cache: false,
                optimization: {
                    minimize: false
                },
                module: {
                    rules: [
                        {
                            test: /\.js$/,
                            enforce: 'post',
                            use: {
                                loader: WebpackObfuscatorPlugin.loader,
                                options: {
                                    sourceMap: true
                                }
                            }
                        }
                    ]
                },
                plugins: [
                    new WebpackObfuscatorPlugin({
                        sourceMap: true
                    })
                ],
                target: 'web',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['main.js.map']).toBeDefined();

            const sourceMap = JSON.parse(output['main.js.map']);
            expect(sourceMap.version).toBe(3);
            expect(sourceMap.sources).toBeDefined();
            expect(Array.isArray(sourceMap.sources)).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should handle empty files gracefully', async () => {
            // Create a temporary empty file
            const emptyFilePath = path.resolve(__dirname, 'input/empty-temp.js');
            fs.writeFileSync(emptyFilePath, '');

            try {
                const config: Configuration = {
                    mode: 'production',
                    entry: {
                        'main': './empty-temp.js'
                    },
                    context: path.resolve(__dirname, 'input'),
                    output: {
                        path: outputDir,
                        filename: '[name].js'
                    },
                    cache: false,
                    optimization: {
                        minimize: false
                    },
                    plugins: [
                        new WebpackObfuscatorPlugin()
                    ],
                    target: 'web',
                    resolve: {
                        extensions: ['.js']
                    }
                };

                const { output } = await runWebpack(config);
                expect(output['main.js']).toBeDefined();
            } finally {
                // Clean up
                if (fs.existsSync(emptyFilePath)) {
                    fs.unlinkSync(emptyFilePath);
                }
            }
        });
    });

    describe('obfuscation strength', () => {
        it('should apply high obfuscation preset effectively', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './index.js'
                },
                context: path.resolve(__dirname, 'input'),
                output: {
                    path: outputDir,
                    filename: '[name].js'
                },
                cache: false,
                optimization: {
                    minimize: false
                },
                plugins: [
                    new WebpackObfuscatorPlugin({
                        compact: true,
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 0.75,
                        deadCodeInjection: true,
                        deadCodeInjectionThreshold: 0.4,
                        stringArray: true,
                        stringArrayThreshold: 0.75,
                        transformObjectKeys: true
                    })
                ],
                target: 'web',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            // High obfuscation should produce larger output
            expect(output['main.js'].length).toBeGreaterThan(500);
        });

        it('should apply low obfuscation preset effectively', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './index.js'
                },
                context: path.resolve(__dirname, 'input'),
                output: {
                    path: outputDir,
                    filename: '[name].js'
                },
                cache: false,
                optimization: {
                    minimize: false
                },
                plugins: [
                    new WebpackObfuscatorPlugin({
                        compact: true,
                        controlFlowFlattening: false,
                        deadCodeInjection: false,
                        stringArray: false
                    })
                ],
                target: 'web',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });
    });
});
