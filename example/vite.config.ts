/* eslint-disable unicorn/prefer-module */
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Fix react-mapbox-gl: it uses require() and mutates MapboxGl.accessToken (illegal in ESM).
// Pre-bundling resolves require(); this plugin lets the assignment pass esbuild.
function reactMapboxGlPatch() {
    return {
        name: 'react-mapbox-gl-patch',
        setup(build: any) {
            build.onLoad({ filter: /react-mapbox-gl[/\\].*\.js$/ }, async (args: any) => {
                const fs = await import('node:fs');
                let contents = await fs.promises.readFile(args.path, 'utf8');
                // Mutate via helper so esbuild doesn't treat as illegal import assignment
                contents = contents.replaceAll(
                    /MapboxGl\.accessToken\s*=\s*accessToken/g,
                    '((m,t)=>{m.accessToken=t})(MapboxGl,accessToken)'
                );
                contents = contents.replaceAll(
                    /MapboxGl\.config\.API_URL\s*=\s*apiUrl/g,
                    '((m,u)=>{m.config.API_URL=u})(MapboxGl,apiUrl)'
                );
                return { contents, loader: 'js' };
            });
        }
    };
}

export default defineConfig(({ mode }) => {
    // Load .env from repo root (parent of example) so process.env.* in source keeps working
    const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
    const envKeys = [
        'AERIS_CLIENT_ID',
        'AERIS_CLIENT_SECRET',
        'MAPBOX_TOKEN',
        'GOOGLE_KEY',
        'GOOGLE_MAP_ID',
        'MAPTILER_KEY'
    ];
    const define: Record<string, string> = {};
    envKeys.forEach((key) => {
        if (rootEnv[key] !== undefined) {
            define[`process.env.${key}`] = JSON.stringify(rootEnv[key]);
        }
    });

    return {
        root: __dirname,
        plugins: [react()],
        resolve: {
            alias: {
                'react': path.resolve(__dirname, 'node_modules/react'),
                'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
            },
            dedupe: ['react', 'react-dom']
        },
        define,
        optimizeDeps: {
            // Pre-bundle so require() and CJS deps resolve; patch handles MapboxGl.accessToken assignment
            include: [
                '@turf/helpers',
                '@turf/bbox',
                '@turf/meta',
                '@xweather/mapsgl',
                '@xweather/react-mapsgl',
                'react-mapbox-gl'
            ],
            esbuildOptions: {
                mainFields: ['module', 'main'],
                plugins: [reactMapboxGlPatch()]
            }
        },
        build: {
            outDir: 'dist',
            sourcemap: true,
            commonjsOptions: {
                transformMixedEsModules: true,
                defaultIsModuleExports: 'auto'
            },
            rollupOptions: {
                onwarn(warning, warn) {
                    if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
                    warn(warning);
                }
            }
        },
        server: {
            host: '127.0.0.1',
            port: 8080,
            open: true,
            fs: {
                allow: [__dirname, path.resolve(__dirname, '..')]
            }
        }
    };
});
