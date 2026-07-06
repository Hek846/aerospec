import 'package:json_annotation/json_annotation.dart';

part 'home.g.dart';

@JsonSerializable()
class Location {
  final String city;
  final String region;
  final double lat;
  final double lon;

  Location({
    required this.city,
    required this.region,
    required this.lat,
    required this.lon,
  });

  factory Location.fromJson(Map<String, dynamic> json) => _$LocationFromJson(json);
  Map<String, dynamic> toJson() => _$LocationToJson(this);
}

@JsonSerializable()
class Home {
  final String id;
  final String ownerId;
  final String name;
  final Location location;
  final String timezone;
  final String? configProfileId;
  final List<String> roomIds;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Home({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.location,
    required this.timezone,
    this.configProfileId,
    required this.roomIds,
    this.createdAt,
    this.updatedAt,
  });

  factory Home.fromJson(Map<String, dynamic> json) => _$HomeFromJson(json);
  Map<String, dynamic> toJson() => _$HomeToJson(this);
}
