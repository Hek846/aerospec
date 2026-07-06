import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/api/api_client.dart';
import '../../../data/ble/aerospec_ble.dart';
import '../../../data/ble/device_link_store.dart';
import '../../../data/ble/sync_service.dart';
import '../../../data/repositories/ingest_repository.dart';

/// Single BLE transport shared by the pairing and sync screens (one
/// AeroSpec connection at a time in phase 1).
final aerospecBleProvider = Provider<AerospecBle>((ref) {
  final ble = AerospecBle();
  ref.onDispose(ble.dispose);
  return ble;
});

final deviceLinkStoreProvider =
    Provider<DeviceLinkStore>((ref) => deviceLinkStore);

final ingestRepositoryProvider = Provider<IngestRepository>((ref) {
  return IngestRepository(apiClient: apiClient);
});

/// Identifies one claimed device for a sync session.
class SyncSessionArgs {
  final String serial;
  final String deviceId;

  const SyncSessionArgs({required this.serial, required this.deviceId});

  @override
  bool operator ==(Object other) =>
      other is SyncSessionArgs &&
      other.serial == serial &&
      other.deviceId == deviceId;

  @override
  int get hashCode => Object.hash(serial, deviceId);
}

/// Sync state machine for one claimed device. The BLE connection must
/// already be established (pairing screen) before this is watched.
final syncProvider = StateNotifierProvider.autoDispose
    .family<SyncNotifier, SyncState, SyncSessionArgs>((ref, args) {
  return SyncNotifier(
    ble: ref.watch(aerospecBleProvider),
    ingestRepository: ref.watch(ingestRepositoryProvider),
    linkStore: ref.watch(deviceLinkStoreProvider),
    serial: args.serial,
    deviceId: args.deviceId,
  );
});
