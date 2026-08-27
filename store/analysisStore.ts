import { CallState } from '../types/call';
import { PredictionPoint, RiskLevel, AnalysisSummary } from '../types/analysis';
import { AudioCapabilityInfo } from '../types/audio';
import { WsConnectionStatus } from '../services/websocket';
import { StorageService } from '../services/storage';

export type LiveScreenState =
  | 'IDLE'
  | 'WAITING_FOR_CALL'
  | 'CALL_DETECTED'
  | 'CHECKING_AUDIO'
  | 'CAPTURING'
  | 'PROCESSING'
  | 'UNSUPPORTED'
  | 'ERROR'
  | 'COMPLETED';

export interface AnalysisState {
  callState: CallState;
  screenState: LiveScreenState;
  wsStatus: WsConnectionStatus;
  wsStatusMessage?: string;
  errorMessage?: string;
  audioCapability: AudioCapabilityInfo | null;
  currentRms: number;
  currentDb: number;
  latestPrediction: PredictionPoint | null;
  predictions: PredictionPoint[];
  smoothedAiRisk: number; // 0 to 100
  smoothedConfidence: number; // 0 to 100
  callDurationSec: number;
  analysisDurationSec: number;
  isAnalyzing: boolean;
  activeSessionId: string | null;
  realThreshold: number;
  aiThreshold: number;
}

type Listener = () => void;

class AnalysisStore {
  private state: AnalysisState = {
    callState: 'IDLE',
    screenState: 'IDLE',
    wsStatus: 'DISCONNECTED',
    audioCapability: null,
    currentRms: 0,
    currentDb: -90,
    latestPrediction: null,
    predictions: [],
    smoothedAiRisk: 0,
    smoothedConfidence: 0,
    callDurationSec: 0,
    analysisDurationSec: 0,
    isAnalyzing: false,
    activeSessionId: null,
    realThreshold: 30,
    aiThreshold: 60,
  };

  private listeners: Set<Listener> = new Set();

  constructor() {
    this.initThresholds();
  }

  private async initThresholds() {
    const thresholds = await StorageService.getThresholds();
    this.setState({
      realThreshold: thresholds.realThreshold,
      aiThreshold: thresholds.aiThreshold,
    });
  }

  getState(): AnalysisState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  setState(partial: Partial<AnalysisState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  setCallState(callState: CallState) {
    this.setState({ callState });
  }

  setScreenState(screenState: LiveScreenState, errorMessage?: string) {
    this.setState({ screenState, errorMessage });
  }

  setWsStatus(wsStatus: WsConnectionStatus, message?: string) {
    this.setState({ wsStatus, wsStatusMessage: message });
  }

  setAudioCapability(audioCapability: AudioCapabilityInfo) {
    this.setState({ audioCapability });
  }

  setAudioLevel(rms: number, db: number) {
    this.setState({ currentRms: rms, currentDb: db });
  }

  addPrediction(point: PredictionPoint) {
    const prevSmoothedRisk = this.state.smoothedAiRisk;
    const prevSmoothedConf = this.state.smoothedConfidence;

    // Convert 0.0-1.0 to percentage 0-100
    const rawRiskPct = point.aiRisk * 100;
    const rawConfPct = point.confidence * 100;

    // Exponential moving average smoothing (alpha = 0.35)
    const alpha = 0.35;
    const newSmoothedRisk =
      this.state.predictions.length === 0
        ? rawRiskPct
        : alpha * rawRiskPct + (1 - alpha) * prevSmoothedRisk;

    const newSmoothedConf =
      this.state.predictions.length === 0
        ? rawConfPct
        : alpha * rawConfPct + (1 - alpha) * prevSmoothedConf;

    const updatedList = [...this.state.predictions, point];

    this.setState({
      latestPrediction: point,
      predictions: updatedList,
      smoothedAiRisk: Math.round(newSmoothedRisk),
      smoothedConfidence: Math.round(newSmoothedConf),
      screenState: 'PROCESSING',
    });
  }

  getRiskCategory(riskScore: number): RiskLevel {
    if (riskScore <= this.state.realThreshold) {
      return 'LIKELY_REAL';
    } else if (riskScore > this.state.aiThreshold) {
      return 'POSSIBLE_AI_VOICE';
    } else {
      return 'INCONCLUSIVE';
    }
  }

  startSession(sessionId: string) {
    this.setState({
      isAnalyzing: true,
      activeSessionId: sessionId,
      predictions: [],
      latestPrediction: null,
      smoothedAiRisk: 0,
      smoothedConfidence: 0,
      callDurationSec: 0,
      analysisDurationSec: 0,
      screenState: 'CHECKING_AUDIO',
      errorMessage: undefined,
    });
  }

  async finishSession(deviceSummary = 'Android Device'): Promise<AnalysisSummary | null> {
    const { activeSessionId, predictions, smoothedAiRisk, smoothedConfidence, analysisDurationSec, audioCapability } =
      this.state;

    if (!activeSessionId) return null;

    const avgRisk =
      predictions.length > 0
        ? Math.round(
            (predictions.reduce((acc, p) => acc + p.aiRisk * 100, 0) / predictions.length)
          )
        : smoothedAiRisk;

    const avgConf =
      predictions.length > 0
        ? Math.round(
            (predictions.reduce((acc, p) => acc + p.confidence * 100, 0) / predictions.length)
          )
        : smoothedConfidence;

    const finalRisk = smoothedAiRisk > 0 ? smoothedAiRisk : avgRisk;
    const resultLabel = this.getRiskCategory(finalRisk);

    const summary: AnalysisSummary = {
      id: activeSessionId,
      timestamp: Date.now(),
      durationSec: analysisDurationSec,
      windowCount: predictions.length,
      averageAiRisk: avgRisk,
      smoothedAiRisk: finalRisk,
      confidence: avgConf,
      resultLabel,
      mode: audioCapability?.audioSource ? `Direct Call (${audioCapability.audioSource})` : 'Microphone Path',
      device: `${deviceSummary}`,
      predictionTimeline: predictions,
    };

    if (predictions.length > 0) {
      await StorageService.saveAnalysis(summary);
    }

    this.setState({
      isAnalyzing: false,
      activeSessionId: null,
      screenState: 'COMPLETED',
    });

    return summary;
  }

  reset() {
    this.setState({
      isAnalyzing: false,
      activeSessionId: null,
      predictions: [],
      latestPrediction: null,
      smoothedAiRisk: 0,
      smoothedConfidence: 0,
      currentRms: 0,
      currentDb: -90,
      screenState: 'IDLE',
      errorMessage: undefined,
    });
  }
}

export const analysisStore = new AnalysisStore();
