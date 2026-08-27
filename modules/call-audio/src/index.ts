import { EventEmitter, requireOptionalNativeModule } from 'expo-modules-core';
import {
  AudioCapability,
  AudioChunkPayload,
  AudioLevelPayload,
  AudioStatus,
  CallStatePayload,
  DeviceCapabilities,
  ErrorPayload,
} from './CallAudioModule.types';

export * from './CallAudioModule.types';

export interface EventSubscription {
  remove(): void;
}

type CallAudioEvents = {
  onCallStateChanged: (event: CallStatePayload) => void;
  onAudioChunk: (event: AudioChunkPayload) => void;
  onAudioLevel: (event: AudioLevelPayload) => void;
  onError: (event: ErrorPayload) => void;
  onCapabilityChecked: (event: AudioCapability) => void;
};

const CallAudioNativeModule = requireOptionalNativeModule('CallAudio');

const emitter = CallAudioNativeModule
  ? new EventEmitter<CallAudioEvents>(CallAudioNativeModule)
  : null;

export class CallAudioService {
  static isAvailable(): boolean {
    return !!CallAudioNativeModule;
  }

  static async isAccessibilityEnabled(): Promise<boolean> {
    if (!CallAudioNativeModule?.isAccessibilityEnabled) return false;
    return CallAudioNativeModule.isAccessibilityEnabled();
  }

  static async openAccessibilitySettings(): Promise<void> {
    if (CallAudioNativeModule?.openAccessibilitySettings) {
      CallAudioNativeModule.openAccessibilitySettings();
    }
  }

  static async getCallState(): Promise<'IDLE' | 'RINGING' | 'ACTIVE' | 'ENDED' | 'UNKNOWN'> {
    if (!CallAudioNativeModule?.getCallState) return 'IDLE';
    return CallAudioNativeModule.getCallState();
  }

  static async checkAudioCapability(): Promise<AudioCapability> {
    if (!CallAudioNativeModule?.checkAudioCapability) {
      return {
        supported: false,
        status: 'UNAVAILABLE',
        sampleRate: 16000,
        channels: 1,
        audioSource: 'NONE',
        directCallAudio: false,
        localMicrophoneAvailable: false,
        androidVersion: 0,
        manufacturer: 'Simulated',
        model: 'Expo Simulator',
        reason: 'Native CallAudio module not running in this environment.',
      };
    }
    return CallAudioNativeModule.checkAudioCapability();
  }

  static async getDeviceCapabilities(): Promise<DeviceCapabilities> {
    if (!CallAudioNativeModule?.getDeviceCapabilities) {
      return {
        androidVersion: 0,
        manufacturer: 'Generic',
        model: 'Development Device',
        accessibilityEnabled: false,
        directCallAudio: false,
        microphone: false,
        status: 'UNAVAILABLE',
      };
    }
    return CallAudioNativeModule.getDeviceCapabilities();
  }

  static async startCallAudioCapture(
    sampleRate = 16000,
    windowSec = 5,
    saveLocal = false,
    autoSpeaker = false
  ): Promise<{ started: boolean; savedPath: string | null }> {
    if (!CallAudioNativeModule?.startCallAudioCapture) return { started: false, savedPath: null };
    return CallAudioNativeModule.startCallAudioCapture(sampleRate, windowSec, saveLocal, autoSpeaker);
  }

  static async stopCallAudioCapture(): Promise<boolean> {
    if (!CallAudioNativeModule?.stopCallAudioCapture) return true;
    return CallAudioNativeModule.stopCallAudioCapture();
  }

  static async getAudioStatus(): Promise<AudioStatus> {
    if (!CallAudioNativeModule?.getAudioStatus) {
      return {
        isRecording: false,
        sampleRate: 16000,
        windowDurationSec: 5,
        totalSamplesCaptured: 0,
        elapsedDurationSec: 0,
        currentRms: 0,
      };
    }
    return CallAudioNativeModule.getAudioStatus();
  }

  // Event Listeners
  static addCallStateListener(listener: (event: CallStatePayload) => void): EventSubscription {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('onCallStateChanged', listener);
  }

  static addAudioChunkListener(listener: (event: AudioChunkPayload) => void): EventSubscription {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('onAudioChunk', listener);
  }

  static addAudioLevelListener(listener: (event: AudioLevelPayload) => void): EventSubscription {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('onAudioLevel', listener);
  }

  static addErrorListener(listener: (event: ErrorPayload) => void): EventSubscription {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('onError', listener);
  }

  static addCapabilityListener(listener: (event: AudioCapability) => void): EventSubscription {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('onCapabilityChecked', listener);
  }
}

export default CallAudioService;
