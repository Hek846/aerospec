# Sensair Mobile App – Product Requirements Document (PRD)

Version: 0.1  
Owner: Joe He / Sensair team  
Target: Cross‑platform mobile app (Flutter preferred; React Native or similar also acceptable)  
Platforms: iOS, Android (web/desktop optional later)

This PRD defines requirements for the Sensair mobile app. The mobile app complements the Sensair web app and focuses on consumer use, device setup, and day‑to‑day monitoring.

The app will:

- Help users set up Sensair devices over Bluetooth.
- Communicate with devices and backend services to show real‑time air quality.
- Provide insights and trends based on historical readings.
- Show a crowdsourced air quality map.
- Let users manage their account and device preferences.

The design should follow clean, modern, minimal patterns similar to the attached inspiration screenshots: gradient headers, circular AQI gauges, card‑based metrics, and simple tab navigation with clear typography.

---

## 1. Product Goals

### 1.1 Primary Goals

- Make it easy for a new user to set up a Sensair device in a few minutes via Bluetooth.
- Provide a clear, friendly view of indoor air quality for each room.
- Show trends and alerts by day, week, month, and all time.
- Provide a crowdsourced community AQ map for local and remote locations.
- Enable basic device control and configuration after onboarding.
- Keep the UX consistent with the Sensair web app while optimized for mobile.

### 1.2 Non‑Goals (V1)

- No complex admin tools in the mobile app (admins use web app).
- No full offline mode beyond simple caching.
- No advanced ML models beyond rule‑based insights supplied by the backend.
- No third‑party integrations (e.g., HomeKit, Google Home) in V1.
- No public developer API exposure.

---

## 2. Users and Use Cases

### 2.1 Users

- **Home owner / primary user**  
  Sets up devices, manages rooms, checks air quality, configures alerts.

- **Household member / standard user**  
  Invited by owner. Views data and receives alerts. May adjust some settings if allowed.

### 2.2 Key Use Cases

1. First‑time user unboxes a device and sets it up via Bluetooth and Wi‑Fi.
2. User opens app to quickly check if the air quality at home is “OK now”.
3. User opens **Statistics** to see how air quality changed this week and which room is worst.
4. User checks the **Map** to see AQ in their neighborhood or a destination (e.g., workplace, school).
5. User receives an alert about poor AQ and opens the app to see details and history.
6. User manages multiple devices (e.g., bedrooms, living room, family room) and renames or moves them.
7. User updates device firmware when notified.

---

## 3. Information Architecture and Navigation

The app uses a bottom navigation bar with four tabs:

1. **Home**
2. **Statistics**
3. **Map**
4. **Profile**

On iOS and Android, the tab bar sits at the bottom with clear icons and labels.

### 3.1 Navigation Model

- Global tabs are always visible once the user is authenticated.
- Each tab can have its own nested stack (e.g., Home → Device detail, Statistics → Detail view).
- From Home or Statistics, user can deep‑link into specific device or room views.
- The onboarding flow (BLE setup) appears before the main tab bar or as a modal flow from Home when adding another device.

---

## 4. Home Tab

### 4.1 Purpose

Provide a quick, friendly overview of the user’s current air quality and device status. This is the default landing screen after login.

### 4.2 Content and Layout

Use the first inspiration screenshot set as a style guide: gradient header, big readable numbers, circular AQI gauge, and cards.

**Header section**

- Greeting line: “Good morning, {name}” or similar.
- Selected “Home” (if the user has multiple homes; V1 may support one).
- Connection status summary (e.g., “All devices online” or “1 offline”).

**Main AQI gauge**

- Large circular AQI gauge similar to sample screenshot:
  - Shows current AQI value and category (Good / Moderate / Unhealthy for sensitive groups / etc.).
  - Uses color gradient arc that changes with AQI.
- Under gauge:
  - Short message (e.g., “Air looks good.” / “Air is a bit polluted. Ventilate the room.”).

**Quick metrics cards**

Horizontal or grid cards for the default room or aggregated home view:

- Temperature
- PM2.5
- CO₂
- Humidity
- VOC index
- Noise

Each card shows:

- Metric name
- Current value + unit
- Sub‑indicator (e.g., “OK” or “High” icon)

**Devices summary list**

- List of devices/rooms with compact cards:
  - Room name (Bedroom 1, Living Room, etc.)
  - Small AQI pill with color
  - Online/offline status
  - Tap card → Device detail screen

### 4.3 Interactions

- Pull‑to‑refresh for latest readings from backend.
- Tap gauge → quick view of AQI history for the last 24h.
- Tap device card → device detail including per‑metric readings and control options.

