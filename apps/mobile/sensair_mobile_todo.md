# Sensair Mobile App – Implementation To‑Do List

Version: 0.2
Audience: Coding agent / engineering team
Last Updated: 2025-01-22

This checklist breaks the PRD into concrete tasks.
Use it to track progress.
You can reorder or split items as needed.

**Reference Documents**:
- [Product Requirements](../sensair_mobile_prd.md)
- [API Specification](docs/API_SPECIFICATION.md)
- [BLE Protocol](docs/BLE_PROTOCOL.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Clarifications & Decisions](docs/QUESTIONS_ANSWERED.md)

---

## 0. Project Setup

**✅ DECISIONS MADE**:
- Framework: **Flutter 3.x**
- State Management: **Riverpod** (recommended)
- Target Platforms: iOS 14+, Android 8.0+ (API 26+)
- Backend API: Existing Express.js API (see `d:\Projects\sensair\apps\api`)

**Tasks**:
- [ ] Create Flutter project with iOS + Android targets
  - [ ] Set app name: "Sensair"
  - [ ] Set bundle IDs: `com.sensair.mobile` (iOS), `com.sensair.mobile` (Android)
  - [ ] Configure minimum versions: iOS 14.0, Android API 26
- [ ] Set up project structure (feature-based):
  ```
  lib/
    core/           # Shared utilities, constants, theme
    data/           # Models, repositories, API clients
    features/       # Feature modules (home, stats, map, profile, auth, onboarding)
    main.dart
  ```
- [ ] Add dependencies to `pubspec.yaml`:
  - [ ] `flutter_riverpod` or `riverpod` (state management)
  - [ ] `dio` (HTTP client)
  - [ ] `flutter_secure_storage` (token storage)
  - [ ] `flutter_blue_plus` (BLE)
  - [ ] `google_maps_flutter` or `mapbox_gl` (maps)
  - [ ] `fl_chart` (charts for Statistics tab)
  - [ ] `intl` (date formatting, future i18n)
  - [ ] `firebase_messaging` (push notifications)
  - [ ] `firebase_analytics` (optional analytics)
- [ ] Configure environment variables:
  - [ ] Create `.env` file with `API_BASE_URL` (dev: `http://localhost:4000`, prod: TBD)
  - [ ] Use `flutter_dotenv` or similar for env loading
- [ ] Set up theme scaffold:
  - [ ] Create `lib/core/theme/app_theme.dart`
  - [ ] Define light theme (see [Design System](docs/DESIGN_SYSTEM.md))
  - [ ] Define dark theme
  - [ ] Implement theme switcher (light/dark/system)
- [ ] Set up localization scaffold (English only for V1):
  - [ ] Add `flutter_localizations`
  - [ ] Create `lib/l10n/` directory for future translations
  - [ ] Use `Intl` package for string externalization
- [ ] Configure app icons (placeholder):
  - [ ] Use `flutter_launcher_icons` package
  - [ ] Create placeholder icon (teal gradient with "S")
  - [ ] Generate iOS and Android icons

---

## 1. Data Models and Repositories

**✅ REFERENCE**: See `d:\Projects\sensair\src\types\index.ts` for complete type definitions

**Tasks**:
- [ ] Create data models in `lib/data/models/`:
  - [ ] `user.dart` - User, UserRole enum
  - [ ] `home.dart` - Home, Location
  - [ ] `room.dart` - Room, RoomType enum
  - [ ] `device.dart` - Device, DeviceStatus enum
  - [ ] `sensor_reading.dart` - SensorReading
  - [ ] `alert.dart` - AlertRule, AlertEvent, AlertEventStatus, QuietHours
  - [ ] `report.dart` - ReportSummary, RoomStats, MetricStats
  - [ ] `aqi.dart` - AQIBand enum, AQIInfo
  - [ ] `ota.dart` - OTAJob, DeviceOTAStatus (for firmware updates)
- [ ] Implement JSON serialization for all models:
  - [ ] Use `json_annotation` and `json_serializable` packages
  - [ ] Add `fromJson()` and `toJson()` methods
  - [ ] Run `flutter pub run build_runner build`
