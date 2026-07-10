import { cellToBoundary, cellToLatLng, latLngToCell } from 'h3-js';

export interface BboxLike {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface HomeAggregate {
  id: string;
  lat: number;
  lon: number;
  deviceCount: number;
  avgPm25: number | null;
  avgAqi: number | null;
  lastTs: Date | string | null;
  readingCount: number;
}

export interface H3CellAggregate {
  h3: string;
  resolution: number;
  centerLat: number;
  centerLon: number;
  /** @deprecated legacy alias for centerLat. */
  lat: number;
  /** @deprecated legacy alias for centerLon. */
  lon: number;
  boundary: [number, number][];
  deviceCount: number;
  avgPm25: number | null;
  avgAqi: number | null;
  lastTs: string | null;
}

interface CellAccumulator {
  h3: string;
  deviceCount: number;
  pm25WeightedSum: number;
  pm25Weight: number;
  aqiWeightedSum: number;
  aqiWeight: number;
  lastTsMs: number | null;
}

function clampResolution(resolution: number): number {
  return Math.min(9, Math.max(5, Math.trunc(resolution)));
}

export function resolutionForBbox(bbox: BboxLike, requested?: number): number {
  if (requested !== undefined && Number.isFinite(requested)) {
    return clampResolution(requested);
  }

  const lonSpan = Math.abs(bbox.maxLon - bbox.minLon);
  if (lonSpan > 2) {
    return 5;
  }
  if (lonSpan > 0.5) {
    return 6;
  }
  if (lonSpan > 0.15) {
    return 7;
  }
  return 8;
}

function dateToMs(value: Date | string | null): number | null {
  if (value === null) {
    return null;
  }
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function weightedAverage(
  weightedSum: number,
  weight: number,
  round: (value: number) => number
): number | null {
  if (weight === 0) {
    return null;
  }
  return round(weightedSum / weight);
}

export function aggregateHomesToCells(
  homes: HomeAggregate[],
  resolution: number
): H3CellAggregate[] {
  const clampedResolution = clampResolution(resolution);
  const cells = new Map<string, CellAccumulator>();

  for (const home of homes) {
    const h3 = latLngToCell(home.lat, home.lon, clampedResolution);
    const existing =
      cells.get(h3) ??
      ({
        h3,
        deviceCount: 0,
        pm25WeightedSum: 0,
        pm25Weight: 0,
        aqiWeightedSum: 0,
        aqiWeight: 0,
        lastTsMs: null
      } satisfies CellAccumulator);

    const readingCount = Math.max(0, Math.trunc(home.readingCount));
    existing.deviceCount += home.deviceCount;
    if (home.avgPm25 !== null && readingCount > 0) {
      existing.pm25WeightedSum += home.avgPm25 * readingCount;
      existing.pm25Weight += readingCount;
    }
    if (home.avgAqi !== null && readingCount > 0) {
      existing.aqiWeightedSum += home.avgAqi * readingCount;
      existing.aqiWeight += readingCount;
    }

    const lastTsMs = dateToMs(home.lastTs);
    if (lastTsMs !== null && (existing.lastTsMs === null || lastTsMs > existing.lastTsMs)) {
      existing.lastTsMs = lastTsMs;
    }

    cells.set(h3, existing);
  }

  return Array.from(cells.values())
    .map((cell) => {
      const [centerLat, centerLon] = cellToLatLng(cell.h3);
      const boundary = cellToBoundary(cell.h3).map(
        ([lat, lon]) => [lon, lat] as [number, number]
      );

      return {
        h3: cell.h3,
        resolution: clampedResolution,
        centerLat,
        centerLon,
        lat: centerLat,
        lon: centerLon,
        boundary,
        deviceCount: cell.deviceCount,
        avgPm25: weightedAverage(cell.pm25WeightedSum, cell.pm25Weight, (value) =>
          Math.round(value * 10) / 10
        ),
        avgAqi: weightedAverage(cell.aqiWeightedSum, cell.aqiWeight, Math.round),
        lastTs: cell.lastTsMs === null ? null : new Date(cell.lastTsMs).toISOString()
      };
    })
    .sort((a, b) => a.h3.localeCompare(b.h3));
}
