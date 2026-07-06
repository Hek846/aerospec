// Simple in-memory cache with TTL (Time To Live)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const cache = new Cache();

// Cache key builders
export const cacheKeys = {
  homes: () => 'homes',
  home: (id: string) => `home:${id}`,
  homeRooms: (homeId: string) => `home:${homeId}:rooms`,
  room: (id: string) => `room:${id}`,
  devices: () => 'devices',
  device: (id: string) => `device:${id}`,
  deviceReadings: (deviceId: string, range: string) => `device:${deviceId}:readings:${range}`,
  alerts: () => 'alerts',
  alertEvents: (status?: string) => `alerts:events:${status || 'all'}`,
  reports: () => 'reports',
  report: (id: string) => `report:${id}`,
  adminDevices: () => 'admin:devices',
  adminStats: () => 'admin:stats',
};
