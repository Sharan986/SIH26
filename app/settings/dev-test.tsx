import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Terminal, Play, CheckCircle, AlertTriangle, RefreshCw, Cpu } from 'lucide-react-native';
import { ApiService, HealthResponse } from '../../services/api';
import { settingsStore } from '../../store/settingsStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { PredictionPoint } from '../../types/analysis';

export default function DevTestScreen() {
  const router = useRouter();
  const settings = settingsStore.getState();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [testPrediction, setTestPrediction] = useState<PredictionPoint | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogMessages((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const checkBackendHealth = async () => {
    setIsCheckingHealth(true);
    addLog(`Pinging FastAPI health check at: ${settings.apiUrl}/health...`);
    try {
      const res = await ApiService.checkHealth(settings.apiUrl);
      setHealth(res);
      addLog(`Backend responded: status=${res.status}, model=${res.model}, device=${res.device}`);
    } catch (err: any) {
      addLog(`Health check failed: ${err.message}`);
      setHealth(null);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const runTestInference = async () => {
    setIsRunningTest(true);
    addLog('Generating synthetic test PCM waveform (16kHz 16-bit 3 seconds)...');

    try {
      // Generate 3-second multi-frequency test wave in Base64 PCM format
      const sampleRate = 16000;
      const durationSec = 3.0;
      const totalSamples = Math.floor(sampleRate * durationSec);
      const buffer = new Int16Array(totalSamples);

      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        // 440Hz + 880Hz harmonic signal
        const sampleVal = 0.5 * Math.sin(2 * Math.PI * 440 * t) + 0.25 * Math.sin(2 * Math.PI * 880 * t);
        buffer[i] = Math.floor(sampleVal * 32767);
      }

      // Convert Int16Array to byte string then Base64
      const uint8 = new Uint8Array(buffer.buffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64Pcm = btoa(binary);

      addLog(`Sending ${totalSamples} samples (${base64Pcm.length} chars) to /analyze...`);
      const startTime = Date.now();
      const pred = await ApiService.analyzeAudioPcm(base64Pcm, 16000, 1, settings.apiUrl);
      const elapsed = Date.now() - startTime;

      setTestPrediction(pred);
      addLog(`Inference completed in ${elapsed}ms: AI Risk=${Math.round(pred.aiRisk * 100)}%, Label=${pred.label}`);
    } catch (err: any) {
      addLog(`Inference test failed: ${err.message}`);
    } finally {
      setIsRunningTest(false);
    }
  };

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
        <Text style={styles.headerTitle}>Developer Pipeline Test</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Backend Health Check */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Terminal size={18} color="#4F46E5" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Backend Server Probe</Text>
          </View>
          <Text style={styles.cardSubtitle}>URL: {settings.apiUrl}</Text>

          {health && (
            <View style={styles.healthResultBox}>
              <CheckCircle size={16} color="#16A34A" style={styles.healthIcon} />
              <Text style={styles.healthText}>
                Status: {health.status.toUpperCase()} • Device: {health.device.toUpperCase()} • Model: {health.model}
              </Text>
            </View>
          )}

          <Button
            title="Run Health Check"
            size="small"
            variant="outline"
            loading={isCheckingHealth}
            onPress={checkBackendHealth}
            style={styles.actionBtn}
          />
        </GlassCard>

        {/* Inference Test Harness */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Cpu size={18} color="#4F46E5" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>End-to-End Inference Test</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Sends synthesized PCM 16-bit audio through preprocessing and Wav2Vec2 inference.
          </Text>

          {testPrediction && (
            <View style={styles.predictionBox}>
              <View style={styles.predRow}>
                <Text style={styles.predLabel}>Result Label:</Text>
                <Text style={styles.predVal}>{testPrediction.label}</Text>
              </View>
              <View style={styles.predRow}>
                <Text style={styles.predLabel}>AI Risk Score:</Text>
                <Text style={styles.predVal}>{Math.round(testPrediction.aiRisk * 100)}%</Text>
              </View>
              <View style={styles.predRow}>
                <Text style={styles.predLabel}>Confidence:</Text>
                <Text style={styles.predVal}>{Math.round(testPrediction.confidence * 100)}%</Text>
              </View>
              <View style={styles.predRow}>
                <Text style={styles.predLabel}>Inference Time:</Text>
                <Text style={styles.predVal}>{testPrediction.inferenceTimeMs} ms</Text>
              </View>
            </View>
          )}

          <Button
            title="Execute Test Waveform Inference"
            size="medium"
            loading={isRunningTest}
            icon={<Play size={16} color="#FFFFFF" />}
            onPress={runTestInference}
            style={styles.actionBtn}
          />
        </GlassCard>

        {/* Live Diagnostics Console */}
        <Text style={styles.consoleHeading}>Diagnostics Log Console</Text>
        <GlassCard style={styles.consoleCard}>
          {logMessages.length === 0 ? (
            <Text style={styles.consoleEmpty}>Click an action above to view diagnostics output.</Text>
          ) : (
            logMessages.map((msg, i) => (
              <Text key={i} style={styles.consoleLine}>
                {msg}
              </Text>
            ))
          )}
        </GlassCard>
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
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardIcon: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  healthResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 12,
  },
  healthIcon: {
    marginRight: 8,
  },
  healthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  actionBtn: {
    marginTop: 4,
  },
  predictionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  predRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  predLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  predVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  consoleHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  consoleCard: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    padding: 14,
    minHeight: 120,
  },
  consoleEmpty: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  consoleLine: {
    fontSize: 11,
    color: '#38BDF8',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
