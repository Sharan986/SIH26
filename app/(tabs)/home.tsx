import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, Play, ArrowRight, Activity, ShieldAlert, Cpu } from 'lucide-react-native';
import { useCallState } from '../../hooks/useCallState';
import { useCallAudio } from '../../hooks/useCallAudio';
import { useHistory } from '../../hooks/useHistory';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { CallStateBanner } from '../../components/call/CallStateBanner';
import { AudioCapabilityBadge } from '../../components/call/AudioCapabilityBadge';
import { HistoryCard } from '../../components/history/HistoryCard';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';

export default function HomeScreen() {
  const router = useRouter();
  const { callState } = useCallState();
  const { capability, checkCapability } = useCallAudio();
  const { history, isLoading, loadHistory } = useHistory();

  useEffect(() => {
    loadHistory();
    checkCapability();
  }, [loadHistory, checkCapability]);

  const recentAnalyses = history.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadHistory} colors={['#4F46E5']} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>VoiceGuard</Text>
            <Text style={styles.appTagline}>Your voice safety layer</Text>
          </View>
          <View style={styles.shieldBadge}>
            <ShieldCheck size={24} color="#4F46E5" />
          </View>
        </View>

        {/* Live Call State Banner */}
        <View style={styles.section}>
          <CallStateBanner state={callState} />
        </View>

        {/* Hero Action Card */}
        <GlassCard variant="elevated" style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconCircle}>
              <Activity size={24} color="#4F46E5" />
            </View>
            <View style={styles.heroHeaderText}>
              <Text style={styles.heroTitle}>Live Voice Authenticity</Text>
              <Text style={styles.heroSubtitle}>
                {callState === 'ACTIVE'
                  ? 'Call is currently active and ready for analysis'
                  : 'Start real-time detection for cellular call audio'}
              </Text>
            </View>
          </View>

          <View style={styles.capabilityRow}>
            <AudioCapabilityBadge capability={capability} compact />
          </View>

          <Button
            title={callState === 'ACTIVE' ? 'Analyze Active Call Now' : 'Start Voice Check'}
            size="large"
            icon={<Play size={18} color="#FFFFFF" fill="#FFFFFF" />}
            onPress={() => router.push('/live' as any)}
            style={styles.heroButton}
          />
        </GlassCard>

        {/* Device Status & Model Info Summary */}
        <GlassCard style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Cpu size={18} color="#4F46E5" style={styles.statusIcon} />
              <View>
                <Text style={styles.statusLabel}>AI Model</Text>
                <Text style={styles.statusValue}>Wav2Vec2 Deepfake V2</Text>
              </View>
            </View>

            <View style={styles.statusDivider} />

            <View style={styles.statusItem}>
              <ShieldCheck size={18} color="#16A34A" style={styles.statusIcon} />
              <View>
                <Text style={styles.statusLabel}>Audio Buffer</Text>
                <Text style={styles.statusValue}>5.0s Rolling Window</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Recent Analysis Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Analysis</Text>
          {history.length > 0 && (
            <Button
              title="View All"
              variant="ghost"
              size="small"
              icon={<ArrowRight size={14} color="#4F46E5" />}
              onPress={() => router.push('/(tabs)/history' as any)}
            />
          )}
        </View>

        {history.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No analyses yet</Text>
            <Text style={styles.emptySubtitle}>
              Completed call voice checks will appear here with authenticity risk metrics and duration details.
            </Text>
          </GlassCard>
        ) : (
          recentAnalyses.map((item) => <HistoryCard key={item.id} item={item} />)
        )}

        {/* Disclaimer */}
        <DisclaimerBanner />
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  shieldBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  section: {
    marginBottom: 16,
  },
  heroCard: {
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroHeaderText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  capabilityRow: {
    marginBottom: 16,
  },
  heroButton: {
    width: '100%',
  },
  statusCard: {
    padding: 14,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    marginRight: 10,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  statusDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
