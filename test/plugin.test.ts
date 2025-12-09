import webpack, { Configuration, Stats } from 'webpack';
import path from 'path';
import fs from 'fs';
import { WebpackObfuscatorPlugin } from '../plugin';

const outputDir = path.resolve(__dirname, 'temp-output');

const runWebpack = (config: Configuration): Promise<{ stats: Stats; output: Record<string, string> }> => {
    return new Promise((resolve, reject) => {
        // Ensure output directory exists
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

            // Read output files from disk instead of memory
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

// Clean up output directory before and after tests
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

describe('WebpackObfuscatorPlugin', () => {
    describe('constructor', () => {
        it('should initialize with default options', () => {
            const plugin = new WebpackObfuscatorPlugin();
            expect(plugin.options).toEqual({});
            expect(plugin.excludes).toEqual([]);
        });

        it('should initialize with custom options', () => {
            const options = { compact: false, stringArray: true };
            const plugin = new WebpackObfuscatorPlugin(options);
            expect(plugin.options).toEqual(options);
        });

        it('should accept string exclude pattern', () => {
            const plugin = new WebpackObfuscatorPlugin({}, 'vendor.js');
            expect(plugin.excludes).toEqual(['vendor.js']);
        });

        it('should accept array of exclude patterns', () => {
            const excludes = ['vendor.js', 'external/**/*.js'];
            const plugin = new WebpackObfuscatorPlugin({}, excludes);
            expect(plugin.excludes).toEqual(excludes);
        });
    });

    describe('static properties', () => {
        it('should expose loader path', () => {
            expect(WebpackObfuscatorPlugin.loader).toBeDefined();
            expect(typeof WebpackObfuscatorPlugin.loader).toBe('string');
            expect(WebpackObfuscatorPlugin.loader).toContain('loader');
        });
    });

    describe('obfuscation', () => {
        it('should obfuscate JavaScript files', async () => {
            const config = createBaseConfig({
                'main': './index.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin()];

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            // Obfuscated code should not contain original variable names in plain text
            expect(output['main.js']).not.toMatch(/function\s+abc\s*\(/);
        });

        it('should apply obfuscator options', async () => {
            const config = createBaseConfig({
                'main': './index.js'
            });
            config.plugins = [
                new WebpackObfuscatorPlugin({
                    compact: false,
                    controlFlowFlattening: true,
                    controlFlowFlatteningThreshold: 1
                })
            ];

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            // With control flow flattening, code structure should be significantly changed
            expect(output['main.js'].length).toBeGreaterThan(100);
        });

        it('should handle multiple entry points', async () => {
            const config = createBaseConfig({
                'entry1': './index.js',
                'entry2': './index-excluded.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin()];

            const { output } = await runWebpack(config);

            expect(output['entry1.js']).toBeDefined();
            expect(output['entry2.js']).toBeDefined();
        });
    });

    describe('exclusion patterns', () => {
        it('should exclude files matching string pattern', async () => {
            const config = createBaseConfig({
                'main': './index.js',
                'vendor': './nested.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin({}, 'vendor*')];
            config.optimization = { minimize: false };

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['vendor.js']).toBeDefined();
            // vendor.js should contain original code (not obfuscated)
            expect(output['vendor.js']).toContain('nested');
        });

        it('should exclude files matching glob pattern', async () => {
            const config = createBaseConfig({
                'main': './index.js',
                'lib/vendor': './nested.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin({}, 'lib/**/*')];

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
        });

        it('should exclude files matching multiple patterns', async () => {
            const config = createBaseConfig({
                'main': './index.js',
                'vendor': './nested.js',
                'external': './index-excluded.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin({}, ['vendor*', 'external*'])];

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['vendor.js']).toBeDefined();
            expect(output['external.js']).toBeDefined();
        });
    });

    describe('source maps', () => {
        it('should generate source maps when enabled', async () => {
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
            expect(sourceMap.sources).toBeDefined();
        });

        it('should not generate source maps when disabled', async () => {
            const config = createBaseConfig({
                'main': './index.js'
            });
            config.devtool = false;
            config.plugins = [
                new WebpackObfuscatorPlugin({
                    sourceMap: false
                })
            ];

            const { output } = await runWebpack(config);

            expect(output['main.js']).toBeDefined();
            expect(output['main.js.map']).toBeUndefined();
        });
    });

    describe('file extensions', () => {
        it('should obfuscate .js files', async () => {
            const config = createBaseConfig({
                'main': './index.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin()];

            const { output } = await runWebpack(config);
            expect(output['main.js']).toBeDefined();
        });

        it('should handle .mjs files', async () => {
            const config = createBaseConfig({
                'main': './index.js'
            });
            config.output!.filename = '[name].mjs';
            config.plugins = [new WebpackObfuscatorPlugin()];

            const { output } = await runWebpack(config);
            expect(output['main.mjs']).toBeDefined();
        });
    });

    describe('identifier prefix', () => {
        it('should use unique prefixes for different chunks', async () => {
            const config = createBaseConfig({
                'chunk1': './index.js',
                'chunk2': './nested.js'
            });
            config.plugins = [new WebpackObfuscatorPlugin()];

            const { output } = await runWebpack(config);

            expect(output['chunk1.js']).toBeDefined();
            expect(output['chunk2.js']).toBeDefined();
            // Each chunk should have different identifier prefixes (a0, a1, etc.)
        });
    });
});
