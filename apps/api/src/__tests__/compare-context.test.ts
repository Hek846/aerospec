import { describe, it, expect } from 'vitest';
import { latLngToCell, cellToBoundary } from 'h3-js';
import {
  clampHours,
  formatPm25,
  averagePm25,
  bboxFromBoundary,
  bboxAroundPoint,
  nearestStationName
} from '../routes/compare.js';

describe('clampHours', () => {
  it('defaults to 24 for missing or invalid values', () => {
    expect(clampHours(undefined)).toBe(24);
    expect(clampHours('')).toBe(24);
    expect(clampHours('not-a-number')).toBe(24);
    expect(clampHours(NaN)).toBe(24);
  });

  it('clamps below 1 to 1', () => {
    expect(clampHours(0)).toBe(1);
    expect(clampHours(-5)).toBe(1);
  });

  it('clamps above 168 to 168', () => {
    expect(clampHours(200)).toBe(168);
    expect(clampHours(999)).toBe(168);
  });

  it('accepts valid integer and numeric strings', () => {
    expect(clampHours(1)).toBe(1);
    expect(clampHours(48)).toBe(48);
    expect(clampHours(168)).toBe(168);
    expect(clampHours('72')).toBe(72);
  });

  it('truncates decimals', () => {
    expect(clampHours(12.7)).toBe(12);
  });
});

describe('formatPm25', () => {
  it('returns null for missing or invalid values', () => {
    expect(formatPm25(null)).toBeNull();
    expect(formatPm25(undefined)).toBeNull();
    expect(formatPm25(NaN)).toBeNull();
  });

  it('rounds to one decimal place', () => {
    expect(formatPm25(12.34)).toBe(12.3);
    expect(formatPm25(12.35)).toBe(12.4);
    expect(formatPm25(7)).toBe(7);
  });
});

describe('averagePm25', () => {
  it('returns null for an empty array', () => {
    expect(averagePm25([])).toBeNull();
  });

  it('averages values and rounds to one decimal place', () => {
    expect(averagePm25([10, 20])).toBe(15);
    expect(averagePm25([10.05, 20.07])).toBe(15.1);
  });

  it('ignores non-finite values', () => {
    expect(averagePm25([10, NaN, 20])).toBe(15);
  });
});

describe('bboxFromBoundary', () => {
  it('computes min/max lat/lon from a boundary', () => {
    const bbox = bboxFromBoundary([
      [37.7, -122.5],
      [37.8, -122.5],
      [37.8, -122.3],
      [37.7, -122.3]
    ]);
    expect(bbox).toEqual({
      minLon: -122.5,
      minLat: 37.7,
      maxLon: -122.3,
      maxLat: 37.8
    });
  });

  it('matches the bounding box of an H3 res-7 cell around San Francisco', () => {
    const cell = latLngToCell(37.7749, -122.4194, 7);
    const boundary = cellToBoundary(cell) as Array<[number, number]>;
    const bbox = bboxFromBoundary(boundary);
    const lats = boundary.map(([lat]) => lat);
    const lons = boundary.map(([, lon]) => lon);
    expect(bbox.minLat).toBeCloseTo(Math.min(...lats), 8);
    expect(bbox.maxLat).toBeCloseTo(Math.max(...lats), 8);
    expect(bbox.minLon).toBeCloseTo(Math.min(...lons), 8);
    expect(bbox.maxLon).toBeCloseTo(Math.max(...lons), 8);
  });
});

describe('bboxAroundPoint', () => {
  it('produces a ~25 km box at the equator', () => {
    const bbox = bboxAroundPoint(0, 0, 25);
    expect(bbox.minLat).toBeCloseTo(-0.225, 3);
    expect(bbox.maxLat).toBeCloseTo(0.225, 3);
    expect(bbox.minLon).toBeCloseTo(-0.225, 3);
    expect(bbox.maxLon).toBeCloseTo(0.225, 3);
  });

  it('widens the longitude span at higher latitudes', () => {
    const bbox = bboxAroundPoint(60, 0, 25);
    expect(bbox.minLat).toBeCloseTo(59.775, 3);
    expect(bbox.maxLat).toBeCloseTo(60.225, 3);
    expect(bbox.maxLon).toBeGreaterThan(0.3);
  });

  it('clamps latitude to [-90, 90]', () => {
    const bbox = bboxAroundPoint(-89.5, 0, 100);
    expect(bbox.minLat).toBe(-90);
    expect(bbox.maxLat).toBeCloseTo(-88.599, 3);
  });

  it('clamps longitude to [-180, 180]', () => {
    const bbox = bboxAroundPoint(0, -179.6, 100);
    expect(bbox.minLon).toBe(-180);
    expect(bbox.maxLon).toBeCloseTo(-178.702, 3);
  });
});

describe('nearestStationName', () => {
  it('returns null for an empty station list', () => {
    expect(nearestStationName([], 0, 0)).toBeNull();
  });

  it('picks the station closest to the reference point', () => {
    const stations = [
      { name: 'Far away', lat: 10, lon: 10 },
      { name: 'Nearby', lat: 0.1, lon: 0.1 },
      { name: 'Also far', lat: -10, lon: -10 }
    ];
    expect(nearestStationName(stations, 0, 0)).toBe('Nearby');
  });
});
