import { useEffect, useMemo, useState } from 'react';
import { Device, Home, Room, SensorReading } from '../types';
import { api } from '../lib/api';

// Module-level cache so many components can share one in-flight request.
// Invalidated on login/logout via clearDataCache().
const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const promise = fetcher().catch(err => {
      cache.delete(key); // don't cache failures
      throw err;
    });
    cache.set(key, promise);
  }
  return cache.get(key) as Promise<T>;
}

export function clearDataCache() {
  cache.clear();
}

function useCachedFetch<T>(key: string, fetcher: () => Promise<T>, fallback: T): T {
  const [data, setData] = useState<T>(fallback);

  useEffect(() => {
    let alive = true;
    cached(key, fetcher)
      .then(result => {
        if (alive) setData(result);
      })
      .catch(err => {
        console.error(`Failed to load ${key}:`, err);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return data;
}

const EMPTY: never[] = [];

export function useHomes(): Home[] {
  return useCachedFetch<Home[]>(
    'homes',
    () => api.getHomes().then(r => r.homes as Home[]),
    EMPTY
  );
}

export function useDevices(): Device[] {
  return useCachedFetch<Device[]>(
    'devices',
    () => api.getDevices().then(r => r.devices as Device[]),
    EMPTY
  );
}

export function useRooms(): Room[] {
  return useCachedFetch<Room[]>(
    'rooms',
    async () => {
      const { homes } = await api.getHomes();
      const roomLists = await Promise.all(
        homes.map(h => api.getHomeRooms(h.id).then(r => r.rooms as Room[]))
      );
      return roomLists.flat();
    },
    EMPTY
  );
}

// Helper hooks
export function useDevice(deviceId: string): Device | undefined {
  const devices = useDevices();
  return useMemo(() => devices.find(d => d.id === deviceId), [devices, deviceId]);
}

export function useHome(homeId: string): Home | undefined {
  const homes = useHomes();
  return useMemo(() => homes.find(h => h.id === homeId), [homes, homeId]);
}

export function useRoom(roomId: string | null | undefined): Room | undefined {
  const rooms = useRooms();
  return useMemo(() => rooms.find(r => r.id === roomId), [rooms, roomId]);
}

export interface ReadingsState {
  readings: SensorReading[];
  loading: boolean;
  error: string | null;
}

export function useDeviceReadings(
  deviceId: string | undefined,
  range: '24h' | '7d' | '30d'
): ReadingsState {
  const [state, setState] = useState<ReadingsState>({ readings: [], loading: false, error: null });

  useEffect(() => {
    if (!deviceId) return;
    let alive = true;
    setState(s => ({ ...s, loading: true, error: null }));
    cached(`readings:${deviceId}:${range}`, () =>
      api.getDeviceReadings(deviceId, range).then(r => r.readings as SensorReading[])
    )
      .then(readings => {
        if (alive) setState({ readings, loading: false, error: null });
      })
      .catch(err => {
        if (alive) setState({ readings: [], loading: false, error: err.message });
      });
    return () => {
      alive = false;
    };
  }, [deviceId, range]);

  return state;
}

export function useLatestReading(deviceId: string): SensorReading | undefined {
  const device = useDevice(deviceId);
  return device?.latestReading ?? undefined;
}
