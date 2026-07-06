# Stage 5: Map Tab

**Status**: 🚧 Not Started
**Estimated Duration**: 4-5 hours

---

## Objectives

Complete **Section 5 (Map Tab)** from [sensair_mobile_todo.md](sensair_mobile_todo.md).

---

## Tasks

### Section 5: Map Tab

- [ ] Implement base Map tab screen skeleton:
  - Create proper state management with Riverpod
  - Set up map repository and providers
  - Implement loading states and error handling
  - Add permission handling for location services

- [ ] Integrate Google Maps SDK:
  - Use google_maps_flutter package (already in pubspec.yaml)
  - Configure Google Maps API keys for iOS and Android
  - Initialize map with default location
  - Implement map controller and camera controls
  - Add user location marker with permission handling

- [ ] Implement search bar with autocomplete:
  - Create search input field with debouncing
  - Integrate location search API (Google Places or similar)
  - Display autocomplete suggestions
  - Handle search result selection
  - Animate map to selected location

- [ ] Render AQ polygons/tiles with AQI colors:
  - Create polygon/tile overlay layer
  - Fetch AQ data for visible map area
  - Color polygons based on AQI values (EPA standards)
  - Update polygons when map viewport changes
  - Add polygon tap interaction to show AQI details

- [ ] Implement bottom sheet with location list:
  - Create draggable bottom sheet component
  - Display list of nearby locations/devices
  - Show AQI pills for each location
  - Sort by distance or AQI value
  - Make list items tappable to center map

- [ ] Implement map interactions:
  - Tap on polygon/tile to show AQI info popup
  - Tap on list item to center map and show marker
  - Handle map pan/zoom to refresh AQ data
  - Add info window for selected locations
  - Implement "My Location" button

- [ ] Connect to backend map API:
  - Implement map repository methods
  - Add API endpoint for AQ tiles/polygons by viewport
  - Add API endpoint for nearby locations
  - Handle viewport-based data loading
  - Implement caching for map data

- [ ] Add location permissions handling:
  - Use permission_handler package (if not already present)
  - Request location permissions with explanations
  - Handle permission denied scenarios
  - Show settings link if permission permanently denied
  - Gracefully handle location unavailable state

---

## Documentation References

Read these before starting:

1. **[sensair_mobile_todo.md](sensair_mobile_todo.md)** - Full task checklist
2. **[docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)** - Map API endpoints
3. **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - Map UI specs, colors, markers
4. **[docs/QUESTIONS_ANSWERED.md](docs/QUESTIONS_ANSWERED.md)** - Technical decisions

---

## Success Criteria

- [ ] Map screen displays with Google Maps integration
- [ ] User location marker shows when permission granted
- [ ] Search bar allows location search with autocomplete
- [ ] AQ polygons/tiles render with correct AQI colors
- [ ] Bottom sheet displays list of nearby locations with AQI
- [ ] Tapping polygon shows AQI info popup
- [ ] Tapping list item centers map on location
- [ ] Map refreshes AQ data when viewport changes
- [ ] Location permissions handled gracefully
- [ ] "My Location" button centers map on user
- [ ] Loading states show during data fetches
- [ ] Error states display user-friendly messages
- [ ] All colors match EPA AQI standards
- [ ] Data properly cached for offline viewing
- [ ] No build errors or analyzer warnings
- [ ] Code follows Flutter/Dart style guidelines

---

## Implementation Guidelines

