/**
 * Advanced data generation script with configurable parameters
 * Generates data with anomalies, edge cases, and realistic sensor drift
 * Run with: pnpm generate:advanced
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SensorReading {
  deviceId: string;
  timestamp: string;
  pm25: number;
  pm10: number;
  co2: number;
  temperature: number;
  humidity: number;
  pressure: number;
  vocIndex: number;
  noiseDb: number;
  aqi: number;
  anomalyFlags: string[];
}

// Configuration
const CONFIG = {
  // Time range
  days: parseInt(process.env.DAYS || '14', 10),
  intervalMinutes: parseInt(process.env.INTERVAL || '10', 10),

  // Anomaly settings
  anomalyRate: parseFloat(process.env.ANOMALY_RATE || '0.05'), // 5% chance of anomaly
  sensorDrift: parseFloat(process.env.SENSOR_DRIFT || '0.02'), // 2% drift over time

  // Device settings
  devices: [
    { id: 'device-br1', type: 'bedroom', calibrationOffset: -0.5 },
    { id: 'device-br2', type: 'bedroom', calibrationOffset: 0.3 },
    { id: 'device-br3', type: 'bedroom', calibrationOffset: -0.2 },
    { id: 'device-br4', type: 'bedroom', calibrationOffset: 0.1 },
    { id: 'device-lr', type: 'common', calibrationOffset: 0.5 },
    { id: 'device-fr', type: 'common', calibrationOffset: -0.3 },
  ],
};

const DAYS = CONFIG.days;
const INTERVAL_MINUTES = CONFIG.intervalMinutes;
const READINGS_PER_DAY = (24 * 60) / INTERVAL_MINUTES;
const TOTAL_READINGS = DAYS * READINGS_PER_DAY;

const END_DATE = new Date();
const START_DATE = new Date(END_DATE.getTime() - DAYS * 24 * 60 * 60 * 1000);

console.log('🔧 Advanced Data Generation');
console.log('='.repeat(50));
console.log(`Days: ${DAYS}`);
console.log(`Interval: ${INTERVAL_MINUTES} minutes`);
console.log(`Anomaly rate: ${(CONFIG.anomalyRate * 100).toFixed(1)}%`);
console.log(`Sensor drift: ${(CONFIG.sensorDrift * 100).toFixed(1)}%`);
console.log(`Total readings: ${CONFIG.devices.length * TOTAL_READINGS}`);
console.log();

// Helper functions
function randomVariation(base: number, variance: number): number {
  return base + (Math.random() - 0.5) * 2 * variance;
}

function getHourOfDay(date: Date): number {
  return date.getHours() + date.getMinutes() / 60;
}

function isSleepHours(hour: number): boolean {
  return hour >= 22 || hour < 7;
}

function isEveningHours(hour: number): boolean {
  return hour >= 18 && hour < 23;
}

function calculateAQI(pm25: number): number {
  if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
  if (pm25 <= 35.4) return Math.round(50 + ((100 - 50) / (35.4 - 12.1)) * (pm25 - 12.1));
  if (pm25 <= 55.4) return Math.round(100 + ((150 - 100) / (55.4 - 35.5)) * (pm25 - 35.5));
  if (pm25 <= 150.4) return Math.round(150 + ((200 - 150) / (150.4 - 55.5)) * (pm25 - 55.5));
  if (pm25 <= 250.4) return Math.round(200 + ((300 - 200) / (250.4 - 150.5)) * (pm25 - 150.5));
  return Math.round(300 + ((500 - 300) / (500.4 - 250.5)) * (pm25 - 250.5));
}

// Apply sensor drift over time
function applyDrift(value: number, readingIndex: number, driftRate: number): number {
  const driftFactor = 1 + (readingIndex / TOTAL_READINGS) * driftRate;
  return value * driftFactor;
}

// Generate anomaly if conditions are met
function maybeGenerateAnomaly(
  baseValue: number,
  anomalyType: 'spike' | 'drop' | 'oscillation'
): number {
  if (Math.random() > CONFIG.anomalyRate) {
    return baseValue;
  }

  switch (anomalyType) {
    case 'spike':
      return baseValue * randomVariation(2.5, 0.5);
    case 'drop':
      return baseValue * randomVariation(0.3, 0.1);
    case 'oscillation':
      return baseValue * (1 + Math.sin(Date.now() / 1000) * 0.5);
    default:
      return baseValue;
  }
}

function generatePM25(
  deviceType: string,
  hour: number,
  dayProgress: number,
  readingIndex: number,
  calibrationOffset: number
): number {
  const basePM = (deviceType === 'bedroom' ? 10 : 12) + calibrationOffset;
  const dailyCycle = Math.sin(dayProgress * Math.PI * 2) * 3;

  let value = basePM + dailyCycle;

  // Evening spikes for common areas
  if (deviceType === 'common' && isEveningHours(hour)) {
    if (Math.random() < 0.15) {
      value = randomVariation(80, 15);
    }
  }

  // Apply drift
  value = applyDrift(value, readingIndex, CONFIG.sensorDrift);

  // Maybe add anomaly
  value = maybeGenerateAnomaly(value, Math.random() < 0.5 ? 'spike' : 'drop');

  return Math.max(5, randomVariation(value, 4));
}

function generateCO2(
  deviceType: string,
  hour: number,
  readingIndex: number,
  calibrationOffset: number
): number {
  const baseCO2 = 600 + calibrationOffset * 10;

  let value = baseCO2;

  if (deviceType === 'bedroom' && isSleepHours(hour)) {
    value = randomVariation(1100, 150);
  } else if (deviceType === 'common' && isEveningHours(hour)) {
    value = randomVariation(850, 100);
  } else {
    value = randomVariation(baseCO2, 100);
  }

  value = applyDrift(value, readingIndex, CONFIG.sensorDrift);
  value = maybeGenerateAnomaly(value, 'spike');

  return Math.round(Math.max(400, value));
}

function generateTemperature(hour: number, readingIndex: number, calibrationOffset: number): number {
  const dailyVariation = Math.cos((hour / 24) * Math.PI * 2) * 1.5;
  let value = 21.5 + dailyVariation + calibrationOffset;

  value = applyDrift(value, readingIndex, CONFIG.sensorDrift * 0.5);
  value = maybeGenerateAnomaly(value, 'oscillation');

  return randomVariation(value, 0.5);
}

function generateVOC(
  deviceType: string,
  hour: number,
  readingIndex: number,
  calibrationOffset: number
): number {
  const baseVOC = (deviceType === 'common' ? 180 : 150) + calibrationOffset * 5;

  let value = baseVOC;

  if (deviceType === 'common' && isEveningHours(hour)) {
    if (Math.random() < 0.12) {
      value = randomVariation(280, 30);
    }
  }

  value = applyDrift(value, readingIndex, CONFIG.sensorDrift);
  value = maybeGenerateAnomaly(value, 'spike');

  return Math.round(Math.max(50, randomVariation(value, 25)));
}

function detectAnomalies(
  reading: Omit<SensorReading, 'anomalyFlags'>,
  prevReading: SensorReading | null
): string[] {
  const flags: string[] = [];

  if (reading.pm25 > 70) flags.push('PM_SPIKE');
  if (prevReading && Math.abs(reading.pm25 - prevReading.pm25) > 30) flags.push('PM_RAPID_CHANGE');
  if (reading.co2 > 1200) flags.push('CO2_HIGH');
  if (reading.vocIndex > 260) flags.push('VOC_HIGH');
  if (prevReading && Math.abs(reading.temperature - prevReading.temperature) > 3) flags.push('TEMP_RAPID_CHANGE');
  if (reading.humidity > 60 || reading.humidity < 30) flags.push('HUMIDITY_ABNORMAL');

  return flags;
}

// Generate all readings
function generateReadings(): SensorReading[] {
  const allReadings: SensorReading[] = [];
  let anomalyCount = 0;

  for (const device of CONFIG.devices) {
    let prevReading: SensorReading | null = null;

    for (let i = 0; i < TOTAL_READINGS; i++) {
      const timestamp = new Date(START_DATE.getTime() + i * INTERVAL_MINUTES * 60 * 1000);
      const hour = getHourOfDay(timestamp);
      const dayProgress = (i % READINGS_PER_DAY) / READINGS_PER_DAY;

      const pm25 = generatePM25(device.type, hour, dayProgress, i, device.calibrationOffset);
      const pm10 = randomVariation(pm25 * 1.7, pm25 * 0.2);
      const co2 = generateCO2(device.type, hour, i, device.calibrationOffset);
      const temperature = generateTemperature(hour, i, device.calibrationOffset);
      const humidity = randomVariation(45, 5);
      const pressure = randomVariation(1015, 2);
      const vocIndex = generateVOC(device.type, hour, i, device.calibrationOffset);
      const noiseDb = randomVariation(device.type === 'bedroom' ? 30 : 38, 4);
      const aqi = calculateAQI(pm25);

      const reading: Omit<SensorReading, 'anomalyFlags'> = {
        deviceId: device.id,
        timestamp: timestamp.toISOString(),
        pm25: Math.round(pm25 * 10) / 10,
        pm10: Math.round(pm10 * 10) / 10,
        co2: Math.round(co2),
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.round(humidity * 10) / 10,
        pressure: Math.round(pressure * 10) / 10,
        vocIndex: Math.round(vocIndex),
        noiseDb: Math.round(noiseDb * 10) / 10,
        aqi,
      };

      const anomalyFlags = detectAnomalies(reading, prevReading);
      if (anomalyFlags.length > 0) anomalyCount++;

      const fullReading: SensorReading = { ...reading, anomalyFlags };
      allReadings.push(fullReading);
      prevReading = fullReading;
    }
  }

  console.log(`✓ Generated ${allReadings.length} readings`);
  console.log(`✓ Detected ${anomalyCount} anomalies (${((anomalyCount / allReadings.length) * 100).toFixed(2)}%)`);

  return allReadings;
}

// Main execution
const readings = generateReadings();

const outputPath = join(__dirname, 'data', 'sensorReadings.json');
writeFileSync(outputPath, JSON.stringify(readings, null, 2));

console.log(`\n✅ Advanced sensor readings written to: ${outputPath}`);
console.log('\n💡 Use this data for testing edge cases and anomaly detection');
