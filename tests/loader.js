import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const mockSupabaseUrl = pathToFileURL(path.resolve('tests/mockSupabaseModule.js')).href;
const mockLoggerUrl = pathToFileURL(path.resolve('tests/mockLogger.js')).href;

export async function resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('lib/supabase') || specifier.endsWith('lib/supabase.js') || specifier === '../lib/supabase') {
        return {
            url: mockSupabaseUrl,
            shortCircuit: true
        };
    }

    if (specifier.endsWith('utils/logger') || specifier.endsWith('utils/logger.js') || specifier === './logger') {
        return {
            url: mockLoggerUrl,
            shortCircuit: true
        };
    }

    try {
        return await nextResolve(specifier, context);
    } catch (err) {
        if (context.parentURL && (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/'))) {
            let basePath;
            if (specifier.startsWith('/')) {
                basePath = specifier;
            } else {
                const parentPath = fileURLToPath(context.parentURL);
                basePath = path.resolve(path.dirname(parentPath), specifier);
            }

            for (const ext of ['.js', '.jsx', '.json', '/index.js', '/index.jsx']) {
                const cand = basePath + ext;
                if (fs.existsSync(cand)) {
                    return {
                        url: pathToFileURL(cand).href,
                        shortCircuit: true
                    };
                }
            }
        }
        throw err;
    }
}

export async function load(url, context, nextLoad) {
    if (url.endsWith('.jsx')) {
        const filePath = fileURLToPath(url);
        const rawSource = fs.readFileSync(filePath, 'utf8');
        const transformed = esbuild.transformSync(rawSource, {
            loader: 'jsx',
            format: 'esm',
            target: 'node22'
        });
        return {
            format: 'module',
            shortCircuit: true,
            source: transformed.code
        };
    }
    return nextLoad(url, context);
}
