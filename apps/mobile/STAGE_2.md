# Stage 2: Authentication Flow

**Status**: ✅ Completed - 2025-11-23
**Actual Duration**: ~2 hours

---

## Objectives

Complete **Section 2 (Authentication Flow)** from [sensair_mobile_todo.md](sensair_mobile_todo.md).

---

## Tasks

### Section 2: Authentication Flow

- [ ] Implement splash screen:
  - Create `lib/features/auth/screens/splash_screen.dart`
  - Show app logo/branding
  - Perform initial auth check (check if token exists)
  - Navigate to login or main app based on auth state
  - Add loading indicator during check

- [ ] Implement login screen:
  - Create `lib/features/auth/screens/login_screen.dart`
  - Email input field with validation
  - Password input field with validation
  - "Login" button
  - Loading state during authentication
  - Error handling and display
  - "Forgot password?" link (placeholder for V1)
  - Form validation before submission

- [ ] Create authentication state management:
  - Create `lib/features/auth/providers/auth_provider.dart`
  - Use Riverpod for state management
  - Implement authentication state (unauthenticated, loading, authenticated, error)
  - Connect to AuthRepository
  - Handle token storage via API client

- [ ] Implement secure token storage:
  - Token already handled in ApiClient (flutter_secure_storage)
  - Ensure token persists across app restarts
  - Implement token refresh logic (if applicable)

- [ ] Implement logout functionality:
  - Add logout method to auth provider
  - Clear token from secure storage
  - Clear cached user data
  - Navigate back to login screen

- [ ] Create main app navigation:
  - Create `lib/core/navigation/app_router.dart`
  - Implement routing logic based on auth state
  - Wire login success to show main tab bar
  - Implement bottom navigation bar with 4 tabs:
    - Home
    - Statistics
    - Map
    - Profile

- [ ] Create main app scaffold:
  - Create `lib/features/main/screens/main_screen.dart`
  - Implement bottom navigation bar
  - Create placeholder screens for each tab:
    - `lib/features/home/screens/home_screen.dart`
    - `lib/features/stats/screens/stats_screen.dart`
    - `lib/features/map/screens/map_screen.dart`
    - `lib/features/profile/screens/profile_screen.dart`
  - Maintain tab state when switching
  - Use proper icons for each tab

---

## Documentation References

Read these before starting:

1. **[sensair_mobile_todo.md](sensair_mobile_todo.md)** - Full task checklist
2. **[docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)** - REST API endpoints (login endpoint)
3. **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** - Colors, typography, button styles
4. **[docs/QUESTIONS_ANSWERED.md](docs/QUESTIONS_ANSWERED.md)** - Technical decisions

---

## Success Criteria

- [ ] Splash screen shows and performs auth check
- [ ] Login screen displays with proper validation
- [ ] User can successfully login with valid credentials
- [ ] Token is stored securely and persists across restarts
- [ ] Login errors are displayed clearly to user
- [ ] Successful login navigates to main app with bottom tabs
- [ ] All 4 tabs are accessible and show placeholder content
- [ ] User can logout from Profile tab
- [ ] Logout clears token and returns to login screen
- [ ] No build errors or analyzer warnings
- [ ] Code follows Flutter/Dart style guidelines

---

## Implementation Guidelines

