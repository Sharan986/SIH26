import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Mic, Radio, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { AudioCapabilityInfo } from '../../types/audio';

interface AudioCapabilityBadgeProps {
  capability: AudioCapabilityInfo | null;
  compact?: boolean;
}

export const AudioCapabilityBadge: React.FC<AudioCapabilityBadgeProps> = ({ capability, compact = false }) => {
  if (!capability) {
    return (
      <View style={[styles.badge, styles.badgeChecking]}>
        <Radio size={14} color="#64748B" style={styles.icon} />
        <Text style={styles.textChecking}>Checking call audio support...</Text>
      </View>
    );
  }

  const isDirectSupported = capability.directCallAudio;
  const isMicAvailable = capability.localMicrophoneAvailable;

  if (isDirectSupported) {
    return (
      <View style={[styles.badge, styles.badgeSupported]}>
        <CheckCircle size={14} color="#15803D" style={styles.icon} />
        <Text style={styles.textSupported}>Direct call audio — Supported</Text>
      </View>
    );
  }

  if (isMicAvailable) {
    return (
      <View style={[styles.badge, styles.badgeMic]}>
        <Mic size={14} color="#4338CA" style={styles.icon} />
        <Text style={styles.textMic}>
          {compact ? 'Acoustic Audio Path' : 'Direct call audio unavailable • Acoustic Capture Active'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.badgeError]}>
      <AlertTriangle size={14} color="#B91C1C" style={styles.icon} />
      <Text style={styles.textError}>Direct call audio unavailable on this device</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeChecking: {
    backgroundColor: '#F1F5F9',
  },
  badgeSupported: {
    backgroundColor: '#DCFCE7',
  },
  badgeMic: {
    backgroundColor: '#EEF2FF',
  },
  badgeError: {
    backgroundColor: '#FEE2E2',
  },
  icon: {
    marginRight: 6,
  },
  textChecking: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  textSupported: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  textMic: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
  textError: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
});
