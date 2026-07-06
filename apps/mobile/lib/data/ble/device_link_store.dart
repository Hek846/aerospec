import 'package:shared_preferences/shared_preferences.dart';

/// Persists the link between a physical AeroSpec unit (identified by its
/// serial) and the backend, in SharedPreferences:
///
/// - serial -> backend device id (from `POST /devices/claim`), so sync knows
///   which deviceId to upload under;
/// - serial -> sync high-water mark (newest uploaded sample timestamp), so
///   history re-uploads are bounded. Server-side dedupe makes overlap safe.
class DeviceLinkStore {
  static const String _deviceIdPrefix = 'ble_device_id_';
  static const String _highWaterPrefix = 'ble_high_water_';
  static const String _serialPrefix = 'ble_serial_';

  final SharedPreferences _prefs;

  DeviceLinkStore(this._prefs);

  /// Backend device id for [serial], or null when the unit is unclaimed.
  String? getDeviceId(String serial) {
    return _prefs.getString(_deviceIdPrefix + serial);
  }

  Future<void> setDeviceId(String serial, String deviceId) async {
    await _prefs.setString(_deviceIdPrefix + serial, deviceId);
  }

  /// Newest sample timestamp (UTC) already uploaded for [serial].
  DateTime? getHighWaterMark(String serial) {
    final millis = _prefs.getInt(_highWaterPrefix + serial);
    if (millis == null) return null;
    return DateTime.fromMillisecondsSinceEpoch(millis, isUtc: true);
  }

  /// Advances the high-water mark; never moves it backwards.
  Future<void> advanceHighWaterMark(String serial, DateTime timestamp) async {
    final current = getHighWaterMark(serial);
    final ts = timestamp.toUtc();
    if (current == null || ts.isAfter(current)) {
      await _prefs.setInt(_highWaterPrefix + serial, ts.millisecondsSinceEpoch);
    }
  }

  /// Remembers which serial a BLE peripheral ([remoteId]) belongs to, so
  /// re-pairing does not require re-entering the serial.
  String? getSerialForRemoteId(String remoteId) {
    return _prefs.getString(_serialPrefix + remoteId);
  }

  Future<void> setSerialForRemoteId(String remoteId, String serial) async {
    await _prefs.setString(_serialPrefix + remoteId, serial);
  }

  Future<void> clear(String serial) async {
    await _prefs.remove(_deviceIdPrefix + serial);
    await _prefs.remove(_highWaterPrefix + serial);
  }
}

// Singleton instance (same pattern as CacheManager)
DeviceLinkStore? _instance;

DeviceLinkStore get deviceLinkStore {
  if (_instance == null) {
    throw StateError(
      'DeviceLinkStore not initialized. Call initDeviceLinkStore() first.',
    );
  }
  return _instance!;
}

Future<DeviceLinkStore> initDeviceLinkStore() async {
  final prefs = await SharedPreferences.getInstance();
  _instance = DeviceLinkStore(prefs);
  return _instance!;
}
