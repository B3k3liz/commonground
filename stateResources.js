/**
 * stateResources.js — Per-state USDA zone + Cooperative Extension lookups
 * ---------------------------------------------------------------------------
 * Companion to cottageFoodValidator.js, but informational only (never returns
 * "violations"). Surfaces:
 *
 *   * USDA Plant Hardiness Zone range covered by a state
 *   * The state's Cooperative Extension Service URLs
 *   * A hint about where to find local land-use zoning (which is county-
 *     level and not catalogue-able)
 *
 * Loads ./data/state-extension-resources.json once and caches it.
 * Publishes a stable global on the browser:
 *
 *     window.cgStateResources = {
 *         ready:      boolean,
 *         all:        () => { [stateCode]: ResourceEntry },
 *         get:        (stateCode) => ResourceEntry | null,
 *         zoneInfo:   (stateCode) => { zones, lookupUrl, note } | null,
 *         extension:  (stateCode) => ExtensionInfo | null,
 *         landUseHint:(stateCode) => { message, searchUrl }
 *     };
 *
 * License: MIT
 * ---------------------------------------------------------------------------
 */

let _cache = null;
let _promise = null;

export async function loadResources(url = './data/state-extension-resources.json') {
    if (_cache) return _cache;
    if (!_promise) {
        _promise = fetch(url, { cache: 'force-cache' })
            .then(r => {
                if (!r.ok) throw new Error(`state-extension-resources.json HTTP ${r.status}`);
                return r.json();
            })
            .then(rules => { _cache = rules; return rules; })
            .catch(err => { _promise = null; throw err; });
    }
    return _promise;
}

export function _injectResourcesForTesting(data) { _cache = data; _promise = Promise.resolve(data); }
export function _resetResourcesForTesting()       { _cache = null; _promise = null; }

function _state(stateCode) {
    if (!_cache) throw new Error('stateResources: not loaded; call loadResources() first');
    const code = (stateCode || '').toUpperCase();
    return code ? (_cache.states[code] || null) : null;
}

export function getStateResources(stateCode) {
    return _state(stateCode);
}

export function getZoneInfo(stateCode) {
    if (!_cache) return null;
    const s = _state(stateCode);
    if (!s) return null;
    return {
        stateCode: stateCode.toUpperCase(),
        stateName: s.name,
        zones:     s.usdaZones || [],
        lookupUrl: _cache._meta.usdaZoneLookupUrl,
        note:      _cache._meta.usdaPlantHardinessNote
    };
}

export function getExtensionResources(stateCode) {
    if (!_cache) return null;
    const s = _state(stateCode);
    if (!s || !s.extension) return null;
    return {
        stateCode: stateCode.toUpperCase(),
        stateName: s.name,
        ...s.extension,
        confidence:   s.confidence || null,
        lastVerified: s.lastVerified || null
    };
}

/**
 * Land-use zoning is local — there's no national database. We return a
 * search-engine link scoped to the state, plus a short guidance message,
 * so the operator can find their actual county planning department.
 */
export function getLandUseZoningHint(stateCode) {
    const s = _state(stateCode);
    const stateName = s ? s.name : (stateCode || 'your state');
    const query = encodeURIComponent(`${stateName} county zoning agricultural use lookup`);
    return {
        stateCode: (stateCode || '').toUpperCase() || null,
        stateName,
        message:
            'Land-use zoning (residential / agricultural / mixed-use) is set at the ' +
            'city or county level. The right authority is your county planning ' +
            'department or its public GIS portal — not the state ag department. ' +
            'Look up your specific parcel\'s zoning classification before adding ' +
            'livestock, building a hoop house, or operating a retail farm stand.',
        searchUrl: `https://duckduckgo.com/?q=${query}`
    };
}

// ---------------------------------------------------------------------------
// Dataset freshness — months-since-lastVerified for the extension entry.
// Same shape as cottageFoodValidator.getFreshness, surfaced separately because
// the two datasets have independent verification cadences.
// ---------------------------------------------------------------------------
export function getFreshness(stateCode) {
    if (!_cache) return null;
    const code = (stateCode || '').toUpperCase();
    const s = code ? _cache.states[code] : null;
    if (!s) return { stateCode: code, stateName: null, lastVerified: null, ageMonths: null, isStale: true, label: 'No extension entry for this state.' };
    const ts = s.lastVerified;
    if (!ts) return { stateCode: code, stateName: s.name, lastVerified: null, ageMonths: null, isStale: true, label: `${s.name}: extension URL never verified.` };
    const ageMonths = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    const isStale   = ageMonths >= 24;
    const label = `${s.name} extension URLs verified ${ageMonths} month${ageMonths === 1 ? '' : 's'} ago` +
                  (isStale ? ' — likely link rot; recheck.' : '.');
    return { stateCode: code, stateName: s.name, lastVerified: ts, ageMonths, isStale, label };
}

