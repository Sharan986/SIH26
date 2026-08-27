export interface AudioCapability {
  supported: boolean;
  status: string;
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

export interface DeviceCapabilities {
  androidVersion: number;
  manufacturer: string;
  model: string;
  accessibilityEnabled: boolean;
  directCallAudio: boolean;
  microphone: boolean;
  audioSource?: string;
  status?: string;
}

export interface AudioStatus {
  isRecording: boolean;
  sampleRate: number;
  windowDurationSec: number;
  totalSamplesCaptured: number;
  elapsedDurationSec: number;
  currentRms: number;
}

export interface AudioChunkPayload {
  audioBase64: string;
  rms: number;
  durationSec: number;
  sampleCount: number;
  sampleRate: number;
}

export interface AudioLevelPayload {
  rms: number;
  db: number;
}

export interface CallStatePayload {
  state: 'IDLE' | 'RINGING' | 'ACTIVE' | 'ENDED' | 'UNKNOWN';
}

export interface ErrorPayload {
  code: string;
  message: string;
}
