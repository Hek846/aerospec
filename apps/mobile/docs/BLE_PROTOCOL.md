# Sensair Mobile App - Bluetooth Low Energy (BLE) Protocol

Version: 0.1
Target: IoT Air Quality Sensor Devices

This document specifies the BLE protocol for discovering, pairing, configuring, and controlling Sensair air quality devices.

---

## Overview

The Sensair BLE protocol is based on **GATT (Generic Attribute Profile)** and follows common IoT device provisioning patterns similar to ESP32 WiFi provisioning.

**Key Features**:
- Device discovery and identification
- Secure pairing and authentication
- WiFi credential provisioning
- Real-time sensor data streaming (when nearby)
- Device control (indicator light, alerts, etc.)
- Firmware update support (future)

---

## BLE Service Architecture

The Sensair device exposes **two primary GATT services**:

### 1. Device Provisioning Service
**UUID**: `0000ff00-0000-1000-8000-00805f9b34fb`

Used for initial setup: WiFi configuration, device registration, and basic info.

### 2. Device Control Service
**UUID**: `0000ff10-0000-1000-8000-00805f9b34fb`

Used for live sensor data streaming and device control when in BLE range.

---

## Device Provisioning Service (0xff00)

### Characteristics

#### 1. Device Info (Read)
**UUID**: `0000ff01-0000-1000-8000-00805f9b34fb`
**Properties**: Read
**Description**: Returns device metadata

**Response Format** (JSON string):
```json
{
  "deviceId": "SENS-A1B2C3D4",
  "model": "Sensair Pro",
  "firmwareVersion": "1.2.3",
  "hardwareVersion": "2.0",
  "manufacturer": "Sensair Inc",
  "serialNumber": "SN123456789"
}
```

**Mobile App Usage**:
- Display device info during pairing
- Verify device model compatibility
- Check firmware version

---

#### 2. WiFi Scan (Read/Notify)
**UUID**: `0000ff02-0000-1000-8000-00805f9b34fb`
**Properties**: Read, Notify
**Description**: Triggers WiFi scan and returns available networks

**Write**: Send `{"action": "scan"}` to trigger scan
**Notify**: Receive scan results as JSON array

**Response Format**:
```json
{
  "networks": [
    {
      "ssid": "MyHomeWiFi",
      "rssi": -45,
      "security": "WPA2",
      "channel": 6
    },
    {
      "ssid": "NeighborWiFi",
      "rssi": -78,
      "security": "WPA2",
      "channel": 11
    }
  ]
}
```

**Mobile App Usage**:
- Show available WiFi networks to user
- Sort by signal strength (RSSI)
- Pre-select strongest network

---

#### 3. WiFi Credentials (Write)
**UUID**: `0000ff03-0000-1000-8000-00805f9b34fb`
**Properties**: Write
**Description**: Send WiFi credentials to device

**Write Format** (JSON string):
```json
{
  "ssid": "MyHomeWiFi",
  "password": "mySecurePassword123",
  "securityType": "WPA2"
}
```

**Security Notes**:
- Password is transmitted over BLE (encrypted at link layer)
- Device does NOT store password after successful connection
- Consider implementing additional encryption layer (AES) in future

**Mobile App Usage**:
- Send after user enters WiFi password
- Show connection progress
- Handle errors (wrong password, out of range, etc.)

---

#### 4. Provisioning Status (Read/Notify)
**UUID**: `0000ff04-0000-1000-8000-00805f9b34fb`
**Properties**: Read, Notify
**Description**: WiFi connection and cloud registration status

**Response Format**:
```json
{
  "status": "connecting_wifi",
  "progress": 30,
  "message": "Connecting to WiFi..."
}
```

**Status Values**:
- `idle` - Waiting for WiFi credentials
- `connecting_wifi` - Attempting to connect to WiFi
- `wifi_connected` - WiFi connected, attempting cloud registration
- `cloud_connected` - Successfully registered with cloud
- `error` - Error occurred (see `message`)

**Mobile App Usage**:
- Subscribe to notifications for real-time progress
- Show progress UI (0-100%)
- Display status messages to user
- Handle error states with retry option

---

#### 5. Cloud Registration (Write)
**UUID**: `0000ff05-0000-1000-8000-00805f9b34fb`
**Properties**: Write
**Description**: Provide cloud server details and device claim token

