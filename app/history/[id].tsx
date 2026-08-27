import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, Layers, Smartphone, Trash2, Calendar } from 'lucide-react-native';
import { StorageService } from '../../services/storage';
import { AnalysisSummary } from '../../types/analysis';
import { GlassCard } from '../../components/ui/GlassCard';
import { RiskBadge } from '../../components/ui/RiskBadge';
import { CircularRiskGauge } from '../../components/ui/CircularRiskGauge';
import { RiskTimelineChart } from '../../components/analysis/RiskTimelineChart';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';
import { Button } from '../../components/ui/Button';

export default function HistoryDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<AnalysisSummary | null>(null);

  useEffect(() => {
    async function load() {
      if (id) {
        const item = await StorageService.getHistoryById(id);
        setRecord(item);
      }
    }
    load();
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this analysis record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await StorageService.deleteHistoryRecord(id);
            router.back();
          }
        },
      },
    ]);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analysis details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Button
          title="Back"
          variant="ghost"
          size="small"
          icon={<ArrowLeft size={16} color="#4F46E5" />}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Analysis Details</Text>
        <Button
          title=""
          variant="ghost"
          size="small"
          icon={<Trash2 size={18} color="#DC2626" />}
          onPress={handleDelete}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date & Badge */}
        <View style={styles.metaRow}>
          <View style={styles.dateGroup}>
            <Calendar size={14} color="#64748B" style={styles.dateIcon} />
            <Text style={styles.dateText}>{formatDate(record.timestamp)}</Text>
          </View>
          <RiskBadge level={record.resultLabel} size="medium" />
        </View>

        {/* Circular Gauge */}
        <View style={styles.gaugeSection}>
          <CircularRiskGauge
            score={record.smoothedAiRisk}
            confidence={record.confidence}
            size={220}
            strokeWidth={16}
          />
        </View>

        {/* Stat Grid */}
        <View style={styles.grid}>
          <GlassCard style={styles.gridCard}>
            <Clock size={16} color="#64748B" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>Call Duration</Text>
            <Text style={styles.cardValue}>{formatDuration(record.durationSec)}</Text>
          </GlassCard>

          <GlassCard style={styles.gridCard}>
            <Layers size={16} color="#64748B" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>Windows Analyzed</Text>
            <Text style={styles.cardValue}>{record.windowCount}</Text>
          </GlassCard>
        </View>

        {/* Technical Detail Card */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Audio Capture Mode</Text>
            <Text style={styles.infoValue}>{record.mode}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target Device</Text>
            <Text style={styles.infoValue}>{record.device}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Average Risk</Text>
            <Text style={styles.infoValue}>{record.averageAiRisk}%</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session ID</Text>
            <Text style={styles.infoValue}>{record.id}</Text>
          </View>
        </GlassCard>

        {/* Risk Over Time Graph */}
        {record.predictionTimeline && record.predictionTimeline.length > 1 && (
          <GlassCard style={styles.chartCard}>
            <Text style={styles.chartTitle}>Risk Evolution Over Time</Text>
            <RiskTimelineChart predictions={record.predictionTimeline} />
          </GlassCard>
        )}

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  gaugeSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
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
    marginBottom: 14,
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
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
});
