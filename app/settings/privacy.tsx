import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Mic, Accessibility, Server, Database, Trash2, ShieldCheck } from 'lucide-react-native';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

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
        <Text style={styles.headerTitle}>Privacy & Data Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerHero}>
          <View style={styles.iconCircle}>
            <Lock size={28} color="#4F46E5" />
          </View>
          <Text style={styles.heroTitle}>Transparency & Trust</Text>
          <Text style={styles.heroSubtitle}>
            VoiceGuard is committed to absolute clarity regarding how voice signals are handled.
          </Text>
        </View>

        <View style={styles.sectionList}>
          {/* Section 1 */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Mic size={18} color="#4F46E5" style={styles.cardIcon} />
              <Text style={styles.cardTitle}>1. Why Microphone Access is Needed</Text>
            </View>
            <Text style={styles.cardText}>
              VoiceGuard accesses the microphone / voice communication audio stream strictly when you initiate an active voice check session. This allows sampling the speech signal to assess authenticity characteristics (such as vocoder phase artifacts and acoustic synthetic speech traits).
            </Text>
          </GlassCard>

          {/* Section 2 */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Accessibility size={18} color="#4F46E5" style={styles.cardIcon} />
              <Text style={styles.cardTitle}>2. Why Accessibility Access is Needed</Text>
            </View>
            <Text style={styles.cardText}>
              The Accessibility Service is used solely to detect when a phone call is active or ended by observing in-call system windows. VoiceGuard does not inspect your personal messages, keyboard typing, or screen content of unrelated apps.
            </Text>
          </GlassCard>

          {/* Section 3 */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Server size={18} color="#4F46E5" style={styles.cardIcon} />
              <Text style={styles.cardTitle}>3. Backend Audio Transmission</Text>
            </View>
            <Text style={styles.cardText}>
              During an active analysis, short 5-second PCM audio chunks are streamed via WebSocket / REST to your configured VoiceGuard AI backend server for Wav2Vec2 machine learning inference. Audio is decoded in RAM for inference and is not saved to disk on the backend.
            </Text>
          </GlassCard>

          {/* Section 4 */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Database size={18} color="#4F46E5" style={styles.cardIcon} />
              <Text style={styles.cardTitle}>4. Local History & Retention</Text>
            </View>
            <Text style={styles.cardText}>
              Only high-level metadata (risk score, confidence percentage, duration, and session timestamp) is stored in local encrypted device storage. Raw audio recordings of the call are discarded after the session closes.
            </Text>
          </GlassCard>

          {/* Section 5 */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Trash2 size={18} color="#DC2626" style={styles.cardIcon} />
              <Text style={styles.cardTitle}>5. How to Delete Your Data</Text>
            </View>
            <Text style={styles.cardText}>
              You have full ownership of your data. You can delete individual analysis records or wipe all history at any time from the Settings tab via the "Clear All History" action.
            </Text>
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
  headerHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  sectionList: {
    gap: 14,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
});
