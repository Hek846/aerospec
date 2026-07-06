import 'package:json_annotation/json_annotation.dart';

part 'alert.g.dart';

@JsonSerializable()
class QuietHours {
  final String start;
  final String end;

  QuietHours({
    required this.start,
    required this.end,
  });

  factory QuietHours.fromJson(Map<String, dynamic> json) => _$QuietHoursFromJson(json);
  Map<String, dynamic> toJson() => _$QuietHoursToJson(this);
}

@JsonSerializable()
class AlertRule {
  final String id;
  final String homeId;
  final String? deviceId;
  final String metric;
  final String thresholdType;
  final double thresholdValue;
  final bool enabled;
  final String? notifyEmail;
  final QuietHours? quietHours;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  AlertRule({
    required this.id,
    required this.homeId,
    this.deviceId,
    required this.metric,
    required this.thresholdType,
    required this.thresholdValue,
    required this.enabled,
    this.notifyEmail,
    this.quietHours,
    this.createdAt,
    this.updatedAt,
  });

  factory AlertRule.fromJson(Map<String, dynamic> json) => _$AlertRuleFromJson(json);
  Map<String, dynamic> toJson() => _$AlertRuleToJson(this);
}

enum AlertEventStatus {
  @JsonValue('open')
  open,
  @JsonValue('acknowledged')
  acknowledged,
  @JsonValue('closed')
  closed,
}

@JsonSerializable()
class AlertEvent {
  final String id;
  final String ruleId;
  final String deviceId;
  final DateTime timestamp;
  final String metric;
  final double value;
  final AlertEventStatus status;
  final DateTime? acknowledgedAt;
  final DateTime? closedAt;

  AlertEvent({
    required this.id,
    required this.ruleId,
    required this.deviceId,
    required this.timestamp,
    required this.metric,
    required this.value,
    required this.status,
    this.acknowledgedAt,
    this.closedAt,
  });

  factory AlertEvent.fromJson(Map<String, dynamic> json) => _$AlertEventFromJson(json);
  Map<String, dynamic> toJson() => _$AlertEventToJson(this);
}
