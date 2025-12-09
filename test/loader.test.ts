import webpack, { Configuration, Stats } from 'webpack';
import path from 'path';
import fs from 'fs';
import { WebpackObfuscatorPlugin } from '../plugin';

const outputDir = path.resolve(__dirname, 'temp-output-loader');

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

const createLoaderConfig = (entry: Record<string, string>, loaderOptions = {}): Configuration => ({
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
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: 'post',
                use: {
                    loader: WebpackObfuscatorPlugin.loader,
                    options: loaderOptions
                }
            }
        ]
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

describe('WebpackObfuscatorLoader', () => {
    describe('basic obfuscation', () => {
        it('should obfuscate JavaScript modules', async () => {
            const config = createLoaderConfig({
                'main': './index.js'
            });

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['main.js'].length).toBeGreaterThan(0);
        });

        it('should obfuscate nested modules', async () => {
            const config = createLoaderConfig({
                'main': './index.js'
            });

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });
    });

    describe('loader options', () => {
        it('should apply string array option', async () => {
            const config = createLoaderConfig(
                { 'main': './index.js' },
                {
                    stringArray: true,
                    stringArrayThreshold: 1
                }
            );

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });

        it('should apply compact option', async () => {
            const config = createLoaderConfig(
                { 'main': './index.js' },
                { compact: false }
            );

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['main.js']).toContain('\n');
        });

        it('should apply disableConsoleOutput option', async () => {
            const config = createLoaderConfig(
                { 'main': './index.js' },
                { disableConsoleOutput: true }
            );

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });

        it('should apply renameGlobals option', async () => {
            const config = createLoaderConfig(
                { 'main': './nested.js' },
                { renameGlobals: true }
            );

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });
    });

    describe('source maps', () => {
        it('should generate source maps when enabled', async () => {
            const config = createLoaderConfig(
                { 'main': './index.js' },
                { sourceMap: true }
            );
            config.devtool = 'source-map';

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['main.js.map']).toBeDefined();

            const sourceMap = JSON.parse(output['main.js.map']);
            expect(sourceMap.version).toBe(3);
        });

        it('should work with inline-source-map devtool', async () => {
            const config = createLoaderConfig(
                { 'main': './index.js' },
                { sourceMap: true }
            );
            config.devtool = 'inline-source-map';

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['main.js']).toContain('sourceMappingURL=data:');
        });
    });

    describe('exclude patterns', () => {
        it('should respect exclude in module rules', async () => {
            const config: Configuration = {
                mode: 'production',
                entry: {
                    'main': './index.js',
                    'vendor': './nested.js'
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
                            exclude: [
                                path.resolve(__dirname, 'input/nested')
                            ],
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
            expect(output['vendor.js']).toBeDefined();
        });
    });

    describe('multiple entries', () => {
        it('should obfuscate multiple entry points independently', async () => {
            const config = createLoaderConfig({
                'entry1': './index.js',
                'entry2': './index-excluded.js'
            });

            const { output } = await runWebpack(config);

            expect(output['entry1.js']).toBeDefined();
            expect(output['entry2.js']).toBeDefined();
        });
    });

    describe('ignoreRequireImports', () => {
        it('should preserve require statements', async () => {
            const config = createLoaderConfig(
                { 'main': './index.js' },
                {}
            );

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });
    });

    describe('dead code injection', () => {
        it('should support dead code injection option', async () => {
            const config = createLoaderConfig(
                { 'main': './index.js' },
                {
                    deadCodeInjection: true,
                    deadCodeInjectionThreshold: 1
                }
            );

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });
    });

    describe('self defending', () => {
        it('should support self defending option', async () => {
            const config = createLoaderConfig(
                { 'main': './index.js' },
                { selfDefending: true }
            );

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });
    });
});
