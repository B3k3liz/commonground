/**
 * climateCalculators.test.mjs
 * CommonGround — EnvironmentalCalibrator (agro-ecology) unit tests.
 *
 * calculateDynamicAUD is a pure function with rich branching (triangular thermal
 * curve, moisture/humidity ramps, cold thermoregulation, risk tiers). It had zero
 * coverage. These tests pin the math so a refactor can't silently change grazing
 * recommendations.
 *
 * RUN:  node --test climateCalculators.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EnvironmentalCalibrator } from './climateCalculators.js';

const calc = new EnvironmentalCalibrator(6);
const near = (a, b, eps = 0.011) => Math.abs(a - b) <= eps;

/* ------------------------------------------------------------------------- */
/* Thermal growth curve (triangular: tBase=40, tOpt=70, tMax=95)             */
/* ------------------------------------------------------------------------- */

describe('calculateDynamicAUD — thermal growth curve', () => {
  it('yields zero growth and zero capacity below the metabolic base (40F)', () => {
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 35);
    assert.equal(r.coefficientApplied, 0);
    assert.equal(r.adjustedAUD, 0);
  });

  it('yields zero growth at or above the high-temp cutoff (95F)', () => {
    assert.equal(calc.calculateDynamicAUD(1500, 2.5, 50, 25, 95).coefficientApplied, 0);
    assert.equal(calc.calculateDynamicAUD(1500, 2.5, 50, 25, 110).coefficientApplied, 0);
  });

  it('peaks at the optimal temperature (70F) with full moisture', () => {
    // tOpt with rain>=15 and humidity<=85 => growth 1.0, moisture 1.0 => coeff 1.0
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70);
    assert.ok(near(r.coefficientApplied, 1.0), `expected ~1.0, got ${r.coefficientApplied}`);
  });

  it('ramps linearly on the ascending limb (55F is the midpoint)', () => {
    // (55-40)/(70-40) = 0.5 growth; moisture 1.0 => coeff 0.5
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 55);
    assert.ok(near(r.coefficientApplied, 0.5), `expected ~0.5, got ${r.coefficientApplied}`);
  });

  it('ramps linearly on the descending limb (82.5F is the midpoint)', () => {
    // (95-82.5)/(95-70) = 0.5 growth; moisture 1.0 => coeff 0.5
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 82.5);
    assert.ok(near(r.coefficientApplied, 0.5), `expected ~0.5, got ${r.coefficientApplied}`);
  });
});

/* ------------------------------------------------------------------------- */
/* Moisture / humidity modifiers                                             */
/* ------------------------------------------------------------------------- */

describe('calculateDynamicAUD — moisture modifiers', () => {
  it('applies a drought penalty floor of 0.75 at zero rainfall', () => {
    // growth at 70F = 1.0; rainfall 0 => rainfallFactor 0.75; humidity<=85 => coeff 0.75
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 0, 70);
    assert.ok(near(r.coefficientApplied, 0.75), `expected ~0.75, got ${r.coefficientApplied}`);
  });

  it('ramps rainfall linearly between 0 and 15mm', () => {
    // rain=7.5 => 0.75 + 0.25*(7.5/15) = 0.875
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 7.5, 70);
    assert.ok(near(r.coefficientApplied, 0.875), `expected ~0.875, got ${r.coefficientApplied}`);
  });

  it('treats negative rainfall as zero (clamped)', () => {
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, -40, 70);
    assert.ok(near(r.coefficientApplied, 0.75), `expected ~0.75, got ${r.coefficientApplied}`);
  });

  it('adds a humidity bonus above 85% (capped at +0.05 at 100%)', () => {
    // growth 1.0, rain>=15 => 1.0, humidity 100 => +0.05 => coeff 1.05
    const r = calc.calculateDynamicAUD(1500, 2.5, 100, 25, 70);
    assert.ok(near(r.coefficientApplied, 1.05), `expected ~1.05, got ${r.coefficientApplied}`);
  });
});

/* ------------------------------------------------------------------------- */
/* Multi-species intake & cold thermoregulation                              */
/* ------------------------------------------------------------------------- */

