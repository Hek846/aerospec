/**
 * US EPA PM2.5 AQI breakpoint conversion (24-hour standard, no NowCast).
 * https://www.airnow.gov/aqi/aqi-calculator-concentration/
 */

interface Breakpoint {
  cLow: number;
  cHigh: number;
  aqiLow: number;
  aqiHigh: number;
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0.0, cHigh: 12.0, aqiLow: 0, aqiHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, aqiLow: 151, aqiHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, aqiLow: 201, aqiHigh: 300 },
  { cLow: 250.5, cHigh: 500.4, aqiLow: 301, aqiHigh: 500 }
];

/**
 * Convert a PM2.5 concentration (µg/m³) to US EPA AQI.
 * Returns null when the concentration is missing or negative.
 * Concentrations above 500.4 µg/m³ clamp to 500.
 */
export function pm25ToAqi(pm25: number | null | undefined): number | null {
  if (pm25 === null || pm25 === undefined || Number.isNaN(pm25) || pm25 < 0) {
    return null;
  }

  // EPA truncates PM2.5 to 1 decimal place before lookup
  const c = Math.trunc(pm25 * 10) / 10;

  const bp = PM25_BREAKPOINTS.find((b) => c >= b.cLow && c <= b.cHigh);
  if (!bp) {
    return c > 500.4 ? 500 : null;
  }

  const aqi =
    ((bp.aqiHigh - bp.aqiLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.aqiLow;
  return Math.round(aqi);
}

/**
 * AQI for a sensor reading: prefer the EPA humidity-corrected PM2.5,
 * fall back to the environmental value.
 */
export function computeAqi(
  pm25Corr: number | null | undefined,
  pm25Env: number | null | undefined
): number | null {
  return pm25ToAqi(pm25Corr ?? pm25Env);
}

/** Map battery voltage (LiPo 3.2 V empty -> 4.2 V full) to percent, clamped. */
export function batteryVoltageToPercent(batteryV: number | null | undefined): number | null {
  if (batteryV === null || batteryV === undefined || Number.isNaN(batteryV)) {
    return null;
  }
  const pct = ((batteryV - 3.2) / (4.2 - 3.2)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
