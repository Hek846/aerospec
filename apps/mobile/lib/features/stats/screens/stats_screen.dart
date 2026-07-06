import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/stats_providers.dart';
import '../widgets/time_range_selector.dart';
import '../widgets/aqi_donut_chart.dart';
import '../widgets/room_comparison_cards.dart';
import '../widgets/aqi_horizontal_bar_chart.dart';
import '../widgets/aqi_hourly_bar_chart.dart';
import '../widgets/recent_alerts_list.dart';
import '../../../data/models/analytics.dart';
import '../../../data/models/alert.dart';

class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timeRange = ref.watch(timeRangeProvider);
    final analyticsAsync = ref.watch(analyticsDataProvider);
    final alertsAsync = ref.watch(recentAlertsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics'),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          // Invalidate providers to trigger refresh
          ref.invalidate(analyticsDataProvider);
          ref.invalidate(recentAlertsProvider);

          // Wait for the data to refresh
          await Future.wait([
            ref.read(analyticsDataProvider.future),
            ref.read(recentAlertsProvider.future),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Time range selector
              Padding(
                padding: const EdgeInsets.all(16),
                child: TimeRangeSelector(
                  selectedRange: timeRange,
                  onRangeChanged: (range) {
                    ref.read(timeRangeProvider.notifier).state = range;
                  },
                ),
              ),

              // Analytics content
              analyticsAsync.when(
                data: (analytics) => _buildAnalyticsContent(
                  context,
                  analytics,
                  alertsAsync,
                ),
                loading: () => _buildLoadingState(),
                error: (error, stack) => _buildErrorState(context, error),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAnalyticsContent(
    BuildContext context,
    AnalyticsData analytics,
    AsyncValue<List<AlertEvent>> alertsAsync,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // AQI Distribution Donut Chart
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: AQIDonutChart(distribution: analytics.aqiDistribution),
        ),
        const SizedBox(height: 16),

        // Room Comparison Cards
        RoomComparisonCards(
          roomComparisons: analytics.roomComparisons,
          onRoomTap: (roomId) {
            // TODO: Navigate to room detail or filter stats by room
          },
        ),
        const SizedBox(height: 16),

        // Average AQI by Locations (Horizontal Bar Chart)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: AQIHorizontalBarChart(
            roomComparisons: analytics.roomComparisons,
          ),
        ),
        const SizedBox(height: 16),

        // Average AQI by Hours (Vertical Bar Chart)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: AQIHourlyBarChart(hourlyData: analytics.hourlyData),
        ),
        const SizedBox(height: 16),

        // Recent Alerts
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: alertsAsync.when(
            data: (alerts) => RecentAlertsList(
              alerts: alerts,
              onAlertTap: (alert) {
                // TODO: Navigate to alert detail
              },
              onSeeAll: () {
                // TODO: Navigate to all alerts view
              },
            ),
            loading: () => const Card(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
            error: (_, __) => const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('Failed to load alerts'),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildLoadingState() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            'Loading statistics...',
            style: TextStyle(color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, Object error) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to load statistics',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Colors.grey.shade600,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            error.toString(),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey.shade500,
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
