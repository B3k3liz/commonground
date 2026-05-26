/**
 * cottageFoodValidator.js — CommonGround Cottage Food Compliance Engine
 * ---------------------------------------------------------------------------
 * Validates a homestead's storefront state against the state-by-state
 * cottage-food matrix in data/cottage-food-rules.json. Outputs three
 * things callers care about:
 *
 *   1. `violations`  — hard rule failures (prohibited category, exceeded cap)
 *   2. `warnings`    — soft signals (approaching cap, low-confidence state)
 *   3. `requiredDisclaimers` — text to inject on the printable invoice
 *
 * Important: this file fails CLOSED. When the matrix doesn't know about a
 * state (confidence: "low" or missing entry), the validator returns
 * `needsCounselReview: true` and refuses to issue blanket approvals.
 *
 * Both ESM and classic-script consumers are supported:
 *
 *   ESM (Node tests, future ES module callers):
 *       import { evaluateStorefront, getInvoiceDisclaimerHTML } from './cottageFoodValidator.js';
 *
 *   Classic script (app.js, loaded via <script src="...">):
 *       The module fetches rules on load and publishes `window.cgCottageFood`
 *       and dispatches a 'cg-cottage-food-ready' event when ready.
 *
 * License: MIT
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Heuristic category inference for products that don't carry an explicit
// `category` field. Apps that want deterministic behaviour should set
// `product.category` directly to one of the keys in the rules matrix's
// `_meta.foodCategories` map.
// ---------------------------------------------------------------------------
// Each pattern uses `\w*` after the stem so plural / inflected forms match
// ("eggs", "jams", "pickled", "breads") without an explicit list.
const CATEGORY_RULES = [
    // [regex, category]  -- first match wins; order matters
    [/\b(soap|lotion|candle|salve|tincture)\w*/i,                null],            // not food
    [/\begg\w*/i,                                                'eggs-shell'],
    [/\braw\b[\w\s]*?\b(milk|cream|butter|kefir)\w*/i,           'raw-milk'],     // "Raw Milk", "Raw Goat Milk"
    [/\b(yogurt|cheese|kefir|cultured)\w*/i,                     'yogurt-cheese'],
    [/\b(milk|butter|cream)\w*/i,                                'yogurt-cheese'], // catch-all dairy
    [/\b(bacon|sausage|jerky|salami|charcuterie|cured|smoked)\w*/i,'meat-products'],
    [/\b(chicken|turkey|duck|hen|broiler|fryer)\w*/i,            'poultry'],
    [/\b(honey|maple\s+syrup|sorghum)\w*/i,                      'honey-syrup'],
    [/\b(jam|jelly|jellies|preserve|marmalade|conserve)\w*/i,    'jams-jellies'],
    [/\b(pickle|sauerkraut|kimchi|fermented)\w*/i,               'pickles-fermented'],
    [/\b(salsa|hot\s+sauce|tomato\s+sauce|canned\s+tomato)\w*/i, 'canned-high-acid'],
    [/\bcanned\s+(vegetable|bean|soup|stew|meat)\w*/i,           'canned-low-acid'],
    [/\b(granola|trail\s+mix|tea|herb\s+blend|dried\s+(herb|spice))\w*/i, 'dried-mixes'],
    [/\b(fruit\s+leather|dried\s+(apple|fruit|berry|tomato))\w*/i,'dehydrated'],
    [/\b(candy|fudge|brittle|toffee|chocolate)\w*/i,             'candy-confections'],
    [/\b(bread|sourdough|loaf|muffin|cookie|cake|biscuit|scone|pastry|pie|tart|brownie)\w*/i, 'baked-goods'],
    // Fresh produce (tomatoes, kale, bouquets) → null = exempt from cottage food
    [/.*/,                                                       null]
];

