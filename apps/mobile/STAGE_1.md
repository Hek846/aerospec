# Stage 1: Project Setup & Data Layer

**Status**: ✅ Completed - 2025-11-22
**Actual Duration**: ~2 hours

---

## Objectives

Complete **Section 0 (Project Setup)** and **Section 1 (Data Models and Repositories)** from [sensair_mobile_todo.md](sensair_mobile_todo.md).

---

## Tasks

### Section 0: Project Setup

- [ ] Create Flutter project with iOS + Android targets
  - App name: "Sensair"
  - Bundle IDs: `com.sensair.mobile` (both platforms)
  - iOS minimum: 14.0
  - Android minimum: API 26

- [ ] Set up feature-based folder structure:
  ```
  lib/
    core/           # Shared utilities, constants, theme
    data/           # Models, repositories, API clients
    features/       # Feature modules (home, stats, map, profile, auth, onboarding)
    main.dart
  ```

- [ ] Add dependencies to `pubspec.yaml`:
  - `flutter_riverpod` (state management)
  - `dio` (HTTP client)
  - `flutter_secure_storage` (token storage)
  - `flutter_blue_plus` (BLE)
  - `google_maps_flutter` (maps)
  - `fl_chart` (charts)
  - `intl` (date formatting)
  - `firebase_messaging` (push notifications)
  - `firebase_analytics` (optional)
  - `json_annotation`, `json_serializable` (JSON serialization)
  - `flutter_dotenv` (environment variables)
  - `shared_preferences` (caching)
  - `flutter_launcher_icons` (app icons)

- [ ] Configure environment variables:
  - Create `.env` file with `API_BASE_URL=http://localhost:4000`
  - Add `.env.example` template
  - Configure flutter_dotenv loading

- [ ] Set up theme scaffold:
  - Create `lib/core/theme/app_theme.dart`
  - Implement light theme per [Design System](docs/DESIGN_SYSTEM.md):
    - Primary color: #26D0CE
    - AQI colors: EPA standard
    - Typography using system fonts
  - Implement dark theme
  - Create theme provider with Riverpod
  - Implement theme switcher (light/dark/system)

- [ ] Set up localization scaffold:
  - Add `flutter_localizations` dependency
  - Create `lib/l10n/` directory
  - Configure for English only (V1)

- [ ] Configure app icons:
  - Use `flutter_launcher_icons` package
  - Create placeholder icon (teal gradient with "S")
  - Generate iOS and Android icons

### Section 1: Data Models and Repositories

**Reference**: See `d:\Projects\sensair\src\types\index.ts` for exact TypeScript type definitions to convert to Dart.

- [ ] Create data models in `lib/data/models/`:
  - [ ] `user.dart` - User model, UserRole enum
  - [ ] `home.dart` - Home model, Location model
  - [ ] `room.dart` - Room model, RoomType enum
  - [ ] `device.dart` - Device model, DeviceStatus enum
  - [ ] `sensor_reading.dart` - SensorReading model
  - [ ] `alert.dart` - AlertRule, AlertEvent, AlertEventStatus, QuietHours models
  - [ ] `report.dart` - ReportSummary, RoomStats, MetricStats models
  - [ ] `aqi.dart` - AQIBand enum, AQIInfo model, calculateAQI utility
  - [ ] `ota.dart` - OTAJob, DeviceOTAStatus models

- [ ] Implement JSON serialization:
  - Add `@JsonSerializable()` annotations
  - Create `fromJson()` and `toJson()` methods
  - Run `flutter pub run build_runner build --delete-conflicting-outputs`

- [ ] Create API client in `lib/data/api/api_client.dart`:
  - Use Dio package
  - Configure base URL from environment (.env)
  - Implement JWT token interceptor (reads from flutter_secure_storage)
  - Implement error handling:
    - 401 → logout/clear token
    - 500 → retry with exponential backoff
    - Network errors → graceful failure
  - Add request/response logging (debug mode only)
  - See [API Specification](docs/API_SPECIFICATION.md) for endpoints

- [ ] Create repositories in `lib/data/repositories/`:
  - [ ] `auth_repository.dart`:
    - `login(email, password)` → returns User + token
    - `logout()` → clears token
    - `getCurrentUser()` → from cache or API
  - [ ] `home_repository.dart`:
    - `getHomes()` → List<Home>
    - `getRooms(homeId)` → List<Room>
  - [ ] `device_repository.dart`:
    - `getRoom(roomId)` → Room with Device and latest reading
    - `getDeviceReadings(deviceId, range)` → List<SensorReading>
  - [ ] `alert_repository.dart`:
    - `getAlerts()` → AlertRule + AlertEvent lists
    - `getAlertEvents(status, limit)` → List<AlertEvent>
    - `acknowledgeAlert(alertId)` → void
    - `dismissAlert(alertId)` → void
  - [ ] `report_repository.dart`:
    - `getWeeklyReports()` → List<ReportSummary>
    - `getReport(reportId)` → ReportSummary
  - [ ] `map_repository.dart`:
    - `getMapTiles(bounds, zoom)` → Map data (API endpoint TBD)

