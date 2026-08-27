import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, Clock, Layers, Shield, ArrowRight, Home } from 'lucide-react-native';
import { StorageService } from '../../services/storage';
import { AnalysisSummary } from '../../types/analysis';
import { GlassCard } from '../../components/ui/GlassCard';
import { RiskBadge } from '../../components/ui/RiskBadge';
import { CircularRiskGauge } from '../../components/ui/CircularRiskGauge';
import { RiskTimelineChart } from '../../components/analysis/RiskTimelineChart';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';
import { Button } from '../../components/ui/Button';

export default function LiveResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const summaryId = params.summaryId as string;

  const [summary, setSummary] = useState<AnalysisSummary | null>(null);

  useEffect(() => {
    async function load() {
      if (summaryId) {
        const data = await StorageService.getHistoryById(summaryId);
        setSummary(data);
      } else {
        const all = await StorageService.getHistory();
        if (all.length > 0) {
          setSummary(all[0]);
        }
      }
    }
    load();
  }, [summaryId]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!summary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analysis summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <CheckCircle size={32} color="#16A34A" />
          </View>
          <Text style={styles.title}>Voice Analysis Complete</Text>
          <Text style={styles.subtitle}>Call session ended and authenticity evaluated</Text>
        </View>

        {/* Circular Gauge */}
        <View style={styles.gaugeSection}>
          <CircularRiskGauge
            score={summary.smoothedAiRisk}
            confidence={summary.confidence}
            size={230}
            strokeWidth={16}
          />
        </View>

        {/* Metadata Breakdown Cards */}
        <View style={styles.grid}>
          <GlassCard style={styles.gridCard}>
            <Clock size={16} color="#64748B" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>Call Duration</Text>
            <Text style={styles.cardValue}>{formatDuration(summary.durationSec)}</Text>
          </GlassCard>

          <GlassCard style={styles.gridCard}>
            <Layers size={16} color="#64748B" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>Analysis Windows</Text>
            <Text style={styles.cardValue}>{summary.windowCount}</Text>
          </GlassCard>
        </View>

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Audio Capture Mode</Text>
            <Text style={styles.infoValue}>{summary.mode}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device Target</Text>
            <Text style={styles.infoValue}>{summary.device}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session ID</Text>
            <Text style={styles.infoValue}>{summary.id}</Text>
          </View>
        </GlassCard>

        {/* Risk Over Time Graph */}
        {summary.predictionTimeline.length > 1 && (
          <GlassCard style={styles.chartCard}>
            <Text style={styles.chartTitle}>Risk Score Over Time</Text>
            <RiskTimelineChart predictions={summary.predictionTimeline} />
          </GlassCard>
        )}

        <DisclaimerBanner />

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Return to Home"
            size="large"
            icon={<Home size={18} color="#FFFFFF" />}
            onPress={() => router.replace('/(tabs)/home' as any)}
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
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    alignItems: 'center',
    marginVertical: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  gaugeSection: {
    marginVertical: 16,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridCard: {
    flex: 1,
    padding: 14,
  },
  cardIcon: {
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  infoCard: {
    padding: 14,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  chartCard: {
    padding: 14,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  actions: {
    marginTop: 20,
  },
});
