import { useMemo } from 'react';
import { Device, Home, Room, User, SensorReading, AlertRule, AlertEvent, ConfigProfile, ReportSummary } from '../types';

// Import JSON data
import devicesData from '../data/devices.json';
import homesData from '../data/homes.json';
import roomsData from '../data/rooms.json';
import usersData from '../data/users.json';
import sensorReadingsData from '../data/sensorReadings.json';
import alertRulesData from '../data/alertRules.json';
import alertEventsData from '../data/alertEvents.json';
import configProfilesData from '../data/configProfiles.json';
import reportSummariesData from '../data/reportSummaries.json';

export function useDevices(): Device[] {
  return useMemo(() => devicesData as Device[], []);
}

export function useHomes(): Home[] {
  return useMemo(() => homesData as Home[], []);
}

export function useRooms(): Room[] {
  return useMemo(() => roomsData as Room[], []);
}

export function useUsers(): User[] {
  return useMemo(() => usersData as User[], []);
}

export function useSensorReadings(): SensorReading[] {
  return useMemo(() => sensorReadingsData as SensorReading[], []);
}

export function useAlertRules(): AlertRule[] {
  return useMemo(() => alertRulesData as AlertRule[], []);
}

export function useAlertEvents(): AlertEvent[] {
  return useMemo(() => alertEventsData as AlertEvent[], []);
}

export function useConfigProfiles(): ConfigProfile[] {
  return useMemo(() => configProfilesData as ConfigProfile[], []);
}

export function useReportSummaries(): ReportSummary[] {
  return useMemo(() => reportSummariesData as ReportSummary[], []);
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

export function useRoom(roomId: string): Room | undefined {
  const rooms = useRooms();
  return useMemo(() => rooms.find(r => r.id === roomId), [rooms, roomId]);
}

export function useDeviceSensorReadings(deviceId: string): SensorReading[] {
  const readings = useSensorReadings();
  return useMemo(
    () => readings.filter(r => r.deviceId === deviceId).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    [readings, deviceId]
  );
}

export function useLatestReading(deviceId: string): SensorReading | undefined {
  const readings = useDeviceSensorReadings(deviceId);
  return useMemo(() => readings[readings.length - 1], [readings]);
}
