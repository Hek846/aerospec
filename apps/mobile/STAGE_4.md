# Stage 4: Statistics Tab

**Status**: ✅ Completed - 2025-11-23
**Estimated Duration**: 4-5 hours

---

## Objectives

Complete **Section 4 (Statistics Tab)** from [sensair_mobile_todo.md](sensair_mobile_todo.md).

---

## Tasks

### Section 4: Statistics Tab

- [ ] Implement base Statistics tab screen skeleton:
  - Create proper state management with Riverpod
  - Set up data providers for analytics endpoints
  - Implement loading states and error handling
  - Add time range state management

- [ ] Implement time-range segmented control:
  - Create segmented control widget (Day/Week/Month/All)
  - Match design system specifications
  - Connect to data refresh logic
  - Persist selected range in state

- [ ] Implement AQI overview donut chart:
  - Create donut chart component using fl_chart
  - Display AQI band distribution (Good, Moderate, Unhealthy, etc.)
  - Show hours/percentage for each band
  - Add legend with colors matching EPA standards
  - Animate on load (800ms ease-out)

- [ ] Implement "Compare Average AQI" cards:
  - Create comparison card widget
  - Display AQI for each room/device
  - Use metric cards with AQI color coding
  - Sort by AQI value (worst to best)
  - Make tappable to filter statistics

- [ ] Implement "Average AQI by Locations" horizontal bar chart:
  - Create horizontal bar chart component
  - Display average AQI per room
  - Use AQI band colors for bars
  - Show room names and values
  - Sort by AQI value

- [ ] Implement "Average AQI by Hours" vertical bar chart:
  - Create vertical bar chart for hourly distribution
  - Show 24 hours (0-23)
  - Color bars by AQI band
  - Add grid lines and axis labels
  - Enable tap to show exact values

- [ ] Implement alerts/anomalies list section:
  - Display recent alerts from alert repository
  - Show metric, value, timestamp, device/room
  - Use status colors (open, acknowledged, closed)
  - Make tappable to view details or acknowledge
  - Add "See All" link to full alerts view

- [ ] Implement drill-down view for charts:
  - Create detail screen for expanded chart view
  - Show full data table
  - Export functionality (optional for V1)
  - Filter by room/device

- [ ] Connect to backend analytics APIs:
  - Implement analytics repository methods
  - Add API endpoints for AQI distribution
  - Add API endpoints for room comparison
  - Add API endpoints for hourly averages
  - Handle time range parameters
  - Implement caching for analytics data

- [ ] Add pull-to-refresh:
  - Refresh all statistics data
  - Update cache on success
  - Show loading indicators

---

## Documentation References

Read these before starting:

1. **[sensair_mobile_todo.md](sensair_mobile_todo.md)** - Full task checklist
2. **[docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)** - Analytics API endpoints
3. **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - Chart specs, segmented control, colors
4. **[docs/QUESTIONS_ANSWERED.md](docs/QUESTIONS_ANSWERED.md)** - Technical decisions

---

## Success Criteria

- [ ] Statistics screen displays with time-range selector
- [ ] Segmented control switches between Day/Week/Month/All views
- [ ] AQI overview donut chart renders with proper colors
- [ ] Room comparison cards display average AQI values
- [ ] "Average AQI by Locations" horizontal bar chart shows room data
- [ ] "Average AQI by Hours" vertical bar chart displays hourly trends
- [ ] Recent alerts/anomalies list shows latest events
- [ ] Pull-to-refresh updates all statistics
- [ ] Loading states show during data fetches
- [ ] Error states display user-friendly messages
- [ ] All charts use EPA AQI color standards
- [ ] Charts animate smoothly on load
- [ ] Data properly cached for offline viewing
- [ ] No build errors or analyzer warnings
- [ ] Code follows Flutter/Dart style guidelines

---

## Implementation Guidelines

