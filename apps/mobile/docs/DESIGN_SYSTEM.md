# Sensair Mobile App - Design System

Version: 0.1
Based on: Design inspiration screenshots

This document specifies the visual design system, UI patterns, colors, typography, and component guidelines for the Sensair mobile app.

---

## Design Principles

1. **Clean and Modern**: Minimal clutter, generous whitespace
2. **Data-First**: Prioritize clarity of air quality information
3. **Accessible**: High contrast, readable font sizes, clear labels
4. **Responsive**: Adapt to different screen sizes and orientations
5. **Consistent**: Unified design language across all screens

---

## Color Palette

### Theme Colors

#### Primary Brand Colors
```
Teal/Cyan (Primary):     #26D0CE (rgb(38, 208, 206))
Teal Dark:               #1BA8A6
Teal Light:              #4DD9D7
```

#### Gradient Headers
**Light Mode**:
```css
background: linear-gradient(135deg, #26D0CE 0%, #1BA8A6 100%)
```

**Dark Mode**:
```css
background: linear-gradient(135deg, #1A5F5E 0%, #0D3635 100%)
```

### AQI Color Scale

Based on EPA Air Quality Index standards:

| AQI Range | Band | Color (Hex) | Color (RGB) | Usage |
|-----------|------|-------------|-------------|-------|
| 0-50 | Good | `#00E400` | rgb(0, 228, 0) | Gauges, charts, badges |
| 51-100 | Moderate | `#FFFF00` | rgb(255, 255, 0) | Gauges, charts, badges |
| 101-150 | Unhealthy for Sensitive Groups | `#FF7E00` | rgb(255, 126, 0) | Gauges, charts, badges |
| 151-200 | Unhealthy | `#FF0000` | rgb(255, 0, 0) | Gauges, charts, badges |
| 201-300 | Very Unhealthy | `#8F3F97` | rgb(143, 63, 151) | Gauges, charts, badges |
| 301-500 | Hazardous | `#7E0023` | rgb(126, 0, 35) | Gauges, charts, badges |

**Important**: Use these exact colors for all AQI visualizations to maintain consistency with EPA standards and user familiarity.

### Metric-Specific Colors

For charts and metric cards:

```
PM2.5:        #FF7E00 (orange)
PM10:         #8F3F97 (purple)
CO₂:          #FF0000 (red)
Temperature:  #4DD9D7 (cyan)
Humidity:     #00E400 (green)
VOC:          #FFFF00 (yellow)
Noise:        #1BA8A6 (teal)
```

### Neutral Colors

#### Light Theme
```
Background:           #FFFFFF
Surface:              #F5F5F5
Surface Elevated:     #FFFFFF
Border:               #E0E0E0
Divider:              #E0E0E0

Text Primary:         #212121
Text Secondary:       #757575
Text Disabled:        #BDBDBD
```

#### Dark Theme
```
Background:           #121212
Surface:              #1E1E1E
Surface Elevated:     #2C2C2C
Border:               #3C3C3C
Divider:              #3C3C3C

Text Primary:         #FFFFFF
Text Secondary:       #B0B0B0
Text Disabled:        #6C6C6C
```

### Status Colors

```
Online/Success:       #00E400
Warning:              #FFFF00
Error/Offline:        #FF0000
Info:                 #26D0CE
```

---

## Typography

### Font Family

**Primary**: System default (platform-specific)
- iOS: SF Pro, SF Pro Rounded
- Android: Roboto

**Fallback**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

### Type Scale

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display Large | 48px | 700 | 56px | Large AQI gauge number |
| Display | 36px | 700 | 44px | Main headings |
| Headline 1 | 28px | 600 | 36px | Screen titles |
| Headline 2 | 24px | 600 | 32px | Section headers |
| Headline 3 | 20px | 600 | 28px | Card titles |
| Body Large | 18px | 400 | 26px | Primary content |
| Body | 16px | 400 | 24px | Default text |
| Body Small | 14px | 400 | 20px | Secondary text |
| Caption | 12px | 400 | 16px | Labels, timestamps |
| Label | 14px | 500 | 20px | Button text, tabs |

### Text Styles

**Greeting Text** (Home header):
- Font: Body Large (18px)
- Weight: 400
- Color: White (on gradient header)
- Example: "Good morning, Jenny"

**AQI Value** (Main gauge):
- Font: Display Large (48px)
- Weight: 700
- Color: Match AQI band color
- Example: "32"

**AQI Band Label** (Below gauge number):
- Font: Headline 3 (20px)
- Weight: 600
- Color: Match AQI band color
- Example: "Good"

