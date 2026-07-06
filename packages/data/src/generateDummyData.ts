/**
 * Main data generation script for Sensair
 * Orchestrates generation of all dummy data fixtures
 * Run with: pnpm generate
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🏗️  Sensair Data Generation');
console.log('='.repeat(50));
console.log();

const DATA_DIR = join(__dirname, 'data');

// Ensure data directory exists
try {
  mkdirSync(DATA_DIR, { recursive: true });
  console.log('✓ Data directory ready');
} catch (error) {
  console.error('❌ Failed to create data directory:', error);
  process.exit(1);
}

// Step 1: Generate sensor readings
console.log('\n📊 Step 1: Generating sensor readings...');
try {
  execSync('tsx src/generateSensorData.ts', {
    cwd: join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✓ Sensor readings generated');
} catch (error) {
  console.error('❌ Failed to generate sensor readings:', error);
  process.exit(1);
}

// Step 2: Generate alert events
console.log('\n🚨 Step 2: Generating alert events...');
try {
  execSync('tsx src/generateAlertEvents.ts', {
    cwd: join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✓ Alert events generated');
} catch (error) {
  console.error('❌ Failed to generate alert events:', error);
  process.exit(1);
}

// Step 3: Generate report summaries
console.log('\n📈 Step 3: Generating report summaries...');
try {
  execSync('tsx src/generateReportSummaries.ts', {
    cwd: join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('✓ Report summaries generated');
} catch (error) {
  console.error('❌ Failed to generate report summaries:', error);
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('✅ Data generation complete!');
console.log('\nGenerated files:');
console.log('  - users.json (static)');
console.log('  - homes.json (static)');
console.log('  - rooms.json (static)');
console.log('  - devices.json (static)');
console.log('  - configProfiles.json (static)');
console.log('  - alertRules.json (static)');
console.log('  - sensorReadings.json ✨');
console.log('  - alertEvents.json ✨');
console.log('  - reportSummaries.json ✨');
console.log('\n💡 Run `pnpm build` to rebuild the project with new data');
