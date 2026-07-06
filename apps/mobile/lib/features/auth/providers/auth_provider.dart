import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/api/api_client.dart';
import '../../../data/cache/cache_manager.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../data/models/user.dart';

/// Authentication state
class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;
  final AuthStatus status;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.error,
    this.status = AuthStatus.initial,
  });

  AuthState copyWith({
    User? user,
    bool? isLoading,
    String? error,
    AuthStatus? status,
    bool clearError = false,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      status: status ?? this.status,
    );
  }
}

enum AuthStatus {
  initial,
  authenticated,
  unauthenticated,
  loading,
  error,
}

/// Auth repository provider
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    apiClient: apiClient,
    cacheManager: cacheManager,
  );
});

/// Auth state notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _authRepository;

  AuthNotifier(this._authRepository) : super(const AuthState()) {
    _checkAuth();
  }

  /// Check if user is authenticated on app start
  Future<void> _checkAuth() async {
    state = state.copyWith(
      isLoading: true,
      status: AuthStatus.loading,
    );

    try {
      final isAuth = await _authRepository.isAuthenticated();
      if (isAuth) {
        final user = await _authRepository.getCurrentUser();
        if (user != null) {
          state = state.copyWith(
            user: user,
            isLoading: false,
            status: AuthStatus.authenticated,
          );
        } else {
          state = state.copyWith(
            isLoading: false,
            status: AuthStatus.unauthenticated,
          );
        }
      } else {
        state = state.copyWith(
          isLoading: false,
          status: AuthStatus.unauthenticated,
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
        status: AuthStatus.unauthenticated,
      );
    }
  }

  /// Login with email and password
  Future<void> login(String email, String password) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
      status: AuthStatus.loading,
    );

    try {
      final user = await _authRepository.login(email, password);
      state = state.copyWith(
        user: user,
        isLoading: false,
        status: AuthStatus.authenticated,
      );
    } catch (e) {
      String errorMessage = 'Login failed. Please try again.';

      // Parse error message
      if (e.toString().contains('401')) {
        errorMessage = 'Invalid email or password';
      } else if (e.toString().contains('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      }

      state = state.copyWith(
        isLoading: false,
        error: errorMessage,
        status: AuthStatus.error,
      );
    }
  }

  /// Logout
  Future<void> logout() async {
    await _authRepository.logout();
    state = const AuthState(
      status: AuthStatus.unauthenticated,
    );
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

/// Auth state provider
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authRepository = ref.watch(authRepositoryProvider);
  return AuthNotifier(authRepository);
});
