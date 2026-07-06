/// Returns a time-based greeting
/// - "Good morning" for 5 AM - 11:59 AM
/// - "Good afternoon" for 12 PM - 4:59 PM
/// - "Good evening" for 5 PM - 8:59 PM
/// - "Good night" for 9 PM - 4:59 AM
String getGreeting() {
  final hour = DateTime.now().hour;

  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good evening';
  } else {
    return 'Good night';
  }
}
