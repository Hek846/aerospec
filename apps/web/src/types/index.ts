// User Types
export type UserRole = 'owner' | 'standard' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  homes: string[]; // list of home IDs the user can access
}

// Home Types
export interface Location {
  city: string;
  region: string; // state or province code
  lat: number;
  lon: number;
}

export interface Home {
  id: string;
  ownerId: string;
  name: string;
  location: Location;
  timezone: string; // IANA format
  configProfileId: string;
  roomIds: string[];
}

// Room Types
export type RoomType = 'Bedroom' | 'LivingRoom' | 'FamilyRoom' | 'Kitchen' | 'Office' | 'Other';

export interface Room {
  id: string;
  homeId: string;
  name: string;
  type: RoomType;
  floor: string | number; // "1", "2", "Basement", etc.
  deviceId: string; // 1:1 relationship in V1
}

// Device Types
export type DeviceStatus = 'online' | 'offline';

export interface Device {
  id: string;
  homeId: string;
  roomId: string;
  name: string;
  deploymentId: string; // human-readable unique ID
  tags: string[];
  firmwareVersion: string;
  status: DeviceStatus;
  lastSeen: string; // ISO timestamp
  wifiRssi: number; // dBm
  batteryLevel: number; // percent
}

// Sensor Reading Types
export interface SensorReading {
  deviceId: string;
  timestamp: string; // ISO timestamp
  pm25: number; // µg/m³
  pm10: number; // µg/m³
  co2: number; // ppm
  temperature: number; // degrees Celsius
  humidity: number; // percent
  pressure: number; // hPa
  vocIndex: number; // dimensionless index
  noiseDb: number; // dB
  aqi: number; // 0-500 or similar
  anomalyFlags: string[]; // e.g., ["PM_SPIKE", "CO2_HIGH"]
}

// Alert Types
export type ThresholdType = 'above' | 'below';
export type MetricType = 'pm25' | 'pm10' | 'co2' | 'vocIndex' | 'noiseDb';

export interface QuietHours {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface AlertRule {
  id: string;
  homeId?: string; // optional if scoped to home
  deviceId?: string; // optional if scoped to device
  metric: MetricType;
  thresholdType: ThresholdType;
  thresholdValue: number;
  enabled: boolean;
  notifyEmail: string;
  quietHours: QuietHours;
}

export type AlertEventStatus = 'open' | 'acknowledged' | 'closed';

export interface AlertEvent {
  id: string;
  ruleId: string;
  deviceId: string;
  timestamp: string; // ISO timestamp
  metric: string;
  value: number;
  status: AlertEventStatus;
}

// Config Profile Types
export interface ThresholdDefaults {
  pm25: number;
  pm10: number;
  co2: number;
  vocIndex: number;
  noiseDb: number;
}

export interface ConfigProfile {
  id: string;
  name: string; // e.g., "Standard", "Sensitive"
  defaults: ThresholdDefaults;
}

// UI Theme
export type Theme = 'light' | 'dark' | 'auto';

// Report Types
export interface RoomStats {
  roomId: string;
  avgAqi: number;
  maxAqi: number;
  maxAqiTimestamp: string;
}

export interface MetricStats {
  metric: string;
  avgValue: number;
  maxValue: number;
  alertCount: number;
}

export interface ReportSummaryStats {
  rooms: RoomStats[];
  metrics: MetricStats[];
  totalAlerts: number;
}

export interface ReportSummary {
  id: string;
  homeId: string;
  periodStart: string; // ISO timestamp
  periodEnd: string; // ISO timestamp
  generatedAt: string; // ISO timestamp
  summaryStats: ReportSummaryStats;
  worstRoomId?: string;
  link?: string; // optional URL or path to a generated report view
}

// OTA Types
export type OTAStatus = 'idle' | 'pending' | 'updating' | 'success' | 'failure';

export interface OTAJob {
  id: string;
  firmwareVersion: string;
  targetDeviceIds: string[];
  status: OTAStatus;
  createdAt: string;
  completedAt?: string;
}

export interface DeviceOTAStatus {
  deviceId: string;
  status: OTAStatus;
  currentVersion: string;
  targetVersion?: string;
  lastUpdateAttempt?: string;
}

// AQI Band Types
export type AQIBand = 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';

export interface AQIInfo {
  value: number;
  band: AQIBand;
  color: string;
}
