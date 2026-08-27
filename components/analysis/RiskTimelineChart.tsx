import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { PredictionPoint } from '../../types/analysis';

interface RiskTimelineChartProps {
  predictions: PredictionPoint[];
  height?: number;
  width?: number;
}

export const RiskTimelineChart: React.FC<RiskTimelineChartProps> = ({
  predictions,
  height = 140,
  width = Dimensions.get('window').width - 64,
}) => {
  if (predictions.length < 2) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>Analyzing call windows to generate timeline...</Text>
      </View>
    );
  }

  const paddingLeft = 30;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = predictions.map((p, idx) => {
    const x = paddingLeft + (idx / (predictions.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - p.aiRisk * chartHeight;
    return { x, y, risk: Math.round(p.aiRisk * 100), time: p.timestamp };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${
    paddingTop + chartHeight
  } Z`;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#4F46E5" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* 30% and 60% threshold dashed lines */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight * (1 - 0.3)}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight * (1 - 0.3)}
          stroke="#CBD5E1"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight * (1 - 0.6)}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight * (1 - 0.6)}
          stroke="#FCA5A5"
          strokeDasharray="4 4"
          strokeWidth={1}
        />

        {/* Base line */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="#E2E8F0"
          strokeWidth={1.5}
        />

        {/* Area Fill */}
        <Path d={areaD} fill="url(#chartFill)" />

        {/* Line Stroke */}
        <Path d={pathD} stroke="#4F46E5" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((pt, idx) => (
          <Circle key={idx} cx={pt.x} cy={pt.y} r={idx === points.length - 1 ? 4.5 : 3} fill="#4F46E5" />
        ))}
      </Svg>

      <View style={styles.legendRow}>
        <Text style={styles.axisLabel}>0% (Real)</Text>
        <Text style={styles.axisLabel}>60% (AI Threshold)</Text>
        <Text style={styles.axisLabel}>100%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  axisLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
