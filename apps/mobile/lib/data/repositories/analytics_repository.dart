import '../api/api_client.dart';
import '../models/analytics.dart';
import '../models/sensor_reading.dart';
import '../models/aqi.dart';
import '../cache/cache_manager.dart';

class AnalyticsRepository {
  final ApiClient _apiClient;
  final CacheManager _cacheManager;

  AnalyticsRepository({
    required ApiClient apiClient,
    required CacheManager cacheManager,
  })  : _apiClient = apiClient,
        _cacheManager = cacheManager;

  /// Get analytics data for a home
  /// Falls back to client-side aggregation if backend endpoints are not available
  Future<AnalyticsData> getAnalytics(String homeId, TimeRange range) async {
    // Try to get from cache first (5 minute expiry)
    final cacheKey = 'analytics_${homeId}_${range.apiValue}';
    final cached = _cacheManager.get(cacheKey);
    if (cached != null) {
      try {
        return AnalyticsData.fromJson(cached);
      } catch (e) {
        // Cache deserialization failed (likely due to model changes)
        // Silently ignore and fetch fresh data from backend
        // This is acceptable as cache is just an optimization
      }
    }

    try {
      // Try backend analytics endpoint first
      final response = await _apiClient.get(
        '/analytics',
        queryParameters: {
          'homeId': homeId,
          'range': range.apiValue,
        },
      );

      final data = AnalyticsData.fromJson(response.data);

      // Cache the result
      await _cacheManager.set(cacheKey, response.data, duration: const Duration(minutes: 5));

      return data;
    } catch (e) {
      // Backend endpoint not available, fall back to client-side aggregation
      return _aggregateClientSide(homeId, range);
    }
  }

  /// Client-side aggregation from device readings
  Future<AnalyticsData> _aggregateClientSide(String homeId, TimeRange range) async {
    try {
      // Get all rooms for the home
      final homeResponse = await _apiClient.get('/homes/$homeId/rooms');
      final roomsData = homeResponse.data as Map<String, dynamic>;
      final roomsList = roomsData['rooms'] as List;

      // Collect all readings from all rooms
      final List<SensorReading> allReadings = [];
      final Map<String, String> roomNames = {};
      final Map<String, List<SensorReading>> readingsByRoom = {};

      // Build room names map and prepare futures for parallel fetching
      final List<Future<void>> readingsFutures = [];
      final rangeParam = _getRangeParam(range);

      for (final roomJson in roomsList) {
        final roomId = roomJson['id'] as String;
        final roomName = roomJson['name'] as String;
        roomNames[roomId] = roomName;

        // Get device for this room
        if (roomJson['device'] != null) {
          final deviceId = roomJson['device']['id'] as String;

          // Create future for fetching this device's readings
          final future = _apiClient.get(
            '/devices/$deviceId/readings',
            queryParameters: {'range': rangeParam},
          ).then((readingsResponse) {
            final readingsData = readingsResponse.data as Map<String, dynamic>;
            final readings = (readingsData['readings'] as List)
                .map((json) => SensorReading.fromJson(json))
                .toList();

            allReadings.addAll(readings);
            readingsByRoom[roomId] = readings;
          }).catchError((e) {
            // Device might not have readings, continue
            readingsByRoom[roomId] = [];
          });

          readingsFutures.add(future);
        }
      }

      // Fetch all device readings in parallel
      await Future.wait(readingsFutures);

      // Calculate AQI distribution
      final distribution = _calculateAQIDistribution(allReadings);

      // Calculate room comparisons
      final roomComparisons = _calculateRoomComparisons(readingsByRoom, roomNames);

      // Calculate hourly data
      final hourlyData = _calculateHourlyAQI(allReadings);

      return AnalyticsData(
        aqiDistribution: distribution,
        roomComparisons: roomComparisons,
        hourlyData: hourlyData,
      );
    } catch (e) {
      throw Exception('Failed to aggregate analytics: $e');
    }
  }

  /// Calculate AQI distribution from readings
  AQIDistribution _calculateAQIDistribution(List<SensorReading> readings) {
    final distribution = <String, int>{
      'Good': 0,
      'Moderate': 0,
      'Unhealthy for Sensitive Groups': 0,
      'Unhealthy': 0,
      'Very Unhealthy': 0,
      'Hazardous': 0,
    };

    for (final reading in readings) {
      if (reading.aqi != null) {
        final aqiInfo = calculateAQI(reading.aqi!);
        final bandName = getAQIBandName(aqiInfo.band);
        distribution[bandName] = (distribution[bandName] ?? 0) + 1;
      }
    }

    return AQIDistribution(
      distribution: distribution,
      totalReadings: readings.length,
    );
  }

  /// Calculate room AQI comparisons
  List<RoomAQIComparison> _calculateRoomComparisons(
    Map<String, List<SensorReading>> readingsByRoom,
    Map<String, String> roomNames,
  ) {
    final comparisons = <RoomAQIComparison>[];

    for (final entry in readingsByRoom.entries) {
      final roomId = entry.key;
      final readings = entry.value;

      if (readings.isEmpty) continue;

      final aqiValues = readings
          .where((r) => r.aqi != null)
          .map((r) => r.aqi!.toDouble())
          .toList();

      if (aqiValues.isEmpty) continue;

      final averageAqi = aqiValues.reduce((a, b) => a + b) / aqiValues.length;

      comparisons.add(RoomAQIComparison(
        roomId: roomId,
        roomName: roomNames[roomId] ?? 'Unknown',
        averageAqi: averageAqi,
        readingsCount: aqiValues.length,
      ));
    }

    // Sort by AQI value (worst to best)
    comparisons.sort((a, b) => b.averageAqi.compareTo(a.averageAqi));

    return comparisons;
  }

  /// Calculate hourly AQI averages
  List<HourlyAQI> _calculateHourlyAQI(List<SensorReading> readings) {
    final hourlyData = <int, List<int>>{};

    // Initialize all 24 hours
    for (int i = 0; i < 24; i++) {
      hourlyData[i] = [];
    }

    // Group readings by hour
    for (final reading in readings) {
      if (reading.aqi != null) {
        final hour = reading.timestamp.hour;
        hourlyData[hour]!.add(reading.aqi!);
      }
    }

    // Calculate averages
    final result = <HourlyAQI>[];
    for (int hour = 0; hour < 24; hour++) {
      final values = hourlyData[hour]!;
      double averageAqi = 0;

      if (values.isNotEmpty) {
        averageAqi = values.reduce((a, b) => a + b) / values.length;
      }

      result.add(HourlyAQI(
        hour: hour,
        averageAqi: averageAqi,
        readingsCount: values.length,
      ));
    }

    return result;
  }

  /// Get range parameter for API
  String _getRangeParam(TimeRange range) {
    switch (range) {
      case TimeRange.day:
        return '24h';
      case TimeRange.week:
        return '7d';
      case TimeRange.month:
        return '30d';
      case TimeRange.all:
        return 'all';
    }
  }
}
