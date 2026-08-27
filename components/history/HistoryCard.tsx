import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock, Layers, Smartphone } from 'lucide-react-native';
import { AnalysisSummary } from '../../types/analysis';
import { RiskBadge } from '../ui/RiskBadge';
import { GlassCard } from '../ui/GlassCard';

interface HistoryCardProps {
  item: AnalysisSummary;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({ item }) => {
  const router = useRouter();

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/history/${item.id}` as any)}
      style={styles.container}
    >
      <GlassCard style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          <RiskBadge level={item.resultLabel} size="small" />
        </View>

        <View style={styles.mainRow}>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreNumber}>{item.smoothedAiRisk}%</Text>
            <Text style={styles.scoreLabel}>AI Risk</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaColumn}>
            <View style={styles.metaItem}>
              <Clock size={13} color="#64748B" style={styles.metaIcon} />
              <Text style={styles.metaText}>Duration: {formatDuration(item.durationSec)}</Text>
            </View>

            <View style={styles.metaItem}>
              <Layers size={13} color="#64748B" style={styles.metaIcon} />
              <Text style={styles.metaText}>{item.windowCount} Windows • Conf: {item.confidence}%</Text>
            </View>

            <View style={styles.metaItem}>
              <Smartphone size={13} color="#64748B" style={styles.metaIcon} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.mode}
              </Text>
            </View>
          </View>

          <ChevronRight size={18} color="#94A3B8" style={styles.chevron} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 14,
  },
  scoreNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: '#E2E8F0',
    marginRight: 14,
  },
  metaColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
  },
  chevron: {
    marginLeft: 6,
  },
});
