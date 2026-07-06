import 'package:json_annotation/json_annotation.dart';

part 'device.g.dart';

enum DeviceStatus {
  @JsonValue('online')
  online,
  @JsonValue('offline')
  offline,
  @JsonValue('error')
  error,
}

@JsonSerializable()
class Device {
  final String id;
  final String name;
  final String deploymentId;
  final String firmwareVersion;
  final DeviceStatus status;
  final DateTime? lastSeen;
  final int? wifiRssi;
  final int? batteryLevel;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Device({
    required this.id,
    required this.name,
    required this.deploymentId,
    required this.firmwareVersion,
    required this.status,
    this.lastSeen,
    this.wifiRssi,
    this.batteryLevel,
    this.createdAt,
    this.updatedAt,
  });

  factory Device.fromJson(Map<String, dynamic> json) => _$DeviceFromJson(json);
  Map<String, dynamic> toJson() => _$DeviceToJson(this);
}
