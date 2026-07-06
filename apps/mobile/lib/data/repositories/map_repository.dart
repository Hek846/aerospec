import '../api/api_client.dart';

class MapRepository {
  final ApiClient _apiClient;

  MapRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Get map tiles for visualization
  /// Note: This endpoint structure is proposed and may need adjustment
  Future<Map<String, dynamic>> getMapTiles({
    required String bounds,
    required int zoom,
  }) async {
    try {
      final response = await _apiClient.get(
        '/map/tiles',
        queryParameters: {
          'bounds': bounds,
          'zoom': zoom,
        },
      );

      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw Exception('Failed to fetch map tiles: $e');
    }
  }
}
