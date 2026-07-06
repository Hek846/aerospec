import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../data/ble/aerospec_ble.dart';
import '../../../data/ble/ble_messages.dart';
import '../../home/providers/home_providers.dart';
import '../providers/device_sync_providers.dart';
import 'device_sync_screen.dart';

/// Scan for AeroSpec devices, connect, inspect (`GET INFO`) and claim the
/// device on the backend, then hand off to [DeviceSyncScreen].
class DevicePairingScreen extends ConsumerStatefulWidget {
  const DevicePairingScreen({super.key});

  @override
  ConsumerState<DevicePairingScreen> createState() =>
      _DevicePairingScreenState();
}

class _DevicePairingScreenState extends ConsumerState<DevicePairingScreen> {
  final TextEditingController _nameController =
      TextEditingController(text: 'AeroSpec Monitor');
  final TextEditingController _serialController = TextEditingController();

  BluetoothDevice? _connectedDevice;
  DeviceInfo? _deviceInfo;
  bool _connecting = false;
  bool _claiming = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startScan();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _serialController.dispose();
    AerospecBle.stopScan();
    super.dispose();
  }

  Future<bool> _requestPermissions() async {
    final permissions = Platform.isAndroid
        ? [Permission.bluetoothScan, Permission.bluetoothConnect]
        : [Permission.bluetooth];
    final statuses = await permissions.request();
    return statuses.values.every((s) => s.isGranted || s.isLimited);
  }

  Future<void> _startScan() async {
    setState(() => _error = null);
    if (!await _requestPermissions()) {
      setState(() => _error = 'Bluetooth permission is required to scan.');
      return;
    }
    try {
      await AerospecBle.startScan();
    } catch (e) {
      setState(() => _error = 'Scan failed: $e');
    }
  }

  Future<void> _connect(BluetoothDevice device) async {
    final ble = ref.read(aerospecBleProvider);
    setState(() {
      _connecting = true;
      _error = null;
    });
    try {
      await AerospecBle.stopScan();
      await ble.connect(device);
      final info = await ble.getInfo();

      // Prefill the serial if this peripheral was paired before.
      final knownSerial = ref
          .read(deviceLinkStoreProvider)
          .getSerialForRemoteId(device.remoteId.str);
      if (knownSerial != null && _serialController.text.isEmpty) {
        _serialController.text = knownSerial;
      }

      if (mounted) {
        setState(() {
          _connectedDevice = device;
          _deviceInfo = info;
        });
      }
    } catch (e) {
      await ble.disconnect();
      if (mounted) {
        setState(() => _error = 'Connection failed: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _connecting = false);
      }
    }
  }

  Future<void> _claim() async {
    final device = _connectedDevice;
    if (device == null) return;

    final serial = _serialController.text.trim();
    final name = _nameController.text.trim();
    if (serial.isEmpty || name.isEmpty) {
      setState(() => _error = 'Enter the device serial and a name.');
      return;
    }

    setState(() {
      _claiming = true;
      _error = null;
    });

    try {
      final homeRepository = ref.read(homeRepositoryProvider);
      final deviceRepository = ref.read(deviceRepositoryProvider);
      final linkStore = ref.read(deviceLinkStoreProvider);

      // Use the user's first home; create a default one when none exists.
      final homes = await homeRepository.getHomes();
      final homeId = homes.isNotEmpty
          ? homes.first.id
          : (await homeRepository.createHome(name: 'My Home')).id;

      final deviceId = await deviceRepository.claimDevice(
        serial: serial,
        name: name,
        homeId: homeId,
      );

      await linkStore.setDeviceId(serial, deviceId);
      await linkStore.setSerialForRemoteId(device.remoteId.str, serial);

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => DeviceSyncScreen(
              args: SyncSessionArgs(serial: serial, deviceId: deviceId),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _claiming = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Connect Device'),
        foregroundColor: Theme.of(context).colorScheme.onSurface,
      ),
      body: _connectedDevice == null ? _buildScanView() : _buildClaimView(),
    );
  }

  // ---------------------------------------------------------------------
  // Scan list
  // ---------------------------------------------------------------------

  Widget _buildScanView() {
    return Column(
      children: [
        if (_error != null) _buildErrorBanner(),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Nearby AeroSpec devices',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
              StreamBuilder<bool>(
                stream: AerospecBle.isScanning,
                initialData: false,
                builder: (context, snapshot) {
                  final scanning = snapshot.data ?? false;
                  if (scanning) {
                    return const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    );
                  }
                  return TextButton.icon(
                    onPressed: _startScan,
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Rescan'),
                  );
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: StreamBuilder<List<ScanResult>>(
            stream: AerospecBle.scanResults,
            initialData: const [],
            builder: (context, snapshot) {
              final results = snapshot.data ?? [];
              if (results.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.bluetooth_searching,
                        size: 60,
                        color: Colors.grey.shade300,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Searching for devices...',
                        style:
                            Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: Colors.grey,
                                ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Make sure your AeroSpec is powered on and nearby',
                        style: Theme.of(context).textTheme.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: results.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final result = results[index];
                  return Card(
                    child: ListTile(
                      leading: const Icon(
                        Icons.sensors,
                        color: Color(0xFF26D0CE),
                      ),
                      title: Text(
                        result.advertisementData.advName.isNotEmpty
                            ? result.advertisementData.advName
                            : result.device.platformName,
                      ),
                      subtitle: Text('RSSI ${result.rssi} dBm'),
                      trailing: _connecting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.chevron_right),
                      onTap: _connecting ? null : () => _connect(result.device),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------
  // Claim form (after connect + GET INFO)
  // ---------------------------------------------------------------------

  Widget _buildClaimView() {
    final info = _deviceInfo;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_error != null) _buildErrorBanner(),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.sensors, color: Color(0xFF26D0CE)),
                    const SizedBox(width: 8),
                    Text(
                      'Device connected',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (info != null) ...[
                  _infoRow('Firmware', info.firmwareVersion),
                  _infoRow(
                    'Battery',
                    info.batteryV != null
                        ? '${info.batteryV!.toStringAsFixed(2)} V'
                        : 'Unknown',
                  ),
                  _infoRow('Sample interval', '${info.intervalS} s'),
                  _infoRow(
                    'Log size',
                    '${(info.logBytes / 1024).toStringAsFixed(1)} KB',
                  ),
                  _infoRow(
                    'Clock',
                    info.clockUnset ? 'Not set (will sync)' : 'Set',
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Claim this device',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _serialController,
          decoration: const InputDecoration(
            labelText: 'Serial number',
            hintText: 'Printed on the device',
          ),
          textCapitalization: TextCapitalization.characters,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _nameController,
          decoration: const InputDecoration(
            labelText: 'Device name',
            hintText: 'e.g. Living Room Monitor',
          ),
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _claiming ? null : _claim,
          child: _claiming
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Text('Claim device'),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _claiming
              ? null
              : () async {
                  await ref.read(aerospecBleProvider).disconnect();
                  if (mounted) {
                    setState(() {
                      _connectedDevice = null;
                      _deviceInfo = null;
                    });
                    await _startScan();
                  }
                },
          child: const Text('Disconnect'),
        ),
      ],
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _error ?? '',
        style: TextStyle(color: Colors.red.shade700),
      ),
    );
  }
}