1. **Follow the Design System**: Use exact map specs from [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
2. **State Management**: Use Riverpod for all state
3. **Maps Package**: Use google_maps_flutter
4. **Data Flow**: Repository → Provider → UI
5. **Error Handling**: Display user-friendly error messages
6. **Loading States**: Show spinners during data loads
7. **Caching**: Cache map data (viewport-specific, 5-minute expiry)
8. **Permissions**: Handle all permission states gracefully
9. **Code Style**: Run `flutter analyze` and fix all warnings
10. **Git Commits**: Make atomic commits for each subsection

---

## API Endpoints Used

From [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md):

### New Endpoints Needed (may require backend implementation):
- `GET /map/aqi-tiles?bounds={north,south,east,west}&zoom={level}` - Get AQI tiles for map area
- `GET /map/locations?lat={lat}&lng={lng}&radius={meters}` - Get nearby locations with AQI
- `GET /map/polygon/{id}` - Get detailed AQI info for specific polygon

**Note**: If map endpoints are not implemented in backend, use device locations from homes/rooms and create simple circle markers instead of polygons.

---

## Component Specifications

### Map View
- Full screen map using google_maps_flutter
- Default zoom level: 12
- Min zoom: 3
- Max zoom: 18
- Map type: Normal (with option to switch to satellite)

### Search Bar
- Height: 56px
- Background: White / Surface
- Border Radius: 28px
- Shadow: 0px 2px 8px rgba(0,0,0,0.15)
- Icon: Search icon (24px)
- Placeholder: "Search location..."
- Position: Floating at top with 16px margins

### Bottom Sheet
- Initial peek height: 120px
- Max height: 60% of screen
- Background: Surface color
- Border radius: 16px (top corners)
- Drag handle: 32px wide, 4px tall, centered at top
- Content: Scrollable list of location cards

### Location Cards (in bottom sheet)
- Height: 72px
- Padding: 12px 16px
- Border radius: 12px
- Layout: [Icon] Location Name + Distance [AQI Badge]
- Tap: Center map on location

### AQI Polygons/Tiles
- Stroke width: 2px
- Stroke color: AQI color at 80% opacity
- Fill color: AQI color at 30% opacity
- Colors: EPA AQI standard colors from theme

### User Location Marker
- Icon: Blue dot with pulse animation
- Accuracy circle: Light blue at 20% opacity
- Size: 16px dot

### Info Window (on tap)
- Background: White / Surface
- Border radius: 8px
- Shadow: 0px 4px 12px rgba(0,0,0,0.15)
- Content: Location name, AQI value, AQI band, timestamp

---

## Google Maps Configuration

### Android (android/app/src/main/AndroidManifest.xml)
```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="${GOOGLE_MAPS_API_KEY}"/>
```

### iOS (ios/Runner/AppDelegate.swift)
```swift
GMSServices.provideAPIKey("YOUR_API_KEY")
```

### Permissions

**Android (AndroidManifest.xml)**:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
```

**iOS (Info.plist)**:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby air quality data</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>We need your location to show nearby air quality data</string>
```

---

## Sample Data Structure

If backend map endpoints are not ready, use device locations:

```dart
// Example: Convert devices to map markers
List<Marker> devicesToMarkers(List<Device> devices, List<SensorReading> readings) {
  final markers = <Marker>[];

  for (final device in devices) {
    if (device.location != null) {
      final reading = readings.firstWhere(
        (r) => r.deviceId == device.id,
        orElse: () => null,
      );

      final aqi = reading?.aqi ?? 0;
      final aqiInfo = calculateAQI(aqi);

      markers.add(Marker(
        markerId: MarkerId(device.id),
        position: LatLng(device.location.lat, device.location.lng),
        icon: _getMarkerIcon(aqiInfo.color),
        infoWindow: InfoWindow(
          title: device.name,
          snippet: 'AQI: $aqi - ${getAQIBandName(aqiInfo.band)}',
        ),
      ));
    }
  }

  return markers;
}
```

---

## Notes & Decisions

- **Google Maps API Key**: Required for both iOS and Android
- **Location Permission**: Request "when in use" permission, not "always"
- **Offline Mode**: Show cached markers when no internet connection
- **Polygon Complexity**: If too many polygons, switch to heatmap overlay
- **Search Provider**: Use Google Places API or simple lat/lng geocoding
- **Data Refresh**: Refresh AQ data when map idle after pan/zoom
- **Default Location**: Use last known location or home location as default

---

## After Completion

When Stage 5 is complete:

1. **Test the Map tab**:
   ```bash
   flutter pub get
   flutter analyze
   # Test location permissions
   # Test search functionality
   # Test map interactions (pan, zoom, tap)
   # Test with/without location permission
   # Test offline mode
   ```

2. **Commit your work**:
   ```bash
   git add .
   git commit -m "Complete Stage 5: Map tab implementation"
   git push
   ```

3. **Create `STAGE_6.md`** following the same format for Section 6 (Profile Tab)

4. **Update `STAGE_5.md`**:
   - Change status to: `✅ Completed - [DATE]`
   - Add "Completed By" section with any notes

5. **Update `PROGRESS.md`**:
   ```markdown
   ## Completed Stages
   - ✅ Stage 1: Project Setup & Data Layer - [DATE]
   - ✅ Stage 2: Authentication Flow - [DATE]
   - ✅ Stage 3: Home Tab - [DATE]
   - ✅ Stage 4: Statistics Tab - [DATE]
   - ✅ Stage 5: Map Tab - [DATE]

   ## Current Stage
   - 🚧 Stage 6: Profile Tab - Ready to start
   ```

---

## Questions or Issues?

If you encounter ambiguity:
1. Check the documentation files first
2. Look at the API specification for endpoint details
3. Reference the design system for exact map specs
4. For missing backend endpoints, use device location markers
5. Use google_maps_flutter documentation: https://pub.dev/packages/google_maps_flutter
6. For permissions: https://pub.dev/packages/permission_handler
7. Document your decision in code comments
8. Note it in PROGRESS.md for review

---

**Previous Stage**: [STAGE_4.md](STAGE_4.md) - Statistics Tab (completed)
**Next Stage**: [STAGE_6.md](STAGE_6.md) - Profile Tab (to be created)
