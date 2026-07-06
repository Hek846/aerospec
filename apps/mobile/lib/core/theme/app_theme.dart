import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Theme mode provider
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

/// App theme configuration based on Design System
class AppTheme {
  // Primary brand colors
  static const Color primaryTeal = Color(0xFF26D0CE);
  static const Color tealDark = Color(0xFF1BA8A6);
  static const Color tealLight = Color(0xFF4DD9D7);

  // AQI Colors (EPA Standard)
  static const Color aqiGood = Color(0xFF00E400);
  static const Color aqiModerate = Color(0xFFFFFF00);
  static const Color aqiUnhealthySensitive = Color(0xFFFF7E00);
  static const Color aqiUnhealthy = Color(0xFFFF0000);
  static const Color aqiVeryUnhealthy = Color(0xFF8F3F97);
  static const Color aqiHazardous = Color(0xFF7E0023);

  // Metric-specific colors
  static const Color metricPM25 = Color(0xFFFF7E00);
  static const Color metricPM10 = Color(0xFF8F3F97);
  static const Color metricCO2 = Color(0xFFFF0000);
  static const Color metricTemperature = Color(0xFF4DD9D7);
  static const Color metricHumidity = Color(0xFF00E400);
  static const Color metricVOC = Color(0xFFFFFF00);
  static const Color metricNoise = Color(0xFF1BA8A6);

  // Status colors
  static const Color statusOnline = Color(0xFF00E400);
  static const Color statusWarning = Color(0xFFFFFF00);
  static const Color statusError = Color(0xFFFF0000);
  static const Color statusInfo = Color(0xFF26D0CE);

  // Light theme
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: primaryTeal,
      scaffoldBackgroundColor: Colors.white,
      colorScheme: const ColorScheme.light(
        primary: primaryTeal,
        onPrimary: Colors.white,
        secondary: tealDark,
        onSecondary: Colors.white,
        error: statusError,
        onError: Colors.white,
        surface: Color(0xFFF5F5F5),
        onSurface: Color(0xFF212121),
      ),

      // Card theme
      cardTheme: CardTheme(
        color: const Color(0xFFF5F5F5),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        shadowColor: Colors.black.withOpacity(0.08),
      ),

      // App bar theme
      appBarTheme: const AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
      ),

      // Text theme
      textTheme: const TextTheme(
        // Display Large - AQI gauge number
        displayLarge: TextStyle(
          fontSize: 48,
          fontWeight: FontWeight.w700,
          height: 56 / 48,
          color: Color(0xFF212121),
        ),
        // Display - Main headings
        displayMedium: TextStyle(
          fontSize: 36,
          fontWeight: FontWeight.w700,
          height: 44 / 36,
          color: Color(0xFF212121),
        ),
        // Headline 1 - Screen titles
        headlineLarge: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w600,
          height: 36 / 28,
          color: Color(0xFF212121),
        ),
        // Headline 2 - Section headers
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          height: 32 / 24,
          color: Color(0xFF212121),
        ),
        // Headline 3 - Card titles
        headlineSmall: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          height: 28 / 20,
          color: Color(0xFF212121),
        ),
        // Body Large - Primary content
        bodyLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w400,
          height: 26 / 18,
          color: Color(0xFF212121),
        ),
        // Body - Default text
        bodyMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          height: 24 / 16,
          color: Color(0xFF212121),
        ),
        // Body Small - Secondary text
        bodySmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 20 / 14,
          color: Color(0xFF757575),
        ),
        // Caption - Labels, timestamps
        labelSmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          height: 16 / 12,
          color: Color(0xFF757575),
        ),
        // Label - Button text, tabs
        labelMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          height: 20 / 14,
          color: Color(0xFF212121),
        ),
      ),

      // Button theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryTeal,
          foregroundColor: Colors.white,
          elevation: 2,
          shadowColor: primaryTeal.withOpacity(0.3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
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
          foregroundColor: primaryTeal,
          side: const BorderSide(color: primaryTeal),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
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
          foregroundColor: primaryTeal,
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
        fillColor: const Color(0xFFF5F5F5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: primaryTeal, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),

      // Divider theme
      dividerTheme: const DividerThemeData(
        color: Color(0xFFE0E0E0),
        thickness: 1,
        space: 1,
      ),

      // Bottom navigation bar theme
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFFF5F5F5),
        selectedItemColor: primaryTeal,
        unselectedItemColor: Color(0xFF757575),
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

  // Dark theme
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: primaryTeal,
      scaffoldBackgroundColor: const Color(0xFF121212),
      colorScheme: const ColorScheme.dark(
        primary: primaryTeal,
        onPrimary: Colors.white,
        secondary: tealDark,
        onSecondary: Colors.white,
        error: statusError,
        onError: Colors.white,
        surface: Color(0xFF1E1E1E),
        onSurface: Colors.white,
      ),

      // Card theme
      cardTheme: CardTheme(
        color: const Color(0xFF1E1E1E),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        shadowColor: Colors.black.withOpacity(0.2),
      ),

      // App bar theme
      appBarTheme: const AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
      ),

      // Text theme
      textTheme: const TextTheme(
        // Display Large - AQI gauge number
        displayLarge: TextStyle(
          fontSize: 48,
          fontWeight: FontWeight.w700,
          height: 56 / 48,
          color: Colors.white,
        ),
        // Display - Main headings
        displayMedium: TextStyle(
          fontSize: 36,
          fontWeight: FontWeight.w700,
          height: 44 / 36,
          color: Colors.white,
        ),
        // Headline 1 - Screen titles
        headlineLarge: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w600,
          height: 36 / 28,
          color: Colors.white,
        ),
        // Headline 2 - Section headers
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          height: 32 / 24,
          color: Colors.white,
        ),
        // Headline 3 - Card titles
        headlineSmall: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          height: 28 / 20,
          color: Colors.white,
        ),
        // Body Large - Primary content
        bodyLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w400,
          height: 26 / 18,
          color: Colors.white,
        ),
        // Body - Default text
        bodyMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          height: 24 / 16,
          color: Colors.white,
        ),
        // Body Small - Secondary text
        bodySmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 20 / 14,
          color: Color(0xFFB0B0B0),
        ),
        // Caption - Labels, timestamps
        labelSmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          height: 16 / 12,
          color: Color(0xFFB0B0B0),
        ),
        // Label - Button text, tabs
        labelMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          height: 20 / 14,
          color: Colors.white,
        ),
      ),

      // Button theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryTeal,
          foregroundColor: Colors.white,
          elevation: 2,
          shadowColor: primaryTeal.withOpacity(0.3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
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
          foregroundColor: primaryTeal,
          side: const BorderSide(color: primaryTeal),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
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
          foregroundColor: primaryTeal,
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
        fillColor: const Color(0xFF2C2C2C),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: primaryTeal, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),

      // Divider theme
      dividerTheme: const DividerThemeData(
        color: Color(0xFF3C3C3C),
        thickness: 1,
        space: 1,
      ),

      // Bottom navigation bar theme
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFF1E1E1E),
        selectedItemColor: primaryTeal,
        unselectedItemColor: Color(0xFFB0B0B0),
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
    colors: [primaryTeal, tealDark],
  );

  // Gradient for headers (dark mode)
  static const LinearGradient headerGradientDark = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1A5F5E), Color(0xFF0D3635)],
  );
}
