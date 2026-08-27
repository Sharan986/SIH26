import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RiskLevel } from '../../types/analysis';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'small' | 'medium' | 'large';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'medium' }) => {
  let bg = '#DCFCE7';
  let text = '#15803D';
  let label = 'LIKELY REAL';
  let dotColor = '#16A34A';

  if (level === 'POSSIBLE_AI_VOICE') {
    bg = '#FEE2E2';
    text = '#B91C1C';
    label = 'POSSIBLE AI VOICE';
    dotColor = '#DC2626';
  } else if (level === 'INCONCLUSIVE') {
    bg = '#FEF3C7';
    text = '#B45309';
    label = 'INCONCLUSIVE';
    dotColor = '#F59E0B';
  }

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        isSmall && styles.badgeSmall,
        isLarge && styles.badgeLarge,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }, isSmall && styles.dotSmall]} />
      <Text
        style={[
          styles.text,
          { color: text },
          isSmall && styles.textSmall,
          isLarge && styles.textLarge,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textSmall: {
    fontSize: 10,
  },
  textLarge: {
    fontSize: 14,
  },
});
