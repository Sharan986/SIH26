import { AnalysisSummary } from './analysis';

export type HistoryRecord = AnalysisSummary;

export interface HistoryFilterOptions {
  riskLevel?: 'ALL' | 'LIKELY_REAL' | 'INCONCLUSIVE' | 'POSSIBLE_AI_VOICE';
  sortBy?: 'NEWEST' | 'OLDEST' | 'RISK_HIGH' | 'RISK_LOW';
}
