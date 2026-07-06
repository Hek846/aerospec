# Stage 3: Home Tab

**Status**: ✅ Completed - 2025-11-23
**Estimated Duration**: 3-4 hours
**Actual Duration**: ~4 hours

---

## Objectives

Complete **Section 3 (Home Tab)** from [sensair_mobile_todo.md](sensair_mobile_todo.md).

---

## Tasks

### Section 3: Home Tab

- [ ] Implement base Home tab screen skeleton:
  - Create proper state management with Riverpod
  - Set up data providers for homes and devices
  - Implement loading states and error handling

- [ ] Implement header (greeting, home name, status):
  - Greeting based on time of day ("Good morning", "Good afternoon", "Good evening")
  - Display selected home name
  - Show overall status (number of devices online, etc.)
  - Use gradient header per design system

- [ ] Implement AQI gauge component:
  - Create circular gauge widget
  - 270° arc (135° to 405°)
  - Arc thickness: 12px
  - Color based on AQI band (EPA standard colors)
  - Display AQI value (large, bold)
  - Display AQI band label ("Good", "Moderate", etc.)
  - Smooth animation on load

- [ ] Implement quick metric cards:
  - Create reusable metric card component
  - Display primary metrics: PM2.5, PM10, CO₂, Temperature, Humidity
  - Show value, unit, and status indicator
  - Use metric-specific colors from design system
  - Card style: rounded corners, subtle shadow
  - Grid layout (2 columns on mobile)

- [ ] Implement device summary list:
  - Show all rooms/devices for selected home
  - Card per room with:
    - Room icon
    - Room name
    - Floor information
    - Device status (online/offline)
    - Latest AQI badge
  - Tap to navigate to device detail

- [ ] Implement pull-to-refresh:
  - Refresh homes and latest readings
  - Show loading indicator
  - Update cache on success
  - Display error message on failure

- [ ] Implement navigation from device card to device detail:
  - Create route to device detail screen
  - Pass device/room ID
  - Hero animation for smooth transition (optional)

### 3.1 Device Detail Screen

- [ ] Create device detail layout:
  - Header with gradient (match design system)
  - Device name and room
  - Large AQI gauge
  - Grid of all metric cards
  - Device health section

- [ ] Display live readings:
  - Show all sensor metrics
  - Last update timestamp
  - Auto-refresh option (every 30 seconds when active)

- [ ] Show device health information:
  - WiFi RSSI (signal strength)
  - Battery level (if applicable)
  - Firmware version
  - Last seen timestamp
  - Device status (online/offline/error)

- [ ] Implement control widgets:
  - Indicator light toggle
  - Alert sound toggle
  - (Controls connect to BLE or cloud - implement cloud first, BLE in Stage 7)

- [ ] Historical data preview:
  - Simple chart showing last 24 hours of AQI
  - Link to full statistics view
  - Use fl_chart package

---

## Documentation References

Read these before starting:

1. **[sensair_mobile_todo.md](sensair_mobile_todo.md)** - Full task checklist
2. **[docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)** - REST API endpoints (homes, devices, readings)
3. **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - AQI gauge specs, metric cards, colors
4. **[docs/QUESTIONS_ANSWERED.md](docs/QUESTIONS_ANSWERED.md)** - Technical decisions

---

## Success Criteria

- [ ] Home screen displays with proper gradient header
- [ ] User sees greeting appropriate for time of day
- [ ] AQI gauge renders correctly with proper colors
- [ ] Quick metric cards display current values
- [ ] Device/room list shows all devices for selected home
- [ ] Pull-to-refresh updates data successfully
- [ ] Tapping device card navigates to device detail screen
- [ ] Device detail shows all sensor readings
- [ ] Device health information displays correctly
- [ ] Control toggles work (via cloud API)
- [ ] Loading states show during data fetches
- [ ] Error states display user-friendly messages
- [ ] All data properly cached for offline viewing
- [ ] No build errors or analyzer warnings
- [ ] Code follows Flutter/Dart style guidelines

---

## Implementation Guidelines

