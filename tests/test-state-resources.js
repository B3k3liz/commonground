/**
 * test-state-resources.js — sanity tests for the state-resources matrix
 * ---------------------------------------------------------------------------
 * Covers:
 *   * Every US state + DC is present
 *   * Each entry carries a non-empty zone range and extension.rootUrl
 *   * Every URL is a syntactically valid http(s) URL
 *   * Land-grant institutions list is non-empty
 *   * Lookup helpers behave correctly for known and unknown states
 *   * Lookup helpers tolerate lower-case + missing input
 * ---------------------------------------------------------------------------
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    getStateResources,
    getZoneInfo,
    getExtensionResources,
    getLandUseZoningHint,
    getResourcePanelHTML,
    _injectResourcesForTesting
} from '../stateResources.js';

let data;
before(async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const raw = await readFile(path.join(__dirname, '..', 'data', 'state-extension-resources.json'), 'utf8');
    data = JSON.parse(raw);
    _injectResourcesForTesting(data);
});

const STATE_CODES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC'
];

function isUrl(s) { try { new URL(s); return true; } catch { return false; } }

// ===========================================================================
describe('Matrix completeness', () => {
    test('every state + DC is present', () => {
        for (const code of STATE_CODES) {
            assert.ok(data.states[code], `missing entry: ${code}`);
        }
    });

    test('every state has a non-empty USDA zone range', () => {
        for (const code of STATE_CODES) {
            const s = data.states[code];
            assert.ok(Array.isArray(s.usdaZones) && s.usdaZones.length > 0,
                `${code}: usdaZones missing or empty`);
            for (const z of s.usdaZones) {
                assert.match(z, /^(1[0-3]|[1-9])[ab]$/,
                    `${code}: malformed zone "${z}"`);
            }
        }
    });

    test('every state has a Cooperative Extension entry', () => {
        for (const code of STATE_CODES) {
            const e = data.states[code].extension;
            assert.ok(e,                                          `${code}: extension missing`);
            assert.ok(typeof e.name === 'string' && e.name.length > 0, `${code}: extension.name`);
            assert.ok(Array.isArray(e.institutions) && e.institutions.length > 0,
                `${code}: extension.institutions`);
            assert.ok(isUrl(e.rootUrl), `${code}: extension.rootUrl not a URL`);
            if (e.findOfficeUrl)     assert.ok(isUrl(e.findOfficeUrl), `${code}: findOfficeUrl`);
            if (e.gardenHubUrl)      assert.ok(isUrl(e.gardenHubUrl),  `${code}: gardenHubUrl`);
            if (e.livestockHubUrl)   assert.ok(isUrl(e.livestockHubUrl),`${code}: livestockHubUrl`);
            if (e.foodSafetyHubUrl)  assert.ok(isUrl(e.foodSafetyHubUrl),`${code}: foodSafetyHubUrl`);
        }
    });

    test('1890 land-grant HBCU partners are recognised in southern states', () => {
        // States that statutorily co-administer with 1890 HBCUs.
        const expectMultiple = ['AL','AR','DE','FL','GA','KY','LA','MD','MS','NC','OH','OK','SC','TN','TX','VA','WV'];
        for (const code of expectMultiple) {
            const inst = data.states[code].extension.institutions;
            assert.ok(inst.length >= 2,
                `${code}: expected co-administration with an 1890 HBCU partner (got ${inst.join(', ')})`);
        }
    });
});

// ===========================================================================
describe('Lookup helpers', () => {

    test('getStateResources returns the full entry', () => {
        const s = getStateResources('CA');
        assert.equal(s.name, 'California');
        assert.ok(Array.isArray(s.usdaZones));
    });

    test('getZoneInfo returns zones + lookup URL + note', () => {
        const z = getZoneInfo('TX');
        assert.equal(z.stateName, 'Texas');
        assert.ok(z.zones.includes('8a') || z.zones.includes('9a'));
        assert.ok(isUrl(z.lookupUrl));
        assert.match(z.note, /USDA/);
    });

    test('getExtensionResources returns institution names + URLs', () => {
        const e = getExtensionResources('NY');
        assert.equal(e.stateName, 'New York');
        assert.match(e.name, /Cornell/);
        assert.ok(e.institutions.includes('Cornell University'));
        assert.ok(isUrl(e.rootUrl));
        assert.equal(e.confidence, 'high');
        assert.match(e.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
    });

    test('getLandUseZoningHint is informational and returns a search URL', () => {
        const h = getLandUseZoningHint('OR');
        assert.equal(h.stateName, 'Oregon');
        assert.match(h.message, /county/i);
        assert.ok(isUrl(h.searchUrl));
        assert.match(h.searchUrl, /Oregon/i);
    });

    test('lower-case state codes are accepted', () => {
        const e = getExtensionResources('ca');
        assert.equal(e.stateCode, 'CA');
    });

    test('unknown state code returns null gracefully', () => {
        assert.equal(getStateResources('XX'), null);
        assert.equal(getZoneInfo('XX'),       null);
        assert.equal(getExtensionResources('XX'), null);
    });

    test('missing state code → land-use hint still works (with generic message)', () => {
        const h = getLandUseZoningHint(null);
        assert.equal(h.stateCode, null);
        assert.match(h.message, /county/i);
    });
});

// ===========================================================================
describe('Resource panel HTML', () => {

    test('panel for a known state includes Extension name + zone pills', () => {
        const html = getResourcePanelHTML('CA');
        assert.match(html, /UC Agriculture/);
        assert.match(html, /cg-zone-pill/);
        assert.match(html, /California/);
        // The search-URL helper for county land-use should be linked.
        assert.match(html, /county zoning/i);
    });

    test('panel for an empty state shows the prompt', () => {
        const html = getResourcePanelHTML(null);
        assert.match(html, /Set your two-letter state code/i);
    });

    test('panel for a medium-confidence state surfaces the caveat', () => {
        const html = getResourcePanelHTML('HI');     // HI confidence is medium
        assert.match(html, /confidence/i);
        assert.match(html, /last verified/i);
    });

    test('high-confidence states have NO caveat block', () => {
        const html = getResourcePanelHTML('TX');
        assert.doesNotMatch(html, /If a link 404s/);
    });
});
