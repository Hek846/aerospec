import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../data/models/alert.dart';

class RecentAlertsList extends StatelessWidget {
  final List<AlertEvent> alerts;
  final Function(AlertEvent alert)? onAlertTap;
  final VoidCallback? onSeeAll;

  const RecentAlertsList({
    super.key,
    required this.alerts,
    this.onAlertTap,
    this.onSeeAll,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Alerts',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                if (onSeeAll != null)
                  TextButton(
                    onPressed: onSeeAll,
                    child: const Text('See All'),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if (alerts.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(
                    'No recent alerts',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey,
                        ),
                  ),
                ),
              )
            else
              ...alerts.map((alert) => _buildAlertItem(context, alert)),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertItem(BuildContext context, AlertEvent alert) {
    return InkWell(
      onTap: () => onAlertTap?.call(alert),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status indicator
            Container(
              width: 8,
              height: 8,
              margin: const EdgeInsets.only(top: 6, right: 12),
              decoration: BoxDecoration(
                color: _getStatusColor(alert.status),
                shape: BoxShape.circle,
              ),
            ),
            // Alert content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _getMetricLabel(alert.metric),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      Text(
                        _formatTimestamp(alert.timestamp),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Value: ${alert.value.toStringAsFixed(1)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _getStatusLabel(alert.status),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: _getStatusColor(alert.status),
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(AlertEventStatus status) {
    switch (status) {
      case AlertEventStatus.open:
        return Colors.red;
      case AlertEventStatus.acknowledged:
        return Colors.orange;
      case AlertEventStatus.closed:
        return Colors.green;
    }
  }

  String _getStatusLabel(AlertEventStatus status) {
    switch (status) {
      case AlertEventStatus.open:
        return 'Open';
      case AlertEventStatus.acknowledged:
        return 'Acknowledged';
      case AlertEventStatus.closed:
        return 'Closed';
    }
  }

  String _getMetricLabel(String metric) {
    switch (metric.toLowerCase()) {
      case 'pm25':
        return 'PM2.5 Alert';
      case 'pm10':
        return 'PM10 Alert';
      case 'co2':
        return 'CO2 Alert';
      case 'temperature':
        return 'Temperature Alert';
      case 'humidity':
        return 'Humidity Alert';
      case 'vocindex':
        return 'VOC Alert';
      default:
        return metric.toUpperCase();
    }
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM d').format(timestamp);
    }
  }
}