### 4.4 Device Detail View (from Home)

- Per‑device AQI gauge.
- Live readings for all metrics.
- Device health: Wi‑Fi RSSI, battery, firmware version.
- Simple controls (backed by Bluetooth when near device or cloud if remote):
  - Toggle indicator light on/off.
  - Toggle sound on alerts.
  - (Leave room for future controls such as fan speed, etc.).

---

## 5. Statistics Tab

### 5.1 Purpose

Provide deeper insights into the user’s historical data. Inspired by the “This Week” and sleep statistics screenshots.

### 5.2 Time Range Selector

At top of page, use segmented control:

- Day | Week | Month | All

The active tab drives query time range and chart layout.

### 5.3 Core Sections (per range)

Apply variations of these components based on selected range.

1. **AQI overview**  
   - Donut or pie chart summarizing time spent in AQI bands (Good, Moderate, Unhealthy for sensitive, etc.).  
   - Caption like “4 days Good, 2 days Moderate, 1 day Unhealthy for sensitive group” for week view.

2. **Compare average AQI**  
   - Cards for key groupings, similar to “Beta 15 / Seattle users / US users” inspiration:  
     - For Sensair, show: per‑room averages (Bedroom 1, Bedroom 2, Living Room, Family Room).  
   - Each card: rounded card with label and big all‑time or period average AQI.

3. **Average AQI by locations (rooms)**  
   - Horizontal bar chart grouped by “Indoor” rooms.  
   - Bars colored by AQ band; numeric labels at bar end.

4. **Average AQI by hours**  
   - Bar chart along x‑axis of time (24h for Day, aggregated per hour for Week/Month).  
   - Bars colored by AQ band; highlight worst hours.

5. **Alerts and anomalies list**  
   - List of days or events where metrics crossed thresholds, with icons per metric (PM, CO₂, VOC, Noise).  
   - Tap event → small detail view with mini chart for that metric.

### 5.4 Drill‑down View

- From any chart or card, tap to open a detail screen:
  - Larger chart with pinch‑zoom and pan.
  - Metric picker to switch among PM2.5, CO₂, etc.
  - Room picker (for cross‑room comparisons).

### 5.5 Data Source

- Use backend aggregate APIs that mirror the web app’s analytics.
- Mobile app should not do heavy aggregation; only light post‑processing (formatting, labeling).

---

## 6. Map Tab (Crowdsourced AQ Map)

### 6.1 Purpose

Allow users to see outdoor AQ and approximate indoor contributions in their community and other locations of interest. Design is inspired by the included AQ map screenshots.

### 6.2 Features

- Full‑screen map with bottom sheet list of nearby locations.  
- Colored polygons or hex tiles to indicate AQ levels (green, yellow, red, etc.).  
- User location marker (if permission granted).  
- Search bar at top:
  - Search by place name or address.
  - Autocomplete suggestions.
- “Map updated X minutes ago” label.

### 6.3 Interactions

- Pan and zoom map as usual.
- Tap tile/area → show AQ at that location (AQI value, category, last updated).
- Bottom sheet list updates with places around the current viewport:
  - Each item: name, address, AQI pill.  
  - Tap item → centers map and shows details.

### 6.4 Data

- Use a backend endpoint that returns aggregated AQI tiles or polygons plus place summaries.  
- For V1, assume read‑only map; users do not edit or annotate areas.

---

## 7. Profile Tab

### 7.1 Purpose

Contain account settings, device management entry points, and preferences.

### 7.2 Sections

- **User info**  
  - Avatar or initials, name, email.

- **Home and devices**  
  - List of homes (start with one).  
  - Link to “Manage devices” screen (same device list as Home but with settings emphasis).

- **Preferences**  
  - Theme: Light / Dark / System.  
  - Units: °C/°F, 24h/12h time.  
  - Notification preferences (alerts on/off, per metric or severity).

- **Support and legal**  
  - Link to FAQ, support email.  
  - Privacy policy and terms.  
  - App version and build.

- **Sign out** button.

---

## 8. Device Setup and Management (Bluetooth + Wi‑Fi)

### 8.1 Onboarding Triggers

- First app launch after login with no devices.  
- “Add device” button in Home or Profile.

### 8.2 Permissions

- Request Bluetooth + location permissions as required by platform.  
- Explain why they are needed (“to discover and configure your devices”).

### 8.3 Flow Steps

1. **Intro screen**  
   - Brief explanation (1–2 sentences).  
   - “Start setup” button.