- [ ] Create API client in `lib/data/api/api_client.dart`:
  - [ ] Use Dio package
  - [ ] Configure base URL from environment
  - [ ] Implement interceptor for JWT token (from secure storage)
  - [ ] Implement error handling (401 → logout, 500 → retry, etc.)
  - [ ] Add request/response logging (debug mode only)
- [ ] Create repository interfaces in `lib/data/repositories/`:
  - [ ] `auth_repository.dart`:
    - [ ] `login(email, password)` → returns User + token
    - [ ] `logout()`
    - [ ] `getCurrentUser()`
  - [ ] `home_repository.dart`:
    - [ ] `getHomes()` → List<Home>
    - [ ] `getRooms(homeId)` → List<Room>
  - [ ] `device_repository.dart`:
    - [ ] `getRoom(roomId)` → Room with Device and latest reading
    - [ ] `getDeviceReadings(deviceId, range)` → List<SensorReading>
  - [ ] `alert_repository.dart`:
    - [ ] `getAlerts()` → AlertRule list + AlertEvent list
    - [ ] `getAlertEvents(status, limit)` → List<AlertEvent>
    - [ ] `acknowledgeAlert(alertId)`
    - [ ] `dismissAlert(alertId)`
  - [ ] `report_repository.dart`:
    - [ ] `getWeeklyReports()` → List<ReportSummary>
    - [ ] `getReport(reportId)` → ReportSummary
  - [ ] `map_repository.dart`:
    - [ ] `getMapTiles(bounds, zoom)` → Map tiles/polygons (API endpoint TBD)
- [ ] Implement caching layer in `lib/data/cache/`:
  - [ ] Use `shared_preferences` for simple key-value storage
  - [ ] Cache last readings per device (timestamp + data)
  - [ ] Cache user info and homes
  - [ ] Implement cache expiry (e.g., 5 minutes for readings, 1 hour for user/home)
  - [ ] Create `CacheManager` utility class

---

## 2. Authentication Flow

- [ ] Implement splash screen + initial auth check.  
- [ ] Implement login screen (email + password).  
- [ ] Handle token storage in secure storage.  
- [ ] Implement logout and token clearing.  
- [ ] Wire login to show main tab bar (Home/Statistics/Map/Profile) after success.

---

## 3. Home Tab

- [ ] Implement base Home tab screen skeleton.  
- [ ] Implement header (greeting, home name, status).  
- [ ] Implement AQI gauge component with color gradient and category labels.  
- [ ] Implement quick metric cards for primary metrics.  
- [ ] Implement device summary list (cards per room/device).  
- [ ] Implement pull‑to‑refresh to reload data.  
- [ ] Implement navigation from device card to device detail.

### 3.1 Device Detail Screen

- [ ] Create device detail layout (gauge, metrics, health).  
- [ ] Display live readings and last update time.  
- [ ] Show Wi‑Fi RSSI, battery, firmware version.  
- [ ] Implement control widgets (e.g., indicator light, sound on alerts).  
- [ ] Hook controls to BLE or cloud commands (see Section 5).

---

## 4. Statistics Tab

- [ ] Implement Statistics tab skeleton.  
- [ ] Implement time‑range segmented control (Day/Week/Month/All).  
- [ ] Hook segmented control to appropriate data loading.  
- [ ] Implement AQI overview chart (donut/pie).  
- [ ] Implement “Compare average AQI” cards per room.  
- [ ] Implement “Average AQI by locations” horizontal bar chart.  
- [ ] Implement “Average AQI by hours” bar chart.  
- [ ] Implement alerts/anomalies list section.  
- [ ] Implement drill‑down view for charts (detail screen).  
- [ ] Connect all charts to backend aggregate APIs (or dummy data layer).

---

## 5. Map Tab

- [ ] Implement Map tab skeleton.  
- [ ] Integrate mapping SDK (Google Maps, Mapbox, or platform default).  
- [ ] Implement search bar with autocomplete.  
- [ ] Show user location marker (with permission handling).  
- [ ] Render AQ polygons/tiles with AQI colors.  
- [ ] Implement bottom sheet list of locations with AQI pills.  
- [ ] Implement tap interactions on tiles and list items (center map, show info).  
- [ ] Hook map to backend map API and refresh based on viewport.

