import 'package:flutter/material.dart';

/// Reusable metric card component
///
/// Displays a single metric with:
/// - Label (e.g., "PM2.5")
/// - Value (e.g., "12.5")
/// - Unit (e.g., "μg/m³")
/// - Optional status indicator
class MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String unit;
  final Color? accentColor;
  final IconData? statusIcon;
  final Color? statusColor;
  final VoidCallback? onTap;

  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.unit,
    this.accentColor,
    this.statusIcon,
    this.statusColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 0,
      shadowColor: Colors.black.withOpacity(0.08),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Label
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: isDark ? const Color(0xFFB0B0B0) : const Color(0xFF757575),
                  height: 1.0,
                ),
              ),
              const SizedBox(height: 12),
              // Value and unit
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Flexible(
                    child: Text(
                      value,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w600,
                        color: accentColor ?? (isDark ? Colors.white : const Color(0xFF212121)),
                        height: 1.0,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text(
                      unit,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: isDark ? const Color(0xFFB0B0B0) : const Color(0xFF757575),
                        height: 1.0,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Status indicator
              if (statusIcon != null)
                Icon(
                  statusIcon,
                  size: 16,
                  color: statusColor ?? (isDark ? const Color(0xFFB0B0B0) : const Color(0xFF757575)),
                )
              else
                const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

/// Helper class for metric-specific colors
class MetricColors {
  static const pm25 = Color(0xFFFF7E00); // Orange
  static const pm10 = Color(0xFF8F3F97); // Purple
  static const co2 = Color(0xFFFF0000); // Red
  static const temperature = Color(0xFF4DD9D7); // Cyan
  static const humidity = Color(0xFF00E400); // Green
  static const voc = Color(0xFFFFFF00); // Yellow
  static const noise = Color(0xFF1BA8A6); // Teal
  static const pressure = Color(0xFF757575); // Gray

  static Color getMetricColor(String metric) {
    switch (metric.toLowerCase()) {
      case 'pm2.5':
      case 'pm25':
        return pm25;
      case 'pm10':
        return pm10;
      case 'co2':
      case 'co₂':
        return co2;
      case 'temperature':
      case 'temp':
        return temperature;
      case 'humidity':
        return humidity;
      case 'voc':
        return voc;
      case 'noise':
        return noise;
      case 'pressure':
        return pressure;
      default:
        return const Color(0xFF757575);
    }
  }
}
