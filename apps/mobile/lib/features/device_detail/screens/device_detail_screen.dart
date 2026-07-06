import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../data/models/sensor_reading.dart';
import '../../../data/models/device.dart';
import '../../../data/repositories/device_repository.dart';
import '../../home/widgets/aqi_gauge.dart';
import '../../home/widgets/metric_card.dart';
import '../../home/providers/home_providers.dart';

// Provider for device readings
final deviceReadingsProvider = FutureProvider.family<List<SensorReading>, String>(
  (ref, deviceId) async {
    final repository = ref.watch(deviceRepositoryProvider);
    return await repository.getDeviceReadings(deviceId, range: '24h');
  },
);

// Provider for auto-refresh
final autoRefreshEnabledProvider = StateProvider<bool>((ref) => false);

class DeviceDetailScreen extends ConsumerStatefulWidget {
  final RoomWithDeviceAndReading roomData;

  const DeviceDetailScreen({
    super.key,
    required this.roomData,
  });

  @override
  ConsumerState<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends ConsumerState<DeviceDetailScreen> {
  bool _indicatorLightEnabled = true;
  bool _alertSoundEnabled = true;

  @override
  void initState() {
    super.initState();
    _startAutoRefresh();
  }

  @override
  void dispose() {
    ref.read(autoRefreshEnabledProvider.notifier).state = false;
    super.dispose();
  }

  void _startAutoRefresh() {
    ref.read(autoRefreshEnabledProvider.notifier).state = true;
    Future.delayed(const Duration(seconds: 30), () {
      if (mounted && ref.read(autoRefreshEnabledProvider)) {
        final deviceId = widget.roomData.room.deviceId;
        if (deviceId != null) {
          ref.invalidate(deviceReadingsProvider(deviceId));
        }
        _startAutoRefresh();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final room = widget.roomData.room;
    final device = widget.roomData.device;
    final reading = widget.roomData.latestReading;
    final deviceId = room.deviceId;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App bar with gradient
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF1A5F5E)
                : const Color(0xFF26D0CE),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
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
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 60, 16, 24),
                    child: Column(
                      children: [
                        Text(
                          room.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          device?.name ?? 'Device',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                        const SizedBox(height: 24),
                        AqiGauge(
                          aqiValue: reading?.aqi,
                          size: AqiGaugeSize.large,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Content
          SliverToBoxAdapter(
            child: Container(
              color: Theme.of(context).scaffoldBackgroundColor,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 24),
                  // Last update
                  if (reading?.timestamp != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        'Last updated: ${DateFormat('MMM d, h:mm a').format(reading!.timestamp)}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey,
                            ),
                      ),
                    ),
                  const SizedBox(height: 24),
                  // All metrics
                  _buildAllMetrics(reading),
                  const SizedBox(height: 32),
                  // Device health
                  _buildDeviceHealth(device),
                  const SizedBox(height: 32),
                  // Controls
                  _buildControls(),
                  const SizedBox(height: 32),
                  // Historical chart
                  if (deviceId != null) _buildHistoricalChart(deviceId),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAllMetrics(SensorReading? reading) {
    if (reading == null) {
      return const Padding(
        padding: EdgeInsets.all(24.0),
        child: Center(child: Text('No data available')),
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
              'Sensor Readings',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
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
                ),
              if (reading.pm10 != null)
                MetricCard(
                  label: 'PM10',
                  value: reading.pm10!.toStringAsFixed(1),
                  unit: 'μg/m³',
                  accentColor: MetricColors.pm10,
                ),
              if (reading.co2 != null)
                MetricCard(
                  label: 'CO₂',
                  value: reading.co2!.toString(),
                  unit: 'ppm',
                  accentColor: MetricColors.co2,
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
              if (reading.pressure != null)
                MetricCard(
                  label: 'Pressure',
                  value: reading.pressure!.toStringAsFixed(1),
                  unit: 'hPa',
                  accentColor: MetricColors.pressure,
                ),
              if (reading.vocIndex != null)
                MetricCard(
                  label: 'VOC Index',
                  value: reading.vocIndex!.toString(),
                  unit: '',
                  accentColor: MetricColors.voc,
                ),
              if (reading.noiseDb != null)
                MetricCard(
                  label: 'Noise',
                  value: reading.noiseDb!.toStringAsFixed(0),
                  unit: 'dB',
                  accentColor: MetricColors.noise,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceHealth(Device? device) {
    if (device == null) {
      return const SizedBox.shrink();
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              'Device Health',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                _buildHealthRow(
                  icon: Icons.wifi,
                  label: 'WiFi Signal',
                  value: device.wifiRssi != null ? '${device.wifiRssi} dBm' : 'N/A',
                  color: _getWifiColor(device.wifiRssi),
                ),
                const Divider(height: 24),
                if (device.batteryLevel != null)
                  _buildHealthRow(
                    icon: Icons.battery_std,
                    label: 'Battery',
                    value: '${device.batteryLevel}%',
                    color: _getBatteryColor(device.batteryLevel!),
                  ),
                if (device.batteryLevel != null) const Divider(height: 24),
                _buildHealthRow(
                  icon: Icons.info_outline,
                  label: 'Firmware',
                  value: device.firmwareVersion ?? 'Unknown',
                ),
                const Divider(height: 24),
                _buildHealthRow(
                  icon: device.status == DeviceStatus.online
                      ? Icons.check_circle
                      : Icons.cancel,
                  label: 'Status',
                  value: device.status.toString().split('.').last,
                  color: device.status == DeviceStatus.online
                      ? const Color(0xFF00E400)
                      : const Color(0xFF757575),
                ),
                if (device.lastSeen != null) ...[
                  const Divider(height: 24),
                  _buildHealthRow(
                    icon: Icons.access_time,
                    label: 'Last Seen',
                    value: DateFormat('MMM d, h:mm a').format(device.lastSeen!),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHealthRow({
    required IconData icon,
    required String label,
    required String value,
    Color? color,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: color ?? (isDark ? const Color(0xFFB0B0B0) : const Color(0xFF757575)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? const Color(0xFFB0B0B0) : const Color(0xFF757575),
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: color ?? (isDark ? Colors.white : const Color(0xFF212121)),
          ),
        ),
      ],
    );
  }

  Widget _buildControls() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              'Controls',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                _buildControlRow(
                  icon: Icons.lightbulb_outline,
                  label: 'Indicator Light',
                  value: _indicatorLightEnabled,
                  onChanged: (value) {
                    setState(() {
                      _indicatorLightEnabled = value;
                    });
                    // TODO: Send control command to cloud API
                  },
                ),
                const Divider(height: 24),
                _buildControlRow(
                  icon: Icons.volume_up_outlined,
                  label: 'Alert Sound',
                  value: _alertSoundEnabled,
                  onChanged: (value) {
                    setState(() {
                      _alertSoundEnabled = value;
                    });
                    // TODO: Send control command to cloud API
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlRow({
    required IconData icon,
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: isDark ? const Color(0xFFB0B0B0) : const Color(0xFF757575),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 16,
              color: isDark ? Colors.white : const Color(0xFF212121),
            ),
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeColor: const Color(0xFF26D0CE),
        ),
      ],
    );
  }

  Widget _buildHistoricalChart(String deviceId) {
    final readingsAsync = ref.watch(deviceReadingsProvider(deviceId));

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '24-Hour AQI History',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                TextButton(
                  onPressed: () {
                    // TODO: Navigate to full statistics view
                  },
                  child: const Text('See All'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            height: 200,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF2C2C2C)
                  : Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: readingsAsync.when(
              data: (readings) {
                if (readings.isEmpty) {
                  return const Center(child: Text('No historical data'));
                }
                return _buildLineChart(readings);
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const Center(child: Text('Error loading chart')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLineChart(List<SensorReading> readings) {
    // Extract AQI values with timestamps
    final spots = <FlSpot>[];
    for (int i = 0; i < readings.length; i++) {
      if (readings[i].aqi != null) {
        spots.add(FlSpot(i.toDouble(), readings[i].aqi!.toDouble()));
      }
    }

    if (spots.isEmpty) {
      return const Center(child: Text('No AQI data'));
    }

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: 50,
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: Colors.grey.withOpacity(0.2),
              strokeWidth: 1,
            );
          },
        ),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          bottomTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              getTitlesWidget: (value, meta) {
                return Text(
                  value.toInt().toString(),
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        minX: 0,
        maxX: spots.length.toDouble() - 1,
        minY: 0,
        maxY: spots.map((s) => s.y).reduce((a, b) => a > b ? a : b) + 20,
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: const Color(0xFF26D0CE),
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              color: const Color(0xFF26D0CE).withOpacity(0.1),
            ),
          ),
        ],
      ),
    );
  }

  Color _getWifiColor(int? rssi) {
    if (rssi == null) return Colors.grey;
    if (rssi > -50) return const Color(0xFF00E400);
    if (rssi > -70) return const Color(0xFFFFFF00);
    return const Color(0xFFFF0000);
  }

  Color _getBatteryColor(int level) {
    if (level > 50) return const Color(0xFF00E400);
    if (level > 20) return const Color(0xFFFFFF00);
    return const Color(0xFFFF0000);
  }
}
