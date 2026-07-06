/// Typed representations of the AeroSpec BLE line protocol.
///
/// The firmware speaks newline-terminated ASCII lines over the Nordic UART
/// Service (see `docs/PIPELINE.md` section 1 and the firmware README).
/// This file turns raw lines into typed messages; the transport lives in
/// `aerospec_ble.dart`.
library;

/// One 19-column CSV sensor record.
///
/// Produced by `$D,<csv>` live pushes, `GET LIVE` responses and
/// `$H,<csv>` history lines. Column order (firmware README):
///
/// ```
/// Date, Time, Battery, Temp_C, RH_pct, Press_hPa,
/// Dp>0.3, Dp>0.5, Dp>1.0, Dp>2.5, Dp>5.0, Dp>10.0,
/// PM1_Std, PM2.5_Std, PM10_Std, PM1_Env, PM2.5_Env, PM10_Env, PM2.5_Corr
/// ```
///
/// `NA` fields become null. Date + Time (both UTC) are combined into a
/// single UTC [timestamp]; it is null when either is missing.
class DeviceSample {
  /// UTC timestamp; null when the device clock was unset for this record.
  final DateTime? timestamp;
  final double? batteryV;
  final double? temperature;
  final double? humidity;
  final double? pressure;

  /// Particle counts per 0.1 L for Dp>0.3 ... Dp>10.0 (always 6 entries,
  /// individual entries null when the sensor reported `NA`).
  final List<int?> bins;

  final double? pm1Std;
  final double? pm25Std;
  final double? pm10Std;
  final double? pm1Env;
  final double? pm25Env;
  final double? pm10Env;

  /// US EPA humidity-corrected PM2.5 — preferred value for AQI.
  final double? pm25Corr;

  const DeviceSample({
    required this.bins,
    this.timestamp,
    this.batteryV,
    this.temperature,
    this.humidity,
    this.pressure,
    this.pm1Std,
    this.pm25Std,
    this.pm10Std,
    this.pm1Env,
    this.pm25Env,
    this.pm10Env,
    this.pm25Corr,
  });

  static const int columnCount = 19;

  /// Parses a raw 19-column CSV record.
  ///
  /// Returns null for malformed input, including the CSV header lines that
  /// the firmware interleaves in the flash log (`Date, Time, Battery, ...`).
  static DeviceSample? tryParseCsv(String csv) {
    final parts = csv.split(',').map((p) => p.trim()).toList();
    if (parts.length != columnCount) return null;

    // Every column after Date/Time must be numeric or NA; anything else
    // (e.g. the literal header row) is not a data record.
    for (var i = 2; i < columnCount; i++) {
      if (parts[i] != 'NA' && double.tryParse(parts[i]) == null) {
        return null;
      }
    }

    double? d(int i) => parts[i] == 'NA' ? null : double.tryParse(parts[i]);
    int? n(int i) {
      if (parts[i] == 'NA') return null;
      return int.tryParse(parts[i]) ?? double.tryParse(parts[i])?.round();
    }

    return DeviceSample(
      timestamp: _parseUtcTimestamp(parts[0], parts[1]),
      batteryV: d(2),
      temperature: d(3),
      humidity: d(4),
      pressure: d(5),
      bins: [n(6), n(7), n(8), n(9), n(10), n(11)],
      pm1Std: d(12),
      pm25Std: d(13),
      pm10Std: d(14),
      pm1Env: d(15),
      pm25Env: d(16),
      pm10Env: d(17),
      pm25Corr: d(18),
    );
  }

  static DateTime? _parseUtcTimestamp(String date, String time) {
    if (date == 'NA' || time == 'NA') return null;
    return DateTime.tryParse('${date}T${time}Z')?.toUtc();
  }

  /// Payload shape for `POST /ingest/readings` (PIPELINE.md section 2).
  ///
  /// Callers must not upload samples without a timestamp.
  Map<String, dynamic> toIngestJson() {
    final ts = timestamp;
    if (ts == null) {
      throw StateError('Cannot upload a sample without a timestamp');
    }
    // The contract specifies bins as an array of 6 ints (or null); a
    // partially missing bin set is sent as null.
    final completeBins = bins.length == 6 && !bins.contains(null)
        ? bins.whereType<int>().toList()
        : null;
    return {
      'ts': ts.toUtc().toIso8601String(),
      'batteryV': batteryV,
      'temperature': temperature,
      'humidity': humidity,
      'pressure': pressure,
      'bins': completeBins,
      'pm1Std': pm1Std,
      'pm25Std': pm25Std,
      'pm10Std': pm10Std,
      'pm1Env': pm1Env,
      'pm25Env': pm25Env,
      'pm10Env': pm10Env,
      'pm25Corr': pm25Corr,
    };
  }
}

/// Response to `GET INFO`: `$I,<fw>,<battery V>,<interval s>,<unix>,<log bytes>`.
class DeviceInfo {
  final String firmwareVersion;
  final double? batteryV;
  final int intervalS;

  /// Device clock as unix epoch seconds; 0 when the clock was never set.
  final int unixTime;
  final int logBytes;

