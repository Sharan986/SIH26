import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Trash2, Filter } from 'lucide-react-native';
import { useHistory } from '../../hooks/useHistory';
import { HistoryCard } from '../../components/history/HistoryCard';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';

export default function HistoryListScreen() {
  const { history, isLoading, filter, setFilter, loadHistory, clearAll } = useHistory();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClear = () => {
    Alert.alert(
      'Clear Analysis History',
      'Are you sure you want to permanently delete all recorded voice authenticity analyses?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: clearAll },
      ]
    );
  };

  const filterOptions: { label: string; value: 'ALL' | 'LIKELY_REAL' | 'INCONCLUSIVE' | 'POSSIBLE_AI_VOICE' }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'AI Voice', value: 'POSSIBLE_AI_VOICE' },
    { label: 'Inconclusive', value: 'INCONCLUSIVE' },
    { label: 'Likely Real', value: 'LIKELY_REAL' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Analysis History</Text>
          <Text style={styles.subtitle}>{history.length} recorded session{history.length !== 1 ? 's' : ''}</Text>
        </View>

        {history.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
            <Trash2 size={18} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filterOptions.map((opt) => {
          const isActive = (filter.riskLevel || 'ALL') === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setFilter({ ...filter, riskLevel: opt.value })}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryCard item={item} />}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={loadHistory}
        ListEmptyComponent={
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No stored analyses</Text>
            <Text style={styles.emptySubtitle}>
              VoiceGuard records will automatically be saved locally after each completed call voice check.
            </Text>
          </GlassCard>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  clearBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
