import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/screens/splash_screen.dart';
import 'data/ble/device_link_store.dart';
import 'data/cache/cache_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    // If .env file is missing, use defaults
    // API_BASE_URL will default to localhost in ApiClient
    debugPrint('Warning: .env file not found, using defaults');
  }

  // Initialize cache manager and BLE device link store
  await initCacheManager();
  await initDeviceLinkStore();

  runApp(
    const ProviderScope(
      child: AerospecApp(),
    ),
  );
}

class AerospecApp extends ConsumerWidget {
  const AerospecApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      title: 'AeroSpec',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      home: const SplashScreen(),
    );
  }
}
