// eslint.config.js — flat config (ESLint 9+)
//
// Conservative ruleset because the codebase mixes IIFE classics
// (cloudLedger.js, voiceLogger.js), ES modules (commonGroundSyncEngine.js,
// cottageFoodValidator.js), and a giant browser class (app.js). The point
// here is to catch the foot-guns (undefined vars, accidental implicit
// globals, dead code) without forcing a style migration on a working app.

export default [
    // ---- shared defaults --------------------------------------------------
    {
        files: ['**/*.{js,mjs,cjs}'],
        ignores: [
            'node_modules/**',
            '.legacy-prototype/**',
            'vendor/**',
            'models/**',
            'dist/**',
            'firmware/**',                  // C++ — not lintable as JS
            'gateway/nginx/**',
            'data/**'                       // JSON only
        ],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType:  'module',
            globals: {
                // Browser
                window: 'readonly', document: 'readonly', navigator: 'readonly',
                localStorage: 'readonly', fetch: 'readonly', console: 'readonly',
                location: 'readonly', alert: 'readonly', crypto: 'readonly',
                indexedDB: 'readonly', CustomEvent: 'readonly',
                AudioContext: 'readonly', AudioWorkletNode: 'readonly',
                sampleRate: 'readonly', registerProcessor: 'readonly',
                AudioWorkletProcessor: 'readonly',
                setTimeout: 'readonly', clearTimeout: 'readonly',
                setInterval: 'readonly', clearInterval: 'readonly',
                Buffer: 'readonly',
                // Node test runner
                process: 'readonly', globalThis: 'readonly',
                // Service worker
                self: 'readonly', caches: 'readonly', Response: 'readonly'
            }
        },
        rules: {
            // Real bugs
            'no-undef':                   'error',
            'no-unused-vars':             ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-unreachable':             'error',
            'no-dupe-keys':               'error',
            'no-dupe-args':               'error',
            'no-cond-assign':             ['error', 'except-parens'],
            'no-constant-condition':      ['error', { checkLoops: false }],
            'no-self-assign':             'error',
            'no-self-compare':            'error',
            'use-isnan':                  'error',
            'valid-typeof':               'error',
            'no-fallthrough':             'warn',

            // Memory / leak hazards
            'no-implicit-globals':        'error',
            'no-with':                    'error',

            // Style guard-rails we DO care about
            'eqeqeq':                     ['warn', 'smart'],
            'no-var':                     'warn',
            'prefer-const':               ['warn', { destructuring: 'all' }],

            // Async sanity
            'require-atomic-updates':     'off',  // too many false positives in event handlers
            'no-async-promise-executor':  'error',
            'no-await-in-loop':           'off',  // legitimate in our sync loops
            'no-promise-executor-return': 'error',

            // Console + debugging
            'no-console':                 'off',
            'no-debugger':                'error'
        }
    },

    // ---- service worker has its own globals ------------------------------
    {
        files: ['sw.js'],
        languageOptions: {
            globals: {
                self: 'readonly', caches: 'readonly', clients: 'readonly',
                fetch: 'readonly', Response: 'readonly', console: 'readonly',
                setTimeout: 'readonly', Promise: 'readonly'
            }
        }
    },

    // ---- AudioWorklet processor runs in its own realm --------------------
    {
        files: ['vosk-resampler-worklet.js'],
        languageOptions: {
            globals: {
                sampleRate: 'readonly', currentTime: 'readonly',
                registerProcessor: 'readonly', AudioWorkletProcessor: 'readonly'
            }
        }
    }
];
