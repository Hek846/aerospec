import 'package:json_annotation/json_annotation.dart';

part 'analytics.g.dart';

/// Time range for analytics data
enum TimeRange {
  @JsonValue('day')
  day,
  @JsonValue('week')
  week,
  @JsonValue('month')
  month,
  @JsonValue('all')
  all,
}

/// Extension to get display name for time range
extension TimeRangeExtension on TimeRange {
  String get displayName {
    switch (this) {
      case TimeRange.day:
        return 'Day';
      case TimeRange.week:
        return 'Week';
      case TimeRange.month:
        return 'Month';
      case TimeRange.all:
        return 'All';
    }
  }

  String get apiValue {
    switch (this) {
      case TimeRange.day:
        return 'day';
      case TimeRange.week:
        return 'week';
      case TimeRange.month:
        return 'month';
      case TimeRange.all:
        return 'all';
    }
  }
}

/// AQI distribution data for donut chart
@JsonSerializable()
class AQIDistribution {
  final Map<String, int> distribution;
  final int totalReadings;

  AQIDistribution({
    required this.distribution,
    required this.totalReadings,
  });

  factory AQIDistribution.fromJson(Map<String, dynamic> json) =>
      _$AQIDistributionFromJson(json);
  Map<String, dynamic> toJson() => _$AQIDistributionToJson(this);

  /// Get percentage for a band
  double getPercentage(String band) {
    if (totalReadings == 0) return 0;
    final count = distribution[band] ?? 0;
    return (count / totalReadings) * 100;
  }
}

/// Room AQI comparison data
@JsonSerializable()
class RoomAQIComparison {
  final String roomId;
  final String roomName;
  final double averageAqi;
  final int readingsCount;

  RoomAQIComparison({
    required this.roomId,
    required this.roomName,
    required this.averageAqi,
    required this.readingsCount,
  });

  factory RoomAQIComparison.fromJson(Map<String, dynamic> json) =>
      _$RoomAQIComparisonFromJson(json);
  Map<String, dynamic> toJson() => _$RoomAQIComparisonToJson(this);
}

/// Hourly AQI data
@JsonSerializable()
class HourlyAQI {
  final int hour;
  final double averageAqi;
  final int readingsCount;

  HourlyAQI({
    required this.hour,
    required this.averageAqi,
    required this.readingsCount,
  });

  factory HourlyAQI.fromJson(Map<String, dynamic> json) =>
      _$HourlyAQIFromJson(json);
  Map<String, dynamic> toJson() => _$HourlyAQIToJson(this);
}

/// Analytics data response
@JsonSerializable()
class AnalyticsData {
  final AQIDistribution aqiDistribution;
  final List<RoomAQIComparison> roomComparisons;
  final List<HourlyAQI> hourlyData;

  AnalyticsData({
    required this.aqiDistribution,
    required this.roomComparisons,
    required this.hourlyData,
  });

  factory AnalyticsData.fromJson(Map<String, dynamic> json) =>
      _$AnalyticsDataFromJson(json);
  Map<String, dynamic> toJson() => _$AnalyticsDataToJson(this);
}
