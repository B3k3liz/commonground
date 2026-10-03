/**
 * weatherService.test.mjs
 * CommonGround — Live Weather Service unit tests.
 *
 * The network call is isolated, so everything here runs offline with a stub
 * fetch. Pins the WMO code mapping, growth/watering heuristics, payload
 * normalization (incl. the inch->mm rainfall conversion that feeds the agronomy
 * engine), and the fetch URL/units contract against Open-Meteo.
 *
 * RUN:  node --test weatherService.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapWeatherCode, deriveGrowthBadge, recommendWateringWindow,
  normalizeCurrentWeather, fetchLiveWeather, DEFAULT_LOCATION,
} from './weatherService.js';

describe('mapWeatherCode', () => {
  it('maps known WMO codes to label + emoji', () => {
    assert.deepEqual(mapWeatherCode(0), { label: 'Clear sky', emoji: '☀️' });
    assert.equal(mapWeatherCode(2).label, 'Partly cloudy');
    assert.equal(mapWeatherCode(95).label, 'Thunderstorm');
  });
  it('falls back gracefully for an unknown code', () => {
    assert.equal(mapWeatherCode(1234).label, 'Unknown');
  });
});

describe('deriveGrowthBadge', () => {
  it('reports Good Growth in the optimal band', () => {
    assert.equal(deriveGrowthBadge(70, 55).text, 'Good Growth');
    assert.equal(deriveGrowthBadge(70, 55).tone, 'sage');
  });
  it('reports Dormant outside the viable thermal band', () => {
    assert.equal(deriveGrowthBadge(20, 55).text, 'Dormant');
    assert.equal(deriveGrowthBadge(100, 55).text, 'Dormant');
  });
  it('handles missing temperature', () => {
    assert.equal(deriveGrowthBadge(null, 55).text, 'No Data');
    assert.equal(deriveGrowthBadge(NaN, 55).text, 'No Data');
  });
});

describe('recommendWateringWindow', () => {
  it('holds irrigation when freezing', () => {
    assert.match(recommendWateringWindow({ tempF: 28, humidity: 60, precipitationIn: 0 }), /hold irrigation/i);
  });
  it('skips watering after meaningful precipitation', () => {
    assert.match(recommendWateringWindow({ tempF: 70, humidity: 60, precipitationIn: 0.4 }), /skip watering/i);
  });
  it('recommends evening watering when hot and dry', () => {
    assert.match(recommendWateringWindow({ tempF: 88, humidity: 30, precipitationIn: 0 }), /evening/i);
  });
  it('recommends morning watering in mild conditions', () => {
    assert.match(recommendWateringWindow({ tempF: 65, humidity: 55, precipitationIn: 0 }), /morning/i);
  });
});

describe('normalizeCurrentWeather', () => {
  const payload = {
    current: {
      time: '2026-10-03T14:00',
      temperature_2m: 68.0, relative_humidity_2m: 52,
      wind_speed_10m: 6.0, weather_code: 2, precipitation: 0.0,
    },
    daily: { precipitation_sum: [0.1, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0] },
  };

  it('normalizes the live current block', () => {
    const n = normalizeCurrentWeather(payload);
    assert.equal(n.tempF, 68);
    assert.equal(n.humidity, 52);
    assert.equal(n.windMph, 6);
    assert.equal(n.conditionLabel, 'Partly cloudy');
    assert.equal(n.badge.text, 'Good Growth');
  });

  it('converts the 14-day rainfall sum from inches to mm for the agronomy engine', () => {
    const n = normalizeCurrentWeather(payload);
    // 0.3 in total * 25.4 = 7.62 mm
    assert.ok(Math.abs(n.rainfall14dMm - 7.62) < 0.05, `got ${n.rainfall14dMm}`);
  });

  it('degrades safely on an empty / malformed payload', () => {
    const n = normalizeCurrentWeather({});
    assert.equal(n.tempF, null);
    assert.equal(n.rainfall14dMm, null);
    assert.equal(n.badge.text, 'No Data');
    assert.doesNotThrow(() => normalizeCurrentWeather(null));
  });
});

describe('fetchLiveWeather', () => {
  it('requests Open-Meteo with Fahrenheit/mph/inch units and returns normalized data', async () => {
    let calledUrl = '';
    const stubFetch = async (url) => {
      calledUrl = url;
      return {
        ok: true,
        json: async () => ({ current: { temperature_2m: 71, relative_humidity_2m: 48, wind_speed_10m: 4, weather_code: 0, precipitation: 0 } }),
      };
    };
    const n = await fetchLiveWeather(DEFAULT_LOCATION, stubFetch);
    assert.match(calledUrl, /api\.open-meteo\.com/);
    assert.match(calledUrl, /temperature_unit=fahrenheit/);
    assert.match(calledUrl, /wind_speed_unit=mph/);
    assert.match(calledUrl, /precipitation_unit=inch/);
    assert.equal(n.tempF, 71);
    assert.equal(n.conditionLabel, 'Clear sky');
  });

  it('throws on a non-OK HTTP response', async () => {
    const stubFetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await assert.rejects(() => fetchLiveWeather(DEFAULT_LOCATION, stubFetch), /HTTP 503/);
  });
});
