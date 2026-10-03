/**
 * CommonGround — Live Weather Service (Open-Meteo)
 *
 * Replaces the hardcoded "Homestead Weather" widget with real, live conditions
 * and — crucially — feeds real temperature / humidity / rainfall into the
 * EnvironmentalCalibrator agronomy engine (climateCalculators.js).
 *
 * Data source: Open-Meteo (https://open-meteo.com).
 *   - Free for non-commercial use, NO API key, NO sign-up.
 *   - CORS-enabled, so the browser fetches it directly (no backend needed).
 *   - "public and free to everyone" — matches the project's sovereignty ethos.
 *
 * Design: the network call is isolated in fetchLiveWeather(); everything else is
 * a pure function so it can be unit-tested with zero network (see
 * weatherService.test.mjs). Nothing here touches the DOM — the caller wires the
 * normalized result into whatever view it wants.
 */

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Default location (Denver, CO — USDA Zone 6, matching the climate calibrator's
// Zone 6 defaults). Overridden at runtime by the browser's geolocation when the
// member grants permission.
export const DEFAULT_LOCATION = { latitude: 39.74, longitude: -104.99, label: 'Homestead (default)' };

/**
 * WMO weather interpretation codes -> human label + emoji.
 * https://open-meteo.com/en/docs (WMO Weather interpretation codes, WW)
 */
export function mapWeatherCode(code) {
  const table = {
    0: ['Clear sky', '☀️'],
    1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
    45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'],
    51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
    61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
    66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'],
    71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'],
    77: ['Snow grains', '🌨️'],
    80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Violent showers', '⛈️'],
    85: ['Snow showers', '🌨️'], 86: ['Snow showers', '🌨️'],
    95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm + hail', '⛈️'], 99: ['Thunderstorm + hail', '⛈️'],
  };
  const [label, emoji] = table[code] || ['Unknown', '🌡️'];
  return { label, emoji };
}

/**
 * Growth-condition badge from live temperature + humidity, aligned with the
 * agronomy engine's thermal band (optimal vegetative growth ~40-85F).
 * @returns {{text: string, tone: 'sage'|'amber'|'clay'}}
 */
export function deriveGrowthBadge(tempF, humidity) {
  if (tempF == null || Number.isNaN(tempF)) return { text: 'No Data', tone: 'amber' };
  if (tempF < 40 || tempF > 95) return { text: 'Dormant', tone: 'clay' };
  if (tempF >= 60 && tempF <= 80 && humidity >= 40) return { text: 'Good Growth', tone: 'sage' };
  if (tempF < 50 || tempF > 88) return { text: 'Slowed Growth', tone: 'amber' };
  return { text: 'Fair Growth', tone: 'amber' };
}

/**
 * Agronomy-aware watering recommendation from live conditions.
 * Hot + dry => evening; cool/wet => hold off; freezing => skip.
 */
export function recommendWateringWindow({ tempF, humidity, precipitationIn }) {
  if (tempF != null && tempF <= 32) {
    return 'Freezing conditions — hold irrigation to avoid pipe and root ice damage.';
  }
  if (precipitationIn != null && precipitationIn >= 0.1) {
    return 'Recent precipitation detected — skip watering today and let the soil drink.';
  }
  if (tempF != null && tempF >= 80 && (humidity == null || humidity < 50)) {
    return 'Hot and dry — water early evening (around 6:00 PM) to cut evaporation loss.';
  }
  if (tempF != null && tempF >= 60) {
    return 'Mild conditions — morning watering (around 7:00 AM) keeps foliage dry overnight.';
  }
  return 'Cool conditions — water sparingly at midday when soil is warmest.';
}

/**
 * Normalize a raw Open-Meteo `current` payload into the shape the app and the
 * EnvironmentalCalibrator consume. Pure — no network, no DOM.
 */
export function normalizeCurrentWeather(payload) {
  const cur = (payload && payload.current) || {};
  const tempF = numOrNull(cur.temperature_2m);
  const humidity = numOrNull(cur.relative_humidity_2m);
  const windMph = numOrNull(cur.wind_speed_10m);
  const precipitationIn = numOrNull(cur.precipitation);
  const code = numOrNull(cur.weather_code);

  // 14-day rainfall sum (mm) feeds the calibrator's drought modifier when present.
  let rainfall14dMm = null;
  if (payload && payload.daily && Array.isArray(payload.daily.precipitation_sum)) {
    const sumIn = payload.daily.precipitation_sum.reduce((a, b) => a + (Number(b) || 0), 0);
    rainfall14dMm = +(sumIn * 25.4).toFixed(1); // inches -> mm (API requested in inches)
  }

  const { label, emoji } = mapWeatherCode(code);
  return {
    tempF, humidity, windMph, precipitationIn,
    conditionLabel: label, conditionEmoji: emoji,
    rainfall14dMm,
    badge: deriveGrowthBadge(tempF, humidity),
    wateringAdvice: recommendWateringWindow({ tempF, humidity, precipitationIn }),
    observedAt: (payload && payload.current && payload.current.time) || null,
  };
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch live weather from Open-Meteo and return the normalized shape.
 * The only impure function here. `fetchImpl` is injectable for tests.
 */
export async function fetchLiveWeather(location = DEFAULT_LOCATION, fetchImpl) {
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) throw new Error('No fetch implementation available in this environment.');

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,precipitation',
    daily: 'precipitation_sum',
    past_days: '14',
    forecast_days: '1',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
  });

  const resp = await doFetch(`${OPEN_METEO_URL}?${params.toString()}`);
  if (!resp.ok) throw new Error(`Open-Meteo request failed: HTTP ${resp.status}`);
  const payload = await resp.json();
  return normalizeCurrentWeather(payload);
}

/**
 * Resolve the member's location via the browser Geolocation API, falling back to
 * DEFAULT_LOCATION if denied/unavailable. Browser-only; safe to call elsewhere.
 */
export function resolveLocation(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return resolve(DEFAULT_LOCATION);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        label: 'Your location',
      }),
      () => resolve(DEFAULT_LOCATION),
      { timeout: timeoutMs, maximumAge: 15 * 60 * 1000 }
    );
  });
}