**Metric Value** (Quick cards):
- Font: Headline 2 (24px)
- Weight: 600
- Color: Text Primary

**Metric Label** (Quick cards):
- Font: Caption (12px)
- Weight: 400
- Color: Text Secondary
- Example: "PM2.5", "Temperature"

**Tab Labels**:
- Font: Label (14px)
- Weight: 500
- Active: Text Primary
- Inactive: Text Secondary

---

## Component Library

### 1. AQI Gauge (Circular)

**Reference**: Screenshot 01 - Home screen main gauge

**Specifications**:
- Diameter: 180px (mobile), scales with screen size
- Arc thickness: 12px
- Start angle: 135° (bottom-left)
- End angle: 405° (bottom-right)
- Arc coverage: 270° total
- Color: Gradient based on AQI value
- Inner text:
  - AQI value (Display Large, 48px, bold)
  - Band label (Headline 3, 20px, semibold)
  - Optional percentage (Body Small, 14px)

**Animation**: Smooth arc fill on load (0.8s ease-out)

**Component Variants**:
- **Large** (Home screen): 180px
- **Medium** (Device detail): 120px
- **Small** (List item): 60px

---

### 2. Metric Card

**Reference**: Screenshot 01 - Temperature and PM2.5 cards

**Layout**:
```
┌─────────────────┐
│ Label (Caption) │
│ Value (H2)      │
│ Unit (Caption)  │
│ [Status Icon]   │
└─────────────────┘
```

**Specifications**:
- Background: Surface (light) / Surface Elevated (dark)
- Border Radius: 16px
- Padding: 16px
- Shadow: 0px 2px 8px rgba(0,0,0,0.08)
- Min Width: 100px
- Min Height: 100px

**Status Indicator**:
- Small icon (16px) or colored dot
- Colors: Green (OK), Yellow (Moderate), Red (High)

**Example**:
```
Temperature
54
Fahrenheit
[green checkmark]
```

---

### 3. Device/Room Card (List Item)

**Reference**: Screenshot 01 - Room list at bottom

**Layout**:
```
┌────────────────────────────────┐
│ [Icon] Room Name       [Badge] │
│        Floor • Status           │
└────────────────────────────────┘
```

**Specifications**:
- Background: Surface
- Border Radius: 12px
- Padding: 12px 16px
- Height: 72px
- Tap area: Full card

**Badge** (AQI pill):
- Background: AQI color (20% opacity)
- Text: AQI value
- Text Color: AQI color (full opacity)
- Border Radius: 12px
- Padding: 4px 12px
- Font: Label (14px, semibold)

**Status Indicator**:
- Dot (8px diameter)
- Colors: Green (online), Gray (offline)

---

### 4. Chart Components

#### Donut Chart (AQI Distribution)
**Reference**: Screenshot 02 - AQI Overview of the Week

**Specifications**:
- Diameter: 120px
- Hole diameter: 60px (50% of outer)
- Segments: Colored by AQI band
- Segment spacing: 2px gap
- Legend: Right side, list format
  - Each item: [colored square] Label - Duration

**Data Labels**:
- Inside segment: Percentage or duration
- Font: Caption (12px, semibold)

#### Horizontal Bar Chart
**Reference**: Screenshot 02 - Average AQI by Locations

**Specifications**:
- Bar height: 32px
- Bar spacing: 8px vertical gap
- Bar radius: 6px
- Bar color: AQI band color
- Value label: End of bar, Body (16px)
- Y-axis labels: Body Small (14px), left-aligned

**Example**:
```
Indoor
  [====================] 90
Work
  [===========] 44
Home
  [===============] 60
```

#### Vertical Bar Chart
**Reference**: Screenshot 02 - Average AQI by Hours

**Specifications**:
- Bar width: 16px
- Bar spacing: 8px horizontal gap
- Bar radius: 4px (top only)
- Bar color: AQI band color
- X-axis labels: Caption (12px), rotated if needed
- Y-axis: Optional grid lines (light gray)
- Max height: 200px

**Interaction**:
- Tap bar → highlight and show exact value tooltip

---

### 5. Tab Bar (Bottom Navigation)

**Reference**: Screenshots show bottom tab navigation

**Specifications**:
- Height: 56px
- Background: Surface
- Top border: 1px Divider color
- Tab count: 4 (Home, Statistics, Map, Profile)
- Active indicator: Icon + label in Primary color
- Inactive: Icon + label in Text Secondary

**Tab Item**:
```
[Icon 24x24]
Label
```

**Icons** (Material or SF Symbols):
- Home: `home` / `house`
- Statistics: `bar_chart` / `chart.bar`
- Map: `map` / `map`
- Profile: `person` / `person.circle`

