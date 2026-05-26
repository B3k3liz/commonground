#!/usr/bin/env node
/**
 * scripts/bump-sw-cache.mjs
 * ---------------------------------------------------------------------------
 * Derives the service-worker shell cache name from a content hash of the
 * ASSETS_TO_CACHE list. Run this as a prebuild step (or before each git
 * commit) so manual version bumping is no longer required.
 *
 * Usage:
 *     node scripts/bump-sw-cache.mjs           # bumps in place if changed
 *     node scripts/bump-sw-cache.mjs --check   # exit 1 if out of date
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SW_PATH   = path.join(REPO_ROOT, 'sw.js');
const CHECK_ONLY = process.argv.includes('--check');

const sw = readFileSync(SW_PATH, 'utf8');

// Parse ASSETS_TO_CACHE so we hash the actual file contents the SW will
// pre-cache. If the list ever moves, this regex must move too.
const listMatch = sw.match(/ASSETS_TO_CACHE\s*=\s*\[([\s\S]*?)\]/m);
if (!listMatch) {
    console.error('bump-sw-cache: ASSETS_TO_CACHE list not found in sw.js');
    process.exit(2);
}

const assets = Array.from(listMatch[1].matchAll(/"([^"]+)"/g)).map(m => m[1]);
const hash = createHash('sha256');

for (const asset of assets) {
    // Strip leading ./ — relative to repo root.
    const rel = asset.replace(/^\.\//, '');
    if (rel === '' || rel === '/') {
        // "./" is the document root → use index.html
        const idx = path.join(REPO_ROOT, 'index.html');
        hash.update('index.html\0');
        hash.update(readFileSync(idx));
        continue;
    }
    const abs = path.join(REPO_ROOT, rel);
    let bytes;
    try {
        bytes = readFileSync(abs);
    } catch (e) {
        console.error(`bump-sw-cache: cannot read ${rel}: ${e.message}`);
        process.exit(2);
    }
    hash.update(rel + '\0');
    hash.update(bytes);
}

const newDigest = hash.digest('hex').slice(0, 10);
const newName   = `commonground-cache-${newDigest}`;

const currentMatch = sw.match(/const\s+CACHE_NAME\s*=\s*"([^"]+)";/);
if (!currentMatch) {
    console.error('bump-sw-cache: CACHE_NAME line not found in sw.js');
    process.exit(2);
}
const currentName = currentMatch[1];

if (currentName === newName) {
    console.log(`bump-sw-cache: up to date (${currentName})`);
    process.exit(0);
}

if (CHECK_ONLY) {
    console.error(`bump-sw-cache: STALE — current=${currentName}, expected=${newName}`);
    console.error('Run `npm run sw:bump` to update.');
    process.exit(1);
}

const updated = sw.replace(
    /const\s+CACHE_NAME\s*=\s*"[^"]+";/,
    `const CACHE_NAME = "${newName}";`
);

writeFileSync(SW_PATH, updated);
console.log(`bump-sw-cache: ${currentName}  →  ${newName}`);
console.log('Commit sw.js and deploy. Clients will purge the old cache on next activate.');