// ---------------------------------------------------------------------------
// HTML helper used by the settings panel
// ---------------------------------------------------------------------------
const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function getResourcePanelHTML(stateCode) {
    if (!_cache) return '<em>Loading state resources…</em>';
    const ext   = getExtensionResources(stateCode);
    const zone  = getZoneInfo(stateCode);
    const local = getLandUseZoningHint(stateCode);

    if (!ext) {
        return `<div class="cg-state-res cg-state-res-empty">
            Set your two-letter state code in Settings → Region to see your USDA zone,
            Cooperative Extension office, and county zoning hint.
        </div>`;
    }

    const zonesHtml = zone && zone.zones.length
        ? zone.zones.map(z => `<span class="cg-zone-pill">${esc(z)}</span>`).join(' ')
        : '<em>not listed</em>';

    const topicLinks = [];
    if (ext.gardenHubUrl)     topicLinks.push(`<a href="${esc(ext.gardenHubUrl)}"     target="_blank" rel="noopener noreferrer">Gardening</a>`);
    if (ext.livestockHubUrl)  topicLinks.push(`<a href="${esc(ext.livestockHubUrl)}"  target="_blank" rel="noopener noreferrer">Livestock</a>`);
    if (ext.foodSafetyHubUrl) topicLinks.push(`<a href="${esc(ext.foodSafetyHubUrl)}" target="_blank" rel="noopener noreferrer">Food safety</a>`);

    return `
<div class="cg-state-res" data-state="${esc(ext.stateCode)}">
  <div class="cg-state-res-section">
    <div class="cg-state-res-h">🌱 USDA Plant Hardiness Zones — ${esc(ext.stateName)}</div>
    <div class="cg-state-res-zones">${zonesHtml}</div>
    <a class="cg-state-res-link" href="${esc(zone.lookupUrl)}" target="_blank" rel="noopener noreferrer">
      Look up your exact zone by ZIP →
    </a>
  </div>

  <div class="cg-state-res-section">
    <div class="cg-state-res-h">🚜 Cooperative Extension — ${esc(ext.name)}</div>
    <div class="cg-state-res-institutions">${ext.institutions.map(i => esc(i)).join(' · ')}</div>
    <div class="cg-state-res-links">
      <a href="${esc(ext.rootUrl)}"        target="_blank" rel="noopener noreferrer">Main site</a>
      ${ext.findOfficeUrl ? `<a href="${esc(ext.findOfficeUrl)}" target="_blank" rel="noopener noreferrer">Find county office</a>` : ''}
      ${topicLinks.length ? '<span class="cg-state-res-divider">·</span>' + topicLinks.join(' ') : ''}
    </div>
  </div>

  <div class="cg-state-res-section">
    <div class="cg-state-res-h">🏘️ Local land-use zoning (county-level)</div>
    <div class="cg-state-res-note">${esc(local.message)}</div>
    <a class="cg-state-res-link" href="${esc(local.searchUrl)}" target="_blank" rel="noopener noreferrer">
      Search for ${esc(ext.stateName)} county zoning →
    </a>
  </div>

  ${ext.confidence !== 'high' ? `
  <div class="cg-state-res-caveat">
    URL freshness for ${esc(ext.stateName)} is ${esc(ext.confidence || 'unverified')} confidence
    (last verified: ${esc(ext.lastVerified || 'never')}). If a link 404s, search
    the institution name directly.
  </div>` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// Browser bootstrap
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
    loadResources().then(() => {
        window.cgStateResources = {
            ready: true,
            all:           () => _cache.states,
            get:           getStateResources,
            zoneInfo:      getZoneInfo,
            extension:     getExtensionResources,
            landUseHint:   getLandUseZoningHint,
            getResourcePanelHTML,
            getFreshness
        };
        window.dispatchEvent(new CustomEvent('cg-state-resources-ready'));
    }).catch(err => {
        console.warn('[stateResources] failed to load:', err);
        window.cgStateResources = {
            ready: false,
            error: err,
            all:           () => ({}),
            get:           () => null,
            zoneInfo:      () => null,
            extension:     () => null,
            landUseHint:   () => ({ message: 'Resource data unavailable.', searchUrl: '' }),
            getResourcePanelHTML: () => '<em>State resources unavailable (load failed).</em>'
        };
    });
}