- [ ] Implement caching layer in `lib/data/cache/`:
  - Use `shared_preferences` for simple key-value storage
  - Create `CacheManager` utility class
  - Cache last readings per device (with timestamp)
  - Cache user info and homes
  - Implement cache expiry:
    - Readings: 5 minutes
    - User/homes: 1 hour
  - Provide `get`, `set`, `clear`, `isExpired` methods

---

## Documentation References

Read these before starting:

1. **[sensair_mobile_todo.md](sensair_mobile_todo.md)** - Full task checklist
2. **[docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)** - REST API endpoints
3. **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - Colors, typography, themes
4. **[docs/QUESTIONS_ANSWERED.md](docs/QUESTIONS_ANSWERED.md)** - Technical decisions
5. **TypeScript types**: `d:\Projects\sensair\src\types\index.ts` - Convert these to Dart

---

## Success Criteria

- [ ] Flutter project created and builds successfully (iOS + Android)
- [ ] All dependencies installed without conflicts
- [ ] Theme system works (can switch light/dark)
- [ ] All data models created with proper JSON serialization
- [ ] Code generation completes without errors (`build_runner`)
- [ ] API client configured with Dio and JWT interceptor
- [ ] All repositories implemented with correct method signatures
- [ ] Cache manager created and functional
- [ ] No build errors or analyzer warnings
- [ ] Code follows Flutter/Dart style guidelines

---

## Implementation Guidelines

1. **Follow the Design System**: Use exact colors and typography from [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
2. **Type Safety**: Convert TypeScript types exactly (don't add/remove fields)
3. **Error Handling**: All repository methods should handle errors gracefully
4. **Code Style**: Run `flutter analyze` and fix all warnings
5. **Git Commits**: Make atomic commits for each subsection
6. **Testing**: Ensure `flutter build ios` and `flutter build apk` succeed

---

## Notes & Decisions

- API base URL defaults to `http://localhost:4000` (dev environment)
- Firebase setup is deferred (just add dependencies, no configuration yet)
- Maps: Use `google_maps_flutter` (Mapbox can be swapped later)
- State management: Riverpod (create providers as needed)

---

## After Completion

When Stage 1 is complete:

1. **Test the build**:
   ```bash
   flutter pub get
   flutter pub run build_runner build --delete-conflicting-outputs
   flutter analyze
   flutter build ios --debug
   flutter build apk --debug
   ```

2. **Commit your work**:
   ```bash
   git add .
   git commit -m "Complete Stage 1: Project setup and data layer"
   git push
   ```

3. **Create `STAGE_2.md`** with this structure:
   ```markdown
   # Stage 2: Authentication Flow

   **Status**: 🚧 Not Started
   **Estimated Duration**: X hours

   ## Objectives
   Complete Section 2 (Authentication Flow) from sensair_mobile_todo.md

   ## Tasks
   [List all tasks from Section 2]

   ## Documentation References
   [List relevant docs]

   ## Success Criteria
   [Define what "done" looks like]

   ## After Completion
   [Instructions for Stage 3]
   ```

4. **Update `STAGE_1.md`**:
   - Change status to: `✅ Completed - [DATE]`
   - Add "Completed By" section with any notes

5. **Create `PROGRESS.md`** (or update if exists):
   ```markdown
   # Sensair Mobile App - Implementation Progress

   ## Completed Stages
   - ✅ Stage 1: Project Setup & Data Layer - [DATE]

   ## Current Stage
   - 🚧 Stage 2: Authentication Flow - Ready to start

   ## Upcoming Stages
   - ⏭️ Stage 3: Home Tab
   - ⏭️ Stage 4: Statistics Tab
   - ⏭️ Stage 5: Map Tab
   - ⏭️ Stage 6: Profile Tab
   - ⏭️ Stage 7: Device Onboarding (BLE)
   - ⏭️ Stage 8: Alerts & Notifications
   - ⏭️ Stage 9: Error Handling & Offline
   - ⏭️ Stage 10: Polish & Testing

   ## Notes
   [Any important decisions or blockers]
   ```

---

## Questions or Issues?

If you encounter ambiguity:
1. Check the documentation files first
2. Look at the TypeScript reference implementation
3. Use sensible Flutter/Riverpod best practices
4. Document your decision in code comments
5. Note it in PROGRESS.md for review

---

**Next Stage**: [STAGE_2.md](STAGE_2.md) - Authentication Flow (to be created)
