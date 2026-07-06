/**
 * Script to generate 7 days of realistic sensor readings for all 6 devices
 * Run with: npx tsx scripts/generateSensorData.ts
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

// Device IDs
const DEVICES = [
  { id: 'device-br1', type: 'bedroom' },
  { id: 'device-br2', type: 'bedroom' },
  { id: 'device-br3', type: 'bedroom' },
  { id: 'device-br4', type: 'bedroom' },
  { id: 'device-lr', type: 'common' },
  { id: 'device-fr', type: 'common' },
];

// Time constants
const DAYS = 7;
const INTERVAL_MINUTES = 10;
const READINGS_PER_DAY = (24 * 60) / INTERVAL_MINUTES; // 144
const TOTAL_READINGS = DAYS * READINGS_PER_DAY; // 1008

// Start date: 7 days ago from now
const END_DATE = new Date('2025-11-15T09:50:00Z');
const START_DATE = new Date(END_DATE.getTime() - DAYS * 24 * 60 * 60 * 1000);

// Helper functions
function randomVariation(base: number, variance: number): number {
  return base + (Math.random() - 0.5) * 2 * variance;
}

function getHourOfDay(date: Date): number {
  return date.getUTCHours() + date.getUTCMinutes() / 60;
}

function isSleepHours(hour: number): boolean {
  return hour >= 22 || hour < 7;
}

function isEveningHours(hour: number): boolean {
  return hour >= 18 && hour < 23;
}

function calculateAQI(pm25: number): number {
  // Simplified AQI calculation based on PM2.5
  if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
  if (pm25 <= 35.4) return Math.round(50 + ((100 - 50) / (35.4 - 12.1)) * (pm25 - 12.1));
  if (pm25 <= 55.4) return Math.round(100 + ((150 - 100) / (55.4 - 35.5)) * (pm25 - 35.5));
  if (pm25 <= 150.4) return Math.round(150 + ((200 - 150) / (150.4 - 55.5)) * (pm25 - 55.5));
  if (pm25 <= 250.4) return Math.round(200 + ((300 - 200) / (250.4 - 150.5)) * (pm25 - 150.5));
  return Math.round(300 + ((500 - 300) / (500.4 - 250.5)) * (pm25 - 250.5));
}

function generatePM25(deviceType: string, hour: number, dayProgress: number): number {
  const basePM = deviceType === 'bedroom' ? 10 : 12;

  // Add daily cycle variation
  const dailyCycle = Math.sin(dayProgress * Math.PI * 2) * 3;

  // Common areas have more spikes in evening
  if (deviceType === 'common' && isEveningHours(hour)) {
    // 20% chance of spike
    if (Math.random() < 0.2) {
      return randomVariation(85, 15); // Spike
    }
  }

  // Random occasional spikes
  if (Math.random() < 0.02) {
    return randomVariation(75, 10);
  }

  return Math.max(5, randomVariation(basePM + dailyCycle, 4));
}

function generatePM10(pm25: number): number {
  // PM10 is typically 1.5-2x PM2.5
  return randomVariation(pm25 * 1.7, pm25 * 0.2);
}

function generateCO2(deviceType: string, hour: number): number {
  const baseCO2 = 600;

  if (deviceType === 'bedroom' && isSleepHours(hour)) {
    // Higher CO2 during sleep hours
    return randomVariation(1100, 150);
  }

  if (deviceType === 'common' && isEveningHours(hour)) {
    return randomVariation(850, 100);
  }

  return randomVariation(baseCO2, 100);
}

function generateTemperature(hour: number): number {
  // Slight daily variation
  const dailyVariation = Math.cos((hour / 24) * Math.PI * 2) * 1.5;
  return randomVariation(21.5 + dailyVariation, 0.5);
}

function generateHumidity(): number {
  return randomVariation(45, 5);
}

function generatePressure(dayIndex: number): number {
  // Slowly varying pressure
  const trend = Math.sin((dayIndex / DAYS) * Math.PI * 2) * 5;
  return randomVariation(1015 + trend, 1);
}

function generateVOC(deviceType: string, hour: number): number {
  const baseVOC = deviceType === 'common' ? 180 : 150;

  if (deviceType === 'common' && isEveningHours(hour)) {
    // Occasional spikes in common areas
    if (Math.random() < 0.15) {
      return randomVariation(280, 30);
    }
  }

  return randomVariation(baseVOC, 25);
}

function generateNoise(deviceType: string, hour: number): number {
  if (deviceType === 'bedroom' && isSleepHours(hour)) {
    return randomVariation(28, 3); // Very quiet at night
  }

  if (deviceType === 'common' && isEveningHours(hour)) {
    return randomVariation(42, 5); // Louder in evenings
  }

  const baseNoise = deviceType === 'bedroom' ? 32 : 38;
  return randomVariation(baseNoise, 4);
}

function detectAnomalies(
  reading: Omit<SensorReading, 'anomalyFlags'>,
  prevReading: SensorReading | null
): string[] {
  const flags: string[] = [];

  // PM2.5 spike detection
  if (reading.pm25 > 70) {
    flags.push('PM_SPIKE');
  }

  // Large PM2.5 delta
  if (prevReading && Math.abs(reading.pm25 - prevReading.pm25) > 30) {
    flags.push('PM_RAPID_CHANGE');
  }

  // High CO2
  if (reading.co2 > 1200) {
    flags.push('CO2_HIGH');
  }

  // High VOC
  if (reading.vocIndex > 260) {
    flags.push('VOC_HIGH');
  }

  return flags;
}

// Generate readings
function generateReadings(): SensorReading[] {
  const allReadings: SensorReading[] = [];

  for (const device of DEVICES) {
    let prevReading: SensorReading | null = null;

    for (let i = 0; i < TOTAL_READINGS; i++) {
      const timestamp = new Date(START_DATE.getTime() + i * INTERVAL_MINUTES * 60 * 1000);
      const hour = getHourOfDay(timestamp);
      const dayProgress = (i % READINGS_PER_DAY) / READINGS_PER_DAY;
      const dayIndex = Math.floor(i / READINGS_PER_DAY);

      const pm25 = generatePM25(device.type, hour, dayProgress);
      const pm10 = generatePM10(pm25);
      const co2 = generateCO2(device.type, hour);
      const temperature = generateTemperature(hour);
      const humidity = generateHumidity();
      const pressure = generatePressure(dayIndex);
      const vocIndex = generateVOC(device.type, hour);
      const noiseDb = generateNoise(device.type, hour);
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

      const fullReading: SensorReading = {
        ...reading,
        anomalyFlags,
      };

      allReadings.push(fullReading);
      prevReading = fullReading;
    }
  }

  return allReadings;
}

// Main execution
console.log('Generating sensor readings...');
console.log(`Devices: ${DEVICES.length}`);
console.log(`Duration: ${DAYS} days`);
console.log(`Interval: ${INTERVAL_MINUTES} minutes`);
console.log(`Readings per device: ${TOTAL_READINGS}`);
console.log(`Total readings: ${DEVICES.length * TOTAL_READINGS}`);

const readings = generateReadings();

// Count anomalies
const anomalyCount = readings.filter(r => r.anomalyFlags.length > 0).length;
console.log(`\nAnomalies detected: ${anomalyCount}`);

// Write to file
const outputPath = join(__dirname, '..', 'src', 'data', 'sensorReadings.json');
writeFileSync(outputPath, JSON.stringify(readings, null, 2));

console.log(`\nSensor readings written to: ${outputPath}`);
console.log('Done!');
