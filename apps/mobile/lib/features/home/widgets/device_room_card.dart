import 'package:flutter/material.dart';
import '../../../data/models/room.dart';
import '../../../data/models/device.dart';
import '../../../data/models/aqi.dart';
import '../../../data/repositories/device_repository.dart';

/// Device/Room card component for list items
///
/// Displays:
/// - Room icon
/// - Room name
/// - Floor information
/// - Device status (online/offline)
/// - AQI badge
class DeviceRoomCard extends StatelessWidget {
  final RoomWithDeviceAndReading roomData;
  final VoidCallback? onTap;

  const DeviceRoomCard({
    super.key,
    required this.roomData,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final room = roomData.room;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isOnline = roomData.device?.status == DeviceStatus.online;
    final aqi = roomData.latestReading?.aqi;
    final aqiInfo = aqi != null ? AQI.getAQIInfo(aqi) : null;

    return Material(
      color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 0,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 72,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Row(
            children: [
              // Room icon
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFF26D0CE).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getRoomIcon(room.type),
                  size: 24,
                  color: const Color(0xFF26D0CE),
                ),
              ),
              const SizedBox(width: 12),
              // Room info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Room name
                    Text(
                      room.name,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white : const Color(0xFF212121),
                        height: 1.0,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    // Floor and status
                    Row(
                      children: [
                        if (room.floor != null) ...[
                          Text(
                            'Floor ${room.floor}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              color: isDark ? const Color(0xFFB0B0B0) : const Color(0xFF757575),
                              height: 1.0,
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: Text(
                              '•',
                              style: TextStyle(
                                fontSize: 14,
                                color: isDark ? const Color(0xFFB0B0B0) : const Color(0xFF757575),
                              ),
                            ),
                          ),
                        ],
                        // Status indicator
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: isOnline ? const Color(0xFF00E400) : const Color(0xFF757575),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          isOnline ? 'Online' : 'Offline',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            color: isDark ? const Color(0xFFB0B0B0) : const Color(0xFF757575),
                            height: 1.0,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // AQI badge
              if (aqiInfo != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: aqiInfo.color.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    aqi.toString(),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: aqiInfo.color,
                      height: 1.0,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  IconData _getRoomIcon(RoomType? type) {
    switch (type) {
      case RoomType.bedroom:
        return Icons.bed_outlined;
      case RoomType.livingRoom:
        return Icons.weekend_outlined;
      case RoomType.kitchen:
        return Icons.kitchen_outlined;
      case RoomType.bathroom:
        return Icons.bathtub_outlined;
      case RoomType.office:
        return Icons.work_outline;
      case RoomType.garage:
        return Icons.garage_outlined;
      case RoomType.basement:
        return Icons.home_work_outlined;
      case RoomType.other:
      default:
        return Icons.room_outlined;
    }
  }
}
