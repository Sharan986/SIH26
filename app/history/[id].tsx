import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, Layers, Smartphone, Trash2, Calendar, Play as PlayIcon, Square, Volume2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
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

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    async function load() {
      if (id) {
        const item = await StorageService.getHistoryById(id);
        setRecord(item);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlayPause = async () => {
    if (!record?.localFilePath) return;

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          if (positionMs >= durationMs && durationMs > 0) {
            await sound.playFromPositionAsync(0);
          } else {
            await sound.playAsync();
          }
        }
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: 'file://' + record.localFilePath },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              setPositionMs(status.positionMillis);
              setDurationMs(status.durationMillis || 0);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPositionMs(status.durationMillis || 0);
              }
            }
          }
        );
        setSound(newSound);
      }
    } catch (e) {
      console.error("Audio playback error:", e);
      Alert.alert("Playback Error", "Could not play the audio file. It may have been deleted or corrupted.");
    }
  };

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

        {/* Audio Player */}
        {record.localFilePath && (
          <GlassCard style={styles.playerCard}>
            <Text style={styles.chartTitle}>Call Recording</Text>
            <View style={styles.playerControls}>
              <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause}>
                {isPlaying ? <Square fill="#FFF" color="#FFF" size={20} /> : <PlayIcon fill="#FFF" color="#FFF" size={20} />}
              </TouchableOpacity>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: durationMs > 0 ? `${(positionMs / durationMs) * 100}%` : '0%' }]} />
              </View>
              <Text style={styles.timeText}>
                {formatDuration(Math.floor(positionMs / 1000))} / {formatDuration(Math.floor(durationMs / 1000) || record.durationSec)}
              </Text>
            </View>
          </GlassCard>
        )}

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
  playerCard: {
    padding: 14,
    marginBottom: 14,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    fontVariant: ['tabular-nums'],
    width: 80,
    textAlign: 'right',
  }
});
