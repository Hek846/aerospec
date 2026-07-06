import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

enum AQIBand {
  good,
  moderate,
  unhealthySensitive,
  unhealthy,
  veryUnhealthy,
  hazardous,
}

/// AQI Information class
/// Note: Not JSON serializable because Color cannot be serialized
/// Use calculateAQI() to create instances from AQI values
class AQIInfo {
  final int aqi;
  final AQIBand band;
  final String description;

  AQIInfo({
    required this.aqi,
    required this.band,
    required this.description,
  });

  /// Get the color for this AQI band
  Color get color {
    switch (band) {
      case AQIBand.good:
        return AppTheme.aqiGood;
      case AQIBand.moderate:
        return AppTheme.aqiModerate;
      case AQIBand.unhealthySensitive:
        return AppTheme.aqiUnhealthySensitive;
      case AQIBand.unhealthy:
        return AppTheme.aqiUnhealthy;
      case AQIBand.veryUnhealthy:
        return AppTheme.aqiVeryUnhealthy;
      case AQIBand.hazardous:
        return AppTheme.aqiHazardous;
    }
  }
}

/// Calculate AQI band and info from AQI value
AQIInfo calculateAQI(int aqi) {
  if (aqi <= 50) {
    return AQIInfo(
      aqi: aqi,
      band: AQIBand.good,
      description: 'Air quality is satisfactory',
    );
  } else if (aqi <= 100) {
    return AQIInfo(
      aqi: aqi,
      band: AQIBand.moderate,
      description: 'Air quality is acceptable',
    );
  } else if (aqi <= 150) {
    return AQIInfo(
      aqi: aqi,
      band: AQIBand.unhealthySensitive,
      description: 'Unhealthy for sensitive groups',
    );
  } else if (aqi <= 200) {
    return AQIInfo(
      aqi: aqi,
      band: AQIBand.unhealthy,
      description: 'Everyone may begin to experience health effects',
    );
  } else if (aqi <= 300) {
    return AQIInfo(
      aqi: aqi,
      band: AQIBand.veryUnhealthy,
      description: 'Health alert: everyone may experience more serious effects',
    );
  } else {
    return AQIInfo(
      aqi: aqi,
      band: AQIBand.hazardous,
      description: 'Health warning of emergency conditions',
    );
  }
}

/// Get color for an AQI band
Color getAQIColor(AQIBand band) {
  switch (band) {
    case AQIBand.good:
      return AppTheme.aqiGood;
    case AQIBand.moderate:
      return AppTheme.aqiModerate;
    case AQIBand.unhealthySensitive:
      return AppTheme.aqiUnhealthySensitive;
    case AQIBand.unhealthy:
      return AppTheme.aqiUnhealthy;
    case AQIBand.veryUnhealthy:
      return AppTheme.aqiVeryUnhealthy;
    case AQIBand.hazardous:
      return AppTheme.aqiHazardous;
  }
}

/// Get AQI band name as string
String getAQIBandName(AQIBand band) {
  switch (band) {
    case AQIBand.good:
      return 'Good';
    case AQIBand.moderate:
      return 'Moderate';
    case AQIBand.unhealthySensitive:
      return 'Unhealthy for Sensitive Groups';
    case AQIBand.unhealthy:
      return 'Unhealthy';
    case AQIBand.veryUnhealthy:
      return 'Very Unhealthy';
    case AQIBand.hazardous:
      return 'Hazardous';
  }
}
