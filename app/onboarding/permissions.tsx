import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Mic, Accessibility, PhoneCall, Radio, CheckCircle, XCircle, ArrowRight } from 'lucide-react-native';
import { usePermissions } from '../../hooks/usePermissions';
import { useCallAudio } from '../../hooks/useCallAudio';
import { settingsStore } from '../../store/settingsStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';

export default function OnboardingPermissionsScreen() {
  const router = useRouter();
  const { microphone, accessibility, phoneState, requestMicrophone, openAccessibilitySettings, checkPermissions } =
    usePermissions();
  const { capability, checkCapability } = useCallAudio();

  useEffect(() => {
    const timer = setInterval(() => {
      checkPermissions();
      checkCapability();
    }, 2500);
    return () => clearInterval(timer);
  }, [checkPermissions, checkCapability]);

  const handleFinish = async () => {
    await settingsStore.setOnboardingCompleted(true);
    router.replace('/(tabs)/home' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>VoiceGuard Setup</Text>
          <Text style={styles.subtitle}>
            Configure the required system permissions to enable AI voice authenticity checks during calls.
          </Text>
        </View>

        <View style={styles.list}>
          {/* Microphone */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Mic size={20} color="#4F46E5" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Microphone</Text>
                <Text style={styles.cardSubtitle}>Required to sample call audio communication</Text>
              </View>
            </View>
            <View style={styles.cardStatusRow}>
              <View style={styles.statusIndicator}>
                {microphone ? (
                  <>
                    <CheckCircle size={15} color="#16A34A" style={styles.statusIcon} />
                    <Text style={styles.statusGranted}>Granted</Text>
                  </>
                ) : (
                  <>
                    <XCircle size={15} color="#DC2626" style={styles.statusIcon} />
                    <Text style={styles.statusDenied}>Not granted</Text>
                  </>
                )}
              </View>
              {!microphone && (
                <Button title="Grant Access" size="small" variant="outline" onPress={requestMicrophone} />
              )}
            </View>
          </GlassCard>

          {/* Accessibility Service */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Accessibility size={20} color="#4F46E5" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Accessibility Service</Text>
                <Text style={styles.cardSubtitle}>Coordinates active call state transitions</Text>
              </View>
            </View>
            <View style={styles.cardStatusRow}>
              <View style={styles.statusIndicator}>
                {accessibility ? (
                  <>
                    <CheckCircle size={15} color="#16A34A" style={styles.statusIcon} />
                    <Text style={styles.statusGranted}>Enabled</Text>
                  </>
                ) : (
                  <>
                    <XCircle size={15} color="#DC2626" style={styles.statusIcon} />
                    <Text style={styles.statusDenied}>Not enabled</Text>
                  </>
                )}
              </View>
              <Button
                title={accessibility ? 'Settings' : 'Enable Service'}
                size="small"
                variant={accessibility ? 'ghost' : 'outline'}
                onPress={openAccessibilitySettings}
              />
            </View>
          </GlassCard>

          {/* Call Detection */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <PhoneCall size={20} color="#4F46E5" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Call Detection</Text>
                <Text style={styles.cardSubtitle}>Telephony manager call state monitoring</Text>
              </View>
            </View>
            <View style={styles.cardStatusRow}>
              <View style={styles.statusIndicator}>
                {phoneState ? (
                  <>
                    <CheckCircle size={15} color="#16A34A" style={styles.statusIcon} />
                    <Text style={styles.statusGranted}>Available</Text>
                  </>
                ) : (
                  <>
                    <XCircle size={15} color="#DC2626" style={styles.statusIcon} />
                    <Text style={styles.statusDenied}>Unavailable</Text>
                  </>
                )}
              </View>
            </View>
          </GlassCard>

          {/* Call Audio Hardware Probe */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Radio size={20} color="#4F46E5" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Call Audio Path</Text>
                <Text style={styles.cardSubtitle}>
                  {capability ? capability.reason : 'Probing audio hardware capabilities...'}
                </Text>
              </View>
            </View>
            <View style={styles.cardStatusRow}>
              <View style={styles.statusIndicator}>
                {capability ? (
                  capability.supported || capability.localMicrophoneAvailable ? (
                    <>
                      <CheckCircle size={15} color="#16A34A" style={styles.statusIcon} />
                      <Text style={styles.statusGranted}>
                        {capability.directCallAudio ? 'Direct Call Audio' : 'Acoustic Path Ready'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <XCircle size={15} color="#DC2626" style={styles.statusIcon} />
                      <Text style={styles.statusDenied}>Hardware Incompatible</Text>
                    </>
                  )
                ) : (
                  <Text style={styles.statusChecking}>Checking...</Text>
                )}
              </View>
            </View>
          </GlassCard>
        </View>

        <View style={styles.footer}>
          <Button
            title="Complete Setup & Enter"
            size="large"
            onPress={handleFinish}
            icon={<ArrowRight size={18} color="#FFFFFF" />}
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
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  list: {
    gap: 14,
    marginBottom: 32,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusGranted: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  statusDenied: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  statusChecking: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  footer: {
    marginTop: 8,
    marginBottom: 24,
  },
});
