import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/api/api_client.dart';
import '../../../data/cache/cache_manager.dart';
import '../../../data/repositories/analytics_repository.dart';
import '../../../data/repositories/alert_repository.dart';
import '../../../data/models/analytics.dart';
import '../../../data/models/alert.dart';
import '../../home/providers/home_providers.dart';

// Analytics repository provider
final analyticsRepositoryProvider = Provider<AnalyticsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final cacheManager = ref.watch(cacheManagerProvider);

  return AnalyticsRepository(
    apiClient: apiClient,
    cacheManager: cacheManager,
  );
});

// Time range state provider
final timeRangeProvider = StateProvider<TimeRange>((ref) => TimeRange.day);

// Analytics data provider
final analyticsDataProvider =
    FutureProvider.autoDispose<AnalyticsData>((ref) async {
  final repository = ref.watch(analyticsRepositoryProvider);
  final selectedHome = ref.watch(selectedHomeProvider);
  final timeRange = ref.watch(timeRangeProvider);

  if (selectedHome == null) {
    throw Exception('No home selected');
  }

  return repository.getAnalytics(selectedHome.id, timeRange);
});

// Recent alerts provider
final recentAlertsProvider =
    FutureProvider.autoDispose<List<AlertEvent>>((ref) async {
  final repository = ref.watch(alertRepositoryProvider);

  try {
    return await repository.getAlertEvents(
      status: 'open',
      limit: 10,
    );
  } catch (e) {
    // If API fails, return empty list
    return [];
  }
});

// Manual refresh trigger
final statsRefreshProvider = StateProvider<int>((ref) => 0);

// Refresh all stats data
extension StatsRefreshExtension on WidgetRef {
  Future<void> refreshStatsData() async {
    // Invalidate all data providers to trigger refresh
    invalidate(analyticsDataProvider);
    invalidate(recentAlertsProvider);

    // Update refresh counter
    read(statsRefreshProvider.notifier).state++;
  }
}
