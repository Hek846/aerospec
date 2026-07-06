import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

import 'ble_messages.dart';

/// Connection lifecycle as seen by the UI.
enum AerospecConnectionState {
  disconnected,
  connecting,

  /// Connected, NUS discovered and TX notifications active.
  connected,
}

/// Thrown for BLE-level failures and `$ERR` responses.
class AerospecBleException implements Exception {
  final String message;

  AerospecBleException(this.message);

  @override
  String toString() => 'AerospecBleException: $message';
}

/// Progress of a `GET HISTORY` transfer.
class HistoryProgress {
  /// Approximate payload bytes received so far (CSV lines + newlines).
  final int bytesReceived;

  /// Total log size announced by `$H,BEGIN,<bytes>` (0 if unknown).
  final int totalBytes;

  /// Number of `$H` data lines received so far.
  final int linesReceived;

  const HistoryProgress({
    required this.bytesReceived,
    required this.totalBytes,
    required this.linesReceived,
  });

  /// 0..1 completion estimate, or null when the total is unknown.
  double? get fraction => totalBytes > 0
      ? (bytesReceived / totalBytes).clamp(0.0, 1.0).toDouble()
      : null;
}

/// One event of a `GET HISTORY` transfer stream.
sealed class HistoryEvent {
  final HistoryProgress progress;

  const HistoryEvent(this.progress);
}

/// A parsed history record.
class HistorySampleEvent extends HistoryEvent {
  final DeviceSample sample;

  const HistorySampleEvent(this.sample, HistoryProgress progress)
      : super(progress);
}

/// End of the transfer (`$H,END` or `$H,ABORT`).
class HistoryDoneEvent extends HistoryEvent {
  final int lineCount;
  final bool aborted;

  const HistoryDoneEvent(
    HistoryProgress progress, {
    required this.lineCount,
    required this.aborted,
  }) : super(progress);
}

/// BLE transport for AeroSpec devices (Nordic UART Service).
///
/// Handles scanning, connection, notification chunk reassembly into
/// newline-terminated lines, and typed command/response helpers on top of
/// the line protocol described in the firmware README / PIPELINE.md.
///
/// Auto-reconnect is intentionally out of scope for phase 1; on an
/// unexpected disconnect the state stream emits
/// [AerospecConnectionState.disconnected] and the caller decides what to do.
class AerospecBle {
  static const String advertisedName = 'AeroSpec';

  static final Guid serviceUuid =
      Guid('6E400001-B5A3-F393-E0A9-E50E24DCCA9E');

  /// Phone -> device (write).
  static final Guid rxCharUuid = Guid('6E400002-B5A3-F393-E0A9-E50E24DCCA9E');

  /// Device -> phone (notify).
  static final Guid txCharUuid = Guid('6E400003-B5A3-F393-E0A9-E50E24DCCA9E');

  static const Duration _commandTimeout = Duration(seconds: 8);

  /// Max silence between history lines before the transfer is failed.
  static const Duration _historyLineTimeout = Duration(seconds: 20);

  BluetoothDevice? _device;
  BluetoothCharacteristic? _rxChar;
  BluetoothCharacteristic? _txChar;
  StreamSubscription<List<int>>? _valueSub;
  StreamSubscription<BluetoothConnectionState>? _connectionSub;

  final List<int> _rxBuffer = <int>[];

  final StreamController<String> _lineController =
      StreamController<String>.broadcast();
  final StreamController<BleMessage> _messageController =
      StreamController<BleMessage>.broadcast();
  final StreamController<AerospecConnectionState> _stateController =
      StreamController<AerospecConnectionState>.broadcast();

  AerospecConnectionState _state = AerospecConnectionState.disconnected;

  /// Serializes commands so responses can be correlated by order.
  Future<void> _commandQueue = Future<void>.value();

  /// Complete reassembled lines (without the trailing newline).
  Stream<String> get lines => _lineController.stream;

  /// Typed messages parsed from [lines].
  Stream<BleMessage> get messages => _messageController.stream;

  /// Connection lifecycle updates.
  Stream<AerospecConnectionState> get connectionState =>
      _stateController.stream;

  AerospecConnectionState get currentState => _state;

  BluetoothDevice? get device => _device;

  bool get isConnected => _state == AerospecConnectionState.connected;

  // ---------------------------------------------------------------------
  // Scanning
  // ---------------------------------------------------------------------

  /// Bluetooth adapter state (to gate scanning on "adapter on").
  static Stream<BluetoothAdapterState> get adapterState =>
      FlutterBluePlus.adapterState;

  /// Scan results filtered to devices advertising as [advertisedName].
  static Stream<List<ScanResult>> get scanResults =>
      FlutterBluePlus.scanResults.map(
        (results) => results
            .where((r) =>
                r.advertisementData.advName == advertisedName ||
                r.device.platformName == advertisedName)
            .toList(),
      );