describe('calculateDynamicAUD — intake & thermoregulation', () => {
  it('uses species-specific consumption coefficients (cow vs sheep)', () => {
    // intakePerHead = k * weight^0.75, no cold bump at 70F
    const cow = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70, 'cow', 10, 1000);
    const sheep = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70, 'sheep', 10, 1000);
    const w = Math.pow(1000, 0.75);
    assert.ok(near(cow.intakePerHeadDay, 0.12 * w, 0.02), `cow intake ${cow.intakePerHeadDay}`);
    assert.ok(near(sheep.intakePerHeadDay, 0.056 * w, 0.02), `sheep intake ${sheep.intakePerHeadDay}`);
  });

  it('falls back to the cow coefficient for an unknown species', () => {
    const unknown = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70, 'alpaca', 10, 1000);
    const cow = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70, 'cow', 10, 1000);
    assert.equal(unknown.intakePerHeadDay, cow.intakePerHeadDay);
  });

  it('is case-insensitive on species name', () => {
    const upper = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70, 'COW', 10, 1000);
    const lower = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70, 'cow', 10, 1000);
    assert.equal(upper.intakePerHeadDay, lower.intakePerHeadDay);
  });

  it('raises intake below the lower critical temp (45F) — but 42F is still in the dead growth band', () => {
    // At 42F growth is >0 (ascending limb), and cold bump applies: mThermo = 1 + 0.015*(45-42) = 1.045
    const warm = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70, 'cow', 1, 1000);
    const cold = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 42, 'cow', 1, 1000);
    const expectedBump = 1 + 0.015 * (45 - 42);
    assert.ok(cold.intakePerHeadDay > warm.intakePerHeadDay, 'cold intake should exceed warm intake');
    assert.ok(near(cold.intakePerHeadDay, warm.intakePerHeadDay * expectedBump, 0.05),
      `expected ~${(warm.intakePerHeadDay * expectedBump).toFixed(2)}, got ${cold.intakePerHeadDay}`);
  });

  it('scales total herd intake by headcount', () => {
    const one = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70, 'cow', 1, 1000);
    const ten = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70, 'cow', 10, 1000);
    assert.ok(near(ten.totalHerdIntakeDay, one.totalHerdIntakeDay * 10, 0.5));
  });
});

/* ------------------------------------------------------------------------- */
/* Risk tiers & output contract                                              */
/* ------------------------------------------------------------------------- */

describe('calculateDynamicAUD — risk tiers & contract', () => {
  it('flags HIGH_CLIMATE_STRESS when the net modifier drops below 0.40', () => {
    // 48F: growth (48-40)/30 ≈ 0.267, moisture 1.0 => ~0.27 < 0.40
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 48);
    assert.equal(r.riskFactor, 'HIGH_CLIMATE_STRESS');
  });

  it('flags MODERATE_STRESS between 0.40 and 0.75', () => {
    // 58F: growth (58-40)/30 = 0.6, moisture 1.0 => 0.6
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 58);
    assert.equal(r.riskFactor, 'MODERATE_STRESS');
  });

  it('reports NORMAL at optimal conditions', () => {
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70);
    assert.equal(r.riskFactor, 'NORMAL');
  });

  it('never returns a negative AUD and returns the documented shape', () => {
    const r = calc.calculateDynamicAUD(1500, 2.5, 50, 25, 70);
    assert.ok(r.adjustedAUD >= 0);
    for (const key of ['adjustedAUD', 'riskFactor', 'coefficientApplied', 'intakePerHeadDay', 'totalHerdIntakeDay', 'description']) {
      assert.ok(key in r, `missing key: ${key}`);
    }
    assert.match(r.description, /Zone 6/);
  });

  it('is monotonic in forage: more biomass never lowers carrying capacity', () => {
    const lo = calc.calculateDynamicAUD(1000, 2.5, 50, 25, 70);
    const hi = calc.calculateDynamicAUD(2000, 2.5, 50, 25, 70);
    assert.ok(hi.adjustedAUD >= lo.adjustedAUD);
  });
});