1. **Follow the Design System**: Use exact colors and typography from [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
2. **Use Riverpod**: Implement state management with Riverpod providers
3. **Error Handling**: Display user-friendly error messages
4. **Form Validation**: Validate email format and password requirements
5. **Loading States**: Show loading indicators during async operations
6. **Code Style**: Run `flutter analyze` and fix all warnings
7. **Git Commits**: Make atomic commits for each subsection

---

## Notes & Decisions

- Login endpoint: `POST /auth/login`
- Token storage: Uses flutter_secure_storage (already configured in ApiClient)
- No registration flow in V1 (users created by admin)
- "Forgot password?" link is placeholder only for V1
- Bottom navigation uses Material 3 style
- Tab state should persist when switching between tabs

---

## After Completion

When Stage 2 is complete:

1. **Test the authentication flow**:
   ```bash
   flutter pub get
   flutter analyze
   # Test login with valid credentials
   # Test login with invalid credentials
   # Test logout
   # Test app restart (token persistence)
   ```

2. **Commit your work**:
   ```bash
   git add .
   git commit -m "Complete Stage 2: Authentication flow"
   git push
   ```

3. **Create `STAGE_3.md`** following the same format for Section 3 (Home Tab)

4. **Update `STAGE_2.md`**:
   - Change status to: `✅ Completed - [DATE]`
   - Add "Completed By" section with any notes

5. **Update `PROGRESS.md`**:
   ```markdown
   ## Completed Stages
   - ✅ Stage 1: Project Setup & Data Layer - [DATE]
   - ✅ Stage 2: Authentication Flow - [DATE]

   ## Current Stage
   - 🚧 Stage 3: Home Tab - Ready to start
   ```

---

## Questions or Issues?

If you encounter ambiguity:
1. Check the documentation files first
2. Look at the API specification for endpoint details
3. Use sensible Flutter/Riverpod best practices
4. Document your decision in code comments
5. Note it in PROGRESS.md for review

---

**Previous Stage**: [STAGE_1.md](STAGE_1.md) - Project Setup & Data Layer (completed)
**Next Stage**: [STAGE_3.md](STAGE_3.md) - Home Tab (ready to start)

---

## Completion Summary

**Completed By**: Claude Code Agent
**Date**: 2025-11-23

### What Was Implemented

✅ **Authentication Provider** (`lib/features/auth/providers/auth_provider.dart`)
- Full Riverpod state management for authentication
- AuthState with loading, error, and user states
- Login, logout, and auth check functionality
- Proper error handling and user-friendly messages

✅ **Splash Screen** (`lib/features/auth/screens/splash_screen.dart`)
- App branding with gradient background
- Initial authentication check on app start
- Automatic navigation to login or main app based on auth state
- Loading indicator during auth check

✅ **Login Screen** (`lib/features/auth/screens/login_screen.dart`)
- Email and password input fields with validation
- Form validation (email format, password length)
- Loading state during authentication
- Error display for invalid credentials or network issues
- "Forgot password?" link (placeholder for V1)
- Proper keyboard handling and accessibility

✅ **Main Screen** (`lib/features/main/screens/main_screen.dart`)
- Bottom navigation with 4 tabs (Home, Statistics, Map, Profile)
- Tab state persistence using IndexedStack
- Material 3 navigation bar with proper styling
- Active/inactive state indicators with teal accent color

✅ **Placeholder Tab Screens**
- Home screen with gradient header and placeholder content
- Statistics screen placeholder
- Map screen placeholder
- Profile screen with user info and logout functionality

✅ **Navigation Flow**
- Splash → Login (if unauthenticated)
- Splash → Main (if authenticated)
- Login → Main (on successful login)
- Logout → Login (from Profile tab)
- Token persistence across app restarts

### Files Created

1. `lib/features/auth/providers/auth_provider.dart`
2. `lib/features/auth/screens/splash_screen.dart`
3. `lib/features/auth/screens/login_screen.dart`
4. `lib/features/main/screens/main_screen.dart`
5. `lib/features/home/screens/home_screen.dart`
6. `lib/features/stats/screens/stats_screen.dart`
7. `lib/features/map/screens/map_screen.dart`
8. `lib/features/profile/screens/profile_screen.dart`
9. `STAGE_3.md` (next stage specification)

### Files Modified

1. `lib/main.dart` - Updated to use SplashScreen as entry point

### Notes

- All screens follow the design system color palette (teal primary: #26D0CE)
- Proper error handling throughout the authentication flow
- Token storage uses flutter_secure_storage via ApiClient
- Profile screen includes working logout functionality with confirmation dialog
- All placeholder screens show "Coming in Stage X" messages for clarity
- Navigation uses simple MaterialPageRoute (no complex routing needed for V1)
