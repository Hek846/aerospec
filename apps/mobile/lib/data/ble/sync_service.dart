import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../repositories/ingest_repository.dart';
import 'aerospec_ble.dart';
import 'ble_messages.dart';
import 'device_link_store.dart';

/// High-level sync lifecycle (PIPELINE.md section 6).
enum SyncPhase {
  idle,
  scanning,
  connecting,

  /// History transfer + batch upload in progress; see [SyncState.progress].
  syncing,

  /// History synced; live `$D` samples are displayed and uploaded
  /// periodically.
  live,
  error,
}

/// Immutable snapshot of the sync state machine, exposed via Riverpod.
class SyncState {
  final SyncPhase phase;

  /// History transfer progress; non-null only while [SyncPhase.syncing].
  final HistoryProgress? progress;

  /// Latest sample from the device (live push or history tail).
  final DeviceSample? latestSample;

  /// Device status from the initial `GET INFO`.
  final DeviceInfo? deviceInfo;

  /// Total readings accepted by the backend this session.
  final int uploadedCount;

  /// Live samples buffered locally, awaiting the next periodic upload.
  final int pendingLiveCount;

  final String? errorMessage;

  const SyncState({
    this.phase = SyncPhase.idle,
    this.progress,
    this.latestSample,
    this.deviceInfo,
    this.uploadedCount = 0,
    this.pendingLiveCount = 0,
    this.errorMessage,
  });

