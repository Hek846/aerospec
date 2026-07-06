# Sensair Mobile App

Air Quality Monitoring Mobile App built with Flutter.

## Getting Started

### Prerequisites
- Flutter SDK (>=3.0.0)
- Dart SDK (>=3.0.0)
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. Copy environment configuration:
```bash
cp .env.example .env
```
Edit `.env` and set `API_BASE_URL` to your backend API URL.

2. Install dependencies:
```bash
flutter pub get
```

3. Generate code for JSON serialization:
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

4. Run the app:
```bash
flutter run
```

## Project Structure

```
lib/
  core/           # Shared utilities, constants, theme
  data/           # Models, repositories, API clients
  features/       # Feature modules (home, stats, map, profile, auth, onboarding)
  main.dart
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:
```
API_BASE_URL=http://localhost:4000
```

## Building

### Debug builds
```bash
flutter build ios --debug
flutter build apk --debug
```

### Release builds
```bash
flutter build ios --release
flutter build apk --release
```

## Testing

```bash
flutter test
flutter analyze
```

## Documentation

- [Product Requirements](sensair_mobile_prd.md)
- [Task Checklist](sensair_mobile_todo.md)
- [API Specification](docs/API_SPECIFICATION.md)
- [Design System](docs/DESIGN_SYSTEM.md)

## Stage Progress

See [STAGE_1.md](STAGE_1.md) for current implementation stage.
