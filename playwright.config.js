// playwright.config.js — E2E smoke tests for the CommonGround static app.
//
// Run once: `npx playwright install chromium` (downloads ~150 MB of browser
// binary; cached under ~/.cache/ms-playwright).
// Then: `npm run test:e2e`
//
// The webServer block boots a tiny Node static server on :4173 so Playwright
// can hit index.html via http (file:// confuses Service Worker registration
// + module imports).

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: true,
    workers: 1,                 // we serve one static site; no need for more
    retries: 0,
    reporter: process.env.CI ? 'github' : 'list',

    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'retain-on-failure',
        viewport: { width: 1280, height: 800 },
        // The app uses localStorage extensively — keep each test isolated.
        storageState: undefined
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ],

    webServer: {
        command: 'node scripts/static-server.mjs 4173',
        url: 'http://127.0.0.1:4173/index.html',
        timeout: 15_000,
        reuseExistingServer: !process.env.CI
    }
});