  SyncState copyWith({
    SyncPhase? phase,
    HistoryProgress? progress,
    DeviceSample? latestSample,
    DeviceInfo? deviceInfo,
    int? uploadedCount,
    int? pendingLiveCount,
    String? errorMessage,
    bool clearProgress = false,
    bool clearError = false,
  }) {
    return SyncState(
      phase: phase ?? this.phase,
      progress: clearProgress ? null : (progress ?? this.progress),
      latestSample: latestSample ?? this.latestSample,
      deviceInfo: deviceInfo ?? this.deviceInfo,
      uploadedCount: uploadedCount ?? this.uploadedCount,
      pendingLiveCount: pendingLiveCount ?? this.pendingLiveCount,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// Drives the foreground sync flow for one connected device:
///
/// `connect -> GET INFO -> (SET TIME if clock unset) -> GET HISTORY ->
/// filter > high-water mark -> batch upload -> advance mark -> live $D
/// samples uploaded every ~2 minutes`.
///
/// The BLE connection itself is established by the pairing flow; this
/// notifier takes over an already-connected [AerospecBle].
class SyncNotifier extends StateNotifier<SyncState> {
  /// How often buffered live samples are flushed to the backend.
  static const Duration liveUploadInterval = Duration(minutes: 2);

  final AerospecBle _ble;
  final IngestRepository _ingestRepository;
  final DeviceLinkStore _linkStore;

  /// Physical device serial; keys the deviceId + high-water mark storage.
  final String serial;

  /// Backend device id readings are uploaded under.
  final String deviceId;

  StreamSubscription<BleMessage>? _liveSub;
  StreamSubscription<AerospecConnectionState>? _stateSub;
  Timer? _liveUploadTimer;
  final List<DeviceSample> _liveBuffer = <DeviceSample>[];
  bool _syncRunning = false;
  bool _intentionalDisconnect = false;

  SyncNotifier({
    required AerospecBle ble,
    required IngestRepository ingestRepository,
    required DeviceLinkStore linkStore,
    required this.serial,
    required this.deviceId,
  })  : _ble = ble,
        _ingestRepository = ingestRepository,
        _linkStore = linkStore,
        super(const SyncState()) {
    _stateSub = _ble.connectionState.listen((s) {
      if (s == AerospecConnectionState.disconnected &&
          !_intentionalDisconnect &&
          mounted) {
        _stopLiveMode();
        state = state.copyWith(
          phase: SyncPhase.error,
          errorMessage: 'Device disconnected',
          clearProgress: true,
        );
      }
    });
  }

  AerospecBle get ble => _ble;

  /// Runs the full foreground sync. Safe to call again after an error or a
  /// completed run (e.g. the "Sync now" button); no-op while already running.
  Future<void> syncNow() async {
    if (_syncRunning || !_ble.isConnected) return;
    _syncRunning = true;
    _intentionalDisconnect = false;
    _stopLiveMode();

    try {
      state = state.copyWith(
        phase: SyncPhase.syncing,
        clearError: true,
        clearProgress: true,
      );

      // 1. GET INFO — device status, and clock check.
      var info = await _ble.getInfo();
      if (info.clockUnset) {
        await _ble.setTime(DateTime.now().toUtc());
        // Samples logged before the clock was set have no usable timestamp;
        // re-read info so the UI shows the corrected clock.
        info = await _ble.getInfo();
      }
      state = state.copyWith(deviceInfo: info);

      // 2. GET HISTORY — collect samples newer than the high-water mark.
      final highWater = _linkStore.getHighWaterMark(serial);
      final toUpload = <DeviceSample>[];

      await for (final event in _ble.getHistory()) {
        switch (event) {
          case HistorySampleEvent():
            final ts = event.sample.timestamp;
            if (ts != null && (highWater == null || ts.isAfter(highWater))) {
              toUpload.add(event.sample);
            }
            state = state.copyWith(progress: event.progress);
          case HistoryDoneEvent():
            state = state.copyWith(progress: event.progress);
        }
      }

      // 3. Batch upload, advancing the high-water mark per batch so an
      // interrupted upload does not resend what already made it.
      var uploaded = state.uploadedCount;
      for (var i = 0;
          i < toUpload.length;
          i += IngestRepository.maxBatchSize) {
        final end = i + IngestRepository.maxBatchSize > toUpload.length
            ? toUpload.length
            : i + IngestRepository.maxBatchSize;
        final batch = toUpload.sublist(i, end);
        final result = await _ingestRepository.uploadSamples(deviceId, batch);
        uploaded += result.inserted;

        final newestTs = batch
            .map((s) => s.timestamp!)
            .reduce((a, b) => a.isAfter(b) ? a : b);
        await _linkStore.advanceHighWaterMark(serial, newestTs);
        state = state.copyWith(uploadedCount: uploaded);
      }

      // 4. Stay subscribed to live samples.
      _startLiveMode();
      state = state.copyWith(phase: SyncPhase.live, clearProgress: true);
    } catch (e) {
      debugPrint('Sync failed: $e');
      if (mounted) {
        state = state.copyWith(
          phase: SyncPhase.error,
          errorMessage: e.toString(),
          clearProgress: true,
        );
      }
    } finally {
      _syncRunning = false;
    }
  }

  /// Changes the device sample interval (5-3600 s).
  Future<void> setInterval(int seconds) async {
    await _ble.setInterval(seconds);
    final info = state.deviceInfo;
    if (info != null) {
      state = state.copyWith(deviceInfo: info.copyWith(intervalS: seconds));
    }
  }

  /// Flushes pending live samples and cleanly disconnects.
  Future<void> disconnect() async {
    // Left set until the next syncNow() so the (async) disconnect event
    // does not flip the state to error.
    _intentionalDisconnect = true;
    _stopLiveMode();
    await _flushLiveBuffer();
    await _ble.disconnect();
    if (mounted) {
      state = state.copyWith(phase: SyncPhase.idle, clearProgress: true);
    }
  }

  // ---------------------------------------------------------------------
  // Live mode
  // ---------------------------------------------------------------------

  void _startLiveMode() {
    _liveSub = _ble.messages.listen((msg) {
      if (msg is LiveSampleMessage && msg.sample != null) {
        final sample = msg.sample!;
        if (sample.timestamp != null) {
          _liveBuffer.add(sample);
        }
        if (mounted) {
          state = state.copyWith(
            latestSample: sample,
            pendingLiveCount: _liveBuffer.length,
          );
        }
      }
    });
    _liveUploadTimer = Timer.periodic(liveUploadInterval, (_) {
      _flushLiveBuffer();
    });
  }

  void _stopLiveMode() {
    _liveSub?.cancel();
    _liveSub = null;
    _liveUploadTimer?.cancel();
    _liveUploadTimer = null;
  }

  Future<void> _flushLiveBuffer() async {
    if (_liveBuffer.isEmpty) return;
    final batch = List<DeviceSample>.from(_liveBuffer);
    _liveBuffer.clear();

    try {
      final result = await _ingestRepository.uploadSamples(deviceId, batch);
      final newestTs = batch
          .map((s) => s.timestamp!)
          .reduce((a, b) => a.isAfter(b) ? a : b);
      await _linkStore.advanceHighWaterMark(serial, newestTs);
      if (mounted) {
        state = state.copyWith(
          uploadedCount: state.uploadedCount + result.inserted,
          pendingLiveCount: _liveBuffer.length,
        );
      }
    } catch (e) {
      // Put the batch back; server-side dedupe makes a later retry safe.
      debugPrint('Live upload failed, will retry: $e');
      _liveBuffer.insertAll(0, batch);
      if (mounted) {
        state = state.copyWith(pendingLiveCount: _liveBuffer.length);
      }
    }
  }

  @override
  void dispose() {
    _stopLiveMode();
    _stateSub?.cancel();
    super.dispose();
  }
}
