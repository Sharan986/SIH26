export type VoiceLabel = 'REAL' | 'AI_GENERATED' | 'UNKNOWN';

export type RiskLevel = 'LIKELY_REAL' | 'INCONCLUSIVE' | 'POSSIBLE_AI_VOICE';

export interface PredictionPoint {
  id: string;
  timestamp: number;
  aiRisk: number; // 0.0 to 1.0 (Acoustic base score)
  realProbability: number;
  confidence: number;
  label: VoiceLabel;
  rms: number;
  inferenceTimeMs: number;
  speaker_id?: string;
  blended_risk_score?: number; // 0.0 to 1.0 (Dynamic score adjusted by metadata)
  recommended_action?: string;
  metadata_applied?: boolean;
}

export interface AnalysisSummary {
  id: string;
  timestamp: number;
  durationSec: number;
  windowCount: number;
  averageAiRisk: number; // 0 to 100
  smoothedAiRisk: number; // 0 to 100
  confidence: number; // 0 to 100
  resultLabel: RiskLevel;
  mode: string;
  device: string;
  localFilePath?: string;
  predictionTimeline: PredictionPoint[];
}