  static Future<void> startScan({
    Duration timeout = const Duration(seconds: 10),
  }) {
    return FlutterBluePlus.startScan(
      withNames: const [advertisedName],
      timeout: timeout,
    );
  }

  static Future<void> stopScan() => FlutterBluePlus.stopScan();

  static Stream<bool> get isScanning => FlutterBluePlus.isScanning;

  // ---------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------

  /// Connects, discovers the NUS service and enables TX notifications.
  Future<void> connect(BluetoothDevice device) async {
    if (_state != AerospecConnectionState.disconnected) {
      await disconnect();
    }

    _setState(AerospecConnectionState.connecting);
    _device = device;

    try {
      await device.connect(timeout: const Duration(seconds: 15));

      final services = await device.discoverServices();
      final nusMatches = services.where((s) => s.uuid == serviceUuid);
      if (nusMatches.isEmpty) {
        throw AerospecBleException('Nordic UART Service not found');
      }
      final nus = nusMatches.first;

      final rxMatches = nus.characteristics.where((c) => c.uuid == rxCharUuid);
      final txMatches = nus.characteristics.where((c) => c.uuid == txCharUuid);
      if (rxMatches.isEmpty || txMatches.isEmpty) {
        throw AerospecBleException('NUS characteristics not found');
      }
      _rxChar = rxMatches.first;
      _txChar = txMatches.first;

      _rxBuffer.clear();
      _valueSub = _txChar!.onValueReceived.listen(_onChunk);
      device.cancelWhenDisconnected(_valueSub!);
      await _txChar!.setNotifyValue(true);

      _connectionSub = device.connectionState.listen((s) {
        if (s == BluetoothConnectionState.disconnected) {
          _cleanupAfterDisconnect();
        }
      });

      _setState(AerospecConnectionState.connected);
    } catch (e) {
      await disconnect();
      if (e is AerospecBleException) rethrow;
      throw AerospecBleException('Connection failed: $e');
    }
  }

  /// Cleanly tears down the connection.
  Future<void> disconnect() async {
    final device = _device;
    await _valueSub?.cancel();
    await _connectionSub?.cancel();
    _valueSub = null;
    _connectionSub = null;
    _rxChar = null;
    _txChar = null;
    _device = null;
    _rxBuffer.clear();

    if (device != null) {
      try {
        await device.disconnect();
      } catch (e) {
        debugPrint('BLE disconnect error (ignored): $e');
      }
    }
    _setState(AerospecConnectionState.disconnected);
  }

  /// Releases stream controllers. The instance is unusable afterwards.
  Future<void> dispose() async {
    await disconnect();
    await _lineController.close();
    await _messageController.close();
    await _stateController.close();
  }

  void _cleanupAfterDisconnect() {
    _valueSub?.cancel();
    _connectionSub?.cancel();
    _valueSub = null;
    _connectionSub = null;
    _rxChar = null;
    _txChar = null;
    _device = null;
    _rxBuffer.clear();
    _setState(AerospecConnectionState.disconnected);
  }

  void _setState(AerospecConnectionState state) {
    _state = state;
    if (!_stateController.isClosed) {
      _stateController.add(state);
    }
  }

  // ---------------------------------------------------------------------
  // Line reassembly
  // ---------------------------------------------------------------------

  /// Notifications arrive chunked (20 bytes); reassemble until `\n`.
  void _onChunk(List<int> chunk) {
    for (final byte in chunk) {
      if (byte == 0x0A) {
        final line = utf8.decode(_rxBuffer, allowMalformed: true).trim();
        _rxBuffer.clear();
        if (line.isNotEmpty) {
          _lineController.add(line);
          _messageController.add(BleMessage.parse(line));
        }
      } else {
        _rxBuffer.add(byte);
      }
    }
  }

  // ---------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------

  /// Writes [cmd] with a newline appended.
  Future<void> sendCommand(String cmd) async {
    final rx = _rxChar;
    if (rx == null || !isConnected) {
      throw AerospecBleException('Not connected');
    }
    await rx.write(
      utf8.encode('$cmd\n'),
      withoutResponse: rx.properties.writeWithoutResponse,
    );
  }

  /// Runs [action] exclusively, after all previously queued commands.
  Future<T> _enqueue<T>(Future<T> Function() action) {
    final result = _commandQueue.then((_) => action());
    // Keep the queue alive even when a command fails.
    _commandQueue = result.then((_) {}, onError: (_) {});
    return result;
  }

  /// Subscribes before sending so the response cannot be missed, then
  /// resolves with the first message matching [matches]. An `$ERR` line
  /// fails the command unless [matches] accepts it.
  Future<BleMessage> _sendAndWait(
    String cmd,
    bool Function(BleMessage m) matches, {
    Duration timeout = _commandTimeout,
  }) {
    return _enqueue(() async {
      final response = messages
          .firstWhere((m) => matches(m) || m is ErrMessage)
          .timeout(
            timeout,
            onTimeout: () =>
                throw AerospecBleException('Timeout waiting for "$cmd"'),
          );
      await sendCommand(cmd);
      final msg = await response;
      if (msg is ErrMessage && !matches(msg)) {
        throw AerospecBleException('Device error: ${msg.code}');
      }
      return msg;
    });
  }

