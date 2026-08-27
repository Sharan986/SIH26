import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Radio,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  PhoneCall,
  Activity,
  Layers,
  StopCircle,
} from 'lucide-react-native';
import { useAnalysis } from '../../hooks/useAnalysis';
import { CircularRiskGauge } from '../../components/ui/CircularRiskGauge';
import { WaveformVisualizer } from '../../components/ui/WaveformVisualizer';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { CallStateBanner } from '../../components/call/CallStateBanner';
import { AudioCapabilityBadge } from '../../components/call/AudioCapabilityBadge';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';

export default function LiveAnalysisScreen() {
  const router = useRouter();
  const {
    callState,
    screenState,
    wsStatus,
    wsStatusMessage,
    errorMessage,
    audioCapability,
    currentRms,
    smoothedAiRisk,
    smoothedConfidence,
    callDurationSec,
    analysisDurationSec,
    predictions,
    isAnalyzing,
    startAnalysis,
    stopAnalysis,
  } = useAnalysis();

  useEffect(() => {
    // Automatically start analysis when entering screen
    if (!isAnalyzing) {
      startAnalysis();
    }
  }, [isAnalyzing, startAnalysis]);

  const handleStop = async () => {
    const summary = await stopAnalysis();
    if (summary) {
      router.replace({
        pathname: '/live/result',
        params: { summaryId: summary.id },
      } as any);
    } else {
      router.back();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Screen state message mapping
  const getStatusBanner = () => {
    if (screenState === 'UNSUPPORTED') {
      return {
        bg: '#FEE2E2',
        textColor: '#B91C1C',
        title: 'Direct call audio is unavailable on this device.',
        desc: 'Android restrictions prevent direct audio extraction.',
        isError: true,
      };
    }
    if (screenState === 'ERROR' || wsStatus === 'ERROR') {
      return {
        bg: '#FEE2E2',
        textColor: '#B91C1C',
        title: 'AI analysis unavailable',
        desc: wsStatusMessage || errorMessage || 'The VoiceGuard AI server could not be reached.',
        isError: true,
      };
    }
    if (wsStatus === 'RECONNECTING') {
      return {
        bg: '#FEF3C7',
        textColor: '#B45309',
        title: 'Reconnecting...',
        desc: 'Restoring real-time stream with VoiceGuard AI backend',
        isError: false,
      };
    }
    if (screenState === 'CHECKING_AUDIO') {
      return {
        bg: '#EEF2FF',
        textColor: '#4338CA',
        title: 'Checking call audio...',
        desc: 'Verifying microphone & telephony hardware channel',
        isError: false,
      };
    }
    if (screenState === 'CAPTURING' && predictions.length === 0) {
      return {
        bg: '#F0FDF4',
        textColor: '#166534',
        title: 'Listening to call audio...',
        desc: 'Accumulating 5-second initial audio window',
        isError: false,
      };
    }
    if (screenState === 'PROCESSING' || predictions.length > 0) {
      return {
        bg: '#F0FDF4',
        textColor: '#166534',
        title: 'Analyzing voice in real time...',
        desc: `Evaluating sample #${predictions.length}`,
        isError: false,
      };
    }
    return {
      bg: '#F1F5F9',
      textColor: '#475569',
      title: 'Waiting for active call',
      desc: 'VoiceGuard is active and monitoring telephony state',
      isError: false,
    };
  };

  const statusInfo = getStatusBanner();

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.screenHeading}>Live Voice Check</Text>
          <View style={styles.connectionPill}>
            {wsStatus === 'CONNECTED' ? (
              <>
                <Wifi size={12} color="#16A34A" />
                <Text style={styles.connectionPillTextOnline}>AI Server Live</Text>
              </>
            ) : wsStatus === 'RECONNECTING' ? (
              <>
                <RefreshCw size={12} color="#D97706" />
                <Text style={styles.connectionPillTextWarning}>Reconnecting</Text>
              </>
            ) : (
              <>
                <WifiOff size={12} color="#DC2626" />
                <Text style={styles.connectionPillTextOffline}>Server Offline</Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={handleStop} style={styles.closeBtn} activeOpacity={0.7}>
          <X size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Call Banner */}
        <CallStateBanner state={callState} durationSec={callDurationSec} />

        {/* State Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.bg }]}>
          {statusInfo.isError ? (
            <AlertTriangle size={18} color={statusInfo.textColor} style={styles.statusBannerIcon} />
          ) : (
            <Activity size={18} color={statusInfo.textColor} style={styles.statusBannerIcon} />
          )}
          <View style={styles.statusBannerTextCol}>
            <Text style={[styles.statusBannerTitle, { color: statusInfo.textColor }]}>{statusInfo.title}</Text>
            <Text style={[styles.statusBannerDesc, { color: statusInfo.textColor }]}>{statusInfo.desc}</Text>
          </View>
        </View>

        {/* Circular Risk Gauge */}
        <View style={styles.gaugeSection}>
          <CircularRiskGauge
            score={smoothedAiRisk}
            confidence={smoothedConfidence}
            size={250}
            strokeWidth={18}
            isProcessing={screenState === 'PROCESSING'}
          />
        </View>

        {/* Real-time Waveform Display */}
        <GlassCard style={styles.waveformCard}>
          <View style={styles.waveformHeader}>
            <View style={styles.waveformTitleRow}>
              <Radio size={14} color="#4F46E5" style={styles.waveIcon} />
              <Text style={styles.waveformTitle}>Incoming Audio Stream</Text>
            </View>
            <Text style={styles.waveformStatus}>
              {currentRms > 0.003 ? 'Audio Signal Detected' : 'Silent / Waiting'}
            </Text>
          </View>

          <WaveformVisualizer rms={currentRms} isCapturing={isAnalyzing} height={50} />
        </GlassCard>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Analysis Duration</Text>
            <Text style={styles.metricValue}>{formatTime(analysisDurationSec)}</Text>
          </GlassCard>

          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Windows Processed</Text>
            <Text style={styles.metricValue}>{predictions.length}</Text>
          </GlassCard>
        </View>

        {/* Audio Mode Badge */}
        <View style={styles.badgeSection}>
          <AudioCapabilityBadge capability={audioCapability} />
        </View>

        {/* Action Controls */}
        <View style={styles.actionsSection}>
          {statusInfo.isError ? (
            <View style={styles.errorActionsRow}>
              <Button
                title="Retry Connection"
                variant="outline"
                size="medium"
                icon={<RefreshCw size={16} color="#4F46E5" />}
                onPress={() => startAnalysis()}
                style={styles.actionBtnHalf}
              />
              <Button
                title="Stop Analysis"
                variant="danger"
                size="medium"
                onPress={handleStop}
                style={styles.actionBtnHalf}
              />
            </View>
          ) : (
            <Button
              title="Stop & Save Analysis"
              variant="danger"
              size="large"
              icon={<StopCircle size={20} color="#FFFFFF" />}
              onPress={handleStop}
            />
          )}
        </View>

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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  connectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  connectionPillTextOnline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  connectionPillTextWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  connectionPillTextOffline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBannerIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  statusBannerTextCol: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusBannerDesc: {
    fontSize: 12,
    opacity: 0.85,
  },
  gaugeSection: {
    marginVertical: 16,
    alignItems: 'center',
  },
  waveformCard: {
    padding: 14,
    marginBottom: 14,
  },
  waveformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  waveformTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waveIcon: {
    marginRight: 6,
  },
  waveformTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  waveformStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    padding: 12,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeSection: {
    marginBottom: 20,
  },
  actionsSection: {
    marginTop: 6,
    marginBottom: 10,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnHalf: {
    flex: 1,
  },
});
