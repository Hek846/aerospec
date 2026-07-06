import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../data/models/analytics.dart';
import '../../../data/models/aqi.dart';

class AQIHorizontalBarChart extends StatelessWidget {
  final List<RoomAQIComparison> roomComparisons;

  const AQIHorizontalBarChart({
    super.key,
    required this.roomComparisons,
  });

  @override
  Widget build(BuildContext context) {
    if (roomComparisons.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: Text(
              'No room data available',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Average AQI by Locations',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 16),
            ...roomComparisons.map((room) => _buildHorizontalBar(context, room)),
          ],
        ),
      ),
    );
  }

  Widget _buildHorizontalBar(BuildContext context, RoomAQIComparison room) {
    final aqiInfo = calculateAQI(room.averageAqi.round());
    final maxAqi = roomComparisons
        .map((r) => r.averageAqi)
        .reduce((a, b) => a > b ? a : b);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            room.roomName,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Stack(
                  children: [
                    // Background bar
                    Container(
                      height: 32,
                      decoration: BoxDecoration(
                        color: Colors.grey.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    // Filled bar
                    FractionallySizedBox(
                      widthFactor: maxAqi > 0 ? room.averageAqi / maxAqi : 0,
                      child: Container(
                        height: 32,
                        decoration: BoxDecoration(
                          color: aqiInfo.color,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 8),
                        child: Text(
                          room.averageAqi.toStringAsFixed(0),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