  const DeviceInfo({
    required this.firmwareVersion,
    required this.intervalS,
    required this.unixTime,
    required this.logBytes,
    this.batteryV,
  });

  bool get clockUnset => unixTime == 0;

  DeviceInfo copyWith({int? intervalS}) {
    return DeviceInfo(
      firmwareVersion: firmwareVersion,
      intervalS: intervalS ?? this.intervalS,
      unixTime: unixTime,
      logBytes: logBytes,
      batteryV: batteryV,
    );
  }

  /// Parses the payload after `$I,` — returns null on malformed input.
  static DeviceInfo? tryParse(String payload) {
    final parts = payload.split(',').map((p) => p.trim()).toList();
    if (parts.length < 5) return null;
    final interval = int.tryParse(parts[2]);
    final unixTime = int.tryParse(parts[3]);
    final logBytes = int.tryParse(parts[4]);
    if (interval == null || unixTime == null || logBytes == null) return null;
    return DeviceInfo(
      firmwareVersion: parts[0],
      batteryV: parts[1] == 'NA' ? null : double.tryParse(parts[1]),
      intervalS: interval,
      unixTime: unixTime,
      logBytes: logBytes,
    );
  }
}

/// A parsed line from the device. Use [BleMessage.parse] on complete
/// (reassembled, newline-stripped) lines.
sealed class BleMessage {
  /// The raw line as received.
  final String raw;

  const BleMessage(this.raw);

  static BleMessage parse(String line) {
    if (line.startsWith(r'$D,')) {
      return LiveSampleMessage(line, DeviceSample.tryParseCsv(line.substring(3)));
    }
    if (line.startsWith(r'$I,')) {
      return InfoMessage(line, DeviceInfo.tryParse(line.substring(3)));
    }
    if (line.startsWith(r'$H,')) {
      final payload = line.substring(3);
      if (payload.startsWith('BEGIN')) {
        final parts = payload.split(',');
        final totalBytes = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
        return HistoryBeginMessage(line, totalBytes);
      }
      if (payload.startsWith('END') || payload.startsWith('ABORT')) {
        final parts = payload.split(',');
        final count = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
        return HistoryEndMessage(line, count, aborted: payload.startsWith('ABORT'));
      }
      return HistoryLineMessage(line, payload, DeviceSample.tryParseCsv(payload));
    }
    if (line.startsWith(r'$OK')) {
      return OkMessage(line, line.length > 4 ? line.substring(4) : '');
    }
    if (line.startsWith(r'$ERR')) {
      return ErrMessage(line, line.length > 5 ? line.substring(5) : '');
    }
    if (line.startsWith(r'$EVT')) {
      return EventMessage(line, line.length > 5 ? line.substring(5) : '');
    }
    return UnknownMessage(line);
  }
}

/// `$D,<csv>` — live sample push (or `GET LIVE` response).
class LiveSampleMessage extends BleMessage {
  /// Null when the CSV payload failed to parse.
  final DeviceSample? sample;

  const LiveSampleMessage(super.raw, this.sample);
}

/// `$I,...` — `GET INFO` response.
class InfoMessage extends BleMessage {
  /// Null when the payload failed to parse.
  final DeviceInfo? info;

  const InfoMessage(super.raw, this.info);
}

/// `$H,BEGIN,<total log size in bytes>` — history transfer starting.
class HistoryBeginMessage extends BleMessage {
  final int totalBytes;

  const HistoryBeginMessage(super.raw, this.totalBytes);
}

/// `$H,<csv line>` — one history record (oldest first).
class HistoryLineMessage extends BleMessage {
  final String csv;

  /// Null for interleaved header lines or corrupted records.
  final DeviceSample? sample;

  const HistoryLineMessage(super.raw, this.csv, this.sample);
}

/// `$H,END,<lines>` (or `$H,ABORT,<lines>` after a `STOP`).
class HistoryEndMessage extends BleMessage {
  final int lineCount;
  final bool aborted;

  const HistoryEndMessage(super.raw, this.lineCount, {required this.aborted});
}

/// `$OK,<detail>` — command acknowledgement (e.g. `PONG`, `TIME,<unix>`).
class OkMessage extends BleMessage {
  final String detail;

  const OkMessage(super.raw, this.detail);
}

/// `$ERR,<detail>` — command error or unsolicited fault
/// (e.g. `INTERVAL_RANGE`, `BATTERY_LOW,SLEEPING`).
class ErrMessage extends BleMessage {
  final String detail;

  const ErrMessage(super.raw, this.detail);

  /// First segment of the detail, e.g. `INTERVAL_RANGE` or `BATTERY_LOW`.
  String get code => detail.split(',').first;
}

/// `$EVT,<detail>` — unsolicited event (`BURST,ON/OFF`, `TIMESYNC,OK/FAILED`).
class EventMessage extends BleMessage {
  final String detail;

  const EventMessage(super.raw, this.detail);
}

/// Any line that does not match a known message type.
class UnknownMessage extends BleMessage {
  const UnknownMessage(super.raw);
}
