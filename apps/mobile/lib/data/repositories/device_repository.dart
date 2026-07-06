import '../api/api_client.dart';
import '../models/room.dart';
import '../models/device.dart';
import '../models/sensor_reading.dart';
import '../cache/cache_manager.dart';

class RoomWithDeviceAndReading {
  final Room room;
  final Device? device;
  final SensorReading? latestReading;

  RoomWithDeviceAndReading({
    required this.room,
    this.device,
    this.latestReading,
  });
}

class DeviceRepository {
  final ApiClient _apiClient;
  final CacheManager _cacheManager;

  DeviceRepository({
    required ApiClient apiClient,
    required CacheManager cacheManager,
  })  : _apiClient = apiClient,
        _cacheManager = cacheManager;

  /// Get room with device and latest reading
  Future<RoomWithDeviceAndReading> getRoom(String roomId) async {
    try {
      final response = await _apiClient.get('/rooms/$roomId');
      final data = response.data as Map<String, dynamic>;

      final room = Room.fromJson(data);

      Device? device;
      if (data['device'] != null) {
        device = Device.fromJson(data['device']);
      }

      SensorReading? latestReading;
      if (data['latestReading'] != null) {
        latestReading = SensorReading.fromJson(data['latestReading']);

        // Cache latest reading
        if (device != null) {
          await _cacheManager.cacheReading(
            device.id,
            data['latestReading'],
          );
        }
      }

      return RoomWithDeviceAndReading(
        room: room,
        device: device,
        latestReading: latestReading,
      );
    } catch (e) {
      throw Exception('Failed to fetch room: $e');
    }
  }

  /// Get historical sensor readings for a device
  Future<List<SensorReading>> getDeviceReadings(
    String deviceId, {
    String range = '24h',
  }) async {
    try {
      final response = await _apiClient.get(
        '/devices/$deviceId/readings',
        queryParameters: {'range': range},
      );

      final data = response.data as Map<String, dynamic>;
      final readingsJson = data['readings'] as List;

      return readingsJson.map((json) => SensorReading.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Failed to fetch device readings: $e');
    }
  }

  /// Get cached reading for a device
  SensorReading? getCachedReading(String deviceId) {
    final cached = _cacheManager.getReading(deviceId);
    if (cached == null) return null;
    return SensorReading.fromJson(cached);
  }
}
