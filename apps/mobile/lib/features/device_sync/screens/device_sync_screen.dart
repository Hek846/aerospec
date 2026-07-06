import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/ble/sync_service.dart';
import '../providers/device_sync_providers.dart';

/// Shows connection status, history sync progress and live readings for a
/// connected, claimed device.
class DeviceSyncScreen extends ConsumerStatefulWidget {
  const DeviceSyncScreen({required this.args, super.key});

  final SyncSessionArgs args;

  @override
  ConsumerState<DeviceSyncScreen> createState() => _DeviceSyncScreenState();
}

class _DeviceSyncScreenState extends ConsumerState<DeviceSyncScreen> {
  @override
  void initState() {
    super.initState();
    // Kick off the initial sync once the first frame is up.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(syncProvider(widget.args).notifier).syncNow();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(syncProvider(widget.args));
    final notifier = ref.read(syncProvider(widget.args).notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Device Sync'),
        foregroundColor: Theme.of(context).colorScheme.onSurface,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildStatusCard(context, state),
          const SizedBox(height: 16),
          if (state.phase == SyncPhase.syncing) ...[
            _buildProgressCard(context, state),
            const SizedBox(height: 16),
          ],
          _buildLiveReadingsCard(context, state),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed:
                state.phase == SyncPhase.syncing ? null : notifier.syncNow,
            icon: const Icon(Icons.sync),
            label: const Text('Sync now'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: state.phase == SyncPhase.syncing
                ? null
                : () => _showIntervalDialog(context, notifier, state),
            icon: const Icon(Icons.timer_outlined),
            label: const Text('Set interval'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () async {
              await notifier.disconnect();
              if (context.mounted) {
                Navigator.of(context).pop();
              }
            },
            icon: const Icon(Icons.bluetooth_disabled),
            label: const Text('Disconnect'),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------

  Widget _buildStatusCard(BuildContext context, SyncState state) {
    final (label, color, icon) = switch (state.phase) {
      SyncPhase.idle => ('Idle', Colors.grey, Icons.bluetooth),
      SyncPhase.scanning => (
          'Scanning...',
          const Color(0xFF26D0CE),
          Icons.bluetooth_searching
        ),
      SyncPhase.connecting => (
          'Connecting...',
          const Color(0xFF26D0CE),
          Icons.bluetooth_searching
        ),
      SyncPhase.syncing => (
          'Syncing history...',
          const Color(0xFF26D0CE),
          Icons.sync
        ),
      SyncPhase.live => (
          'Live',
          const Color(0xFF00C853),
          Icons.bluetooth_connected
        ),
      SyncPhase.error => ('Error', Colors.red, Icons.error_outline),
    };

    final info = state.deviceInfo;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: color,
                      ),
                ),
              ],
            ),
            if (state.phase == SyncPhase.error &&
                state.errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                state.errorMessage!,
                style: TextStyle(color: Colors.red.shade700, fontSize: 13),
              ),
            ],
            const SizedBox(height: 12),
            _statusRow(
              context,
              'Serial',
              widget.args.serial,
            ),
            if (info != null) ...[
              _statusRow(context, 'Firmware', info.firmwareVersion),
              _statusRow(context, 'Interval', '${info.intervalS} s'),
            ],
            _statusRow(
              context,
              'Uploaded this session',
              '${state.uploadedCount} readings',
            ),
            if (state.pendingLiveCount > 0)
              _statusRow(
                context,
                'Pending upload',
                '${state.pendingLiveCount} live samples',
              ),
          ],
        ),
      ),
    );
  }

  Widget _statusRow(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          Text(
            value,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------
  // History progress
  // ---------------------------------------------------------------------

  Widget _buildProgressCard(BuildContext context, SyncState state) {
    final progress = state.progress;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'History transfer',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: progress?.fraction,
              borderRadius: BorderRadius.circular(4),
            ),
            const SizedBox(height: 8),
            Text(
              progress != null
                  ? '${progress.linesReceived} lines'
                      ' · ${(progress.bytesReceived / 1024).toStringAsFixed(1)}'
                      '${progress.totalBytes > 0 ? ' / ${(progress.totalBytes / 1024).toStringAsFixed(1)}' : ''} KB'
                  : 'Starting...',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Live readings
  // ---------------------------------------------------------------------

  Widget _buildLiveReadingsCard(BuildContext context, SyncState state) {
    final sample = state.latestSample;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Live readings',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                if (sample?.timestamp != null)
                  Text(
                    _formatTime(sample!.timestamp!),
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
              ],
            ),
            const SizedBox(height: 16),
            if (sample == null)
              Text(
                'Waiting for the first sample...',
                style: Theme.of(context).textTheme.bodySmall,
              )
            else
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 2.2,
                children: [
                  _metricTile(
                      context, 'PM2.5', sample.pm25Corr ?? sample.pm25Env,
                      unit: 'µg/m³'),
                  _metricTile(context, 'PM10', sample.pm10Env,
                      unit: 'µg/m³'),
                  _metricTile(context, 'Temperature', sample.temperature,
                      unit: '°C'),
                  _metricTile(context, 'Humidity', sample.humidity,
                      unit: '%'),
                  _metricTile(context, 'Pressure', sample.pressure,
                      unit: 'hPa'),
                  _metricTile(context, 'Battery', sample.batteryV,
                      unit: 'V', decimals: 2),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _metricTile(
    BuildContext context,
    String label,
    double? value, {
    required String unit,
    int decimals = 1,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF2C2C2C)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 2),
          Text(
            value != null ? '${value.toStringAsFixed(decimals)} $unit' : '—',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime utc) {
    final local = utc.toLocal();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(local.hour)}:${two(local.minute)}:${two(local.second)}';
  }

  // ---------------------------------------------------------------------
  // Interval dialog
  // ---------------------------------------------------------------------

  Future<void> _showIntervalDialog(
    BuildContext context,
    SyncNotifier notifier,
    SyncState state,
  ) async {
    final controller = TextEditingController(
      text: (state.deviceInfo?.intervalS ?? 30).toString(),
    );

    final seconds = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sample interval'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Seconds (5-3600)',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final value = int.tryParse(controller.text.trim());
              if (value != null && value >= 5 && value <= 3600) {
                Navigator.of(context).pop(value);
              }
            },
            child: const Text('Set'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (seconds == null) return;
    try {
      await notifier.setInterval(seconds);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Interval set to $seconds s')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to set interval: $e')),
        );
      }
    }
  }
}
