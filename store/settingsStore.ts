import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { DeviceCapabilities } from '../types/device';
import { DeviceInfoService } from '../services/device';

export interface SettingsState {
  apiUrl: string;
  realThreshold: number;
  aiThreshold: number;
  devMode: boolean;
  onboardingCompleted: boolean;
  capabilities: DeviceCapabilities | null;
  isLoading: boolean;
}

type Listener = () => void;

class SettingsStore {
  private state: SettingsState = {
    apiUrl: ApiService.getBaseUrl(),
    realThreshold: 30,
    aiThreshold: 60,
    devMode: false,
    onboardingCompleted: false,
    capabilities: null,
    isLoading: true,
  };

  private listeners: Set<Listener> = new Set();

  constructor() {
    this.loadSettings();
  }

  getState(): SettingsState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  async loadSettings() {
    this.state.isLoading = true;
    this.notify();

    const customUrl = await StorageService.getCustomApiUrl();
    const thresholds = await StorageService.getThresholds();
    const devMode = await StorageService.isDevModeEnabled();
    const onboarding = await StorageService.isOnboardingCompleted();
    const capabilities = await DeviceInfoService.getFullCapabilities();

    this.state = {
      apiUrl: customUrl || ApiService.getBaseUrl(),
      realThreshold: thresholds.realThreshold,
      aiThreshold: thresholds.aiThreshold,
      devMode,
      onboardingCompleted: onboarding,
      capabilities,
      isLoading: false,
    };
    this.notify();
  }

  async setApiUrl(url: string) {
    await StorageService.setCustomApiUrl(url);
    this.state.apiUrl = url;
    this.notify();
  }

  async setThresholds(realThresh: number, aiThresh: number) {
    await StorageService.setThresholds(realThresh, aiThresh);
    this.state.realThreshold = realThresh;
    this.state.aiThreshold = aiThresh;
    this.notify();
  }

  async setDevMode(enabled: boolean) {
    await StorageService.setDevMode(enabled);
    this.state.devMode = enabled;
    this.notify();
  }

  async setOnboardingCompleted(completed: boolean) {
    await StorageService.setOnboardingCompleted(completed);
    this.state.onboardingCompleted = completed;
    this.notify();
  }

  async refreshCapabilities() {
    const capabilities = await DeviceInfoService.getFullCapabilities();
    this.state.capabilities = capabilities;
    this.notify();
  }
}

export const settingsStore = new SettingsStore();
