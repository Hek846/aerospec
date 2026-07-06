import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CacheManager {
  static const String _readingsPrefix = 'readings_';
  static const String _userPrefix = 'user_';
  static const String _homesPrefix = 'homes_';
  static const String _timestampSuffix = '_timestamp';

  // Cache expiry durations
  static const Duration readingsExpiry = Duration(minutes: 5);
  static const Duration userExpiry = Duration(hours: 1);
  static const Duration homesExpiry = Duration(hours: 1);

  final SharedPreferences _prefs;

  CacheManager(this._prefs);

  // Generic cache operations
  Future<void> set(String key, String value) async {
    await _prefs.setString(key, value);
    await _prefs.setInt(
      key + _timestampSuffix,
      DateTime.now().millisecondsSinceEpoch,
    );
  }

  String? get(String key) {
    return _prefs.getString(key);
  }

  Future<void> clear(String key) async {
    await _prefs.remove(key);
    await _prefs.remove(key + _timestampSuffix);
  }

  bool isExpired(String key, Duration expiry) {
    final timestamp = _prefs.getInt(key + _timestampSuffix);
    if (timestamp == null) return true;

    final cacheTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
    final now = DateTime.now();
    return now.difference(cacheTime) > expiry;
  }

  // Readings cache
  Future<void> cacheReading(String deviceId, Map<String, dynamic> reading) async {
    final key = _readingsPrefix + deviceId;
    await set(key, jsonEncode(reading));
  }

  Map<String, dynamic>? getReading(String deviceId) {
    final key = _readingsPrefix + deviceId;
    final cached = get(key);
    if (cached == null) return null;
    return jsonDecode(cached) as Map<String, dynamic>;
  }

  Future<void> clearReading(String deviceId) async {
    final key = _readingsPrefix + deviceId;
    await clear(key);
  }

  // User cache
  Future<void> cacheUser(Map<String, dynamic> user) async {
    await set(_userPrefix + 'current', jsonEncode(user));
  }

  Map<String, dynamic>? getUser() {
    final cached = get(_userPrefix + 'current');
    if (cached == null) return null;

    // Check if expired
    if (isExpired(_userPrefix + 'current', userExpiry)) {
      return null;
    }

    return jsonDecode(cached) as Map<String, dynamic>;
  }

  Future<void> clearUser() async {
    await clear(_userPrefix + 'current');
  }

  // Homes cache
  Future<void> cacheHomes(List<Map<String, dynamic>> homes) async {
    await set(_homesPrefix + 'list', jsonEncode(homes));
  }

  List<Map<String, dynamic>>? getHomes() {
    final cached = get(_homesPrefix + 'list');
    if (cached == null) return null;

    // Check if expired
    if (isExpired(_homesPrefix + 'list', homesExpiry)) {
      return null;
    }

    final decoded = jsonDecode(cached) as List;
    return decoded.cast<Map<String, dynamic>>();
  }

  Future<void> clearHomes() async {
    await clear(_homesPrefix + 'list');
  }

  // Clear all cache
  Future<void> clearAll() async {
    await _prefs.clear();
  }
}

// Singleton instance
CacheManager? _instance;

CacheManager get cacheManager {
  if (_instance == null) {
    throw StateError(
      'CacheManager not initialized. Call initCacheManager() first.',
    );
  }
  return _instance!;
}

Future<CacheManager> initCacheManager() async {
  final prefs = await SharedPreferences.getInstance();
  _instance = CacheManager(prefs);
  return _instance!;
}

// For backwards compatibility
Future<CacheManager> getCacheManager() async {
  if (_instance != null) return _instance!;
  return initCacheManager();
}
