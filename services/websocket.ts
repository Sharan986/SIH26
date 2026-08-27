import { PredictionPoint } from '../types/analysis';
import { ApiService } from './api';

export type WsConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export interface WebSocketCallbacks {
  onStatusChange: (status: WsConnectionStatus, message?: string) => void;
  onPrediction: (prediction: PredictionPoint) => void;
  onError: (error: string) => void;
}

export class WebSocketStreamService {
  private socket: WebSocket | null = null;
  private status: WsConnectionStatus = 'DISCONNECTED';
  private callbacks: WebSocketCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isIntentionallyClosed = false;
  private customBaseUrl?: string;

  constructor(callbacks: WebSocketCallbacks, customBaseUrl?: string) {
    this.callbacks = callbacks;
    this.customBaseUrl = customBaseUrl;
  }

  private sessionId?: string;
  private clientId?: string;

  private getWsUrl(): string {
    const httpUrl = this.customBaseUrl || ApiService.getBaseUrl();
    const wsUrl = httpUrl.replace(/^http/, 'ws');
    // If sessionId and clientId are provided, use the room-based hybrid endpoint
    if (this.sessionId && this.clientId) {
        return `${wsUrl}/ws/analyze/${this.sessionId}/${this.clientId}`;
    }
    return `${wsUrl}/ws/analyze`;
  }

  connect(sessionId: string, clientId: string, sampleRate = 16000, channels = 1) {
    this.isIntentionallyClosed = false;
    this.sessionId = sessionId;
    this.clientId = clientId;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('CONNECTING');
    const wsUrl = this.getWsUrl();

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.setStatus('CONNECTED');
        this.reconnectAttempts = 0;
        this.send({
          type: 'start',
          sampleRate,
          channels,
        });

        this.startPing();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // In hybrid AI, we might receive predictions for the remote speaker.
          // The prediction now includes "speaker_id".
          if (data.type === 'prediction' || data.aiRisk !== undefined) {
            const pred: PredictionPoint = {
              id: `ws_pred_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              timestamp: data.timestamp || Date.now(),
              aiRisk: data.aiRisk ?? 0.0,
              realProbability: data.realProbability ?? 0.0,
              confidence: data.confidence ?? 0.0,
              label: data.label || 'UNKNOWN',
              rms: data.rms ?? 0.0,
              inferenceTimeMs: data.inferenceTimeMs ?? 0.0,
              speaker_id: data.speaker_id, // include speaker_id
            };
            this.callbacks.onPrediction(pred);
          } else if (data.type === 'error') {
            this.callbacks.onError(data.message || 'Server error');
          }
        } catch (e: any) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      this.socket.onerror = (event: any) => {
        this.callbacks.onError(event?.message || 'WebSocket connection error');
      };

      this.socket.onclose = () => {
        this.stopPing();
        if (!this.isIntentionallyClosed) {
          this.attemptReconnect(sampleRate, channels);
        } else {
          this.setStatus('DISCONNECTED');
        }
      };
    } catch (e: any) {
      this.setStatus('ERROR', e.message);
      this.attemptReconnect(sampleRate, channels);
    }
  }

  private attemptReconnect(sampleRate: number, channels: number) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.setStatus('RECONNECTING', `Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`);
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
      this.reconnectTimer = setTimeout(() => {
        if (this.sessionId && this.clientId) {
          this.connect(this.sessionId, this.clientId, sampleRate, channels);
        }
      }, delay);
    } else {
      this.setStatus('ERROR', 'Unable to reach VoiceGuard AI server after multiple attempts.');
      this.callbacks.onError('AI analysis unavailable. VoiceGuard AI server could not be reached.');
    }
  }

  sendAudioChunk(base64Pcm: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({
        type: 'audio',
        data: base64Pcm,
      });
    }
  }

  private send(payload: any) {
    try {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(payload));
      }
    } catch (e: any) {
      console.warn('WebSocket send error:', e);
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 15000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private setStatus(status: WsConnectionStatus, message?: string) {
    this.status = status;
    this.callbacks.onStatusChange(status, message);
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.send({ type: 'stop' });
      try {
        this.socket.close();
      } catch (_: any) {}
      this.socket = null;
    }
    this.setStatus('DISCONNECTED');
  }

  getStatus(): WsConnectionStatus {
    return this.status;
  }
}
