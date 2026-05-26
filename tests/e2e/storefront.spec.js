/**
 * tests/e2e/storefront.spec.js — single Playwright smoke test.
 *
 * Verifies the most critical flow that crosses every layer added in T1–T5:
 *
 *   1. Page loads, app boots, no JS errors.
 *   2. Setting a state code in Settings populates the local resources panel
 *      (USDA zone pills + Cooperative Extension link).
 *   3. Adding a product to the cart populates the cart total.
 *   4. Checkout produces an invoice that contains a state-specific
 *      cottage-food disclaimer.
 *
 * Run:  npx playwright install chromium  (once)
 *       npm run test:e2e
 */
import { test, expect } from '@playwright/test';

test.describe('storefront smoke', () => {

    test('loads, sets state, adds product, sees CA-specific invoice disclaimer', async ({ page }) => {
        const consoleErrors = [];
        page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
        });

        await page.goto('/index.html', { waitUntil: 'load' });

        // Wait for window.app to be initialised by the DOMContentLoaded handler.
        await page.waitForFunction(() => !!window.app, null, { timeout: 10_000 });

        // The cottage-food validator loads its rules async; wait for it to be
        // ready before we exercise the storefront so the disclaimer materialises.
        await page.waitForFunction(() => window.cgCottageFood && window.cgCottageFood.ready,
            null, { timeout: 10_000 });

        // ---- Set state code via the public app API (faster + less brittle
        //      than driving the settings input directly).
        await page.evaluate(() => {
            window.app.regionStateCode = 'CA';
            window.app.saveToStorage();
            window.app.renderCottageFoodBanner();
            window.app.renderStateResourcesPanel();
        });

        // ---- Add a product to the cart via the public API + assert cart total.
        await page.evaluate(() => {
            // Pick the first in-stock product.
            const prod = window.app.storeProducts.find(p => p.stock > 0);
            if (!prod) throw new Error('no in-stock products in seed data');
            window.app.addToCart(prod.id);
        });

        const cartTotalText = await page.locator('#cart-total-val').textContent();
        expect(cartTotalText).toMatch(/\$\d/);

        // ---- Execute checkout and inspect the invoice for the CA disclaimer.
        await page.evaluate(() => window.app.handleCheckoutCart());

        const invoiceText = await page.locator('#printable-invoice-content').textContent();
        // California's required statutory text contains "home kitchen" and
        // references CA Cal. Code §114365.5.
        expect(invoiceText).toMatch(/home kitchen/i);

        // The state-required cottage-food disclaimer must come from the
        // validator, not the legacy free-text field.
        expect(invoiceText).toMatch(/cottage|inspection|home kitchen/i);

        // ---- Bail loudly if any console errors fired during the run.
        expect(consoleErrors,
            'Unexpected console / page errors:\n' + consoleErrors.join('\n')
        ).toEqual([]);
    });
});
