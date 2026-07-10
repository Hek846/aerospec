import { apiRequest } from '../lib/api';

export interface CompareDevice {
  id: string;
  name: string;
  avgPm25: number | null;
  avgAqi: number | null;
}

export interface CompareNeighborhood {
  deviceCount: number;
  avgPm25: number | null;
  avgAqi: number | null;
}

export interface CompareCity {
  name: string;
  stationCount: number;
  avgPm25: number | null;
  avgAqi: number | null;
}

export interface CompareContext {
  device: CompareDevice;
  neighborhood: CompareNeighborhood | null;
  city: CompareCity | null;
}

export function getCompareContext(
  deviceId: string,
  hours: number = 24
): Promise<CompareContext> {
  const params = new URLSearchParams({ deviceId, hours: hours.toString() });
  return apiRequest<CompareContext>(`/compare/context?${params.toString()}`);
}