1. **Follow the Design System**: Use exact chart specs from [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
2. **State Management**: Use Riverpod for all state
3. **Charts Package**: Use fl_chart for all visualizations
4. **Data Flow**: Repository → Provider → UI
5. **Error Handling**: Display user-friendly error messages
6. **Loading States**: Show skeleton screens or spinners during data loads
7. **Caching**: Cache analytics data (5-minute expiry recommended)
8. **Code Style**: Run `flutter analyze` and fix all warnings
9. **Git Commits**: Make atomic commits for each subsection

---

## API Endpoints Used

From [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md):

### Existing Endpoints:
- `GET /alerts` - Get alert rules and recent events
- `GET /alerts/events?status=open&limit=10` - Get recent alert events

### New Endpoints Needed (may require backend implementation):
- `GET /analytics/aqi-distribution?homeId={id}&range={day|week|month|all}` - AQI band distribution
- `GET /analytics/aqi-by-room?homeId={id}&range={range}` - Average AQI per room
- `GET /analytics/aqi-by-hour?homeId={id}&range={range}` - Average AQI by hour of day

**Note**: If analytics endpoints are not implemented in backend, use device readings to calculate statistics client-side.

---

## Component Specifications

### Segmented Control (Time Range Selector)
Per [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md):
- Background: Surface / rgba(255,255,255,0.1) on dark
- Border Radius: 8px
- Height: 40px
- Padding: 2px
- Segments: Day | Week | Month | All
- Active: Primary color background, white text
- Inactive: Transparent background, gray text
- Transition: 0.2s ease

### Donut Chart (AQI Distribution)
- Diameter: 120px
- Hole diameter: 60px (50% of outer)
- Segments: Colored by AQI band (EPA colors)
- Segment spacing: 2px gap
- Legend: Right side, list format
- Animation: 800ms ease-out

### Horizontal Bar Chart
- Bar height: 32px
- Bar spacing: 8px vertical gap
- Bar radius: 6px
- Bar color: AQI band color
- Value label: End of bar, 16px
- Y-axis labels: 14px, left-aligned
- Max bar width: 100% = highest value

### Vertical Bar Chart
- Bar width: 16px
- Bar spacing: 8px horizontal gap
- Bar radius: 4px (top only)
- Bar color: AQI band color
- X-axis labels: 12px (hour numbers)
- Y-axis: Optional grid lines
- Max height: 200px

---

## Sample Data Structure

If backend endpoints are not ready, use client-side aggregation:

```dart
// Example: Calculate AQI distribution from readings
Map<String, int> calculateAQIDistribution(List<SensorReading> readings) {
  final distribution = <String, int>{
    'Good': 0,
    'Moderate': 0,
    'Unhealthy for Sensitive Groups': 0,
    'Unhealthy': 0,
    'Very Unhealthy': 0,
    'Hazardous': 0,
  };

  for (final reading in readings) {
    final band = AQI.getAQIInfo(reading.aqi).label;
    distribution[band] = (distribution[band] ?? 0) + 1;
  }

  return distribution;
}
```

---

## Notes & Decisions

- **Time Ranges**:
  - Day: Last 24 hours
  - Week: Last 7 days
  - Month: Last 30 days
  - All: All available data
- **Data Aggregation**: If no backend analytics, aggregate from device readings
- **Caching**: Cache analytics for 5 minutes to reduce API calls
- **Empty States**: Show helpful messages when no data available
- **Chart Interactions**: Basic tap for now, advanced zoom/pan in future
- **Export**: Defer CSV/PDF export to future version

---

## After Completion

When Stage 4 is complete:

1. **Test the Statistics tab**:
   ```bash
   flutter pub get
   flutter analyze
   # Test time range switching
   # Test all charts render correctly
   # Test with different data ranges
   # Test offline mode
   ```

2. **Commit your work**:
   ```bash
   git add .
   git commit -m "Complete Stage 4: Statistics tab implementation"
   git push
   ```

3. **Create `STAGE_5.md`** following the same format for Section 5 (Map Tab)

4. **Update `STAGE_4.md`**:
   - Change status to: `✅ Completed - [DATE]`
   - Add "Completed By" section with any notes

5. **Update `PROGRESS.md`**:
   ```markdown
   ## Completed Stages
   - ✅ Stage 1: Project Setup & Data Layer - [DATE]
   - ✅ Stage 2: Authentication Flow - [DATE]
   - ✅ Stage 3: Home Tab - [DATE]
   - ✅ Stage 4: Statistics Tab - [DATE]

   ## Current Stage
   - 🚧 Stage 5: Map Tab - Ready to start
   ```

---

## Questions or Issues?

If you encounter ambiguity:
1. Check the documentation files first
2. Look at the API specification for endpoint details
3. Reference the design system for exact chart specs
4. For missing backend endpoints, implement client-side aggregation
5. Use fl_chart documentation: https://pub.dev/packages/fl_chart
6. Document your decision in code comments
7. Note it in PROGRESS.md for review

---

**Previous Stage**: [STAGE_3.md](STAGE_3.md) - Home Tab (completed)
**Next Stage**: [STAGE_5.md](STAGE_5.md) - Map Tab (to be created)
