import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_tokens.dart';

/// Theme mode provider
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

/// App theme configuration based on the unified AeroSpec design system.
class AppTheme {
  // --------------------------------------------------------------------------
  // Legacy brand aliases — kept for backwards compatibility with consumers.
  // New code should prefer AppTokens directly.
  // --------------------------------------------------------------------------
  static const Color primaryTeal = AppTokens.colorPrimaryBright;
  static const Color tealDark = AppTokens.colorPrimaryDark;
  static const Color tealLight = AppTokens.colorPrimaryLight;

  // --------------------------------------------------------------------------
  // EPA AQI colors
  // --------------------------------------------------------------------------
  static const Color aqiGood = AppTokens.colorAqiGood;
  static const Color aqiModerate = AppTokens.colorAqiModerate;
  static const Color aqiUnhealthySensitive = AppTokens.colorAqiSensitive;
  static const Color aqiUnhealthy = AppTokens.colorAqiUnhealthy;
  static const Color aqiVeryUnhealthy = AppTokens.colorAqiVeryUnhealthy;
  static const Color aqiHazardous = AppTokens.colorAqiHazardous;

  /// Translucent AQI band variants for hexagon fills and chip backgrounds.
  static const Color aqiGoodSoft = AppTokens.colorAqiGoodSoft;
  static const Color aqiModerateSoft = AppTokens.colorAqiModerateSoft;
  static const Color aqiUnhealthySensitiveSoft = AppTokens.colorAqiSensitiveSoft;
  static const Color aqiUnhealthySoft = AppTokens.colorAqiUnhealthySoft;
  static const Color aqiVeryUnhealthySoft = AppTokens.colorAqiVeryUnhealthySoft;
  static const Color aqiHazardousSoft = AppTokens.colorAqiHazardousSoft;

  // --------------------------------------------------------------------------
  // Metric-specific colors
  // --------------------------------------------------------------------------
  static const Color metricPM25 = Color(0xFFFF7E00);
  static const Color metricPM10 = Color(0xFF8F3F97);
  static const Color metricCO2 = Color(0xFFFF0000);
  static const Color metricTemperature = Color(0xFF4DD9D7);
  static const Color metricHumidity = Color(0xFF00E400);
  static const Color metricVOC = Color(0xFFFFFF00);
  static const Color metricNoise = Color(0xFF1BA8A6);

  // --------------------------------------------------------------------------
  // Status colors
  // --------------------------------------------------------------------------
  static const Color statusOnline = Color(0xFF00E400);
  static const Color statusWarning = Color(0xFFFFFF00);
  static const Color statusError = Color(0xFFFF0000);
  static const Color statusInfo = AppTokens.colorPrimaryBright;

  // --------------------------------------------------------------------------
  // Light theme
  // --------------------------------------------------------------------------
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppTokens.colorPrimary,
      scaffoldBackgroundColor: AppTokens.colorBackground,
      colorScheme: const ColorScheme.light(
        primary: AppTokens.colorPrimary,
        onPrimary: AppTokens.colorTextInverse,
        secondary: AppTokens.colorPrimaryLight,
        onSecondary: AppTokens.colorTextInverse,
        error: AppTokens.colorError,
        onError: AppTokens.colorTextInverse,
        surface: AppTokens.colorSurface,
        onSurface: AppTokens.colorTextPrimary,
      ),

