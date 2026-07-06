# Sensair Mobile App

Version: 0.1
Platform: Cross-platform (iOS & Android)
Framework: Flutter 3.x

---

## Project Overview

Sensair is a mobile application for monitoring indoor air quality through IoT sensor devices. The app allows users to:
- Set up air quality devices via Bluetooth
- Monitor real-time air quality readings (PM2.5, CO₂, temperature, humidity, VOC, noise)
- View historical data and trends
- Receive alerts when air quality degrades
- View crowdsourced community air quality map

---

## Project Structure

```
sensair-app/
├── docs/                           # Documentation
│   ├── API_SPECIFICATION.md        # Backend API endpoints and data models
│   ├── BLE_PROTOCOL.md             # Bluetooth device communication protocol
│   ├── DESIGN_SYSTEM.md            # UI/UX design specifications
│   ├── QUESTIONS_ANSWERED.md       # Clarifications and technical decisions
│   └── design-screenshots/         # Design reference images
├── lib/                            # Flutter app source code (to be created)
│   ├── core/                       # Shared utilities, theme, constants
│   ├── data/                       # Data layer (models, repositories, API)
│   ├── features/                   # Feature modules (home, stats, map, etc.)
│   └── main.dart                   # App entry point
├── sensair_mobile_prd.md           # Product Requirements Document
├── sensair_mobile_todo.md          # Implementation task checklist
└── README.md                       # This file
```

---

## Key Documentation

### For Product/Business
- **[Product Requirements Document](sensair_mobile_prd.md)** - Complete product specification, features, use cases, and non-functional requirements

### For Developers
- **[Implementation TODO](sensair_mobile_todo.md)** - Detailed task breakdown for development
- **[API Specification](docs/API_SPECIFICATION.md)** - REST API endpoints, authentication, data models
- **[BLE Protocol](docs/BLE_PROTOCOL.md)** - Bluetooth device setup and control protocol
- **[Design System](docs/DESIGN_SYSTEM.md)** - Colors, typography, components, layouts
- **[Q&A Document](docs/QUESTIONS_ANSWERED.md)** - Clarifications and technical decisions

---

## Tech Stack

### Framework & Language
- **Flutter 3.x** - Cross-platform mobile framework
- **Dart** - Programming language

### Key Dependencies
- **State Management**: Riverpod (recommended)
- **Networking**: Dio (HTTP client)
- **Bluetooth**: flutter_blue_plus
- **Maps**: google_maps_flutter or mapbox_gl
- **Charts**: fl_chart
- **Storage**: flutter_secure_storage (tokens), shared_preferences (cache)
- **Notifications**: firebase_messaging
- **Analytics**: firebase_analytics (optional)

### Backend
- **API**: Express.js REST API (existing, see `../sensair/apps/api`)
- **Authentication**: JWT Bearer tokens
- **Base URL**:
  - Dev: `http://localhost:4000`
  - Production: TBD

---

## Getting Started

### Prerequisites
- Flutter SDK 3.x or later
- Xcode (for iOS development)
- Android Studio / Android SDK (for Android development)
- Access to Sensair backend API

### Setup Steps

1. **Clone the repository** (if not already done):
   ```bash
   cd sensair-app
   ```

2. **Install Flutter dependencies**:
   ```bash
   flutter pub get
   ```

3. **Configure environment**:
   - Create `.env` file with API base URL
   - Set up Firebase project (for push notifications and analytics)
   - Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

4. **Run code generation** (for JSON serialization):
   ```bash
   flutter pub run build_runner build
   ```

5. **Run the app**:
   ```bash
   # iOS
   flutter run -d ios

   # Android
   flutter run -d android
   ```

---

## Architecture

### Data Flow
```
UI (Widgets)
    ↕
State Management (Riverpod)
    ↕
Repositories (Business Logic)
    ↕
Data Sources (API Client, BLE Service, Cache)
    ↕
External (REST API, Bluetooth Devices)
```

