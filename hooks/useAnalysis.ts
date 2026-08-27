import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react';
import { analysisStore, AnalysisState } from '../store/analysisStore';
import { settingsStore } from '../store/settingsStore';
import { WebSocketStreamService, WsConnectionStatus } from '../services/websocket';
import { CallAudioService, AudioChunkPayload } from '../modules/call-audio/src';

export function useAnalysis() {
  const state = useSyncExternalStore(
    (onStoreChange) => analysisStore.subscribe(onStoreChange),
    () => analysisStore.getState()
  );

  const wsServiceRef = useRef<WebSocketStreamService | null>(null);
  const timerRef = useRef<any>(null);

  const stopAnalysis = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }

    await CallAudioService.stopCallAudioCapture();
    const settings = settingsStore.getState();
    const deviceName = `${settings.capabilities?.manufacturer || 'Android'} ${settings.capabilities?.model || 'Device'}`;
    const summary = await analysisStore.finishSession(deviceName);
    return summary;
  }, []);

  const startAnalysis = useCallback(async () => {
    const sessionId = `call_${Date.now()}`;
    analysisStore.startSession(sessionId);

    // 1. Verify Audio Capability
    analysisStore.setScreenState('CHECKING_AUDIO');
    const cap = await CallAudioService.checkAudioCapability();
    analysisStore.setAudioCapability({
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
    });

    if (!cap.supported && !cap.localMicrophoneAvailable) {
      analysisStore.setScreenState('UNSUPPORTED', cap.reason || 'Audio capture unavailable on this device.');
      return;
    }

    // 2. Initialize WebSocket Stream
    const currentApiUrl = settingsStore.getState().apiUrl;
    wsServiceRef.current = new WebSocketStreamService(
      {
        onStatusChange: (status: WsConnectionStatus, message?: string) => {
          analysisStore.setWsStatus(status, message);
          if (status === 'CONNECTED') {
            analysisStore.setScreenState('CAPTURING');
          } else if (status === 'RECONNECTING') {
            // Keep previous risk visible, but show reconnecting status
          } else if (status === 'ERROR') {
            analysisStore.setScreenState('ERROR', message || 'VoiceGuard AI server unreachable.');
          }
        },
        onPrediction: (pred) => {
          analysisStore.addPrediction(pred);
        },
        onError: (err) => {
          analysisStore.setWsStatus('ERROR', err);
        },
      },
      currentApiUrl
    );

    wsServiceRef.current.connect(16000, 1);

    // 3. Start Audio Capture Engine
    const started = await CallAudioService.startCallAudioCapture(16000, 5);
    if (!started) {
      analysisStore.setScreenState('ERROR', 'Failed to initialize Android audio capture hardware.');
      return;
    }

    // 4. Start Timer
    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      analysisStore.setState({
        callDurationSec: elapsed,
        analysisDurationSec: elapsed,
      });
    }, 1000);
  }, []);

  // Listen to native Audio Chunks from RingBuffer
  useEffect(() => {
    const subChunk = CallAudioService.addAudioChunkListener((event: AudioChunkPayload) => {
      if (wsServiceRef.current && wsServiceRef.current.getStatus() === 'CONNECTED') {
        wsServiceRef.current.sendAudioChunk(event.audioBase64);
      }
    });

    return () => {
      subChunk.remove();
    };
  }, []);

  // Auto-stop when call ends if active
  useEffect(() => {
    if (state.callState === 'ENDED' && state.isAnalyzing) {
      stopAnalysis();
    }
  }, [state.callState, state.isAnalyzing, stopAnalysis]);

  return {
    ...state,
    startAnalysis,
    stopAnalysis,
  };
}
