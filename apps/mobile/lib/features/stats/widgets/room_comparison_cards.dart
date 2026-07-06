import 'package:flutter/material.dart';
import '../../../data/models/analytics.dart';
import '../../../data/models/aqi.dart';

class RoomComparisonCards extends StatelessWidget {
  final List<RoomAQIComparison> roomComparisons;
  final Function(String roomId)? onRoomTap;

  const RoomComparisonCards({
    super.key,
    required this.roomComparisons,
    this.onRoomTap,
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Compare Average AQI',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 140,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: roomComparisons.length,
            itemBuilder: (context, index) {
              final room = roomComparisons[index];
              return Padding(
                padding: EdgeInsets.only(
                  right: index < roomComparisons.length - 1 ? 12 : 0,
                ),
                child: _buildComparisonCard(context, room),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildComparisonCard(BuildContext context, RoomAQIComparison room) {
    final aqiInfo = calculateAQI(room.averageAqi.round());

    return GestureDetector(
      onTap: () => onRoomTap?.call(room.roomId),
      child: Container(
        width: 120,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.grey.withOpacity(0.2),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Room name
            Text(
              room.roomName,
              style: Theme.of(context).textTheme.bodySmall,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            // AQI value
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  room.averageAqi.toStringAsFixed(0),
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: aqiInfo.color,
                      ),
                ),
                const SizedBox(height: 4),
                // AQI badge
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: aqiInfo.color.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    getAQIBandName(aqiInfo.band),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: aqiInfo.color,
                          fontWeight: FontWeight.w600,
                          fontSize: 10,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
