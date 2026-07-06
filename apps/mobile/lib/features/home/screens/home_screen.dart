import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/home_providers.dart';
import '../utils/greeting_utils.dart';
import '../widgets/aqi_gauge.dart';
import '../widgets/metric_card.dart';
import '../widgets/device_room_card.dart';
import '../../device_detail/screens/device_detail_screen.dart';
import '../../../data/models/device.dart';
import '../../../data/repositories/device_repository.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homesAsync = ref.watch(homesProvider);
    final selectedHome = ref.watch(selectedHomeProvider);
    final roomsAsync = ref.watch(roomsProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          refreshHomeData(ref);
          // Wait for data to refresh
          await Future.delayed(const Duration(milliseconds: 500));
        },
        child: homesAsync.when(
          data: (homes) {
            if (homes.isEmpty) {
              return _buildEmptyState(context);
            }

            return CustomScrollView(
              slivers: [
                // Header with gradient
                SliverToBoxAdapter(
                  child: _buildHeader(context, selectedHome, roomsAsync),
                ),
                // Content area
                SliverToBoxAdapter(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).scaffoldBackgroundColor,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(24),
                        topRight: Radius.circular(24),
                      ),
                    ),
                    child: Column(
                      children: [
                        const SizedBox(height: 24),
                        // Quick metrics
                        roomsAsync.when(
                          data: (rooms) {
                            if (rooms.isEmpty) {
                              return const SizedBox.shrink();
                            }
                            // Get first room with data
                            final roomData = rooms.firstWhere(
                              (r) => r.latestReading != null,
                              orElse: () => rooms.first,
                            );
                            final reading = roomData.latestReading;
                            return _buildQuickMetrics(context, reading);
                          },
                          loading: () => const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24.0),
                              child: CircularProgressIndicator(),
                            ),
                          ),
                          error: (_, __) => const SizedBox.shrink(),
                        ),
                        const SizedBox(height: 32),
                        // Device summary list
                        _buildDeviceList(context, ref, roomsAsync),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) => _buildErrorState(context, ref, error),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, selectedHome, AsyncValue roomsAsync) {
    // Calculate overall AQI from all rooms
    int? overallAqi;
    int onlineDevices = 0;
    int totalDevices = 0;

    roomsAsync.whenData((rooms) {
      totalDevices = rooms.length;
      final aqiValues = <int>[];
      for (final roomData in rooms) {
        if (roomData.device?.status == DeviceStatus.online) {
          onlineDevices++;
        }
        if (roomData.latestReading?.aqi != null) {
          aqiValues.add(roomData.latestReading!.aqi!);
        }
      }
      if (aqiValues.isNotEmpty) {
        overallAqi = (aqiValues.reduce((a, b) => a + b) / aqiValues.length).round();
      }
    });

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF1A5F5E)
                : const Color(0xFF26D0CE),
            Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF0D3635)
                : const Color(0xFF1BA8A6),
          ],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Greeting
              Text(
                getGreeting(),
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.white.withOpacity(0.9),
                      fontSize: 18,
                    ),
              ),
              const SizedBox(height: 4),
              // Home name
              Text(
                selectedHome?.name ?? 'Home',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 28,
                    ),
              ),
              const SizedBox(height: 4),
              // Status
              Text(
                totalDevices > 0
                    ? '$onlineDevices of $totalDevices devices online'
                    : 'No devices',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                    ),
              ),
              const SizedBox(height: 32),
              // AQI Gauge
              Center(
                child: AqiGauge(
                  aqiValue: overallAqi,
                  size: AqiGaugeSize.large,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickMetrics(BuildContext context, reading) {
    if (reading == null) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              'Quick Metrics',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.3,
            children: [
              if (reading.pm25 != null)
                MetricCard(
                  label: 'PM2.5',
                  value: reading.pm25!.toStringAsFixed(1),
                  unit: 'μg/m³',
                  accentColor: MetricColors.pm25,
                  statusIcon: reading.pm25! < 12 ? Icons.check_circle : Icons.warning,
                  statusColor: reading.pm25! < 12 ? const Color(0xFF00E400) : const Color(0xFFFFFF00),
                ),
              if (reading.temperature != null)
                MetricCard(
                  label: 'Temperature',
                  value: reading.temperature!.toStringAsFixed(1),
                  unit: '°C',
                  accentColor: MetricColors.temperature,
                ),
              if (reading.humidity != null)
                MetricCard(
                  label: 'Humidity',
                  value: reading.humidity!.toStringAsFixed(0),
                  unit: '%',
                  accentColor: MetricColors.humidity,
                ),
              if (reading.co2 != null)
                MetricCard(
                  label: 'CO₂',
                  value: reading.co2!.toString(),
                  unit: 'ppm',
                  accentColor: MetricColors.co2,
                  statusIcon: reading.co2! < 1000 ? Icons.check_circle : Icons.warning,
                  statusColor: reading.co2! < 1000 ? const Color(0xFF00E400) : const Color(0xFFFFFF00),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceList(BuildContext context, WidgetRef ref, AsyncValue roomsAsync) {
    return roomsAsync.when(
      data: (rooms) {
        if (rooms.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.devices_outlined,
                    size: 60,
                    color: Colors.grey.shade300,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No devices found',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.grey.shade500,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Add devices to start monitoring',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade400,
                        ),
                  ),
                ],
              ),
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  'Devices',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
              const SizedBox(height: 16),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: rooms.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final roomData = rooms[index];
                  return DeviceRoomCard(
                    roomData: roomData,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => DeviceDetailScreen(roomData: roomData),
                        ),
                      );
                    },
                  );
                },
              ),
            ],
          ),
        );
      },
      loading: () => const Padding(
        padding: EdgeInsets.all(24.0),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (error, stack) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Center(
          child: Text(
            'Error loading devices',
            style: TextStyle(color: Colors.red.shade400),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.home_outlined,
            size: 80,
            color: Colors.grey.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            'No homes found',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.grey.shade400,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Set up your home to start monitoring',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade500,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, WidgetRef ref, Object error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 80,
            color: Colors.red.shade300,
          ),
          const SizedBox(height: 16),
          Text(
            'Error loading data',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.grey.shade400,
                ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              error.toString(),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey.shade500,
                  ),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => refreshHomeData(ref),
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF26D0CE),
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
