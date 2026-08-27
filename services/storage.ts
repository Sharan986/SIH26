import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisSummary } from '../types/analysis';

const KEYS = {
  HISTORY: 'voiceguard_history_v1',
  SETTINGS_API_URL: 'voiceguard_api_url',
  SETTINGS_THRESHOLD_REAL: 'voiceguard_thresh_real',
  SETTINGS_THRESHOLD_AI: 'voiceguard_thresh_ai',
  SETTINGS_DEV_MODE: 'voiceguard_dev_mode',
  ONBOARDING_DONE: 'voiceguard_onboarding_completed',
};

export class StorageService {
  // --- History ---
  static async getHistory(): Promise<AnalysisSummary[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.HISTORY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load history:', e);
      return [];
    }
  }

  static async getHistoryById(id: string): Promise<AnalysisSummary | null> {
    const list = await this.getHistory();
    return list.find((item) => item.id === id) || null;
  }

  static async saveAnalysis(record: AnalysisSummary): Promise<void> {
    try {
      const existing = await this.getHistory();
      // Keep up to 100 recent analyses
      const updated = [record, ...existing.filter((item) => item.id !== record.id)].slice(0, 100);
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save analysis record:', e);
    }
  }

  static async deleteHistoryRecord(id: string): Promise<void> {
    try {
      const existing = await this.getHistory();
      const filtered = existing.filter((item) => item.id !== id);
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete history record:', e);
    }
  }

  static async clearAllHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.HISTORY);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }

  // --- Settings ---
  static async getCustomApiUrl(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.SETTINGS_API_URL);
  }

  static async setCustomApiUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.SETTINGS_API_URL, url);
  }

  static async getThresholds(): Promise<{ realThreshold: number; aiThreshold: number }> {
    const realStr = await AsyncStorage.getItem(KEYS.SETTINGS_THRESHOLD_REAL);
    const aiStr = await AsyncStorage.getItem(KEYS.SETTINGS_THRESHOLD_AI);
    return {
      realThreshold: realStr ? parseInt(realStr, 10) : 30,
      aiThreshold: aiStr ? parseInt(aiStr, 10) : 60,
    };
  }

  static async setThresholds(realThreshold: number, aiThreshold: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.SETTINGS_THRESHOLD_REAL, realThreshold.toString());
    await AsyncStorage.setItem(KEYS.SETTINGS_THRESHOLD_AI, aiThreshold.toString());
  }

  static async isOnboardingCompleted(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
    return val === 'true';
  }

  static async setOnboardingCompleted(completed: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, completed ? 'true' : 'false');
  }

  static async isDevModeEnabled(): Promise<boolean> {
    const val = await AsyncStorage.getItem(KEYS.SETTINGS_DEV_MODE);
    return val === 'true';
  }

  static async setDevMode(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.SETTINGS_DEV_MODE, enabled ? 'true' : 'false');
  }
}
