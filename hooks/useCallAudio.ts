import { useEffect, useState, useCallback } from 'react';
import { CallAudioService, AudioChunkPayload, AudioLevelPayload, ErrorPayload } from '../modules/call-audio/src';
import { analysisStore } from '../store/analysisStore';
import { AudioCapabilityInfo } from '../types/audio';

export function useCallAudio() {
  const [capability, setCapability] = useState<AudioCapabilityInfo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [rms, setRms] = useState(0);
  const [db, setDb] = useState(-90);

  const checkCapability = useCallback(async () => {
    try {
      const cap = await CallAudioService.checkAudioCapability();
      const capInfo: AudioCapabilityInfo = {
        supported: cap.supported,
        status: cap.status as any,
        sampleRate: cap.sampleRate,
        channels: cap.channels,
        audioSource: cap.audioSource,
        directCallAudio: cap.directCallAudio,
        localMicrophoneAvailable: cap.localMicrophoneAvailable,
        androidVersion: cap.androidVersion,
        manufacturer: cap.manufacturer,
        model: cap.model,
        reason: cap.reason,
      };
      setCapability(capInfo);
      analysisStore.setAudioCapability(capInfo);
      return capInfo;
    } catch (e) {
      console.warn('Failed checking audio capability:', e);
      return null;
    }
  }, []);

  const startCapture = useCallback(async (sampleRate = 16000, windowSec = 5, saveLocal = false, autoSpeaker = false) => {
    const res = await CallAudioService.startCallAudioCapture(sampleRate, windowSec, saveLocal, autoSpeaker);
    setIsRecording(res.started);
    return res.started;
  }, []);

  const stopCapture = useCallback(async () => {
    const success = await CallAudioService.stopCallAudioCapture();
    setIsRecording(false);
    return success;
  }, []);

  useEffect(() => {
    checkCapability();

    const subLevel = CallAudioService.addAudioLevelListener((event: AudioLevelPayload) => {
      setRms(event.rms);
      setDb(event.db);
      analysisStore.setAudioLevel(event.rms, event.db);
    });

    const subError = CallAudioService.addErrorListener((event: ErrorPayload) => {
      console.warn('CallAudio Native Error:', event.code, event.message);
    });

    return () => {
      subLevel.remove();
      subError.remove();
    };
  }, [checkCapability]);

  return {
    capability,
    isRecording,
    rms,
    db,
    checkCapability,
    startCapture,
    stopCapture,
  };
}
