import { describe, it, expect } from 'vitest';
import { pm25ToAqi, computeAqi, batteryVoltageToPercent } from '../lib/aqi.js';

describe('pm25ToAqi (US EPA PM2.5 breakpoints)', () => {
  it('returns 0 for 0 µg/m³', () => {
    expect(pm25ToAqi(0)).toBe(0);
  });

  it('maps the Good band boundary (12.0 -> 50)', () => {
    expect(pm25ToAqi(12.0)).toBe(50);
  });

  it('maps the Moderate band (12.1 -> 51, 35.4 -> 100)', () => {
    expect(pm25ToAqi(12.1)).toBe(51);
    expect(pm25ToAqi(35.4)).toBe(100);
  });

  it('maps Unhealthy for Sensitive Groups (35.5 -> 101, 55.4 -> 150)', () => {
    expect(pm25ToAqi(35.5)).toBe(101);
    expect(pm25ToAqi(55.4)).toBe(150);
  });

  it('maps Unhealthy (55.5 -> 151, 150.4 -> 200)', () => {
    expect(pm25ToAqi(55.5)).toBe(151);
    expect(pm25ToAqi(150.4)).toBe(200);
  });

  it('maps Very Unhealthy (150.5 -> 201, 250.4 -> 300)', () => {
    expect(pm25ToAqi(150.5)).toBe(201);
    expect(pm25ToAqi(250.4)).toBe(300);
  });

  it('maps Hazardous (250.5 -> 301, 500.4 -> 500)', () => {
    expect(pm25ToAqi(250.5)).toBe(301);
    expect(pm25ToAqi(500.4)).toBe(500);
  });

  it('interpolates linearly within a band', () => {
    // Midpoint of the Good band: 6.0 µg/m³ -> AQI 25
    expect(pm25ToAqi(6.0)).toBe(25);
    // 35 µg/m³ (well-known moderate value) -> AQI 99
    expect(pm25ToAqi(35.0)).toBe(99);
  });

  it('truncates concentration to one decimal place per EPA convention', () => {
    expect(pm25ToAqi(12.05)).toBe(50); // truncated to 12.0
  });

  it('clamps concentrations above 500.4 to AQI 500', () => {
    expect(pm25ToAqi(600)).toBe(500);
    expect(pm25ToAqi(1000)).toBe(500);
  });

  it('returns null for missing or invalid values', () => {
    expect(pm25ToAqi(null)).toBeNull();
    expect(pm25ToAqi(undefined)).toBeNull();
    expect(pm25ToAqi(-1)).toBeNull();
    expect(pm25ToAqi(NaN)).toBeNull();
  });
});

describe('computeAqi', () => {
  it('prefers pm25Corr over pm25Env', () => {
    expect(computeAqi(6.0, 100)).toBe(25);
  });

  it('falls back to pm25Env when pm25Corr is null', () => {
    expect(computeAqi(null, 6.0)).toBe(25);
    expect(computeAqi(undefined, 12.0)).toBe(50);
  });

  it('returns null when both values are missing', () => {
    expect(computeAqi(null, null)).toBeNull();
    expect(computeAqi(undefined, undefined)).toBeNull();
  });
});

describe('batteryVoltageToPercent', () => {
  it('maps 3.2 V to 0% and 4.2 V to 100%', () => {
    expect(batteryVoltageToPercent(3.2)).toBe(0);
    expect(batteryVoltageToPercent(4.2)).toBe(100);
  });

  it('maps midpoint 3.7 V to 50%', () => {
    expect(batteryVoltageToPercent(3.7)).toBe(50);
  });

  it('clamps out-of-range voltages', () => {
    expect(batteryVoltageToPercent(3.0)).toBe(0);
    expect(batteryVoltageToPercent(4.5)).toBe(100);
  });

  it('returns null for missing values', () => {
    expect(batteryVoltageToPercent(null)).toBeNull();
    expect(batteryVoltageToPercent(undefined)).toBeNull();
  });
});
