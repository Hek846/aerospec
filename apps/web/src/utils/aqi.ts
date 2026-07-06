import { AQIBand, AQIInfo } from '../types';

// AQI Breakpoint table for PM2.5 (based on EPA standards)
interface AQIBreakpoint {
  aqiLow: number;
  aqiHigh: number;
  pm25Low: number;
  pm25High: number;
  band: AQIBand;
  color: string;
}

const AQI_BREAKPOINTS: AQIBreakpoint[] = [
  { aqiLow: 0, aqiHigh: 50, pm25Low: 0.0, pm25High: 12.0, band: 'Good', color: '#00e400' },
  { aqiLow: 51, aqiHigh: 100, pm25Low: 12.1, pm25High: 35.4, band: 'Moderate', color: '#ffff00' },
  { aqiLow: 101, aqiHigh: 150, pm25Low: 35.5, pm25High: 55.4, band: 'Unhealthy for Sensitive Groups', color: '#ff7e00' },
  { aqiLow: 151, aqiHigh: 200, pm25Low: 55.5, pm25High: 150.4, band: 'Unhealthy', color: '#ff0000' },
  { aqiLow: 201, aqiHigh: 300, pm25Low: 150.5, pm25High: 250.4, band: 'Very Unhealthy', color: '#8f3f97' },
  { aqiLow: 301, aqiHigh: 500, pm25Low: 250.5, pm25High: 500.4, band: 'Hazardous', color: '#7e0023' },
];

/**
 * Calculate AQI from PM2.5 concentration
 * @param pm25 - PM2.5 concentration in µg/m³
 * @returns AQI information including value, band, and color
 */
export function calculateAQI(pm25: number): AQIInfo {
  // Find the appropriate breakpoint
  let breakpoint = AQI_BREAKPOINTS[AQI_BREAKPOINTS.length - 1];

  for (const bp of AQI_BREAKPOINTS) {
    if (pm25 >= bp.pm25Low && pm25 <= bp.pm25High) {
      breakpoint = bp;
      break;
    }
  }

  // Calculate AQI using linear interpolation
  const { aqiLow, aqiHigh, pm25Low, pm25High, band, color } = breakpoint;
  const aqi = Math.round(
    ((aqiHigh - aqiLow) / (pm25High - pm25Low)) * (pm25 - pm25Low) + aqiLow
  );

  return {
    value: Math.max(0, Math.min(500, aqi)), // Clamp between 0 and 500
    band,
    color,
  };
}

/**
 * Get AQI band and color for a given AQI value
 */
export function getAQIBandInfo(aqi: number): { band: AQIBand; color: string } {
  for (const bp of AQI_BREAKPOINTS) {
    if (aqi >= bp.aqiLow && aqi <= bp.aqiHigh) {
      return { band: bp.band, color: bp.color };
    }
  }
  return { band: 'Hazardous', color: '#7e0023' };
}

/**
 * Get AQI band as a CSS-friendly string
 */
export function getAQIBand(aqi: number): string {
  const { band } = getAQIBandInfo(aqi);
  return band.toLowerCase().replace(/\s+for\s+/g, '-').replace(/\s+/g, '-');
}

/**
 * Get AQI color for a given AQI value
 */
export function getAQIColor(aqi: number): string {
  const { color } = getAQIBandInfo(aqi);
  return color;
}

/**
 * Get AQI label (band name) for a given AQI value
 */
export function getAQILabel(aqi: number): string {
  const { band } = getAQIBandInfo(aqi);
  return band;
}
