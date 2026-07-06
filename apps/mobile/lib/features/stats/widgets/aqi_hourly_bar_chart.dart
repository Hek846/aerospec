import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../data/models/analytics.dart';
import '../../../data/models/aqi.dart';

class AQIHourlyBarChart extends StatefulWidget {
  final List<HourlyAQI> hourlyData;

  const AQIHourlyBarChart({
    super.key,
    required this.hourlyData,
  });

  @override
  State<AQIHourlyBarChart> createState() => _AQIHourlyBarChartState();
}

class _AQIHourlyBarChartState extends State<AQIHourlyBarChart> {
  int? touchedIndex;

  @override
  Widget build(BuildContext context) {
    final maxAqi = widget.hourlyData
        .map((h) => h.averageAqi)
        .reduce((a, b) => a > b ? a : b);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Average AQI by Hours',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxAqi > 0 ? maxAqi * 1.1 : 100,
                  barTouchData: BarTouchData(
                    enabled: true,
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        final hourData = widget.hourlyData[group.x.toInt()];
                        if (hourData.readingsCount == 0) {
                          return null;
                        }
                        return BarTooltipItem(
                          '${hourData.hour}:00\n',
                          const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                          children: [
                            TextSpan(
                              text: 'AQI: ${hourData.averageAqi.toStringAsFixed(0)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    touchCallback: (FlTouchEvent event, barTouchResponse) {
                      setState(() {
                        if (!event.isInterestedForInteractions ||
                            barTouchResponse == null ||
                            barTouchResponse.spot == null) {
                          touchedIndex = null;
                          return;
                        }
                        touchedIndex = barTouchResponse.spot!.touchedBarGroupIndex;
                      });
                    },
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          // Show only every 4th hour to avoid crowding
                          if (value.toInt() % 4 != 0) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              '${value.toInt()}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          );
                        },
                      ),
                    ),
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: maxAqi > 0 ? maxAqi / 4 : 25,
                    getDrawingHorizontalLine: (value) {
                      return FlLine(
                        color: Colors.grey.withOpacity(0.2),
                        strokeWidth: 1,
                      );
                    },
                  ),
                  borderData: FlBorderData(
                    show: false,
                  ),
                  barGroups: widget.hourlyData.asMap().entries.map((entry) {
                    final index = entry.key;
                    final hourData = entry.value;
                    final isTouched = index == touchedIndex;

                    return BarChartGroupData(
                      x: index,
                      barRods: [
                        BarChartRodData(
                          toY: hourData.averageAqi,
                          color: hourData.averageAqi > 0
                              ? calculateAQI(hourData.averageAqi.round()).color
                              : Colors.grey.withOpacity(0.3),
                          width: isTouched ? 18 : 16,
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(4),
                            topRight: Radius.circular(4),
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
