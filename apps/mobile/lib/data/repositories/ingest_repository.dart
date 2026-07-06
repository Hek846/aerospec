import '../api/api_client.dart';
import '../ble/ble_messages.dart';

/// Result of one `POST /ingest/readings` call.
class IngestResult {
  final int inserted;
  final int duplicates;

  const IngestResult({required this.inserted, required this.duplicates});

  IngestResult operator +(IngestResult other) => IngestResult(
        inserted: inserted + other.inserted,
        duplicates: duplicates + other.duplicates,
      );
}

/// Uploads BLE-sourced sensor readings on behalf of a claimed device
/// (PIPELINE.md section 2).
class IngestRepository {
  /// Server-side limit per request.
  static const int maxBatchSize = 500;

  final ApiClient _apiClient;

  IngestRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Uploads [samples] for [deviceId], splitting into batches of at most
  /// [maxBatchSize]. Samples without a timestamp are skipped. Throws on the
  /// first failed batch; already-uploaded batches are deduped server-side
  /// when retried.
  Future<IngestResult> uploadSamples(
    String deviceId,
    List<DeviceSample> samples,
  ) async {
    final valid = samples.where((s) => s.timestamp != null).toList();
    var result = const IngestResult(inserted: 0, duplicates: 0);

    for (var i = 0; i < valid.length; i += maxBatchSize) {
      final batch = valid.sublist(
        i,
        i + maxBatchSize > valid.length ? valid.length : i + maxBatchSize,
      );
      final response = await _apiClient.post(
        '/ingest/readings',
        data: {
          'deviceId': deviceId,
          'source': 'ble',
          'readings': batch.map((s) => s.toIngestJson()).toList(),
        },
      );
      final data = response.data as Map<String, dynamic>;
      result = result +
          IngestResult(
            inserted: (data['inserted'] as num?)?.toInt() ?? 0,
            duplicates: (data['duplicates'] as num?)?.toInt() ?? 0,
          );
    }

    return result;
  }
}
