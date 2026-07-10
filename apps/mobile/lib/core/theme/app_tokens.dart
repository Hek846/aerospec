import 'package:flutter/material.dart';

// Mirrors apps/web/src/styles/theme.css — that file is the source of truth; keep in sync.
abstract final class AppTokens {
  // --------------------------------------------------------------------------
  // Brand / primary split
  // --------------------------------------------------------------------------
  /// Decorative bright teal — gradients, illustrations, large display numerals,
  /// active-state glows. Never use as small-text color or as a background for
  /// small white text.
  static const Color colorPrimaryBright = Color(0xFF26D0CE);

  /// Interactive primary for the light theme. Tuned so that BOTH
  ///   (a) primary-as-text-on-white, and
  ///   (b) white-text-on-primary-fill
  /// pass WCAG AA (4.5:1).
  /// Contrast ratios against white: ~5.05:1 (measured).
  static const Color colorPrimary = Color(0xFF0F7B7F);

  static const Color colorPrimaryLight = Color(0xFF1A9BA1);
  static const Color colorPrimaryDark = Color(0xFF12777C);
  static const Color colorPrimarySurface = Color(0xFFE8F6F6);

  // --------------------------------------------------------------------------
  // Hero gradient
  // --------------------------------------------------------------------------
  static const List<Color> gradientHeroColors = [
    colorPrimaryBright,
    colorPrimaryLight,
    colorPrimaryDark,
  ];
  static const List<double> gradientHeroStops = [0.0, 0.6, 1.0];

  // --------------------------------------------------------------------------
  // Surfaces
  // --------------------------------------------------------------------------
  static const Color colorBackground = Color(0xFFFAFBFC);
  static const Color colorSurface = Color(0xFFFFFFFF);
  static const Color colorSurfaceElevated = Color(0xFFFFFFFF);

  /// Dark theme background family: teal-black base with stepped-lighter
  /// elevated surfaces.
  static const Color colorBackgroundDark = Color(0xFF0B1D1E);
  static const Color colorSurfaceDark = Color(0xFF122A2C);
  static const Color colorSurfaceElevatedDark = Color(0xFF1A383A);

  // --------------------------------------------------------------------------
  // Borders
  // --------------------------------------------------------------------------
  static const Color colorBorderLight = Color(0xFFE0E0E0);
  static const Color colorBorderDark = Color(0xFF3C3C3C);

  // --------------------------------------------------------------------------
  // Text
  // --------------------------------------------------------------------------
  static const Color colorTextPrimary = Color(0xFF1A2332);
  static const Color colorTextSecondary = Color(0xFF4A5568);
  static const Color colorTextTertiary = Color(0xFF718096);
  static const Color colorTextInverse = Color(0xFFFFFFFF);

  static const Color colorTextPrimaryDark = Color(0xFFF9FAFB);
  static const Color colorTextSecondaryDark = Color(0xFFD1D5DB);
  static const Color colorTextTertiaryDark = Color(0xFF9CA3AF);
  static const Color colorTextInverseDark = Color(0xFF1A2332);

  // --------------------------------------------------------------------------
  // Semantic colors
  // --------------------------------------------------------------------------
  static const Color colorSuccess = Color(0xFF10B981);
  static const Color colorWarning = Color(0xFFF59E0B);
  static const Color colorError = Color(0xFFEF4444);
  static const Color colorInfo = Color(0xFF3B82F6);

  // --------------------------------------------------------------------------
  // EPA AQI band colors
  // --------------------------------------------------------------------------
  static const Color colorAqiGood = Color(0xFF00E400);
  static const Color colorAqiModerate = Color(0xFFFFFF00);
  static const Color colorAqiSensitive = Color(0xFFFF7E00);
  static const Color colorAqiUnhealthy = Color(0xFFFF0000);
  static const Color colorAqiVeryUnhealthy = Color(0xFF8F3F97);
  static const Color colorAqiHazardous = Color(0xFF7E0023);

  /// Translucent AQI band variants for hexagon fills and chip backgrounds.
  /// Alpha ~20% (0x33).
  static const Color colorAqiGoodSoft = Color(0x3300E400);
  static const Color colorAqiModerateSoft = Color(0x33FFFF00);
  static const Color colorAqiSensitiveSoft = Color(0x33FF7E00);
  static const Color colorAqiUnhealthySoft = Color(0x33FF0000);
  static const Color colorAqiVeryUnhealthySoft = Color(0x338F3F97);
  static const Color colorAqiHazardousSoft = Color(0x337E0023);

  // --------------------------------------------------------------------------
  // Border radius
  // --------------------------------------------------------------------------
  static const double radiusSm = 4;
  static const double radiusMd = 8;
  static const double radiusLg = 12;
  static const double radiusXl = 16;
  static const double radiusCard = 16;

  /// Large cards, heroes, bottom sheets.
  static const double radiusHero = 24;

  /// Hero header bottom corners.
  static const double radiusHeader = 28;

  static const double radiusFull = 9999;

  // --------------------------------------------------------------------------
  // Spacing scale (4px base)
  // --------------------------------------------------------------------------
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;
  static const double space5 = 24;
  static const double space6 = 32;
  static const double space8 = 48;
  static const double space10 = 64;
  static const double space12 = 96;

  // --------------------------------------------------------------------------
  // Shadows
  // --------------------------------------------------------------------------
  static const double shadowOpacityLight = 0.08;
  static const double shadowOpacityDark = 0.2;
}