**Active State**:
- Icon color: Primary (#26D0CE)
- Label color: Primary
- Font weight: 600

**Inactive State**:
- Icon color: Text Secondary
- Label color: Text Secondary
- Font weight: 400

---

### 6. Header (Gradient)

**Reference**: Screenshot 01 - Top gradient section

**Specifications**:
- Height: Auto (content-based)
- Min Height: 200px
- Gradient: See "Gradient Headers" in Color Palette
- Padding: 24px horizontal, 32px vertical
- Safe area: Respect top notch/status bar

**Content Layout**:
```
Greeting text (white, Body Large)
Location / Home name (white, Caption)
Status summary (white, Caption)

[Main content - e.g., AQI gauge]

[Optional action buttons]
```

---

### 7. Buttons

#### Primary Button
- Background: Primary color (#26D0CE)
- Text: White
- Font: Label (14px, semibold)
- Height: 48px
- Border Radius: 24px (fully rounded)
- Padding: 12px 24px
- Shadow: 0px 2px 4px rgba(38, 208, 206, 0.3)

**Hover/Press**:
- Background: Teal Dark (#1BA8A6)
- Scale: 0.98

#### Secondary Button
- Background: Transparent
- Border: 1px Primary color
- Text: Primary color
- Same dimensions as Primary

#### Text Button
- Background: Transparent
- Text: Primary color
- Font: Label (14px, semibold)
- Padding: 8px 16px
- No border, no shadow

---

### 8. Segmented Control (Time Range Selector)

**Reference**: Screenshot 02 - Week/Month selector, Screenshot 05 - Days/Weeks/Months/All

**Specifications**:
- Background: Surface / rgba(255,255,255,0.1) on dark
- Border Radius: 8px
- Height: 40px
- Padding: 2px

**Segment**:
- Active background: Primary color (light theme) or Surface Elevated (dark)
- Active text: White (light) or Primary (dark)
- Inactive text: Text Secondary
- Font: Label (14px, semibold)
- Border Radius: 6px
- Transition: 0.2s ease

**Layout**:
```
[Day] [Week] [Month] [All]
```

---

### 9. Search Bar

**Reference**: Screenshot 03, 04 - Map search

**Specifications**:
- Height: 48px
- Background: Surface
- Border Radius: 24px
- Padding: 12px 16px
- Shadow: 0px 2px 8px rgba(0,0,0,0.1)

**Content**:
- [Search icon 20px] Placeholder text
- Font: Body (16px)
- Icon color: Text Secondary

**Focus State**:
- Border: 2px Primary color
- Shadow: 0px 4px 12px rgba(38, 208, 206, 0.2)

---

### 10. Bottom Sheet

**Reference**: Screenshot 03 - Map location list

**Specifications**:
- Background: Surface
- Border Radius: 24px (top corners only)
- Shadow: 0px -2px 16px rgba(0,0,0,0.1)
- Handle: 32px wide, 4px tall, gray, centered

**Behavior**:
- Draggable (swipe up/down)
- Snap points: Collapsed (20%), Half (50%), Expanded (90%)
- Backdrop: Semi-transparent overlay when expanded

**Content**:
- Padding: 16px
- List items with dividers

---

## Layout Grid

### Spacing Scale

Use consistent spacing multiples of 4px:

```
4px   - xs (micro gaps)
8px   - sm (between related items)
12px  - md (card padding)
16px  - lg (section padding)
24px  - xl (major sections)
32px  - 2xl (screen padding)
48px  - 3xl (major dividers)
```

### Safe Areas

- **Top**: Status bar + notch (iOS: 44-48px, Android: 24px)
- **Bottom**: Home indicator (iOS: 34px) or navigation bar (Android: 48px)
- **Horizontal**: 16px minimum padding on all screens

### Breakpoints

While primarily mobile, consider tablet support:

- **Phone**: < 600px width
- **Tablet**: 600px - 900px width
- **Desktop** (future): > 900px width

---

## Iconography

### Icon Set

Use **Material Symbols** (Android/cross-platform) or **SF Symbols** (iOS native).

### Common Icons

| Element | Icon Name (Material) | Icon Name (SF) |
|---------|----------------------|----------------|
| Home | `home` | `house` |
| Statistics | `bar_chart` | `chart.bar` |
| Map | `map` | `map` |
| Profile | `person` | `person.circle` |
| Settings | `settings` | `gearshape` |
| Alert | `notification_important` | `exclamationmark.triangle` |
| Online | `check_circle` | `checkmark.circle.fill` |
| Offline | `cancel` | `xmark.circle.fill` |
| Battery | `battery_std` | `battery.100` |
| WiFi | `wifi` | `wifi` |
| Bluetooth | `bluetooth` | `bluetooth` |
| Refresh | `refresh` | `arrow.clockwise` |
| Search | `search` | `magnifyingglass` |
| Close | `close` | `xmark` |
| Info | `info` | `info.circle` |
| Edit | `edit` | `pencil` |
| Delete | `delete` | `trash` |

### Icon Sizes

- **Navigation/Tabs**: 24x24px
- **Action buttons**: 24x24px
- **List items**: 20x20px
- **Status indicators**: 16x16px

### Icon Colors

- **Active/Primary**: Primary color (#26D0CE)
- **Default**: Text Secondary
- **Status**: Match status color (green, yellow, red)

---

## Animations and Transitions

### Principles

- **Subtle**: Don't distract from content
- **Purposeful**: Indicate state changes, provide feedback
- **Fast**: 200-300ms for most transitions

### Common Animations

**Screen Transitions**:
- Push/Pop: Slide from right (iOS), Fade + slide (Android)
- Modal: Slide up from bottom
- Duration: 300ms
- Easing: ease-out

**Loading States**:
- Skeleton screens (shimmer effect)
- Spinner: Primary color, 40px diameter
- Duration: Continuous until loaded

**Button Press**:
- Scale: 0.98
- Opacity: 0.8
- Duration: 100ms

**Chart Load**:
- Bars: Grow from 0 to full height
- Donut: Arc draws clockwise
- Duration: 800ms
- Easing: ease-out

**Pull-to-Refresh**:
- Spinner appears at top
- Fade in: 200ms
- Spin: Continuous
- Success: Checkmark for 300ms, then fade out

---

## Accessibility

### Color Contrast

Ensure WCAG AA compliance (4.5:1 for normal text):
- All text on gradient headers: White (meets AA)
- AQI colors on white background: Verify contrast
- Dark mode: Ensure all colors meet contrast requirements

### Font Scaling

- Support system font size preferences
- Test with 200% text scaling
- Ensure buttons and tap targets remain accessible

### Touch Targets

- Minimum: 44x44px (iOS), 48x48px (Android)
- Spacing: At least 8px between interactive elements

### Screen Readers

- Label all icons and images
- Provide meaningful descriptions for charts
- Announce AQI values and bands
- Group related content

---

## Dark Mode Specifics

### Adaptations

1. **Gradient Headers**: Use darker teal gradient
2. **Cards**: Use elevated surface color, not white
3. **Shadows**: Reduce opacity, use lighter shadows
4. **Charts**: Maintain AQI colors, adjust backgrounds
5. **Text**: Ensure sufficient contrast on dark surfaces

### Testing

Test all screens in both light and dark modes to ensure:
- Readability
- Color harmony
- Brand consistency

---

## Platform-Specific Guidelines

### iOS
- Use SF Symbols for icons
- Follow iOS Human Interface Guidelines
- Use native navigation patterns (back button, modal sheets)
- Safe area insets for notch and home indicator

### Android
- Use Material Symbols for icons
- Follow Material Design 3 guidelines
- Use native navigation patterns (back gesture, app bar)
- Edge-to-edge display with system bars

---

## Design Asset Delivery

### Formats

- **Icons**: SVG (vector) or PNG @1x, @2x, @3x
- **Images**: PNG or WebP
- **Logos**: SVG preferred

### Naming Convention

```
ic_[name]_[size]_[variant].png

Examples:
ic_home_24_active.png
ic_home_24_inactive.png
img_empty_state_devices.png
```

---

## Reference Screenshots

Design inspiration screenshots are located in:
`docs/design-screenshots/`

- `01-home-screen.png` - Home tab with gradient and gauge
- `02-statistics-week.png` - Statistics with charts
- `03-map-view.png` - Map with AQ polygons
- `04-map-search.png` - Map search functionality
- `05-statistics-dark.png` - Dark mode statistics
- `06-device-history.png` - Device timeline view

---

## Tools and Resources

### Design Tools
- Figma (recommended for prototyping)
- Sketch
- Adobe XD

### Icon Libraries
- Material Symbols: https://fonts.google.com/icons
- SF Symbols: https://developer.apple.com/sf-symbols/

### Color Tools
- Coolors: https://coolors.co/
- Adobe Color: https://color.adobe.com/
- Contrast Checker: https://webaim.org/resources/contrastchecker/

---

## Changelog

- **v0.1 (2025-01-22)**: Initial design system based on inspiration screenshots
