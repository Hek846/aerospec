import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../data/models/aqi.dart';

/// Circular AQI gauge widget
///
/// Displays a 270° arc gauge showing AQI value with EPA color coding
/// Specs:
/// - Arc starts at 135° and ends at 405° (270° total coverage)
/// - Arc thickness: 12px
/// - Animates on load (0.8s ease-out)
class AqiGauge extends StatefulWidget {
  final int? aqiValue;
  final AqiGaugeSize size;
  final bool showLabel;
  final bool animate;

  const AqiGauge({
    super.key,
    required this.aqiValue,
    this.size = AqiGaugeSize.large,
    this.showLabel = true,
    this.animate = true,
  });

  @override
  State<AqiGauge> createState() => _AqiGaugeState();
}

class _AqiGaugeState extends State<AqiGauge> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    );
    if (widget.animate) {
      _controller.forward();
    } else {
      _controller.value = 1.0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final aqi = widget.aqiValue;
    final diameter = widget.size.diameter;
    final aqiInfo = aqi != null ? AQI.getAQIInfo(aqi) : null;

    return SizedBox(
      width: diameter,
      height: diameter,
      child: AnimatedBuilder(
        animation: _animation,
        builder: (context, child) {
          return CustomPaint(
            painter: _AqiGaugePainter(
              aqiValue: aqi,
              aqiInfo: aqiInfo,
              progress: _animation.value,
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (aqi != null) ...[
                    Text(
                      aqi.toString(),
                      style: TextStyle(
                        fontSize: widget.size.valueFontSize,
                        fontWeight: FontWeight.w700,
                        color: aqiInfo?.color ?? Colors.grey,
                        height: 1.0,
                      ),
                    ),
                    if (widget.showLabel && aqiInfo != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        aqiInfo.label,
                        style: TextStyle(
                          fontSize: widget.size.labelFontSize,
                          fontWeight: FontWeight.w600,
                          color: aqiInfo.color,
                          height: 1.0,
                        ),
                      ),
                    ],
                  ] else ...[
                    Icon(
                      Icons.cloud_off_outlined,
                      size: widget.size.valueFontSize,
                      color: Colors.grey,
                    ),
                    if (widget.showLabel) ...[
                      const SizedBox(height: 4),
                      Text(
                        'No Data',
                        style: TextStyle(
                          fontSize: widget.size.labelFontSize,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _AqiGaugePainter extends CustomPainter {
  final int? aqiValue;
  final AQIInfo? aqiInfo;
  final double progress;

  _AqiGaugePainter({
    required this.aqiValue,
    required this.aqiInfo,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 6; // Account for stroke width
    const strokeWidth = 12.0;

    // Background arc (gray)
    final backgroundPaint = Paint()
      ..color = Colors.grey.withOpacity(0.2)
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    // Draw background arc from 135° to 405° (270° total)
    const startAngle = 135 * math.pi / 180; // 135° in radians
    const sweepAngle = 270 * math.pi / 180; // 270° in radians

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      backgroundPaint,
    );

    // Foreground arc (AQI color)
    if (aqiValue != null && aqiInfo != null && progress > 0) {
      final foregroundPaint = Paint()
        ..color = aqiInfo.color
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      // Calculate sweep based on AQI value (max 500)
      final aqiProgress = (aqiValue / 500).clamp(0.0, 1.0);
      final animatedSweep = sweepAngle * aqiProgress * progress;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        animatedSweep,
        false,
        foregroundPaint,
      );
    }
  }

  @override
  bool shouldRepaint(_AqiGaugePainter oldDelegate) {
    return oldDelegate.aqiValue != aqiValue ||
        oldDelegate.progress != progress;
  }
}

enum AqiGaugeSize {
  small(diameter: 60, valueFontSize: 20, labelFontSize: 10),
  medium(diameter: 120, valueFontSize: 32, labelFontSize: 14),
  large(diameter: 180, valueFontSize: 48, labelFontSize: 20);

  const AqiGaugeSize({
    required this.diameter,
    required this.valueFontSize,
    required this.labelFontSize,
  });

  final double diameter;
  final double valueFontSize;
  final double labelFontSize;
}
