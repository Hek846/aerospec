import 'package:json_annotation/json_annotation.dart';

part 'report.g.dart';

@JsonSerializable()
class RoomStats {
  final String roomId;
  final double avgAqi;
  final int maxAqi;
  final DateTime? maxAqiTimestamp;

  RoomStats({
    required this.roomId,
    required this.avgAqi,
    required this.maxAqi,
    this.maxAqiTimestamp,
  });

  factory RoomStats.fromJson(Map<String, dynamic> json) => _$RoomStatsFromJson(json);
  Map<String, dynamic> toJson() => _$RoomStatsToJson(this);
}

@JsonSerializable()
class MetricStats {
  final String metric;
  final double avgValue;
  final double maxValue;
  final int alertCount;

  MetricStats({
    required this.metric,
    required this.avgValue,
    required this.maxValue,
    required this.alertCount,
  });

  factory MetricStats.fromJson(Map<String, dynamic> json) => _$MetricStatsFromJson(json);
  Map<String, dynamic> toJson() => _$MetricStatsToJson(this);
}

@JsonSerializable()
class SummaryStats {
  final List<RoomStats> rooms;
  final List<MetricStats> metrics;
  final int totalAlerts;

  SummaryStats({
    required this.rooms,
    required this.metrics,
    required this.totalAlerts,
  });

  factory SummaryStats.fromJson(Map<String, dynamic> json) => _$SummaryStatsFromJson(json);
  Map<String, dynamic> toJson() => _$SummaryStatsToJson(this);
}

@JsonSerializable()
class ReportSummary {
  final String id;
  final String homeId;
  final DateTime periodStart;
  final DateTime periodEnd;
  final DateTime generatedAt;
  final SummaryStats summaryStats;
  final String? worstRoomId;
  final String? link;

  ReportSummary({
    required this.id,
    required this.homeId,
    required this.periodStart,
    required this.periodEnd,
    required this.generatedAt,
    required this.summaryStats,
    this.worstRoomId,
    this.link,
  });

  factory ReportSummary.fromJson(Map<String, dynamic> json) => _$ReportSummaryFromJson(json);
  Map<String, dynamic> toJson() => _$ReportSummaryToJson(this);
}
