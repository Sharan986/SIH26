import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';

export const DisclaimerBanner: React.FC = () => {
  return (
    <View style={styles.container}>
      <ShieldAlert size={16} color="#64748B" style={styles.icon} />
      <Text style={styles.text}>
        VoiceGuard provides an AI-based risk assessment. It is not definitive proof that a voice is synthetic.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  icon: {
    marginTop: 2,
    marginRight: 10,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
});
