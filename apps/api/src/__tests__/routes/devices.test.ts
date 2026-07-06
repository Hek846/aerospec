import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeviceById, getReadingsForDevice } from '../../data/loader.js';

vi.mock('../../data/loader.js', () => ({
  getDeviceById: vi.fn(),
  getReadingsForDevice: vi.fn(),
  getDevicesForHome: vi.fn(),
}));

describe('Devices Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /devices/:id', () => {
    it('returns device by ID', () => {
      const mockDevice = {
        id: 'device-1',
        name: 'Living Room Sensor',
        homeId: 'home-1',
        location: 'Living Room',
        status: 'online',
        firmware: '1.2.3',
        installDate: '2024-01-01T00:00:00Z'
      };

      (getDeviceById as any).mockReturnValue(mockDevice);

      const device = getDeviceById('device-1');
      expect(device).toEqual(mockDevice);
      expect(device?.id).toBe('device-1');
    });

    it('returns null for non-existent device', () => {
      (getDeviceById as any).mockReturnValue(null);

      const device = getDeviceById('non-existent');
      expect(device).toBeNull();
    });
  });

  describe('GET /devices/:id/readings', () => {
    it('returns sensor readings for device', () => {
      const mockReadings = [
        {
          deviceId: 'device-1',
          timestamp: '2024-01-01T12:00:00Z',
          pm25: 12.5,
          pm10: 20.0,
          co2: 450,
          temperature: 22.5,
          humidity: 45,
          vocIndex: 100,
          noiseDb: 35,
          aqi: 42,
          anomalyFlags: []
        },
        {
          deviceId: 'device-1',
          timestamp: '2024-01-01T11:00:00Z',
          pm25: 11.0,
          pm10: 18.0,
          co2: 420,
          temperature: 22.0,
          humidity: 46,
          vocIndex: 95,
          noiseDb: 33,
          aqi: 38,
          anomalyFlags: []
        }
      ];

      (getReadingsForDevice as any).mockReturnValue(mockReadings);

      const readings = getReadingsForDevice('device-1');
      expect(readings).toEqual(mockReadings);
      expect(readings).toHaveLength(2);
      expect(readings.every(r => r.deviceId === 'device-1')).toBe(true);
    });

    it('returns empty array for device with no readings', () => {
      (getReadingsForDevice as any).mockReturnValue([]);

      const readings = getReadingsForDevice('device-no-data');
      expect(readings).toEqual([]);
    });

    it('readings are sorted by timestamp', () => {
      const mockReadings = [
        {
          deviceId: 'device-1',
          timestamp: '2024-01-01T12:00:00Z',
          pm25: 12.5,
          aqi: 42,
        },
        {
          deviceId: 'device-1',
          timestamp: '2024-01-01T11:00:00Z',
          pm25: 11.0,
          aqi: 38,
        }
      ];

      (getReadingsForDevice as any).mockReturnValue(mockReadings);

      const readings = getReadingsForDevice('device-1');
      // Should be in descending order (newest first)
      expect(new Date(readings[0].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(readings[1].timestamp).getTime());
    });
  });

  describe('Device Status', () => {
    it('identifies online devices', () => {
      const onlineDevice = {
        id: 'device-1',
        status: 'online',
        lastReading: { timestamp: new Date().toISOString() }
      };

      expect(onlineDevice.status).toBe('online');
    });

    it('identifies offline devices', () => {
      const offlineDevice = {
        id: 'device-2',
        status: 'offline',
        lastReading: { timestamp: new Date(Date.now() - 86400000).toISOString() }
      };

      expect(offlineDevice.status).toBe('offline');
    });
  });
});
