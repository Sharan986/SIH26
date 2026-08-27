import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Cpu, Layers, Radio, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';

export default function ModelInfoScreen() {
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
        <Text style={styles.headerTitle}>AI Model & Inference</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.iconCircle}>
              <Cpu size={24} color="#4F46E5" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.modelName}>Wav2Vec2 Deepfake Detector</Text>
              <Text style={styles.modelTag}>Pretrained Acoustic Transformer</Text>
            </View>
          </View>
        </GlassCard>

        <Text style={styles.sectionHeading}>Model Architecture Details</Text>
        <GlassCard style={styles.infoCard}>
          <View style={styles.itemRow}>
            <CheckCircle2 size={16} color="#16A34A" style={styles.itemIcon} />
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Primary Model</Text>
              <Text style={styles.itemDesc}>MelodyMachine/Deepfake-audio-detection-V2</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.itemRow}>
            <CheckCircle2 size={16} color="#16A34A" style={styles.itemIcon} />
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Fallback Model</Text>
              <Text style={styles.itemDesc}>Gustking/wav2vec2-large-xlsr-deepfake-audio-classification</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.itemRow}>
            <CheckCircle2 size={16} color="#16A34A" style={styles.itemIcon} />
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Audio Sample Rate</Text>
              <Text style={styles.itemDesc}>16,000 Hz (16kHz Mono 16-bit PCM)</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.itemRow}>
            <CheckCircle2 size={16} color="#16A34A" style={styles.itemIcon} />
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Rolling Buffer Window</Text>
              <Text style={styles.itemDesc}>5.0 Seconds (80,000 Audio Samples)</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.itemRow}>
            <CheckCircle2 size={16} color="#16A34A" style={styles.itemIcon} />
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>Temporal Smoothing</Text>
              <Text style={styles.itemDesc}>Exponential Moving Average (EMA α = 0.35)</Text>
            </View>
          </View>
        </GlassCard>

        <Text style={styles.sectionHeading}>Classification Strategy</Text>
        <GlassCard style={styles.infoCard}>
          <Text style={styles.bodyText}>
            The model analyzes raw audio waveforms directly without relying purely on hand-crafted spectrograms. It evaluates high-frequency phase consistency, vocoder synthesis traces, and natural glottal pulse variations to yield an AI probability score between 0% and 100%.
          </Text>
        </GlassCard>

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
  heroCard: {
    padding: 16,
    marginBottom: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroText: {
    flex: 1,
  },
  modelName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modelTag: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  infoCard: {
    padding: 16,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  itemIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  bodyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
});
