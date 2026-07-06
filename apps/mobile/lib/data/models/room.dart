import 'package:json_annotation/json_annotation.dart';

part 'room.g.dart';

enum RoomType {
  @JsonValue('Bedroom')
  bedroom,
  @JsonValue('LivingRoom')
  livingRoom,
  @JsonValue('Kitchen')
  kitchen,
  @JsonValue('Bathroom')
  bathroom,
  @JsonValue('Office')
  office,
  @JsonValue('Garage')
  garage,
  @JsonValue('Basement')
  basement,
  @JsonValue('Other')
  other,
}

@JsonSerializable()
class Room {
  final String id;
  final String homeId;
  final String name;
  final RoomType type;
  final String? floor;
  final String? deviceId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Room({
    required this.id,
    required this.homeId,
    required this.name,
    required this.type,
    this.floor,
    this.deviceId,
    this.createdAt,
    this.updatedAt,
  });

  factory Room.fromJson(Map<String, dynamic> json) => _$RoomFromJson(json);
  Map<String, dynamic> toJson() => _$RoomToJson(this);
}
