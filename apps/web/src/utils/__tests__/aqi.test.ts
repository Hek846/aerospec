import { describe, it, expect } from 'vitest';
import { calculateAQI, getAQIBand, getAQIColor, getAQILabel } from '../aqi';

describe('AQI Utilities', () => {
  describe('calculateAQI', () => {
    it('calculates AQI from PM2.5 value', () => {
      const aqiInfo = calculateAQI(12.0);
      expect(aqiInfo.value).toBeGreaterThan(0);
      expect(aqiInfo.value).toBeLessThan(500);
      expect(aqiInfo.band).toBeTruthy();
      expect(aqiInfo.color).toBeTruthy();
    });

    it('returns higher AQI for worse air quality', () => {
      const goodAQI = calculateAQI(5.0);
      const badAQI = calculateAQI(150.0);

      expect(badAQI.value).toBeGreaterThan(goodAQI.value);
    });
  });

  describe('getAQIBand', () => {
    it('returns correct band for good air quality', () => {
      expect(getAQIBand(25)).toBe('good');
      expect(getAQIBand(50)).toBe('good');
    });

    it('returns correct band for moderate air quality', () => {
      expect(getAQIBand(51)).toBe('moderate');
      expect(getAQIBand(75)).toBe('moderate');
      expect(getAQIBand(100)).toBe('moderate');
    });

    it('returns correct band for unhealthy air quality', () => {
      expect(getAQIBand(101)).toBe('unhealthy-sensitive');
      expect(getAQIBand(150)).toBe('unhealthy-sensitive');
    });

    it('returns correct band for very unhealthy air quality', () => {
      expect(getAQIBand(151)).toBe('unhealthy');
      expect(getAQIBand(200)).toBe('unhealthy');
    });

    it('returns correct band for hazardous air quality', () => {
      expect(getAQIBand(201)).toBe('very-unhealthy');
      expect(getAQIBand(300)).toBe('very-unhealthy');
      expect(getAQIBand(301)).toBe('hazardous');
      expect(getAQIBand(500)).toBe('hazardous');
    });
  });

  describe('getAQIColor', () => {
    it('returns color for good air quality', () => {
      const color = getAQIColor(25);
      expect(color).toBeTruthy();
      expect(color).toMatch(/#[0-9a-f]{6}/i);
    });

    it('returns appropriate colors for different AQI levels', () => {
      expect(getAQIColor(25)).toBeTruthy(); // Good
      expect(getAQIColor(75)).toBeTruthy(); // Moderate
      expect(getAQIColor(125)).toBeTruthy(); // Unhealthy for sensitive
      expect(getAQIColor(175)).toBeTruthy(); // Unhealthy
      expect(getAQIColor(225)).toBeTruthy(); // Very unhealthy
      expect(getAQIColor(350)).toBeTruthy(); // Hazardous
    });
  });

  describe('getAQILabel', () => {
    it('returns correct label for each AQI band', () => {
      expect(getAQILabel(25)).toBe('Good');
      expect(getAQILabel(75)).toBe('Moderate');
      expect(getAQILabel(125)).toMatch(/Unhealthy.*Sensitive/i);
      expect(getAQILabel(175)).toBe('Unhealthy');
      expect(getAQILabel(225)).toMatch(/Very Unhealthy/i);
      expect(getAQILabel(350)).toBe('Hazardous');
    });
  });
});
