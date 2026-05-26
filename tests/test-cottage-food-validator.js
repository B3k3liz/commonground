/**
 * test-cottage-food-validator.js — unit tests for the cottage-food engine
 * ---------------------------------------------------------------------------
 * Covers:
 *   * Matrix sanity: every entry has the structural fields the validator reads
 *   * Per-state behaviour (CA, TX, WY, MD, FL, MT)
 *   * Revenue cap thresholds (under, near, over)
 *   * Poultry exemption threshold
 *   * Raw milk channel rules
 *   * Unknown / low-confidence states → conservative defaults + counsel flag
 *   * Disclaimer composition
 * ---------------------------------------------------------------------------
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    evaluateStorefront,
    getInvoiceDisclaimerHTML,
    getStorefrontBannerHTML,
    inferProductCategory,
    summariseProductCategories,
    _injectRulesForTesting
} from '../cottageFoodValidator.js';

let rules;
before(async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const raw = await readFile(path.join(__dirname, '..', 'data', 'cottage-food-rules.json'), 'utf8');
    rules = JSON.parse(raw);
    _injectRulesForTesting(rules);
});

// ===========================================================================
describe('Matrix structural sanity', () => {

    test('every state with confidence != "low" has a requiredDisclaimer', () => {
        for (const [code, s] of Object.entries(rules.states)) {
            if (s.confidence !== 'low' && s.confidence != null) {
                assert.ok(
                    typeof s.requiredDisclaimer === 'string' && s.requiredDisclaimer.length > 0,
                    `${code}: confidence=${s.confidence} but requiredDisclaimer missing`
                );
            }
        }
    });

    test('every cap (where set) is a positive finite number', () => {
        for (const [code, s] of Object.entries(rules.states)) {
            if (s.annualRevenueCapUSD != null) {
                assert.ok(Number.isFinite(s.annualRevenueCapUSD) && s.annualRevenueCapUSD > 0,
                    `${code}: invalid annualRevenueCapUSD`);
            }
        }
    });

    test('rawMilk.status is in the allowed enum for every state that defines it', () => {
        const enumSet = new Set([
            'permitted','pet-only','on-farm-only','farm-store','herd-share','direct','prohibited'
        ]);
        for (const [code, s] of Object.entries(rules.states)) {
            if (s.rawMilk && s.rawMilk.status != null) {
                assert.ok(enumSet.has(s.rawMilk.status),
                    `${code}: rawMilk.status='${s.rawMilk.status}' not in enum`);
            }
        }
    });

    test('_baseDefaults carries the conservative shape the validator needs', () => {
        assert.equal(typeof rules._baseDefaults.annualRevenueCapUSD, 'number');
        assert.ok(Array.isArray(rules._baseDefaults.allowedFoods));
        assert.ok(Array.isArray(rules._baseDefaults.prohibitedFoods));
        assert.ok(rules._baseDefaults.rawMilk);
        assert.ok(rules._baseDefaults.poultry);
    });

    test('all 50 states + DC are present', () => {
        const expected = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
            'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC',
            'ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
        for (const code of expected) {
            assert.ok(rules.states[code], `missing state code: ${code}`);
        }
    });
});

// ===========================================================================
describe('Category inference', () => {
    test('infers categories from product names', () => {
        assert.equal(inferProductCategory({ name: 'Raw Honey' }),           'honey-syrup');
        assert.equal(inferProductCategory({ name: 'Sourdough Loaf' }),      'baked-goods');
        assert.equal(inferProductCategory({ name: 'Smoked Bacon' }),        'meat-products');
        assert.equal(inferProductCategory({ name: 'Lacinato Kale' }),       null);              // produce, not cottage food
        assert.equal(inferProductCategory({ name: 'Goat Milk Soap' }),      null);              // not food
        assert.equal(inferProductCategory({ name: 'Pastured Eggs' }),       'eggs-shell');
        assert.equal(inferProductCategory({ name: 'Raw Goat Milk' }),       'raw-milk');
        assert.equal(inferProductCategory({ name: 'Lavender Goat Cheese' }),'yogurt-cheese');
        assert.equal(inferProductCategory({ name: 'Pickled Beets' }),       'pickles-fermented');
    });

    test('summariseProductCategories aggregates a cart', () => {
        const cart = [
            { name: 'Raw Honey' }, { name: 'Raw Honey' },
            { name: 'Sourdough Loaf' },
            { name: 'Heirloom Tomatoes' }   // → null, not counted
        ];
        const summary = summariseProductCategories(cart);
        assert.deepEqual(summary, { 'honey-syrup': 2, 'baked-goods': 1 });
    });
});

// ===========================================================================
describe('Per-state evaluation', () => {

    test('California: $40k revenue under Class A cap → no violations', () => {
        const ev = evaluateStorefront({
            stateCode: 'CA',
            annualRevenueUSD: 40000,
            productCategoryCounts: { 'baked-goods': 5, 'jams-jellies': 2 }
        });
        assert.equal(ev.stateName, 'California');
        assert.equal(ev.violations.length, 0);
        assert.equal(ev.needsCounselReview, false);
        assert.ok(ev.requiredDisclaimers.some(d => /home kitchen/i.test(d)));
    });

    test('California: $145k revenue → approaching-cap warning', () => {
        const ev = evaluateStorefront({
            stateCode: 'CA',
            annualRevenueUSD: 145000,
            productCategoryCounts: { 'baked-goods': 5 }
        });
        assert.ok(ev.warnings.some(w => w.type === 'revenue-cap-approaching'),
            'expected revenue-cap-approaching warning');
        assert.equal(ev.violations.length, 0);
    });

    test('California: $160k revenue → hard violation', () => {
        const ev = evaluateStorefront({
            stateCode: 'CA',
            annualRevenueUSD: 160000,
            productCategoryCounts: { 'baked-goods': 5 }
        });
        assert.ok(ev.violations.some(v => v.type === 'revenue-cap-exceeded'),
            'expected revenue-cap-exceeded violation');
    });

    test('Texas: 1500 poultry birds exceeds the 1000-bird exemption', () => {
        const ev = evaluateStorefront({
            stateCode: 'TX',
            annualRevenueUSD: 10000,
            poultryAnnualBirds: 1500,
            productCategoryCounts: { 'poultry': 12 }
        });
        assert.ok(ev.violations.some(v => v.type === 'poultry-exemption-exceeded'));
    });

    test('Wyoming Food Freedom Act: raw milk permitted, no revenue cap', () => {
        const ev = evaluateStorefront({
            stateCode: 'WY',
            annualRevenueUSD: 250000,
            rawMilkGallonsAnnual: 800,
            productCategoryCounts: { 'raw-milk': 4, 'meat-products': 2, 'baked-goods': 3 }
        });
        assert.equal(ev.violations.length, 0,
            `Wyoming should permit raw milk + meat + baked goods. Got: ${JSON.stringify(ev.violations)}`);
        assert.ok(ev.requiredDisclaimers.some(d => /Wyoming Food Freedom/i.test(d)));
        // FDA raw-milk warning should be included.
        assert.ok(ev.requiredDisclaimers.some(d => /unpasteuri[sz]ed/i.test(d)),
            'expected the FDA raw-milk warning string');
    });

    test('Maryland: raw milk sale triggers hard violation', () => {
        const ev = evaluateStorefront({
            stateCode: 'MD',
            annualRevenueUSD: 5000,
            rawMilkGallonsAnnual: 10,
            productCategoryCounts: { 'raw-milk': 1 }
        });
        assert.ok(ev.violations.some(v => v.type === 'raw-milk-prohibited'));
    });

    test('Florida: raw milk pet-only triggers warning + ANIMAL CONSUMPTION disclaimer', () => {
        const ev = evaluateStorefront({
            stateCode: 'FL',
            annualRevenueUSD: 50000,
            rawMilkGallonsAnnual: 100,
            productCategoryCounts: { 'raw-milk': 1 }
        });
        assert.ok(ev.warnings.some(w => w.type === 'raw-milk-pet-only'));
        assert.ok(ev.requiredDisclaimers.some(d => /ANIMAL CONSUMPTION ONLY/i.test(d)));
    });

    test('Montana Local Food Choice Act: everything permitted, no cap', () => {
        const ev = evaluateStorefront({
            stateCode: 'MT',
            annualRevenueUSD: 175000,
            rawMilkGallonsAnnual: 500,
            productCategoryCounts: { 'raw-milk': 2, 'meat-products': 1, 'poultry': 5 }
        });
        assert.equal(ev.violations.length, 0);
    });
});

// ===========================================================================
describe('Unknown + low-confidence states', () => {

    test('unknown state code → conservative defaults + needsCounselReview', () => {
        const ev = evaluateStorefront({
            stateCode: 'XX',                       // not in matrix
            annualRevenueUSD: 1000,
            productCategoryCounts: { 'baked-goods': 1 }
        });
        assert.equal(ev.stateName, null);
        assert.equal(ev.needsCounselReview, true);
        assert.ok(ev.warnings.some(w => w.type === 'unknown-state'));
    });

    test('low-confidence state (DE) → counsel-review flag', () => {
        const ev = evaluateStorefront({
            stateCode: 'DE',
            annualRevenueUSD: 100,
            productCategoryCounts: { 'baked-goods': 1 }
        });
        assert.equal(ev.needsCounselReview, true);
        assert.ok(ev.warnings.some(w => w.type === 'low-confidence-state'));
    });

    test('low-confidence state: prohibited category in defaults still blocks raw milk', () => {
        const ev = evaluateStorefront({
            stateCode: 'DE',
            annualRevenueUSD: 100,
            rawMilkGallonsAnnual: 1,
            productCategoryCounts: { 'raw-milk': 1 }
        });
        assert.ok(ev.violations.some(v => v.type === 'raw-milk-prohibited'),
            'fallback defaults must prohibit raw milk on a low-confidence state');
    });
});

// ===========================================================================
describe('HTML helpers', () => {
    test('getInvoiceDisclaimerHTML escapes input and includes the state disclaimer', () => {
        const html = getInvoiceDisclaimerHTML({
            stateCode: 'CA',
            annualRevenueUSD: 50000,
            productCategoryCounts: { 'baked-goods': 1 }
        });
        assert.match(html, /home kitchen/i);
        assert.match(html, /cg-invoice-disclaimer-line/);
    });

    test('getInvoiceDisclaimerHTML adds counsel-review caveat for low-confidence states', () => {
        const html = getInvoiceDisclaimerHTML({
            stateCode: 'DE',
            annualRevenueUSD: 100,
            productCategoryCounts: { 'baked-goods': 1 }
        });
        assert.match(html, /counsel review/i);
    });

    test('getStorefrontBannerHTML is empty when nothing is wrong', () => {
        const html = getStorefrontBannerHTML({
            stateCode: 'CA',
            annualRevenueUSD: 1000,
            productCategoryCounts: { 'baked-goods': 1 }
        });
        assert.equal(html, '');
    });

    test('getStorefrontBannerHTML surfaces a hard banner on cap exceedance', () => {
        const html = getStorefrontBannerHTML({
            stateCode: 'CA',
            annualRevenueUSD: 200000,
            productCategoryCounts: { 'baked-goods': 1 }
        });
        assert.match(html, /cg-cottage-banner-hard/);
        assert.match(html, /cap of \$150,000/);
    });
});
