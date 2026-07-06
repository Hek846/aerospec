import '../api/api_client.dart';
import '../models/alert.dart';

class AlertsData {
  final List<AlertRule> rules;
  final List<AlertEvent> events;

  AlertsData({
    required this.rules,
    required this.events,
  });
}

class AlertRepository {
  final ApiClient _apiClient;

  AlertRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Get alert rules and recent alert events
  Future<AlertsData> getAlerts() async {
    try {
      final response = await _apiClient.get('/alerts');
      final data = response.data as Map<String, dynamic>;

      final rulesJson = data['rules'] as List;
      final eventsJson = data['events'] as List;

      final rules = rulesJson.map((json) => AlertRule.fromJson(json)).toList();
      final events = eventsJson.map((json) => AlertEvent.fromJson(json)).toList();

      return AlertsData(rules: rules, events: events);
    } catch (e) {
      throw Exception('Failed to fetch alerts: $e');
    }
  }

  /// Get alert events with optional filtering
  Future<List<AlertEvent>> getAlertEvents({
    String? status,
    int? limit,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status;
      if (limit != null) queryParams['limit'] = limit;

      final response = await _apiClient.get(
        '/alerts/events',
        queryParameters: queryParams,
      );

      final eventsJson = response.data as List;
      return eventsJson.map((json) => AlertEvent.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Failed to fetch alert events: $e');
    }
  }

  /// Acknowledge an alert event
  Future<void> acknowledgeAlert(String alertId) async {
    try {
      await _apiClient.post('/alerts/$alertId/ack');
    } catch (e) {
      throw Exception('Failed to acknowledge alert: $e');
    }
  }

  /// Dismiss an alert event
  Future<void> dismissAlert(String alertId) async {
    try {
      await _apiClient.post('/alerts/$alertId/dismiss');
    } catch (e) {
      throw Exception('Failed to dismiss alert: $e');
    }
  }
}