### Feature Modules
- **Auth** - Login, logout, token management
- **Home** - Dashboard, device list, current readings
- **Statistics** - Historical data, charts, trends
- **Map** - Crowdsourced AQ map
- **Profile** - User settings, theme, notifications
- **Onboarding** - Bluetooth device setup wizard

---

## Key Features

### V1 (MVP)
✅ User authentication (email/password)
✅ Bluetooth device setup and WiFi provisioning
✅ Real-time air quality monitoring
✅ Historical data visualization (charts)
✅ Alert notifications
✅ Crowdsourced air quality map
✅ Light/dark theme support
✅ Multi-home support

### V2 (Future)
🔜 WebSocket real-time updates
🔜 BLE firmware updates
🔜 Multi-language support
🔜 iOS/Android widgets
🔜 Smart home integration (HomeKit, Google Home)
🔜 Social features (sharing AQ data)

---

## Testing

### Test Coverage Target
- **70%+** for business logic and data layer
- **Unit tests**: Models, repositories, utilities
- **Widget tests**: Key screens (Home, Statistics, Map, Onboarding)
- **Integration tests**: BLE setup flow (manual test plan)

### Running Tests
```bash
# Run all tests
flutter test

# Run tests with coverage
flutter test --coverage

# View coverage report
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

---

## Build & Release

### Build for iOS
```bash
flutter build ios --release
```

### Build for Android
```bash
flutter build apk --release   # APK
flutter build appbundle       # App Bundle (for Play Store)
```

### Beta Distribution
- **iOS**: TestFlight
- **Android**: Google Play Internal Testing

---

## Related Projects

- **Backend API**: `../sensair/apps/api` - Express.js REST API
- **Web App**: `../sensair/apps/frontend` - React web application
- **Shared Types**: `../sensair/packages/types` - TypeScript type definitions

---

## API Integration

The mobile app consumes the same REST API as the web application.

**Key Endpoints**:
- `POST /auth/login` - User authentication
- `GET /homes` - User's homes and rooms
- `GET /devices/{id}/readings` - Sensor data
- `GET /alerts` - Alert rules and events
- `GET /reports/weekly` - Weekly summaries
- `GET /map/tiles` - Map data (TBD)

See [API_SPECIFICATION.md](docs/API_SPECIFICATION.md) for complete endpoint documentation.

---

## Bluetooth Integration

The app uses BLE to:
1. Discover nearby Sensair devices
2. Provision WiFi credentials
3. Register devices with cloud backend
4. Control devices when nearby (optional fast path)

**BLE Services**:
- **Provisioning Service** (`0xff00`) - WiFi setup, cloud registration
- **Control Service** (`0xff10`) - Live data, device controls

See [BLE_PROTOCOL.md](docs/BLE_PROTOCOL.md) for complete protocol specification.

---

## Design Guidelines

The app follows a clean, modern design with:
- **Primary Color**: Teal/Cyan (#26D0CE)
- **AQI Colors**: EPA standard (green/yellow/orange/red/purple/maroon)
- **Themes**: Light and dark mode support
- **Typography**: System fonts (SF Pro on iOS, Roboto on Android)
- **Components**: Circular AQI gauges, metric cards, charts, maps

See [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for complete design specifications.

---

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement feature (follow TODO checklist)
3. Write tests (unit + widget)
4. Run linter and tests: `flutter analyze && flutter test`
5. Create pull request
6. Code review and merge

### Code Style
- Follow [Effective Dart](https://dart.dev/guides/language/effective-dart) guidelines
- Use `flutter_lints` for static analysis
- Format code: `flutter format .`

---

## Support

- **Documentation**: See `docs/` folder
- **Issues**: Report bugs and feature requests in project issue tracker
- **Backend Issues**: Check `../sensair` repository

---

## License

TBD

---

## Changelog

### v0.1 (2025-01-22)
- Initial project setup
- Complete documentation (PRD, API spec, BLE protocol, design system)
- Task breakdown and implementation plan
