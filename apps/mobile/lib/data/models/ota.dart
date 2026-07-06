import 'package:json_annotation/json_annotation.dart';

part 'ota.g.dart';

enum OTAJobStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('in_progress')
  inProgress,
  @JsonValue('completed')
  completed,
  @JsonValue('failed')
  failed,
}

@JsonSerializable()
class OTAJob {
  final String id;
  final String firmwareVersion;
  final List<String> deviceIds;
  final OTAJobStatus status;
  final DateTime createdAt;
  final DateTime? completedAt;

  OTAJob({
    required this.id,
    required this.firmwareVersion,
    required this.deviceIds,
    required this.status,
    required this.createdAt,
    this.completedAt,
  });

  factory OTAJob.fromJson(Map<String, dynamic> json) => _$OTAJobFromJson(json);
  Map<String, dynamic> toJson() => _$OTAJobToJson(this);
}

@JsonSerializable()
class DeviceOTAStatus {
  final String deviceId;
  final String jobId;
  final OTAJobStatus status;
  final int? progress;
  final String? error;
  final DateTime? updatedAt;

  DeviceOTAStatus({
    required this.deviceId,
    required this.jobId,
    required this.status,
    this.progress,
    this.error,
    this.updatedAt,
  });

  factory DeviceOTAStatus.fromJson(Map<String, dynamic> json) => _$DeviceOTAStatusFromJson(json);
  Map<String, dynamic> toJson() => _$DeviceOTAStatusToJson(this);
}