2. **Scan for nearby devices**  
   - Use BLE scan for supported Sensair devices.  
   - Show list of discovered devices with ID and signal strength.  
   - Allow “Rescan” and “Help” if nothing found.

3. **Connect and authenticate**  
   - Tap device to connect over BLE.  
   - Perform any required simple pairing/handshake.  
   - Indicate progress with spinner and status text.

4. **Wi‑Fi configuration**  
   - Ask user to choose Wi‑Fi network and enter password.  
   - Send credentials securely to device over BLE.  
   - Show progress while device connects to cloud.

5. **Link to account/home/room**  
   - Ask user to pick or create a room (Bedroom 1, Living Room, etc.).  
   - Assign device to that room and home.  
   - Name the device (default from room).

6. **Final confirmation**  
   - Confirm success and show quick status.  
   - Offer “View on Home” button.

### 8.4 Post‑Setup Management

- User can:
  - Rename device.  
  - Move to another room.  
  - Remove device from account.  
  - Trigger firmware update if available.

### 8.5 Real‑time vs Cloud Communication

- BLE is used for setup and optional local control when app and device are near.  
- Normal operation and historical data come from cloud APIs (same backend as web app).  
- If BLE is available, app may show “Live” label and slightly faster refresh for the selected device; otherwise, rely on cloud polling / push.

---

## 9. Data and API Integration

### 9.1 Alignment with Web App

- Reuse core data models from the web app: User, Home, Room, Device, SensorReading, AlertRule, etc.
- Mobile app should use the same REST endpoints for:
  - Auth and user info  
  - Home and room metadata  
  - Device list and status  
  - Time series and analytics  
  - Alert rules and events  
  - Map tiles / community AQ data

### 9.2 Data Access Layer

The coding agent should:

- Implement a repository layer which hides the HTTP details from UI.  
- Support at least two sources:
  - Remote API (primary).  
  - Local cache (for recent readings and user settings).

- Use simple caching rules:
  - Home and device metadata cached until explicit refresh or background update.  
  - Statistics and map data fetched on demand per time range / viewport.

### 9.3 Real‑time Updates

Preferred, not mandatory in V1:

- Use WebSockets or server‑sent events if backend supports them.  
- Otherwise, poll key endpoints on intervals (e.g., 30–60 seconds while Home is visible).

---

## 10. UX and Visual Design Guidelines

Use the provided screenshots as loose references, not exact copies.

### 10.1 General

- Clean, modern, “tech minimalism”.  
- Generous white space and large tap targets.  
- Rounded cards.  
- Consistent typography hierarchy (title, section header, body, caption).

### 10.2 Colors and Themes

- Support light and dark themes.  
- Use AQI colors for gauges and bars (green, yellow, orange, red, purple).  
- Gradients for headers and hero sections, similar to examples:
  - Blue/teal gradients on Home and device views.  
  - Dark teal gradients on dark theme stat pages.

### 10.3 Charts

- Avoid clutter; focus on 1–2 key metrics per chart.  
- Use consistent colors for metrics:
  - PM2.5, CO₂, etc.  
- Use outline or subtle shading for selected bars in bar charts.  
- Time‑range chips (Day/Week/Month/All) should be clear and easy to tap.

### 10.4 Interactions

- Pull‑to‑refresh where remote data is central (Home, Statistics).  
- Smooth transitions between pages and drill‑downs (e.g., sliding bottom sheets).  
- Toast/snackbar messages for errors and success (e.g., device added, firmware updated).

---

## 11. Non‑Functional Requirements

- **Performance**  
  - Home screen should render within ~1–2 seconds under normal network.  
  - BLE scanning should feel responsive and show progress states.

- **Reliability**  
  - Handle network errors gracefully (show last known values and clear error messages).  
  - Retry failed calls where safe.

- **Security**  
  - Use HTTPS for all backend communication.  
  - Do not store Wi‑Fi passwords after setup.  
  - Protect tokens using platform‑appropriate secure storage.

- **Analytics and Logging**  
  - Track key events (device added, alerts viewed, map searched, etc.) for product analytics.  
  - Log BLE failures for debugging (without sensitive data).

- **Accessibility**  
  - Respect system font size settings as much as possible.  
  - Ensure color contrast for AQI colors especially in dark mode.

---

## 12. Open Questions / Future Work

These items are out of scope for V1 but should be remembered:

- Multi‑home support (second property, office).  
- Integration with platform widgets and complications (iOS widgets, Android home/lock widgets).  
- Support for external integrations (HomeKit, Google Home, Alexa).  
- Social or community features (sharing AQ snapshots).  
- More advanced health‑related insights linking AQ to sleep or symptoms.

End of PRD.
