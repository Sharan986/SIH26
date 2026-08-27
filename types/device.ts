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

export interface PermissionStatus {
  microphone: boolean;
  phoneState: boolean;
  accessibility: boolean;
  isChecking: boolean;
}
