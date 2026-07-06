import 'package:json_annotation/json_annotation.dart';

part 'sensor_reading.g.dart';

@JsonSerializable()
class SensorReading {
  final String deviceId;
  final DateTime timestamp;
  final double? pm25;
  final double? pm10;
  final int? co2;
  final double? temperature;
  final double? humidity;
  final double? pressure;
  final int? vocIndex;
  final double? noiseDb;
  final int? aqi;
  final List<String>? anomalyFlags;

  SensorReading({
    required this.deviceId,
    required this.timestamp,
    this.pm25,
    this.pm10,
    this.co2,
    this.temperature,
    this.humidity,
    this.pressure,
    this.vocIndex,
    this.noiseDb,
    this.aqi,
    this.anomalyFlags,
  });

  factory SensorReading.fromJson(Map<String, dynamic> json) => _$SensorReadingFromJson(json);
  Map<String, dynamic> toJson() => _$SensorReadingToJson(this);
}
