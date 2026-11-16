import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { mockLocalStorage } from './mockLocalStorage.js';

// Register the custom ESM loader
register(pathToFileURL(path.resolve('tests/loader.js')).href, import.meta.url);

// Global mock localStorage
globalThis.localStorage = mockLocalStorage;