  /// `PING` -> `$OK,PONG`.
  Future<void> ping() async {
    await _sendAndWait(
      'PING',
      (m) => m is OkMessage && m.detail.startsWith('PONG'),
    );
  }

  /// `GET INFO` -> [DeviceInfo].
  Future<DeviceInfo> getInfo() async {
    final msg = await _sendAndWait('GET INFO', (m) => m is InfoMessage);
    final info = (msg as InfoMessage).info;
    if (info == null) {
      throw AerospecBleException('Malformed GET INFO response: ${msg.raw}');
    }
    return info;
  }

  /// `GET LIVE` -> one [DeviceSample].
  Future<DeviceSample> getLive() async {
    final msg = await _sendAndWait(
      'GET LIVE',
      (m) => m is LiveSampleMessage,
      // Sampling the PM sensor can take a moment.
      timeout: const Duration(seconds: 15),
    );
    final sample = (msg as LiveSampleMessage).sample;
    if (sample == null) {
      throw AerospecBleException('Malformed GET LIVE response: ${msg.raw}');
    }
    return sample;
  }

  /// `SET TIME <unix>` -> `$OK,TIME,<unix>`.
  Future<void> setTime(DateTime time) async {
    final unix = time.toUtc().millisecondsSinceEpoch ~/ 1000;
    await _sendAndWait(
      'SET TIME $unix',
      (m) => m is OkMessage && m.detail.startsWith('TIME'),
    );
  }

  /// `SET INTERVAL <seconds>` (5-3600) -> `$OK,INTERVAL,<seconds>`.
  Future<void> setInterval(int seconds) async {
    await _sendAndWait(
      'SET INTERVAL $seconds',
      (m) => m is OkMessage && m.detail.startsWith('INTERVAL'),
    );
  }

  /// `STOP` — aborts a running history transfer (no direct response).
  Future<void> stop() => sendCommand('STOP');

  /// `GET HISTORY` — streams parsed samples with progress.
  ///
  /// The transfer occupies the command queue until `$H,END` / `$H,ABORT`
  /// (the firmware blocks sampling during the transfer anyway). Interleaved
  /// CSV header lines and corrupt records are counted but not emitted.
  Stream<HistoryEvent> getHistory() {
    final controller = StreamController<HistoryEvent>();
    var transferComplete = false;

    controller.onListen = () {
      _enqueue(() async {
        StreamSubscription<BleMessage>? sub;
        Timer? lineTimer;
        final done = Completer<void>();

        var totalBytes = 0;
        var bytesReceived = 0;
        var linesReceived = 0;

        HistoryProgress progress() => HistoryProgress(
              bytesReceived: bytesReceived,
              totalBytes: totalBytes,
              linesReceived: linesReceived,
            );

        void finish([Object? error]) {
          lineTimer?.cancel();
          sub?.cancel();
          if (!done.isCompleted) {
            transferComplete = true;
            if (error != null) {
              controller.addError(error);
            }
            controller.close();
            done.complete();
          }
        }

        void resetLineTimer() {
          lineTimer?.cancel();
          lineTimer = Timer(_historyLineTimeout, () {
            finish(AerospecBleException('History transfer stalled'));
          });
        }

        sub = messages.listen((msg) {
          switch (msg) {
            case HistoryBeginMessage():
              totalBytes = msg.totalBytes;
              resetLineTimer();
            case HistoryLineMessage():
              // Approximate log bytes as CSV payload + newline (the log
              // stores raw CSV lines without the "$H," framing).
              bytesReceived += msg.csv.length + 1;
              linesReceived += 1;
              final sample = msg.sample;
              if (sample != null) {
                controller.add(HistorySampleEvent(sample, progress()));
              }
              resetLineTimer();
            case HistoryEndMessage():
              controller.add(HistoryDoneEvent(
                progress(),
                lineCount: msg.lineCount,
                aborted: msg.aborted,
              ));
              finish();
            default:
              break;
          }
        });

        resetLineTimer();
        try {
          await sendCommand('GET HISTORY');
        } catch (e) {
          finish(e);
        }

        await done.future;
      });
    };

    controller.onCancel = () async {
      // Consumer walked away mid-transfer: tell the device to stop so it
      // resumes sampling. (onCancel also fires after a normal close, hence
      // the transferComplete guard.)
      if (!transferComplete && isConnected) {
        try {
          await stop();
        } catch (e) {
          debugPrint('BLE STOP after history cancel failed: $e');
        }
      }
    };

    return controller.stream;
  }
}