**Write Format**:
```json
{
  "apiEndpoint": "https://api.sensair.io",
  "claimToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "homeId": "home-uuid",
  "roomId": "room-uuid"
}
```

**Mobile App Usage**:
- Mobile app gets `claimToken` from backend API (POST /devices/claim)
- Send along with home/room assignment
- Device uses token to register itself with cloud
- After success, device starts sending data to cloud

---

## Device Control Service (0xff10)

Used for real-time interaction when device is within BLE range.

### Characteristics

#### 1. Live Sensor Data (Read/Notify)
**UUID**: `0000ff11-0000-1000-8000-00805f9b34fb`
**Properties**: Read, Notify
**Description**: Real-time sensor readings

**Response Format**:
```json
{
  "timestamp": "2025-01-22T10:30:45Z",
  "pm25": 12.5,
  "pm10": 18.3,
  "co2": 450,
  "temperature": 22.5,
  "humidity": 45,
  "pressure": 1013.25,
  "vocIndex": 120,
  "noiseDb": 35,
  "batteryLevel": 85,
  "wifiRssi": -45
}
```

**Update Frequency**: Every 5 seconds (when subscribed)

**Mobile App Usage**:
- Show "Live" badge when BLE connected
- Display real-time updates faster than cloud polling
- Use for immediate feedback during testing

---

#### 2. Device Control (Write)
**UUID**: `0000ff12-0000-1000-8000-00805f9b34fb`
**Properties**: Write
**Description**: Send control commands to device

**Write Format**:
```json
{
  "command": "set_indicator_light",
  "params": {
    "enabled": true,
    "brightness": 80
  }
}
```

**Supported Commands**:

1. **set_indicator_light**
   ```json
   {
     "command": "set_indicator_light",
     "params": {
       "enabled": true,
       "brightness": 80  // 0-100
     }
   }
   ```

2. **set_alert_sound**
   ```json
   {
     "command": "set_alert_sound",
     "params": {
       "enabled": false
     }
   }
   ```

3. **restart**
   ```json
   {
     "command": "restart"
   }
   ```

4. **factory_reset**
   ```json
   {
     "command": "factory_reset",
     "confirm": true
   }
   ```

**Mobile App Usage**:
- Prefer BLE control when device is nearby (faster response)
- Fall back to cloud API when out of BLE range
- Show different UI indicator for BLE vs Cloud control

---

#### 3. Device Status (Read/Notify)
**UUID**: `0000ff13-0000-1000-8000-00805f9b34fb`
**Properties**: Read, Notify
**Description**: Device health and configuration status

**Response Format**:
```json
{
  "deviceId": "SENS-A1B2C3D4",
  "status": "online",
  "wifiConnected": true,
  "cloudConnected": true,
  "batteryLevel": 85,
  "batteryCharging": false,
  "uptime": 345600,  // seconds
  "freeMemory": 42000,  // bytes
  "indicatorLight": {
    "enabled": true,
    "brightness": 80
  },
  "alertSound": {
    "enabled": true
  }
}
```

**Mobile App Usage**:
- Show device health in device detail screen
- Warn if WiFi or cloud disconnected
- Display battery status

---

## BLE Discovery and Connection Flow

### 1. Discovery (Scanning)

**Advertisement Data**:
- Service UUID: `0xff00` (Device Provisioning Service)
- Device Name: `Sensair-A1B2C3` (truncated device ID)
- Manufacturer Data: `0x59FF` (Company ID) + device status flags

**Mobile App Scan Filter**:
```javascript
// Flutter example
scanSettings = ScanSettings(
  serviceUuids: ["0000ff00-0000-1000-8000-00805f9b34fb"],
  scanMode: ScanMode.lowLatency
)
```

**Scan Duration**: 10-30 seconds
**User Experience**: Show "Scanning..." spinner, list devices as found

---

### 2. Connection

```
1. User taps device in scan list
2. App connects to device GATT server
3. App discovers services and characteristics
4. App reads Device Info characteristic (0xff01)
5. App displays device details and "Continue Setup" button
```

**Connection Parameters**:
- Connection Interval: 50ms (fast, for responsive setup)
- Supervision Timeout: 5000ms
- MTU: Request 512 bytes (for larger JSON payloads)

---

### 3. Provisioning Flow

