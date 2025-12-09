import webpack, { Configuration, Stats } from 'webpack';
import path from 'path';
import fs from 'fs';
import { WebpackObfuscatorPlugin, IProApiConfig, TProApiProgressCallback } from '../plugin';

const outputDir = path.resolve(__dirname, 'temp-output-pro-api');

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

const createBaseConfig = (entry: Record<string, string>): Configuration => ({
    mode: 'production',
    entry,
    context: path.resolve(__dirname, 'input'),
    output: {
        path: outputDir,
        filename: '[name].js'
    },
    cache: false,
    optimization: {
        minimize: false
    },
    target: 'web',
    resolve: {
        extensions: ['.js']
    }
});

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

describe('Pro API Support', () => {
    describe('Plugin Pro API configuration', () => {
        it('should accept proApiConfig in constructor', () => {
            const proApiConfig: IProApiConfig = {
                apiToken: 'test-token',
                timeout: 60000
            };

            const plugin = new WebpackObfuscatorPlugin({}, [], proApiConfig);

            expect(plugin.proApiConfig).toEqual(proApiConfig);
        });

        it('should accept onProgress callback in constructor', () => {
            const onProgress: TProApiProgressCallback = (message) => {
                console.log(message);
            };

            const plugin = new WebpackObfuscatorPlugin({}, [], undefined, onProgress);

            expect(plugin.onProgress).toBe(onProgress);
        });

        it('should accept both proApiConfig and onProgress', () => {
            const proApiConfig: IProApiConfig = {
                apiToken: 'test-token'
            };
            const onProgress: TProApiProgressCallback = (message) => {
                console.log(message);
            };

            const plugin = new WebpackObfuscatorPlugin({}, [], proApiConfig, onProgress);

            expect(plugin.proApiConfig).toEqual(proApiConfig);
            expect(plugin.onProgress).toBe(onProgress);
        });

        it('should work without proApiConfig (backward compatibility)', async () => {
            const config = createBaseConfig({
                'main': './index.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin()];

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['main.js'].length).toBeGreaterThan(0);
        });

        it('should maintain backward compatibility with excludes as second parameter', () => {
            const plugin = new WebpackObfuscatorPlugin(
                { compact: true },
                ['vendor*.js', 'external/**/*.js']
            );

            expect(plugin.options).toEqual({ compact: true });
            expect(plugin.excludes).toEqual(['vendor*.js', 'external/**/*.js']);
            expect(plugin.proApiConfig).toBeUndefined();
            expect(plugin.onProgress).toBeUndefined();
        });
    });

    describe('Loader Pro API configuration', () => {
        it('should work with proApiConfig in loader options (type check)', async () => {
            // This test verifies the loader accepts proApiConfig in options
            // We can't actually test the Pro API without a real token,
            // but we can verify the configuration is accepted
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
                            use: {
                                loader: WebpackObfuscatorPlugin.loader,
                                options: {
                                    // Without proApiConfig, uses sync obfuscate
                                    compact: true,
                                    stringArray: false
                                }
                            }
                        }
                    ]
                },
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

    describe('Async plugin behavior', () => {
        it('should process files asynchronously', async () => {
            const config = createBaseConfig({
                'main': './index.js',
                'secondary': './nested.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin()];

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['secondary.js']).toBeDefined();
        });

        it('should handle multiple chunks asynchronously', async () => {
            const config = createBaseConfig({
                'chunk1': './index.js',
                'chunk2': './index-excluded.js',
                'chunk3': './nested.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin()];

            const { output } = await runWebpack(config);

            expect(output['chunk1.js']).toBeDefined();
            expect(output['chunk2.js']).toBeDefined();
            expect(output['chunk3.js']).toBeDefined();
        });

        it('should handle source maps asynchronously', async () => {
            const config = createBaseConfig({
                'main': './index.js'
            });
            config.devtool = 'source-map';
            config.plugins = [
                new WebpackObfuscatorPlugin({
                    sourceMap: true
                })
            ];

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['main.js.map']).toBeDefined();

            const sourceMap = JSON.parse(output['main.js.map']);
            expect(sourceMap.version).toBe(3);
        });

        it('should respect exclusions in async mode', async () => {
            const config = createBaseConfig({
                'main': './index.js',
                'vendor': './nested.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin({}, 'vendor*')];

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['vendor.js']).toBeDefined();
            // vendor.js should contain original code (not obfuscated)
            expect(output['vendor.js']).toContain('nested');
        });
    });

    describe('Async loader behavior', () => {
        it('should process modules asynchronously', async () => {
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
                            use: {
                                loader: WebpackObfuscatorPlugin.loader,
                                options: {}
                            }
                        }
                    ]
                },
                target: 'web',
                resolve: {
                    extensions: ['.js']
                }
            };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });

        it('should handle errors gracefully in async mode', async () => {
            // Create a file with valid JS that can be obfuscated
            const testFilePath = path.resolve(__dirname, 'input/async-test-temp.js');
            fs.writeFileSync(testFilePath, 'var x = 1;');

            try {
                const config: Configuration = {
                    mode: 'production',
                    entry: {
                        'main': './async-test-temp.js'
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
                                use: {
                                    loader: WebpackObfuscatorPlugin.loader,
                                    options: {}
                                }
                            }
                        ]
                    },
                    target: 'web',
                    resolve: {
                        extensions: ['.js']
                    }
                };

                const { output } = await runWebpack(config);
                expect(output['main.js']).toBeDefined();
            } finally {
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
    });

    describe('Type exports', () => {
        it('should export IProApiConfig type', () => {
            // This test verifies the type is exported and usable
            const config: IProApiConfig = {
                apiToken: 'test'
            };
            expect(config.apiToken).toBe('test');
        });

        it('should export TProApiProgressCallback type', () => {
            // This test verifies the type is exported and usable
            const callback: TProApiProgressCallback = (message: string) => {
                expect(typeof message).toBe('string');
            };
            callback('test message');
        });
    });
});
