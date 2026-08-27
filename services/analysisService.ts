/**
 * AnalysisService — singleton that owns the WebSocket connection
 * and audio capture lifecycle. All hooks and screens share this one instance,
 * so there is never more than one WS connection or AudioRecord active.
 */
import { WebSocketStreamService, WsConnectionStatus } from './websocket';
import { analysisStore } from '../store/analysisStore';
import { settingsStore } from '../store/settingsStore';
import { CallAudioService, AudioChunkPayload } from '../modules/call-audio/src';

class AnalysisServiceClass {
  private ws: WebSocketStreamService | null = null;
  private timer: any = null;
  private chunkSub: any = null;

  // ── Start ──────────────────────────────────────────────────────────────────
  async start(sessionId: string, clientId: string): Promise<void> {
    if (analysisStore.getState().isAnalyzing) {
      console.log('[AnalysisService] already analyzing, skipping start');
      return;
    }

    analysisStore.startSession(sessionId);

    // 1. Check audio capability
    analysisStore.setScreenState('CHECKING_AUDIO');
    let cap: any;
    try {
      cap = await CallAudioService.checkAudioCapability();
    } catch (e: any) {
      analysisStore.setScreenState('ERROR', `Capability check failed: ${e.message}`);
      analysisStore.setState({ isAnalyzing: false, activeSessionId: null });
      return;
    }

    console.log('[AnalysisService] audio capability:', cap);

    analysisStore.setAudioCapability({
      supported: cap.supported,
      status: cap.status,
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
      analysisStore.setScreenState('UNSUPPORTED', cap.reason || 'Audio unavailable.');
      analysisStore.setState({ isAnalyzing: false, activeSessionId: null });
      return;
    }

    // 2. Open WebSocket
    const apiUrl = settingsStore.getState().apiUrl;
    console.log('[AnalysisService] connecting WS to:', apiUrl);

    this.ws = new WebSocketStreamService(
      {
        onStatusChange: (status: WsConnectionStatus, msg?: string) => {
          console.log('[AnalysisService] WS status:', status, msg || '');
          analysisStore.setWsStatus(status, msg);
          if (status === 'CONNECTED') {
            analysisStore.setScreenState('CAPTURING');
          } else if (status === 'ERROR') {
            analysisStore.setScreenState('ERROR', msg || 'AI server unreachable.');
          }
        },
        onPrediction: (pred) => {
          console.log('[AnalysisService] prediction received aiRisk:', pred.aiRisk, 'speaker:', pred.speaker_id);
          // Only add the prediction if it's from the remote peer, or if there is no speaker_id (fallback)
          if (!pred.speaker_id || pred.speaker_id !== clientId) {
             analysisStore.addPrediction(pred);
             // Update audio level UI based on remote audio RMS
             analysisStore.setAudioLevel(pred.rms, pred.rms * 100);
          }
        },
        onError: (err) => {
          console.warn('[AnalysisService] WS error:', err);
          analysisStore.setWsStatus('ERROR', err);
        },
      },
      apiUrl
    );
    this.ws.connect(sessionId, clientId, 16000, 1);

    // 3. Subscribe to audio chunks and forward to WS
    this.chunkSub = CallAudioService.addAudioChunkListener((event: AudioChunkPayload) => {
      const status = this.ws?.getStatus();
      if (this.ws && status === 'CONNECTED') {
        this.ws.sendAudioChunk(event.audioBase64);
      }
    });

    // 4. Start native audio capture
    console.log('[AnalysisService] starting native audio capture...');
    const res = await CallAudioService.startCallAudioCapture(16000, 5, true, true);
    console.log('[AnalysisService] native capture started:', res.started, 'path:', res.savedPath);

    if (!res.started) {
      analysisStore.setScreenState('ERROR', 'Failed to initialize audio capture. Check microphone permission.');
      await this.stop();
      return;
    }

    if (res.savedPath) {
      analysisStore.setState({ localFilePath: res.savedPath });
    }

    // 5. Elapsed timer
    const startTime = Date.now();
    this.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      analysisStore.setState({ callDurationSec: elapsed, analysisDurationSec: elapsed });
    }, 1000);
  }

  // ── Stop ───────────────────────────────────────────────────────────────────
  async stop() {
    console.log('[AnalysisService] stopping...');

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.chunkSub) {
      this.chunkSub.remove();
      this.chunkSub = null;
    }

    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }

    await CallAudioService.stopCallAudioCapture();

    const settings = settingsStore.getState();
    const deviceName = `${settings.capabilities?.manufacturer || 'Android'} ${settings.capabilities?.model || 'Device'}`;
    const summary = await analysisStore.finishSession(deviceName);
    return summary;
  }
}

export const AnalysisService = new AnalysisServiceClass();