```
1. Mobile app reads WiFi Scan (0xff02) or triggers scan
2. User selects WiFi network from list
3. User enters WiFi password
4. Mobile app writes WiFi Credentials (0xff03)
5. Mobile app subscribes to Provisioning Status (0xff04)
6. Device attempts WiFi connection
7. Device connects to cloud (using credentials from 0xff05)
8. Mobile app shows success or error
9. Mobile app disconnects BLE
10. Mobile app navigates to Home tab (device now appears)
```

**Error Handling**:
- **WiFi connection failed**: Show "Wrong password?" with retry
- **Cloud registration failed**: Show "Check internet connection" with retry
- **Timeout (>2 minutes)**: Allow retry or skip to manual setup

---

### 4. Live Control Flow (Post-Setup)

```
1. User opens device detail screen
2. App scans for device (using Device ID)
3. If found nearby:
   a. Connect to device
   b. Subscribe to Live Sensor Data (0xff11)
   c. Subscribe to Device Status (0xff13)
   d. Show "Live" badge
4. User toggles indicator light
5. App writes to Device Control (0xff12)
6. Device updates setting and notifies status change
7. App updates UI to reflect new state
```

**Fallback to Cloud**:
- If BLE connection fails or device not found, use cloud API
- Show "Cloud" badge instead of "Live"
- Warn user that updates may be slower

---

## Security Considerations

### V1 Security Model
- **BLE Link Layer Encryption**: Enabled (default on modern platforms)
- **Pairing**: "Just Works" mode (no PIN required for V1 simplicity)
- **Authentication**: Device trusts mobile app during initial setup
- **WiFi Password**: Transmitted over encrypted BLE, not stored after connection

### Future Enhancements (V2+)
- **Pairing with PIN**: Display random PIN on device screen
- **AES Encryption**: Encrypt WiFi password before BLE transmission
- **Device Certificate**: Verify device authenticity
- **Claim Token Expiry**: Short-lived tokens (5 minutes)

---

## Firmware Update Over BLE (Future)

**Service UUID**: `0000ff20-0000-1000-8000-00805f9b34fb`

**Characteristics**:
- `0xff21` - OTA Control (write: start/pause/cancel)
- `0xff22` - OTA Data (write: firmware chunks)
- `0xff23` - OTA Status (read/notify: progress, errors)

**Not implemented in V1** - devices will download firmware from cloud.

---

## Testing and Debugging

### BLE Sniffer Tools
- **nRF Connect** (iOS/Android): View raw GATT services and characteristics
- **LightBlue** (iOS): Explore BLE devices
- **BLE Scanner** (Android): Debug BLE communication

### Device Simulator
For testing without hardware:
- Create a BLE peripheral simulator (e.g., using ESP32 or Raspberry Pi)
- Implement mock services with test data
- Simulate error conditions (wrong password, WiFi out of range, etc.)

---

## Platform-Specific Notes

### iOS
- **Permissions**: `NSBluetoothAlwaysUsageDescription` in Info.plist
- **Background**: BLE works in background with `bluetooth-central` capability
- **Scan Behavior**: iOS caches devices; use `allowDuplicates` for real-time RSSI

### Android
- **Permissions**:
  - `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (Android 12+)
  - `ACCESS_FINE_LOCATION` (required for BLE scan)
- **Background**: Requires foreground service for sustained scanning
- **MTU**: Negotiate larger MTU for better performance (512 bytes)

---

## Reference Implementation

Mobile app should use well-maintained BLE libraries:

**Flutter**:
- [flutter_blue_plus](https://pub.dev/packages/flutter_blue_plus)
- [reactive_ble](https://pub.dev/packages/flutter_reactive_ble)

**React Native**:
- [react-native-ble-plx](https://github.com/dotintent/react-native-ble-plx)

---

## Appendix: UUID Summary

| Service/Characteristic | UUID | Properties |
|------------------------|------|------------|
| **Provisioning Service** | `0xff00` | - |
| Device Info | `0xff01` | Read |
| WiFi Scan | `0xff02` | Read, Notify |
| WiFi Credentials | `0xff03` | Write |
| Provisioning Status | `0xff04` | Read, Notify |
| Cloud Registration | `0xff05` | Write |
| **Control Service** | `0xff10` | - |
| Live Sensor Data | `0xff11` | Read, Notify |
| Device Control | `0xff12` | Write |
| Device Status | `0xff13` | Read, Notify |

---

## Changelog

- **v0.1 (2025-01-22)**: Initial BLE protocol specification
