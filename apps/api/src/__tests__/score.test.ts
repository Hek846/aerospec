import { describe, expect, it } from 'vitest';
import {
  co2Subscore,
  combineSubscores,
  humiditySubscore,
  pm10Subscore,
  pm25Subscore,
  scoreBand,
  vocIndexSubscore
} from '../lib/score.js';

describe('air quality score subscores', () => {
  it('maps PM2.5 breakpoints and clamps outside the configured range', () => {
    expect(pm25Subscore(-5)).toBe(100);
    expect(pm25Subscore(0)).toBe(100);
    expect(pm25Subscore(12)).toBe(75);
    expect(pm25Subscore(35.4)).toBe(50);
    expect(pm25Subscore(55.4)).toBe(25);
    expect(pm25Subscore(150.4)).toBe(0);
    expect(pm25Subscore(250)).toBe(0);
  });

  it('interpolates PM2.5 linearly between knots', () => {
    expect(pm25Subscore(6)).toBeCloseTo(87.5);
    expect(pm25Subscore(23.7)).toBeCloseTo(62.5);
  });

  it('maps other pollutant breakpoints', () => {
    expect(pm10Subscore(54)).toBe(75);
    expect(pm10Subscore(154)).toBe(50);
    expect(co2Subscore(600)).toBe(100);
    expect(co2Subscore(1000)).toBe(75);
    expect(vocIndexSubscore(100)).toBe(100);
    expect(vocIndexSubscore(500)).toBe(0);
  });

  it('scores humidity as best inside 40-60% and linearly worse toward 10/90%', () => {
    expect(humiditySubscore(10)).toBe(0);
    expect(humiditySubscore(25)).toBe(50);
    expect(humiditySubscore(40)).toBe(100);
    expect(humiditySubscore(60)).toBe(100);
    expect(humiditySubscore(75)).toBe(50);
    expect(humiditySubscore(90)).toBe(0);
  });

  it('returns null for missing or invalid inputs', () => {
    expect(pm25Subscore(null)).toBeNull();
    expect(pm25Subscore(undefined)).toBeNull();
    expect(pm25Subscore(NaN)).toBeNull();
  });
});

describe('renormalizing combiner', () => {
  it('renormalizes weights over present metrics when CO2 and VOC are missing', () => {
    const combined = combineSubscores({
      pm25: 75,
      pm10: 50,
      co2: null,
      vocIndex: null,
      humidity: 100
    });

    expect(combined.score).toBeCloseTo(73.076923);
    expect(combined.weights).toEqual([
      { metric: 'pm25', subscore: 75, weight: 0.4 / 0.65 },
      { metric: 'pm10', subscore: 50, weight: 0.15 / 0.65 },
      { metric: 'humidity', subscore: 100, weight: 0.1 / 0.65 }
    ]);
  });

  it('returns null when every metric is missing', () => {
    expect(combineSubscores({}).score).toBeNull();
    expect(combineSubscores({}).weights).toEqual([]);
  });
});

describe('scoreBand', () => {
  it('maps band edges', () => {
    expect(scoreBand(80)).toBe('excellent');
    expect(scoreBand(60)).toBe('good');
    expect(scoreBand(40)).toBe('fair');
    expect(scoreBand(20)).toBe('poor');
    expect(scoreBand(19.9)).toBe('bad');
  });
});