export function inferProductCategory(product) {
    if (product && typeof product.category === 'string') return product.category;
    const name = (product && (product.name || product.desc || product.title)) || '';
    for (const [rx, cat] of CATEGORY_RULES) {
        if (rx.test(name)) return cat;
    }
    return null;
}

export function summariseProductCategories(products) {
    const counts = {};
    for (const p of products) {
        const cat = inferProductCategory(p);
        if (!cat) continue;
        counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
}

// ---------------------------------------------------------------------------
// Rules loader
// ---------------------------------------------------------------------------
let _rulesCache = null;
let _rulesPromise = null;

export async function loadRules(url = './data/cottage-food-rules.json') {
    if (_rulesCache) return _rulesCache;
    if (!_rulesPromise) {
        _rulesPromise = fetch(url, { cache: 'force-cache' })
            .then(r => {
                if (!r.ok) throw new Error(`cottage-food-rules.json HTTP ${r.status}`);
                return r.json();
            })
            .then(rules => { _rulesCache = rules; return rules; })
            .catch(err => { _rulesPromise = null; throw err; });
    }
    return _rulesPromise;
}

// Test-only: inject rules synchronously (avoids fetch in node:test).
export function _injectRulesForTesting(rules) { _rulesCache = rules; _rulesPromise = Promise.resolve(rules); }
export function _resetRulesForTesting()       { _rulesCache = null; _rulesPromise = null; }

// ---------------------------------------------------------------------------
// Core evaluation
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EvaluationInput
 * @property {string|null} stateCode               Two-letter US state (or 'DC').
 * @property {number}      [annualRevenueUSD=0]    Cumulative cottage-food revenue this calendar year.
 * @property {Object<string, number>} [productCategoryCounts={}] e.g. {'raw-milk':1,'baked-goods':4}
 * @property {number}      [poultryAnnualBirds=0]  Birds slaughtered on-farm this year.
 * @property {number}      [rawMilkGallonsAnnual=0] Gallons sold this year.
 * @property {Object}      [rules]                 Override rules dataset (defaults to cached).
 */

/**
 * @typedef {Object} Finding
 * @property {string} type
 * @property {'hard'|'warning'|'info'} severity
 * @property {string} message
 * @property {string} [fix]
 */

/**
 * @typedef {Object} Evaluation
 * @property {string|null} stateCode
 * @property {string|null} stateName
 * @property {'high'|'medium'|'low'|null} confidence
 * @property {boolean} needsCounselReview
 * @property {Object}  caps
 * @property {Finding[]} violations
 * @property {Finding[]} warnings
 * @property {string[]}  requiredDisclaimers
 */

/**
 * Pure function — no I/O, no DOM. Returns a verdict object.
 *
 * @param {EvaluationInput} input
 * @returns {Evaluation}
 */
export function evaluateStorefront(input) {
    const rules = input.rules || _rulesCache;
    if (!rules) {
        throw new Error('evaluateStorefront: rules not loaded; call loadRules() first');
    }

    const stateCode = (input.stateCode || '').toUpperCase() || null;
    const defaults  = rules._baseDefaults;
    const stateRule = stateCode ? rules.states[stateCode] : null;

    // Compose effective rule: state overrides applied on top of base defaults.
    // Note: `confidence: 'low'` entries have a state name + statute but
    // delegate every behavioural field to the conservative defaults.
    const effective = {
        ...defaults,
        ...(stateRule || {}),
        rawMilk: { ...defaults.rawMilk, ...((stateRule || {}).rawMilk || {}) },
        poultry: { ...defaults.poultry, ...((stateRule || {}).poultry || {}) },
        labelingRequirements: {
            ...defaults.labelingRequirements,
            ...((stateRule || {}).labelingRequirements || {})
        }
    };

    const annualRevenueUSD     = Math.max(0, Number(input.annualRevenueUSD)     || 0);
    const poultryAnnualBirds   = Math.max(0, Number(input.poultryAnnualBirds)   || 0);
    const rawMilkGallonsAnnual = Math.max(0, Number(input.rawMilkGallonsAnnual) || 0);
    const cats                 = input.productCategoryCounts || {};

    const violations = [];
    const warnings   = [];
    const disclaimers = [];

    // ------ Confidence + state-known guard ---------------------------------
    const confidence = stateRule ? stateRule.confidence : null;
    const needsCounselReview = !stateRule || confidence === 'low' || stateRule.lastVerified === null;

    if (!stateRule) {
        warnings.push({
            type:    'unknown-state',
            severity:'warning',
            message: `No rule entry for "${stateCode || '(none set)'}". Falling back to conservative defaults — verify with local counsel before relying on this output.`
        });
    } else if (needsCounselReview) {
        warnings.push({
            type:    'low-confidence-state',
            severity:'warning',
            message: `Rule entry for ${stateRule.state} is marked low-confidence (lastVerified=${stateRule.lastVerified || 'never'}). Treat output as a hint only.`
        });
    }

    // ------ Per-category checks --------------------------------------------
    const prohibited = new Set(effective.prohibitedFoods || []);
    const allowed    = new Set(effective.allowedFoods    || []);

    for (const [cat, count] of Object.entries(cats)) {
        if (count <= 0) continue;
        if (prohibited.has(cat)) {
            violations.push({
                type:     'prohibited-category',
                category: cat,
                severity: 'hard',
                message:  `${stateRule ? stateRule.state : 'This jurisdiction'} prohibits cottage-food sales of "${cat}" (${count} item${count > 1 ? 's' : ''} in cart).`,
                fix:      'Remove these items from the storefront, or pursue a state-inspected commercial-kitchen license.'
            });
        } else if (!allowed.has(cat)) {
            warnings.push({
                type:     'uncertain-category',
                category: cat,
                severity: 'warning',
                message:  `Category "${cat}" is neither explicitly allowed nor prohibited under the cached rule for ${stateRule ? stateRule.state : 'this state'}. Verify locally before listing.`
            });
        }
    }

    // ------ Annual revenue cap --------------------------------------------
    const capUSD     = effective.annualRevenueCapUSD;
    const warnAtUSD  = effective.annualRevenueWarnAtUSD ?? (capUSD ? Math.round(capUSD * 0.9) : null);
    if (Number.isFinite(capUSD)) {
        if (annualRevenueUSD > capUSD) {
            violations.push({
                type:     'revenue-cap-exceeded',
                severity: 'hard',
                message:  `Annual cottage-food revenue ($${annualRevenueUSD.toLocaleString('en-US')}) exceeds the ${stateRule ? stateRule.state : 'state'} cap of $${capUSD.toLocaleString('en-US')}.`,
                fix:      'Pause cottage-food sales for the rest of the calendar year, or transition to a commercial license (commercial-kitchen rental, shared-use facility, or full DBA processor).'
            });
        } else if (Number.isFinite(warnAtUSD) && annualRevenueUSD >= warnAtUSD) {
            warnings.push({
                type:     'revenue-cap-approaching',
                severity: 'warning',
                message:  `Annual cottage-food revenue ($${annualRevenueUSD.toLocaleString('en-US')}) is approaching the ${stateRule ? stateRule.state : 'state'} cap of $${capUSD.toLocaleString('en-US')}.`
            });
        }
    }

    // ------ Poultry exemption --------------------------------------------
    const birdLimit = effective.poultry.exemptThresholdBirds;
    if (Number.isFinite(birdLimit) && poultryAnnualBirds > birdLimit) {
        violations.push({
            type:     'poultry-exemption-exceeded',
            severity: 'hard',
            message:  `On-farm poultry slaughter (${poultryAnnualBirds.toLocaleString('en-US')} birds) exceeds the ${birdLimit.toLocaleString('en-US')}-bird small-producer exemption.`,
            fix:      'Process additional birds at a USDA-inspected facility, or pursue a State Poultry Inspection grant.'
        });
    }

    // ------ Raw milk channel constraints ---------------------------------
    if ((cats['raw-milk'] || 0) > 0 || rawMilkGallonsAnnual > 0) {
        const rm = effective.rawMilk;
        if (rm.status === 'prohibited') {
            violations.push({
                type:     'raw-milk-prohibited',
                severity: 'hard',
                message:  `Raw milk sales are prohibited in ${stateRule ? stateRule.state : 'this jurisdiction'}.`,
                fix:      'Pasteurise on-farm under a Grade A licence, or limit distribution to on-farm consumption only.'
            });
        } else if (rm.status === 'pet-only') {
            warnings.push({
                type:     'raw-milk-pet-only',
                severity: 'warning',
                message:  `Raw milk in ${stateRule ? stateRule.state : 'this state'} may only be sold for animal consumption. Labels MUST read "FOR ANIMAL CONSUMPTION ONLY".`
            });
            disclaimers.push('FOR ANIMAL CONSUMPTION ONLY — not for human use.');
        } else if (rm.annualCapGal != null && rawMilkGallonsAnnual > rm.annualCapGal) {
            violations.push({
                type:     'raw-milk-cap-exceeded',
                severity: 'hard',
                message:  `Raw milk sold (${rawMilkGallonsAnnual} gal) exceeds the ${rm.annualCapGal}-gal annual cap in ${stateRule ? stateRule.state : 'this state'}.`
            });
        }
        // Standard FDA/CDC raw-milk warning when sales are permitted
        if (rm.status === 'permitted' || rm.status === 'farm-store' ||
            rm.status === 'on-farm-only' || rm.status === 'herd-share' ||
            rm.status === 'direct') {
            disclaimers.push(
                'WARNING: Raw (unpasteurised) milk and raw milk products may contain disease-causing microorganisms. ' +
                'Persons at greatest risk of disease from these organisms include infants, young children, pregnant women, ' +
                'the elderly, and persons with weakened immune systems.'
            );
        }
    }

    // ------ State-required disclaimer (always carried) -------------------
    if (stateRule && stateRule.requiredDisclaimer) {
        disclaimers.unshift(stateRule.requiredDisclaimer);
    } else if (effective.labelingRequirements.homemadeDisclaimer) {
        disclaimers.unshift(effective.labelingRequirements.homemadeDisclaimer);
    }

    return {
        stateCode,
        stateName:  stateRule ? stateRule.state : null,
        confidence,
        needsCounselReview,
        caps: {
            annual: { capUSD, warnAtUSD, currentUSD: annualRevenueUSD,
                      percentUsed: Number.isFinite(capUSD) && capUSD > 0
                          ? Math.round((annualRevenueUSD / capUSD) * 100) : null }
        },
        violations,
        warnings,
        requiredDisclaimers: disclaimers
    };
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Compose the invoice-footer HTML block. Combines the state-required
 * disclaimer with any product-specific disclaimers (e.g. raw-milk FDA
 * warning). Returns an HTML string ready to drop into the invoice <footer>.
 */
export function getInvoiceDisclaimerHTML(input) {
    const evaluation = evaluateStorefront(input);
    const lines = evaluation.requiredDisclaimers.map(d =>
        `<div class="cg-invoice-disclaimer-line">⚖️ ${esc(d)}</div>`
    );
    if (evaluation.needsCounselReview) {
        lines.push(
            '<div class="cg-invoice-disclaimer-caveat" ' +
            'style="margin-top:6px;font-size:0.62rem;color:#9a8a55;font-style:italic;">' +
            'Local cottage-food rules are summarised from a community dataset that needs ' +
            'counsel review. Confirm with your state Department of Agriculture before publishing.' +
            '</div>'
        );
    }
    return lines.join('\n');
}

/**
 * Compose a non-blocking banner shown on the storefront when something needs
 * the operator's attention. Returns an HTML string OR an empty string (no
 * banner needed). The caller is expected to inject this into a stable
 * container; the CSS styling lives in styles.css under `.cg-cottage-banner`.
 */
export function getStorefrontBannerHTML(input) {
    const ev = evaluateStorefront(input);
    if (ev.violations.length === 0 && ev.warnings.length === 0) return '';

    const sev = ev.violations.length > 0 ? 'hard' : 'warn';
    const heading = ev.violations.length > 0
        ? '⚠️ Storefront cannot ship under current cottage-food rules'
        : '⚠️ Heads-up: storefront compliance notice';

    const items = [
        ...ev.violations.map(v => `<li class="hard"><strong>${esc(v.message)}</strong>${v.fix ? `<br><span class="fix">→ ${esc(v.fix)}</span>` : ''}</li>`),
        ...ev.warnings.map(w => `<li class="warn">${esc(w.message)}</li>`)
    ];

    return (
        `<div class="cg-cottage-banner cg-cottage-banner-${sev}" role="alert" aria-live="polite">` +
            `<div class="cg-cottage-banner-head">${heading}</div>` +
            `<ul class="cg-cottage-banner-list">${items.join('')}</ul>` +
        `</div>`
    );
}

// ---------------------------------------------------------------------------
// Dataset freshness — returns months-since-lastVerified for a state.
// Returned shape:
//   { stateCode, stateName, lastVerified, ageMonths, isStale, label }
// where isStale === true when ageMonths >= 24 OR lastVerified is null.
// ---------------------------------------------------------------------------
export function getFreshness(stateCode) {
    const rules = _rulesCache;
    if (!rules) return null;
    const code = (stateCode || '').toUpperCase();
    const s = code ? rules.states[code] : null;
    if (!s) return { stateCode: code, stateName: null, lastVerified: null, ageMonths: null, isStale: true, label: 'No rule entry for this state — counsel review required.' };

    const ts = s.lastVerified;
    if (!ts) return { stateCode: code, stateName: s.state, lastVerified: null, ageMonths: null, isStale: true, label: `${s.state}: never verified by maintainer — counsel review required.` };

    const verified = new Date(ts).getTime();
    const ageMs    = Date.now() - verified;
    const ageMonths = Math.max(0, Math.round(ageMs / (1000 * 60 * 60 * 24 * 30.44)));
    const isStale  = ageMonths >= 24;
    const label    = `${s.state} cottage-food rules verified ${ageMonths} month${ageMonths === 1 ? '' : 's'} ago` +
                     (isStale ? ' — getting stale, re-verify with state DOAg.' : '.');
    return { stateCode: code, stateName: s.state, lastVerified: ts, ageMonths, isStale, label };
}

// ---------------------------------------------------------------------------
// Browser bootstrap — publish a tidy global so classic-script app.js can use
// the validator without doing its own import.
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
    loadRules().then(() => {
        window.cgCottageFood = {
            ready: true,
            evaluateStorefront,
            getInvoiceDisclaimerHTML,
            getStorefrontBannerHTML,
            inferProductCategory,
            summariseProductCategories,
            getFreshness
        };
        window.dispatchEvent(new CustomEvent('cg-cottage-food-ready'));
    }).catch(err => {
        console.warn('[cottageFoodValidator] failed to load rules:', err);
        window.cgCottageFood = {
            ready: false,
            error: err,
            // Stubs so app.js can still no-op safely.
            evaluateStorefront: () => ({
                stateCode: null, stateName: null, confidence: null,
                needsCounselReview: true,
                caps: { annual: { capUSD: null, warnAtUSD: null, currentUSD: 0, percentUsed: null } },
                violations: [], warnings: [], requiredDisclaimers: []
            }),
            getInvoiceDisclaimerHTML: () => '',
            getStorefrontBannerHTML:  () => '',
            inferProductCategory:     () => null,
            summariseProductCategories: () => ({})
        };
    });
}
