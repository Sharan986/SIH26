import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Accessibility, ArrowLeft, ExternalLink, ShieldCheck, AlertCircle, Info } from 'lucide-react-native';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';

export default function OnboardingAccessibilityGuideScreen() {
  const router = useRouter();
  const { accessibility, openAccessibilitySettings } = usePermissions();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <Button
          title="Back"
          variant="ghost"
          size="small"
          icon={<ArrowLeft size={16} color="#4F46E5" />}
          onPress={() => router.back()}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Accessibility size={40} color="#4F46E5" />
        </View>

        <Text style={styles.title}>Enable Accessibility Service</Text>
        <Text style={styles.subtitle}>
          VoiceGuard uses a lightweight Android Accessibility Service to detect when phone calls transition into the active
          in-call state, triggering automatic voice authenticity analysis.
        </Text>

        <GlassCard style={styles.instructionCard}>
          <Text style={styles.stepHeader}>Setup Instructions:</Text>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>1.</Text>
            <Text style={styles.stepText}>Tap <Text style={styles.bold}>Open Accessibility Settings</Text> below.</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>2.</Text>
            <Text style={styles.stepText}>Look for <Text style={styles.bold}>VoiceGuard</Text> (or Installed Services &gt; VoiceGuard).</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>3.</Text>
            <Text style={styles.stepText}>Toggle the switch to <Text style={styles.bold}>On</Text> and confirm the prompt.</Text>
          </View>
        </GlassCard>

        {/* Android 13/14/15 Restricted Settings Help */}
        <View style={styles.restrictedCard}>
          <View style={styles.restrictedHeader}>
            <AlertCircle size={18} color="#D97706" style={styles.restrictedIcon} />
            <Text style={styles.restrictedTitle}>If greyed out / "Restricted Setting":</Text>
          </View>
          <Text style={styles.restrictedText}>
            On Android 13+, sideloaded apps require manual permission:
            {'\n'}1. Open your phone's <Text style={styles.bold}>Settings &gt; Apps &gt; VoiceGuard</Text>.
            {'\n'}2. Tap the <Text style={styles.bold}>3 dots (⋮)</Text> in top-right corner.
            {'\n'}3. Tap <Text style={styles.bold}>"Allow restricted settings"</Text>.
            {'\n'}4. Return here and tap <Text style={styles.bold}>Open Accessibility Settings</Text>.
          </Text>
        </View>

        {/* Expo Go Notice */}
        <View style={styles.expoGoBox}>
          <Info size={16} color="#4F46E5" style={styles.noticeIcon} />
          <Text style={styles.expoGoText}>
            <Text style={styles.bold}>Note for Developers</Text>: Accessibility services require an Expo Development Build (<Text style={styles.codeText}>npx expo run:android</Text>) because custom Android native modules are not bundled inside the generic Expo Go app.
          </Text>
        </View>

        <View style={styles.noticeBox}>
          <ShieldCheck size={18} color="#16A34A" style={styles.noticeIcon} />
          <Text style={styles.noticeText}>
            VoiceGuard only monitors call state events and never captures keystrokes, personal messages, or unrelated application data.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title={accessibility ? 'Accessibility Enabled ✓' : 'Open Accessibility Settings'}
            onPress={openAccessibilitySettings}
            size="large"
            icon={<ExternalLink size={18} color="#FFFFFF" />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topNav: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  instructionCard: {
    width: '100%',
    padding: 18,
    marginBottom: 14,
  },
  stepHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepNumber: {
    fontWeight: '700',
    color: '#4F46E5',
    marginRight: 8,
    width: 18,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#4F46E5',
  },
  restrictedCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    width: '100%',
    marginBottom: 14,
  },
  restrictedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  restrictedIcon: {
    marginRight: 8,
  },
  restrictedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  restrictedText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  expoGoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    width: '100%',
    marginBottom: 14,
  },
  expoGoText: {
    flex: 1,
    fontSize: 12,
    color: '#3730A3',
    lineHeight: 18,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    width: '100%',
    marginBottom: 24,
  },
  noticeIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  actions: {
    width: '100%',
  },
});
