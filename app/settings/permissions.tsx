import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Accessibility, PhoneCall, Radio, CheckCircle, XCircle } from 'lucide-react-native';
import { usePermissions } from '../../hooks/usePermissions';
import { useCallAudio } from '../../hooks/useCallAudio';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';

export default function SettingsPermissionsScreen() {
  const router = useRouter();
  const { microphone, accessibility, phoneState, requestMicrophone, openAccessibilitySettings, checkPermissions } =
    usePermissions();
  const { capability, checkCapability } = useCallAudio();

  useEffect(() => {
    checkPermissions();
    checkCapability();
  }, [checkPermissions, checkCapability]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <Button
          title="Back"
          variant="ghost"
          size="small"
          icon={<ArrowLeft size={16} color="#4F46E5" />}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Permissions & Hardware</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          VoiceGuard strictly requests only the minimal Android system capabilities necessary to detect phone calls and evaluate voice authenticity.
        </Text>

        <View style={styles.list}>
          {/* Microphone */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Mic size={20} color="#4F46E5" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Microphone Access</Text>
                <Text style={styles.cardSubtitle}>Direct acoustic sampling during active call checks</Text>
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
                    <Text style={styles.statusDenied}>Denied</Text>
                  </>
                )}
              </View>
              {!microphone && (
                <Button title="Request Access" size="small" variant="outline" onPress={requestMicrophone} />
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
                <Text style={styles.cardTitle}>VoiceGuard Accessibility Service</Text>
                <Text style={styles.cardSubtitle}>Identifies active telephony in-call window transitions</Text>
              </View>
            </View>
            <View style={styles.cardStatusRow}>
              <View style={styles.statusIndicator}>
                {accessibility ? (
                  <>
                    <CheckCircle size={15} color="#16A34A" style={styles.statusIcon} />
                    <Text style={styles.statusGranted}>Active / Running</Text>
                  </>
                ) : (
                  <>
                    <XCircle size={15} color="#DC2626" style={styles.statusIcon} />
                    <Text style={styles.statusDenied}>Disabled</Text>
                  </>
                )}
              </View>
              <Button
                title={accessibility ? 'Manage Settings' : 'Enable Service'}
                size="small"
                variant={accessibility ? 'ghost' : 'outline'}
                onPress={openAccessibilitySettings}
              />
            </View>
          </GlassCard>

          {/* Telephony Call Detection */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <PhoneCall size={20} color="#4F46E5" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Telephony State Detection</Text>
                <Text style={styles.cardSubtitle}>Monitors RINGING, ACTIVE, and ENDED telephony states</Text>
              </View>
            </View>
            <View style={styles.cardStatusRow}>
              <View style={styles.statusIndicator}>
                <CheckCircle size={15} color="#16A34A" style={styles.statusIcon} />
                <Text style={styles.statusGranted}>Ready</Text>
              </View>
            </View>
          </GlassCard>

          {/* Hardware Diagnostic */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Radio size={20} color="#4F46E5" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Audio Path Diagnostic</Text>
                <Text style={styles.cardSubtitle}>
                  {capability ? capability.reason : 'Verifying audio subsystem...'}
                </Text>
              </View>
            </View>
            <View style={styles.diagBox}>
              <Text style={styles.diagText}>
                • Device: {capability?.manufacturer} {capability?.model} (API {capability?.androidVersion}){'\n'}
                • Selected Audio Source: {capability?.audioSource}{'\n'}
                • Direct Call Downlink: {capability?.directCallAudio ? 'Supported' : 'Restricted by Android Security Policy'}{'\n'}
                • Acoustic Microphone Path: {capability?.localMicrophoneAvailable ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </GlassCard>
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  list: {
    gap: 14,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
  diagBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  diagText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
