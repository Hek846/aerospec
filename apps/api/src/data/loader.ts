import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  User, Home, Room, Device, SensorReading, AlertRule,
  AlertEvent, ConfigProfile, ReportSummary
} from '@aerospec/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the data directory in packages/data (resolved from dist output)
const DATA_PATH = join(__dirname, '../../packages/data/src/data');

function loadJSON<T>(filename: string): T {
  const filePath = join(DATA_PATH, filename);
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

// Load all data at startup
export const users: User[] = loadJSON<User[]>('users.json');
export const homes: Home[] = loadJSON<Home[]>('homes.json');
export const rooms: Room[] = loadJSON<Room[]>('rooms.json');
export const devices: Device[] = loadJSON<Device[]>('devices.json');
export const sensorReadings: SensorReading[] = loadJSON<SensorReading[]>('sensorReadings.json');
export const alertRules: AlertRule[] = loadJSON<AlertRule[]>('alertRules.json');
export let alertEvents: AlertEvent[] = loadJSON<AlertEvent[]>('alertEvents.json');
export const configProfiles: ConfigProfile[] = loadJSON<ConfigProfile[]>('configProfiles.json');
export const reportSummaries: ReportSummary[] = loadJSON<ReportSummary[]>('reportSummaries.json');

// Helper functions
export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email);
}

export function getHomeById(id: string): Home | undefined {
  return homes.find(h => h.id === id);
}

export function getRoomById(id: string): Room | undefined {
  return rooms.find(r => r.id === id);
}

export function getDeviceById(id: string): Device | undefined {
  return devices.find(d => d.id === id);
}

export function getHomesForUser(userId: string): Home[] {
  const user = getUserById(userId);
  if (!user) return [];
  return homes.filter(h => user.homes.includes(h.id));
}

export function getRoomsByHomeId(homeId: string): Room[] {
  return rooms.filter(r => r.homeId === homeId);
}

export function getDevicesByHomeId(homeId: string): Device[] {
  return devices.filter(d => d.homeId === homeId);
}

export function getReadingsForDevice(deviceId: string, limit?: number): SensorReading[] {
  const readings = sensorReadings
    .filter(r => r.deviceId === deviceId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return limit ? readings.slice(0, limit) : readings;
}

export function getLatestReadingForDevice(deviceId: string): SensorReading | undefined {
  return getReadingsForDevice(deviceId, 1)[0];
}

export function updateAlertEvent(eventId: string, updates: Partial<AlertEvent>): AlertEvent | null {
  const index = alertEvents.findIndex(e => e.id === eventId);
  if (index === -1) return null;

  alertEvents[index] = { ...alertEvents[index], ...updates };
  return alertEvents[index];
}

console.log('✅ Data loaded successfully');
console.log(`   Users: ${users.length}`);
console.log(`   Homes: ${homes.length}`);
console.log(`   Rooms: ${rooms.length}`);
console.log(`   Devices: ${devices.length}`);
console.log(`   Sensor Readings: ${sensorReadings.length}`);
console.log(`   Alert Rules: ${alertRules.length}`);
console.log(`   Alert Events: ${alertEvents.length}`);
