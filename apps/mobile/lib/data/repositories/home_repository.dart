import '../api/api_client.dart';
import '../models/home.dart';
import '../models/room.dart';
import '../cache/cache_manager.dart';

class HomeRepository {
  final ApiClient _apiClient;
  final CacheManager _cacheManager;

  HomeRepository({
    required ApiClient apiClient,
    required CacheManager cacheManager,
  })  : _apiClient = apiClient,
        _cacheManager = cacheManager;

  /// Get all homes accessible to the authenticated user
  /// Set [forceRefresh] to true to bypass cache and fetch fresh data
  Future<List<Home>> getHomes({bool forceRefresh = false}) async {
    // Try cache first unless force refresh
    if (!forceRefresh) {
      final cachedHomes = _cacheManager.getHomes();
      if (cachedHomes != null) {
        return cachedHomes.map((json) => Home.fromJson(json)).toList();
      }
    }

    // Fetch from API
    final response = await _apiClient.get('/homes');
    final data = response.data as Map<String, dynamic>;
    final homesJson = data['homes'] as List;

    // Cache homes
    await _cacheManager.cacheHomes(
      homesJson.cast<Map<String, dynamic>>(),
    );

    return homesJson.map((json) => Home.fromJson(json)).toList();
  }

  /// Get all rooms for a specific home
  Future<List<Room>> getRooms(String homeId) async {
    final response = await _apiClient.get('/homes/$homeId/rooms');
    final data = response.data as Map<String, dynamic>;
    final roomsJson = data['rooms'] as List;

    return roomsJson.map((json) => Room.fromJson(json)).toList();
  }

  /// Create a new home (`POST /homes`, PIPELINE.md section 4).
  Future<Home> createHome({required String name}) async {
    final response = await _apiClient.post(
      '/homes',
      data: {'name': name},
    );
    final data = response.data as Map<String, dynamic>;
    // Accept both { home: {...} } and flat home object response shapes.
    final homeJson = data['home'] is Map<String, dynamic>
        ? data['home'] as Map<String, dynamic>
        : data;

    // Stale cached home lists would hide the new home.
    await _cacheManager.clearHomes();

    return Home.fromJson(homeJson);
  }
}
