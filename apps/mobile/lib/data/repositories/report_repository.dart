import '../api/api_client.dart';
import '../models/report.dart';

class ReportRepository {
  final ApiClient _apiClient;

  ReportRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Get weekly summary reports for the user's homes
  Future<List<ReportSummary>> getWeeklyReports() async {
    try {
      final response = await _apiClient.get('/reports/weekly');
      final data = response.data as Map<String, dynamic>;
      final reportsJson = data['reports'] as List;

      return reportsJson.map((json) => ReportSummary.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Failed to fetch weekly reports: $e');
    }
  }

  /// Get a specific report
  Future<ReportSummary> getReport(String reportId) async {
    try {
      final response = await _apiClient.get('/reports/$reportId');
      return ReportSummary.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to fetch report: $e');
    }
  }
}
