import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { RiskLevel } from '../../types/analysis';

interface CircularRiskGaugeProps {
  score: number; // 0 to 100
  confidence: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  isProcessing?: boolean;
}

export const CircularRiskGauge: React.FC<CircularRiskGaugeProps> = ({
  score,
  confidence,
  size = 240,
  strokeWidth = 16,
  label,
  isProcessing = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const strokeDashoffset = circumference - progress * circumference;

  // Determine color scheme based on risk level
  let strokeColor = '#16A34A'; // Success / Likely Real
  let badgeBg = '#DCFCE7';
  let badgeText = '#15803D';
  let categoryTitle = 'LIKELY REAL';

  if (score > 60) {
    strokeColor = '#DC2626'; // Danger / Possible AI Voice
    badgeBg = '#FEE2E2';
    badgeText = '#B91C1C';
    categoryTitle = 'POSSIBLE AI VOICE';
  } else if (score > 30) {
    strokeColor = '#F59E0B'; // Warning / Inconclusive
    badgeBg = '#FEF3C7';
    badgeText = '#B45309';
    categoryTitle = 'INCONCLUSIVE';
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#riskGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.contentContainer}>
        <Text style={styles.scoreText}>{score}%</Text>
        <Text style={styles.riskLabel}>AI RISK</Text>

        <View style={[styles.categoryBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.categoryText, { color: badgeText }]}>
            {label || categoryTitle}
          </Text>
        </View>

        {confidence > 0 && (
          <Text style={styles.confidenceText}>
            Confidence {confidence}%
          </Text>
        )}

        {isProcessing && (
          <Text style={styles.liveIndicator}>● LIVE</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  svg: {
    position: 'absolute',
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
  },
  riskLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.5,
    marginTop: -2,
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  liveIndicator: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
