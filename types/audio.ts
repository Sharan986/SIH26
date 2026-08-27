export interface AudioChunk {
  base64: string;
  rms: number;
  db: number;
  durationSec: number;
  sampleCount: number;
  sampleRate: number;
  timestamp: number;
}

export type AudioCapabilityStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'PERMISSION_DENIED' | 'MICROPHONE_ONLY' | 'CHECKING';

export interface AudioCapabilityInfo {
  supported: boolean;
  status: AudioCapabilityStatus;
  sampleRate: number;
  channels: number;
  audioSource: string;
  directCallAudio: boolean;
  localMicrophoneAvailable: boolean;
  androidVersion: number;
  manufacturer: string;
  model: string;
  reason: string;
}
