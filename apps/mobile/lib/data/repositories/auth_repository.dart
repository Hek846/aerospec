import '../api/api_client.dart';
import '../models/user.dart';
import '../cache/cache_manager.dart';

class AuthRepository {
  final ApiClient _apiClient;
  final CacheManager _cacheManager;

  AuthRepository({
    required ApiClient apiClient,
    required CacheManager cacheManager,
  })  : _apiClient = apiClient,
        _cacheManager = cacheManager;

  /// Login with email and password
  /// Returns User and stores token
  /// Throws DioException for network errors or API errors
  Future<User> login(String email, String password) async {
    final response = await _apiClient.post(
      '/auth/login',
      data: {
        'email': email,
        'password': password,
      },
    );

    final data = response.data as Map<String, dynamic>;
    final token = data['token'] as String;
    final userJson = data['user'] as Map<String, dynamic>;

    // Store token
    await _apiClient.setToken(token);

    // Cache user
    await _cacheManager.cacheUser(userJson);

    return User.fromJson(userJson);
  }

  /// Logout - clears token and cache
  Future<void> logout() async {
    await _apiClient.clearToken();
    await _cacheManager.clearUser();
    await _cacheManager.clearHomes();
  }

  /// Get current user
  /// Returns cached user if available, otherwise fetches from API
  Future<User?> getCurrentUser() async {
    try {
      // Try to get from cache first
      final cachedUser = _cacheManager.getUser();
      if (cachedUser != null) {
        return User.fromJson(cachedUser);
      }

      // If no token, return null
      final token = await _apiClient.getToken();
      if (token == null) {
        return null;
      }

      // Fetch from API
      final response = await _apiClient.get('/auth/me');
      final userJson = response.data as Map<String, dynamic>;

      // Cache user
      await _cacheManager.cacheUser(userJson);

      return User.fromJson(userJson);
    } catch (e) {
      // If error, clear token and return null
      await _apiClient.clearToken();
      return null;
    }
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await _apiClient.getToken();
    return token != null;
  }
}
