/**
 * Script to generate alert events from sensor readings with anomalies
 * Run with: npx tsx scripts/generateAlertEvents.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SensorReading {
  deviceId: string;
  timestamp: string;
  pm25: number;
  co2: number;
  vocIndex: number;
  anomalyFlags: string[];
}

interface AlertEvent {
  id: string;
  ruleId: string;
  deviceId: string;
  timestamp: string;
  metric: string;
  value: number;
  status: 'open' | 'acknowledged' | 'closed';
}

// Load sensor readings
const readingsPath = join(__dirname, '..', 'src', 'data', 'sensorReadings.json');
const readings: SensorReading[] = JSON.parse(readFileSync(readingsPath, 'utf-8'));

// Filter readings with anomalies
const anomalousReadings = readings.filter(r => r.anomalyFlags.length > 0);

console.log(`Total readings: ${readings.length}`);
console.log(`Readings with anomalies: ${anomalousReadings.length}`);

// Generate alert events
const alertEvents: AlertEvent[] = [];
let eventCounter = 1;

for (const reading of anomalousReadings) {
  const flags = reading.anomalyFlags;

  // PM2.5 alerts
  if (flags.includes('PM_SPIKE') || flags.includes('PM_RAPID_CHANGE')) {
    // Randomly decide status (most open, some acknowledged, few closed)
    const rand = Math.random();
    let status: 'open' | 'acknowledged' | 'closed';
    if (rand < 0.6) status = 'open';
    else if (rand < 0.9) status = 'acknowledged';
    else status = 'closed';

    alertEvents.push({
      id: `event-${String(eventCounter++).padStart(4, '0')}`,
      ruleId: 'rule-pm25-home',
      deviceId: reading.deviceId,
      timestamp: reading.timestamp,
      metric: 'pm25',
      value: reading.pm25,
      status,
    });
  }

  // CO2 alerts
  if (flags.includes('CO2_HIGH')) {
    const rand = Math.random();
    let status: 'open' | 'acknowledged' | 'closed';
    if (rand < 0.7) status = 'open';
    else if (rand < 0.95) status = 'acknowledged';
    else status = 'closed';

    alertEvents.push({
      id: `event-${String(eventCounter++).padStart(4, '0')}`,
      ruleId: 'rule-co2-home',
      deviceId: reading.deviceId,
      timestamp: reading.timestamp,
      metric: 'co2',
      value: reading.co2,
      status,
    });
  }

  // VOC alerts
  if (flags.includes('VOC_HIGH')) {
    const rand = Math.random();
    let status: 'open' | 'acknowledged' | 'closed';
    if (rand < 0.65) status = 'open';
    else if (rand < 0.92) status = 'acknowledged';
    else status = 'closed';

    alertEvents.push({
      id: `event-${String(eventCounter++).padStart(4, '0')}`,
      ruleId: 'rule-voc-home',
      deviceId: reading.deviceId,
      timestamp: reading.timestamp,
      metric: 'vocIndex',
      value: reading.vocIndex,
      status,
    });
  }
}

console.log(`\nGenerated ${alertEvents.length} alert events`);
console.log(`Open: ${alertEvents.filter(e => e.status === 'open').length}`);
console.log(`Acknowledged: ${alertEvents.filter(e => e.status === 'acknowledged').length}`);
console.log(`Closed: ${alertEvents.filter(e => e.status === 'closed').length}`);

// Write to file
const outputPath = join(__dirname, '..', 'src', 'data', 'alertEvents.json');
writeFileSync(outputPath, JSON.stringify(alertEvents, null, 2));

console.log(`\nAlert events written to: ${outputPath}`);
console.log('Done!');