      // Card theme
      cardTheme: CardTheme(
        color: AppTokens.colorSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusCard),
        ),
        shadowColor: Colors.black.withOpacity(AppTokens.shadowOpacityLight),
      ),

      // App bar theme
      appBarTheme: const AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent,
        foregroundColor: AppTokens.colorTextInverse,
      ),

      // Text theme
      textTheme: const TextTheme(
        // Display Large - AQI gauge number
        displayLarge: TextStyle(
          fontSize: 48,
          fontWeight: FontWeight.w700,
          height: 56 / 48,
          color: AppTokens.colorTextPrimary,
        ),
        // Display - Main headings
        displayMedium: TextStyle(
          fontSize: 36,
          fontWeight: FontWeight.w700,
          height: 44 / 36,
          color: AppTokens.colorTextPrimary,
        ),
        // Headline 1 - Screen titles
        headlineLarge: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w600,
          height: 36 / 28,
          color: AppTokens.colorTextPrimary,
        ),
        // Headline 2 - Section headers
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          height: 32 / 24,
          color: AppTokens.colorTextPrimary,
        ),
        // Headline 3 - Card titles
        headlineSmall: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          height: 28 / 20,
          color: AppTokens.colorTextPrimary,
        ),
        // Body Large - Primary content
        bodyLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w400,
          height: 26 / 18,
          color: AppTokens.colorTextPrimary,
        ),
        // Body - Default text
        bodyMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          height: 24 / 16,
          color: AppTokens.colorTextPrimary,
        ),
        // Body Small - Secondary text
        bodySmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 20 / 14,
          color: AppTokens.colorTextSecondary,
        ),
        // Caption - Labels, timestamps
        labelSmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          height: 16 / 12,
          color: AppTokens.colorTextSecondary,
        ),
        // Label - Button text, tabs
        labelMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          height: 20 / 14,
          color: AppTokens.colorTextPrimary,
        ),
      ),

      // Button theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTokens.colorPrimary,
          foregroundColor: AppTokens.colorTextInverse,
          elevation: 2,
          shadowColor: AppTokens.colorPrimary.withOpacity(0.3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          minimumSize: const Size(0, 48),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTokens.colorPrimary,
          side: const BorderSide(color: AppTokens.colorPrimary),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          minimumSize: const Size(0, 48),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppTokens.colorPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Input decoration theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppTokens.colorSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          borderSide: const BorderSide(color: AppTokens.colorPrimary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),

      // Divider theme
      dividerTheme: const DividerThemeData(
        color: AppTokens.colorBorderLight,
        thickness: 1,
        space: 1,
      ),

      // Bottom navigation bar theme
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppTokens.colorSurface,
        selectedItemColor: AppTokens.colorPrimary,
        unselectedItemColor: AppTokens.colorTextSecondary,
        selectedLabelStyle: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
        ),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }

  // --------------------------------------------------------------------------
  // Dark theme
  // --------------------------------------------------------------------------
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppTokens.colorPrimaryBright,
      scaffoldBackgroundColor: AppTokens.colorBackgroundDark,
      colorScheme: const ColorScheme.dark(
        primary: AppTokens.colorPrimaryBright,
        onPrimary: AppTokens.colorTextInverseDark,
        secondary: AppTokens.colorPrimaryLight,
        onSecondary: AppTokens.colorTextInverseDark,
        error: AppTokens.colorError,
        onError: AppTokens.colorTextInverseDark,
        surface: AppTokens.colorSurfaceDark,
        onSurface: AppTokens.colorTextPrimaryDark,
      ),

      // Card theme
      cardTheme: CardTheme(
        color: AppTokens.colorSurfaceDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusCard),
        ),
        shadowColor: Colors.black.withOpacity(AppTokens.shadowOpacityDark),
      ),

      // App bar theme
      appBarTheme: const AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent,
        foregroundColor: AppTokens.colorTextPrimaryDark,
      ),

      // Text theme
      textTheme: const TextTheme(
        // Display Large - AQI gauge number
        displayLarge: TextStyle(
          fontSize: 48,
          fontWeight: FontWeight.w700,
          height: 56 / 48,
          color: AppTokens.colorTextPrimaryDark,
        ),
        // Display - Main headings
        displayMedium: TextStyle(
          fontSize: 36,
          fontWeight: FontWeight.w700,
          height: 44 / 36,
          color: AppTokens.colorTextPrimaryDark,
        ),
        // Headline 1 - Screen titles
        headlineLarge: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w600,
          height: 36 / 28,
          color: AppTokens.colorTextPrimaryDark,
        ),
        // Headline 2 - Section headers
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          height: 32 / 24,
          color: AppTokens.colorTextPrimaryDark,
        ),
        // Headline 3 - Card titles
        headlineSmall: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          height: 28 / 20,
          color: AppTokens.colorTextPrimaryDark,
        ),
        // Body Large - Primary content
        bodyLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w400,
          height: 26 / 18,
          color: AppTokens.colorTextPrimaryDark,
        ),
        // Body - Default text
        bodyMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          height: 24 / 16,
          color: AppTokens.colorTextPrimaryDark,
        ),
        // Body Small - Secondary text
        bodySmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 20 / 14,
          color: AppTokens.colorTextSecondaryDark,
        ),
        // Caption - Labels, timestamps
        labelSmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          height: 16 / 12,
          color: AppTokens.colorTextSecondaryDark,
        ),
        // Label - Button text, tabs
        labelMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          height: 20 / 14,
          color: AppTokens.colorTextPrimaryDark,
        ),
      ),

      // Button theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTokens.colorPrimaryBright,
          foregroundColor: AppTokens.colorTextInverseDark,
          elevation: 2,
          shadowColor: AppTokens.colorPrimaryBright.withOpacity(0.3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          minimumSize: const Size(0, 48),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTokens.colorPrimaryBright,
          side: const BorderSide(color: AppTokens.colorPrimaryBright),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          minimumSize: const Size(0, 48),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppTokens.colorPrimaryBright,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Input decoration theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppTokens.colorSurfaceElevatedDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.radiusHero),
          borderSide: const BorderSide(color: AppTokens.colorPrimaryBright, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),

      // Divider theme
      dividerTheme: const DividerThemeData(
        color: AppTokens.colorBorderDark,
        thickness: 1,
        space: 1,
      ),

      // Bottom navigation bar theme
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppTokens.colorSurfaceDark,
        selectedItemColor: AppTokens.colorPrimaryBright,
        unselectedItemColor: AppTokens.colorTextSecondaryDark,
        selectedLabelStyle: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
        ),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
    );
  }

  // Gradient for headers (light mode)
  static const LinearGradient headerGradientLight = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: AppTokens.gradientHeroColors,
    stops: AppTokens.gradientHeroStops,
  );

  // Gradient for headers (dark mode)
  static const LinearGradient headerGradientDark = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      AppTokens.colorPrimaryDark,
      AppTokens.colorPrimary,
    ],
  );
}
