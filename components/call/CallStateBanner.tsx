import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phone, PhoneCall, PhoneOff } from 'lucide-react-native';
import { CallState } from '../../types/call';

interface CallStateBannerProps {
  state: CallState;
  durationSec?: number;
}

export const CallStateBanner: React.FC<CallStateBannerProps> = ({ state, durationSec = 0 }) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  let bg = '#F1F5F9';
  let textColor = '#475569';
  let dotColor = '#94A3B8';
  let label = 'No Active Call';
  let Icon = Phone;

  if (state === 'ACTIVE') {
    bg = '#EFF6FF';
    textColor = '#1D4ED8';
    dotColor = '#3B82F6';
    label = 'Call Active';
    Icon = PhoneCall;
  } else if (state === 'RINGING') {
    bg = '#FEF3C7';
    textColor = '#B45309';
    dotColor = '#F59E0B';
    label = 'Incoming Call...';
    Icon = Phone;
  } else if (state === 'ENDED') {
    bg = '#FEE2E2';
    textColor = '#B91C1C';
    dotColor = '#EF4444';
    label = 'Call Ended';
    Icon = PhoneOff;
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.leftRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Icon size={16} color={textColor} style={styles.icon} />
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </View>

      {state === 'ACTIVE' && (
        <Text style={[styles.timer, { color: textColor }]}>{formatTime(durationSec)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  timer: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
