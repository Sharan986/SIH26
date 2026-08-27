import { PredictionPoint } from '../types/analysis';

export interface HealthResponse {
  status: string;
  model: string;
  model_name: string;
  device: string;
  is_loaded: boolean;
  load_error?: string;
}

export class ApiService {
  private static defaultBaseUrl = 'http://10.0.2.2:8000'; // Default for Android Emulator; customizable in Settings

  static getBaseUrl(): string {
    if (process.env.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
    return this.defaultBaseUrl;
  }

  static async checkHealth(customUrl?: string): Promise<HealthResponse> {
    const url = `${customUrl || this.getBaseUrl()}/health`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(id);
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err: any) {
      clearTimeout(id);
      throw new Error(`Backend unavailable at ${url}: ${err.message}`);
    }
  }

  static async analyzeAudioPcm(
    audioBase64: string,
    sampleRate = 16000,
    channels = 1,
    customUrl?: string
  ): Promise<PredictionPoint> {
    const url = `${customUrl || this.getBaseUrl()}/analyze`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        sampleRate,
        channels,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Analysis failed: ${errText}`);
    }

    const data = await response.json();
    return {
      id: `pred_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: data.timestamp || Date.now(),
      aiRisk: data.aiRisk ?? 0.0,
      realProbability: data.realProbability ?? 0.0,
      confidence: data.confidence ?? 0.0,
      label: data.label || 'UNKNOWN',
      rms: data.rms ?? 0.0,
      inferenceTimeMs: data.inferenceTimeMs ?? 0.0,
    };
  }
}
