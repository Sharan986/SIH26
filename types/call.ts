export type CallState = 'IDLE' | 'RINGING' | 'ACTIVE' | 'ENDED' | 'UNKNOWN';

export interface CallSession {
  id: string;
  startTime: number;
  endTime?: number;
  durationSec: number;
  state: CallState;
  sampleRate: number;
}
