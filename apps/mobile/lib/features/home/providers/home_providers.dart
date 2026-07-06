import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/home.dart';
import '../../../data/repositories/home_repository.dart';
import '../../../data/repositories/device_repository.dart';
import '../../../data/repositories/alert_repository.dart';
import '../../../data/api/api_client.dart';
import '../../../data/cache/cache_manager.dart';

// Global providers for ApiClient and CacheManager
final apiClientProvider = Provider<ApiClient>((ref) => apiClient);
final cacheManagerProvider = Provider<CacheManager>((ref) => cacheManager);

// Provider for HomeRepository
final homeRepositoryProvider = Provider<HomeRepository>((ref) {
  return HomeRepository(
    apiClient: apiClient,
    cacheManager: cacheManager,
  );
});

// Provider for DeviceRepository
final deviceRepositoryProvider = Provider<DeviceRepository>((ref) {
  return DeviceRepository(
    apiClient: apiClient,
    cacheManager: cacheManager,
  );
});

// Provider for AlertRepository
final alertRepositoryProvider = Provider<AlertRepository>((ref) {
  return AlertRepository(
    apiClient: apiClient,
  );
});

// Provider to fetch all homes
final homesProvider = FutureProvider<List<Home>>((ref) async {
  final homeRepository = ref.watch(homeRepositoryProvider);
  return await homeRepository.getHomes();
});

// Provider for selected home (defaults to first home)
final selectedHomeProvider = StateProvider<Home?>((ref) {
  final homesAsync = ref.watch(homesProvider);
  return homesAsync.when(
    data: (homes) => homes.isNotEmpty ? homes.first : null,
    loading: () => null,
    error: (_, __) => null,
  );
});

// Provider to fetch rooms with device and reading data
final roomsProvider = FutureProvider<List<RoomWithDeviceAndReading>>((ref) async {
  final selectedHome = ref.watch(selectedHomeProvider);
  if (selectedHome == null) return [];

  final homeRepository = ref.watch(homeRepositoryProvider);
  final deviceRepository = ref.watch(deviceRepositoryProvider);

  // Get basic room list
  final rooms = await homeRepository.getRooms(selectedHome.id);

  // Fetch full data for each room
  final roomsWithData = <RoomWithDeviceAndReading>[];
  for (final room in rooms) {
    if (room.deviceId != null) {
      try {
        final roomData = await deviceRepository.getRoom(room.id);
        roomsWithData.add(roomData);
      } catch (e) {
        // If fetch fails, add room without device/reading data
        roomsWithData.add(RoomWithDeviceAndReading(room: room));
      }
    } else {
      roomsWithData.add(RoomWithDeviceAndReading(room: room));
    }
  }

  return roomsWithData;
});

// Provider to fetch room details with device and latest reading
final roomDetailProvider = FutureProvider.family<RoomWithDeviceAndReading, String>((ref, roomId) async {
  final deviceRepository = ref.watch(deviceRepositoryProvider);
  return await deviceRepository.getRoom(roomId);
});

// Provider for refreshing homes and rooms
final refreshTimestampProvider = StateProvider<DateTime>((ref) => DateTime.now());

// Helper to trigger refresh
void refreshHomeData(WidgetRef ref) {
  ref.read(refreshTimestampProvider.notifier).state = DateTime.now();
  ref.invalidate(homesProvider);
  ref.invalidate(roomsProvider);
}
