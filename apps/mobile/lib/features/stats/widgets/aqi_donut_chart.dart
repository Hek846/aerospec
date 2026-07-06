import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../data/models/analytics.dart';
import '../../../data/models/aqi.dart';
import '../../../core/theme/app_theme.dart';

class AQIDonutChart extends StatefulWidget {
  final AQIDistribution distribution;

  const AQIDonutChart({
    super.key,
    required this.distribution,
  });

  @override
  State<AQIDonutChart> createState() => _AQIDonutChartState();
}

class _AQIDonutChartState extends State<AQIDonutChart>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;
  int touchedIndex = -1;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _animation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'AQI Overview',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                // Donut chart
                SizedBox(
                  width: 120,
                  height: 120,
                  child: AnimatedBuilder(
                    animation: _animation,
                    builder: (context, child) {
                      return PieChart(
                        PieChartData(
                          sections: _getSections(),
                          sectionsSpace: 2,
                          centerSpaceRadius: 30,
                          pieTouchData: PieTouchData(
                            touchCallback:
                                (FlTouchEvent event, pieTouchResponse) {
                              setState(() {
                                if (!event.isInterestedForInteractions ||
                                    pieTouchResponse == null ||
                                    pieTouchResponse.touchedSection == null) {
                                  touchedIndex = -1;
                                  return;
                                }
                                touchedIndex = pieTouchResponse
                                    .touchedSection!.touchedSectionIndex;
                              });
                            },
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 24),
                // Legend
                Expanded(
                  child: _buildLegend(context),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  List<PieChartSectionData> _getSections() {
    final bands = [
      ('Good', AQIBand.good),
      ('Moderate', AQIBand.moderate),
      ('Unhealthy for Sensitive Groups', AQIBand.unhealthySensitive),
      ('Unhealthy', AQIBand.unhealthy),
      ('Very Unhealthy', AQIBand.veryUnhealthy),
      ('Hazardous', AQIBand.hazardous),
    ];

    final sections = <PieChartSectionData>[];
    int index = 0;

    for (final band in bands) {
      final count = widget.distribution.distribution[band.$1] ?? 0;
      if (count == 0) {
        index++;
        continue;
      }

      final percentage = widget.distribution.getPercentage(band.$1);
      final isTouched = index == touchedIndex;
      final radius = isTouched ? 24.0 : 20.0;

      sections.add(
        PieChartSectionData(
          color: getAQIColor(band.$2),
          value: count.toDouble() * _animation.value,
          title: '${percentage.toStringAsFixed(0)}%',
          radius: radius,
          titleStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
      );
      index++;
    }

    return sections;
  }

  Widget _buildLegend(BuildContext context) {
    final bands = [
      ('Good', AQIBand.good),
      ('Moderate', AQIBand.moderate),
      ('Unhealthy for Sensitive Groups', AQIBand.unhealthySensitive),
      ('Unhealthy', AQIBand.unhealthy),
      ('Very Unhealthy', AQIBand.veryUnhealthy),
      ('Hazardous', AQIBand.hazardous),
    ];

    final legendItems = <Widget>[];
    for (final band in bands) {
      final count = widget.distribution.distribution[band.$1] ?? 0;
      if (count == 0) continue;

      final percentage = widget.distribution.getPercentage(band.$1);

      legendItems.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: getAQIColor(band.$2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  band.$1,
                  style: Theme.of(context).textTheme.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '${percentage.toStringAsFixed(1)}%',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: legendItems,
    );
  }
}
