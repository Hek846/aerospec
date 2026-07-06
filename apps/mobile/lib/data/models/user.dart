import 'package:json_annotation/json_annotation.dart';

part 'user.g.dart';

enum UserRole {
  @JsonValue('owner')
  owner,
  @JsonValue('member')
  member,
  @JsonValue('admin')
  admin,
}

@JsonSerializable()
class User {
  final String id;
  final String name;
  final String email;
  final UserRole role;
  final List<String> homes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.homes,
    this.createdAt,
    this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);
}
