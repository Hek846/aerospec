import { describe, it, expect } from 'vitest';
import { aggregateHomesToCells, resolutionForBbox, type HomeAggregate } from '../lib/h3cells.js';

const bbox = (minLon: number, maxLon: number) => ({
  minLon,
  minLat: 37,
  maxLon,
  maxLat: 38
});

function home(overrides: Partial<HomeAggregate>): HomeAggregate {
  return {
    id: 'home-1',
    lat: 37.7749,
    lon: -122.4194,
    deviceCount: 1,
    avgPm25: 10,
    avgAqi: 42,
    lastTs: new Date('2026-07-10T12:00:00.000Z'),
    readingCount: 1,
    ...overrides
  };
}

describe('resolutionForBbox', () => {
  it('defaults by bbox longitude span', () => {
    expect(resolutionForBbox(bbox(-123, -120.9))).toBe(5);
    expect(resolutionForBbox(bbox(-123, -122.4))).toBe(6);
    expect(resolutionForBbox(bbox(-123, -122.8))).toBe(7);
    expect(resolutionForBbox(bbox(-123, -122.9))).toBe(8);
  });

  it('clamps requested resolution to the public range', () => {
    expect(resolutionForBbox(bbox(-123, -122.9), 3)).toBe(5);
    expect(resolutionForBbox(bbox(-123, -122.9), 7)).toBe(7);
    expect(resolutionForBbox(bbox(-123, -122.9), 12)).toBe(9);
  });
});

describe('aggregateHomesToCells', () => {
  it('merges homes in the same H3 cell with weighted averages and max timestamp', () => {
    const cells = aggregateHomesToCells(
      [
        home({
          id: 'home-1',
          avgPm25: 10,
          avgAqi: 40,
          deviceCount: 2,
          readingCount: 2,
          lastTs: new Date('2026-07-10T12:00:00.000Z')
        }),
        home({
          id: 'home-2',
          lat: 37.7749,
          lon: -122.4194,
          avgPm25: 40,
          avgAqi: 100,
          deviceCount: 3,
          readingCount: 4,
          lastTs: new Date('2026-07-10T14:30:00.000Z')
        })
      ],
      8
    );

    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({
      resolution: 8,
      deviceCount: 5,
      avgPm25: 30,
      avgAqi: 80,
      lastTs: '2026-07-10T14:30:00.000Z'
    });
    expect(cells[0].lat).toBe(cells[0].centerLat);
    expect(cells[0].lon).toBe(cells[0].centerLon);
  });

  it('returns six GeoJSON-order boundary pairs near the input coordinate', () => {
    const [cell] = aggregateHomesToCells([home({})], 8);

    expect(cell.boundary).toHaveLength(6);
    for (const pair of cell.boundary) {
      expect(pair).toHaveLength(2);
      const [lon, lat] = pair;
      expect(lon).toBeGreaterThan(-122.5);
      expect(lon).toBeLessThan(-122.3);
      expect(lat).toBeGreaterThan(37.7);
      expect(lat).toBeLessThan(37.9);
    }
  });

  it('keeps homes in distinct H3 cells separate', () => {
    const cells = aggregateHomesToCells(
      [
        home({ id: 'sf', lat: 37.7749, lon: -122.4194 }),
        home({ id: 'oakland', lat: 37.8044, lon: -122.2712 })
      ],
      8
    );

    expect(cells).toHaveLength(2);
    expect(new Set(cells.map((cell) => cell.h3)).size).toBe(2);
  });
});
