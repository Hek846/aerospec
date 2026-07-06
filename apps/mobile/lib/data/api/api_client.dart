import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static const String _tokenKey = 'auth_token';

  ApiClient() {
    final baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://localhost:4000';

    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
        },
      ),
    );

    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add JWT token to request headers
          final token = await _storage.read(key: _tokenKey);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          // Log request in debug mode
          _logRequest(options);

          return handler.next(options);
        },
        onResponse: (response, handler) {
          // Log response in debug mode
          _logResponse(response);

          return handler.next(response);
        },
        onError: (error, handler) async {
          // Log error in debug mode
          _logError(error);

          // Handle 401 - Unauthorized
          if (error.response?.statusCode == 401) {
            await clearToken();
            // TODO: Navigate to login screen or show session expired dialog
          }

          // Handle 500 - Server Error with exponential backoff retry
          if (error.response?.statusCode == 500) {
            try {
              final response = await _retryRequest(error.requestOptions);
              return handler.resolve(response);
            } catch (e) {
              // Max retries exceeded or retry failed, pass through original error
              return handler.next(error);
            }
          }

          // Handle network errors gracefully
          if (error.type == DioExceptionType.connectionTimeout ||
              error.type == DioExceptionType.receiveTimeout ||
              error.type == DioExceptionType.connectionError) {
            // Return a user-friendly error
            return handler.next(
              DioException(
                requestOptions: error.requestOptions,
                error: 'Network error. Please check your connection.',
                type: error.type,
              ),
            );
          }

          return handler.next(error);
        },
      ),
    );
  }

  /// Retry a request with exponential backoff
  Future<Response> _retryRequest(
    RequestOptions requestOptions, {
    int retryCount = 0,
    int maxRetries = 3,
  }) async {
    if (retryCount >= maxRetries) {
      throw DioException(
        requestOptions: requestOptions,
        error: 'Max retries exceeded',
      );
    }

    // Exponential backoff: 1s, 2s, 4s
    final delayMs = (1 << retryCount) * 1000;
    await Future.delayed(Duration(milliseconds: delayMs));

    try {
      return await _dio.fetch(requestOptions);
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 500) {
        // Retry again
        return _retryRequest(requestOptions, retryCount: retryCount + 1, maxRetries: maxRetries);
      }
      rethrow;
    }
  }

  void _logRequest(RequestOptions options) {
    if (kReleaseMode) return;

    debugPrint('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    debugPrint('🚀 REQUEST [${options.method}] ${options.uri}');
    debugPrint('Headers: ${options.headers}');
    if (options.data != null) {
      debugPrint('Body: ${options.data}');
    }
    debugPrint('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  void _logResponse(Response response) {
    if (kReleaseMode) return;

    debugPrint('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    debugPrint('✅ RESPONSE [${response.statusCode}] ${response.requestOptions.uri}');
    debugPrint('Data: ${response.data}');
    debugPrint('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  void _logError(DioException error) {
    if (kReleaseMode) return;

    debugPrint('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    debugPrint('❌ ERROR [${error.response?.statusCode}] ${error.requestOptions.uri}');
    debugPrint('Error: ${error.message}');
    debugPrint('Response: ${error.response?.data}');
    debugPrint('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  // Token management
  Future<void> setToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  // HTTP methods
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.get(
      path,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.post(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.put(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return await _dio.delete(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }
}

// Singleton instance
final apiClient = ApiClient();