---

## 6. Profile Tab

- [ ] Implement Profile tab skeleton.  
- [ ] Display user info (name, email, avatar/initials).  
- [ ] List homes and “Manage devices” entry.  
- [ ] Implement theme selector (Light / Dark / System).  
- [ ] Implement unit settings (°C/°F, 12h/24h).  
- [ ] Implement notification preferences UI.  
- [ ] Implement support links (FAQ, contact).  
- [ ] Implement legal links (privacy policy, terms).  
- [ ] Show app version/build.  
- [ ] Implement logout button and flow.

---

## 7. Device Onboarding (Bluetooth + Wi‑Fi)

**✅ REFERENCE**: See [BLE Protocol](docs/BLE_PROTOCOL.md) for complete specification

**BLE Services**:
- Provisioning Service: `0xff00`
- Control Service: `0xff10`

**Tasks**:
- [ ] Integrate BLE library:
  - [ ] Add `flutter_blue_plus` to pubspec.yaml
  - [ ] Configure iOS permissions in Info.plist: `NSBluetoothAlwaysUsageDescription`
  - [ ] Configure Android permissions in AndroidManifest.xml: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`
- [ ] Create BLE service in `lib/data/ble/`:
  - [ ] `ble_service.dart` - Main BLE operations
  - [ ] `ble_device_scanner.dart` - Scan for devices (filter by UUID `0xff00`)
  - [ ] `ble_provisioning.dart` - WiFi provisioning flow
  - [ ] `ble_control.dart` - Device control commands
- [ ] Implement permissions flow:
  - [ ] Use `permission_handler` package
  - [ ] Request BLE + Location permissions with explanation dialog
  - [ ] Handle permission denied (show settings link)
- [ ] Create onboarding flow screens in `lib/features/onboarding/`:
  - [ ] `onboarding_intro_screen.dart`:
    - [ ] Welcome message ("Let's set up your Sensair device")
    - [ ] Brief explanation (1-2 sentences)
    - [ ] "Start Setup" button
  - [ ] `device_scan_screen.dart`:
    - [ ] Scanning animation/spinner
    - [ ] List of discovered devices (name, signal strength RSSI)
    - [ ] "Rescan" button
    - [ ] "Help - No devices found" link
    - [ ] Tap device → connect
  - [ ] `device_connect_screen.dart`:
    - [ ] Show connection progress
    - [ ] Read Device Info characteristic (0xff01)
    - [ ] Display device metadata (model, firmware, serial)
    - [ ] "Continue" button
  - [ ] `wifi_setup_screen.dart`:
    - [ ] Trigger WiFi scan (write to 0xff02, subscribe to notifications)
    - [ ] Display available networks (sorted by RSSI)
    - [ ] WiFi password input field
    - [ ] "Connect" button
    - [ ] Write credentials to characteristic 0xff03
  - [ ] `provisioning_progress_screen.dart`:
    - [ ] Subscribe to Provisioning Status (0xff04)
    - [ ] Show progress bar (0-100%)
    - [ ] Status messages: "Connecting to WiFi...", "Registering with cloud...", etc.
    - [ ] Handle errors with retry option
  - [ ] `room_assignment_screen.dart`:
    - [ ] List existing rooms (from home)
    - [ ] "Create new room" option
    - [ ] Room name input (if creating new)
    - [ ] Room type selector (Bedroom, Living Room, etc.)
  - [ ] `device_naming_screen.dart`:
    - [ ] Device name input (default: room name)
    - [ ] Optional custom name
  - [ ] `setup_success_screen.dart`:
    - [ ] Success message with checkmark icon
    - [ ] Summary (device name, room, status)
    - [ ] "View on Home" button → navigate to Home tab
- [ ] Implement cloud registration:
  - [ ] Mobile app requests claim token from backend: `POST /devices/claim`
  - [ ] Write cloud registration data to characteristic 0xff05 (API endpoint, claim token, homeId, roomId)
  - [ ] Device uses token to register with backend
- [ ] Error handling:
  - [ ] No devices found → "Make sure device is powered on and nearby"
  - [ ] Connection failed → "Move closer to device and try again"
  - [ ] Wrong WiFi password → "Check password and try again"
  - [ ] Timeout (>2 minutes) → "Setup took too long. Retry?"
  - [ ] All errors: Show retry button and help link

### 7.1 Post‑Setup BLE / Control

- [ ] Implement "Live via Bluetooth" mode in device detail screen:
  - [ ] Scan for previously paired device (by device ID)
  - [ ] If found nearby: Connect and subscribe to Live Sensor Data (0xff11)
  - [ ] Show "Live" badge in UI (green dot + "Live" label)
  - [ ] Update readings every 5 seconds from BLE notifications
- [ ] Implement BLE control commands:
  - [ ] Toggle indicator light: Write to Device Control (0xff12) with command `set_indicator_light`
  - [ ] Toggle alert sound: Write with command `set_alert_sound`
  - [ ] Subscribe to Device Status (0xff13) for status updates
- [ ] Implement cloud API fallback:
  - [ ] If BLE not available, use cloud API for control (endpoints TBD)
  - [ ] Show "Cloud" badge instead of "Live"
  - [ ] Indicate slower response time
- [ ] Display connection status:
  - [ ] "Live" (green) - BLE connected
  - [ ] "Cloud" (blue) - Via internet
  - [ ] "Offline" (gray) - Not reachable

---

## 8. Alerts and Notifications

- [ ] Implement view for open alerts (can reuse Statistics or Home areas).  
- [ ] Show per‑alert metric, level, timestamp, and affected device/room.  
- [ ] Implement local push notification handling when backend sends alerts.  
- [ ] Implement in‑app notification center or simple list.  
- [ ] Implement mark‑as‑read / acknowledge interactions (if supported by backend).

---

## 9. Error Handling, Loading States, and Offline Behavior

- [ ] Add loading indicators for all remote calls (Home, Statistics, Map, Profile).  
- [ ] Implement generic error component with retry button.  
- [ ] Cache last known data for Home and Statistics so user sees something when offline.  
- [ ] Show explicit “Offline” banner when network is down.  
- [ ] Ensure BLE failures are shown with human‑readable messages.

---

## 10. Theming and Visual Polish

- [ ] Implement light and dark themes.  
- [ ] Implement gradient headers for Home and device detail views.  
- [ ] Ensure AQI color palette is consistent across gauge, charts, map, and badges.  
- [ ] Apply consistent typography rules (sizes, weights).  
- [ ] Add subtle animations (tab transitions, chart loading) where helpful but not distracting.

---

## 11. Analytics and Telemetry

- [ ] Select analytics provider (if any) or implement minimal logging interface.  
- [ ] Track key events:
  - [ ] Login success/failure.  
  - [ ] Device added / removed.  
  - [ ] Alerts opened.  
  - [ ] Map searches.  
  - [ ] Time‑range changes in Statistics.  
- [ ] Ensure analytics events avoid storing sensitive information.  

---

## 12. Testing and QA

- [ ] Add unit tests for data models and repositories.  
- [ ] Add widget/UI tests for critical screens (Home, Statistics, Map, onboarding).  
- [ ] Add integration tests for BLE setup flow if feasible (or at least manual test plan).  
- [ ] Test on a variety of devices and OS versions (iOS and Android).  
- [ ] Validate performance for:
  - [ ] Loading large time‑series datasets.  
  - [ ] Handling frequent updates.  

---

## 13. CI/CD and Release

- [ ] Set up CI to run tests and static analysis on every commit.  
- [ ] Configure build pipelines for iOS and Android artifacts.  
- [ ] Set up beta distribution (TestFlight, internal tracks, etc.).  
- [ ] Prepare app store metadata templates (name, description, screenshots).  
- [ ] Define versioning scheme and release checklist.

---

## 14. Post‑V1 Backlog (Optional)

- [ ] Multi‑home support.  
- [ ] Widgets / complications.  
- [ ] Third‑party smart home integrations.  
- [ ] Social sharing of AQ snapshots.  
- [ ] Advanced health insights based on AQ and usage patterns.