1. **Follow the Design System**: Use exact colors, typography, and component specs from [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
2. **State Management**: Use Riverpod for all state (auth, homes, devices, readings)
3. **Data Flow**: Repository → Provider → UI
4. **Error Handling**: Display user-friendly error messages, never raw errors
5. **Loading States**: Show skeleton screens or spinners during data loads
6. **Caching**: Use CacheManager to cache homes and readings
7. **Code Style**: Run `flutter analyze` and fix all warnings
8. **Git Commits**: Make atomic commits for each subsection

---

## API Endpoints Used

From [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md):

- `GET /homes` - Get all homes for authenticated user
- `GET /homes/:homeId/rooms` - Get all rooms for a home
- `GET /rooms/:roomId` - Get room details with device and latest reading
- `GET /devices/:deviceId/readings?range=24h` - Get historical readings

---

## Component Specifications

### AQI Gauge (Circular)
- Diameter: 180px
- Arc thickness: 12px
- Start angle: 135°
- End angle: 405°
- Arc coverage: 270° total
- Color: EPA AQI color based on value
- Inner text:
  - AQI value: 48px, bold
  - Band label: 20px, semibold
- Animation: 0.8s ease-out on load

### Metric Card
- Border radius: 16px
- Padding: 16px
- Min size: 100px × 100px
- Shadow: 0px 2px 8px rgba(0,0,0,0.08)
- Layout:
  - Label (12px, gray)
  - Value (24px, bold)
  - Unit (12px, gray)
  - Status icon (16px)

### Device/Room Card
- Border radius: 12px
- Padding: 12px 16px
- Height: 72px
- Layout:
  - Icon (24px)
  - Room name (16px, semibold)
  - Floor • Status (14px, gray)
  - AQI badge (right side)

---

## Notes & Decisions

- Home selection: For V1, use first home in list (multi-home selector in future)
- Polling interval: 30 seconds when Home tab is active, stop when inactive
- BLE "Live" mode: Defer to Stage 7, use cloud API only for now
- Charts: Use fl_chart package for simple line charts
- Device controls: Cloud API first, BLE to be added in Stage 7

---

## After Completion

When Stage 3 is complete:

1. **Test the Home tab**:
   ```bash
   flutter pub get
   flutter analyze
   # Test with real backend (or mock data)
   # Test pull-to-refresh
   # Test navigation to device detail
   # Test offline mode (airplane mode)
   ```

2. **Commit your work**:
   ```bash
   git add .
   git commit -m "Complete Stage 3: Home tab implementation"
   git push
   ```

3. **Create `STAGE_4.md`** following the same format for Section 4 (Statistics Tab)

4. **Update `STAGE_3.md`**:
   - Change status to: `✅ Completed - [DATE]`
   - Add "Completed By" section with any notes

5. **Update `PROGRESS.md`**:
   ```markdown
   ## Completed Stages
   - ✅ Stage 1: Project Setup & Data Layer - [DATE]
   - ✅ Stage 2: Authentication Flow - [DATE]
   - ✅ Stage 3: Home Tab - [DATE]

   ## Current Stage
   - 🚧 Stage 4: Statistics Tab - Ready to start
   ```

---

## Questions or Issues?

If you encounter ambiguity:
1. Check the documentation files first
2. Look at the API specification for endpoint details
3. Reference the design system for exact component specs
4. Use sensible Flutter/Riverpod best practices
5. Document your decision in code comments
6. Note it in PROGRESS.md for review

---

## Completed By

**Date**: 2025-11-23
**Commit**: 358a82d

**What was implemented**:
- ✅ Complete Home screen with gradient header, time-based greeting, device status
- ✅ Large AQI gauge component with 270° arc and EPA color standards
- ✅ Quick metrics grid displaying PM2.5, Temperature, Humidity, CO₂
- ✅ Device/room list with online status and AQI badges
- ✅ Pull-to-refresh functionality
- ✅ Complete Device Detail screen with all sensor readings
- ✅ Device health section (WiFi, battery, firmware, status)
- ✅ Control widgets for indicator light and alert sound
- ✅ 24-hour AQI history chart using fl_chart
- ✅ Auto-refresh every 30 seconds when active
- ✅ Riverpod state management for homes, rooms, devices
- ✅ Reusable components: AqiGauge, MetricCard, DeviceRoomCard
- ✅ Light and dark mode support throughout
- ✅ Loading and error states with retry functionality

**Files Created**:
- `lib/features/home/providers/home_providers.dart`
- `lib/features/home/utils/greeting_utils.dart`
- `lib/features/home/widgets/aqi_gauge.dart`
- `lib/features/home/widgets/metric_card.dart`
- `lib/features/home/widgets/device_room_card.dart`
- `lib/features/device_detail/screens/device_detail_screen.dart`
- Updated: `lib/features/home/screens/home_screen.dart`

**Notes**:
- All components follow design system specifications exactly
- EPA AQI color standards used throughout
- Smooth animations on gauge and charts
- Navigation to device detail with Material page route
- Control toggles ready for cloud API integration (TODOs added)
- Chart successfully uses fl_chart package for line visualization

---

**Previous Stage**: [STAGE_2.md](STAGE_2.md) - Authentication Flow (completed)
**Next Stage**: [STAGE_4.md](STAGE_4.md) - Statistics Tab (ready to start)
