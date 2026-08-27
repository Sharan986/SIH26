import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { CallAudioService } from '../modules/call-audio/src';
import { DeviceCapabilities } from '../types/device';

export class DeviceInfoService {
  static async getFullCapabilities(): Promise<DeviceCapabilities> {
    const nativeCaps = await CallAudioService.getDeviceCapabilities();

    return {
      androidVersion: Platform.OS === 'android' ? (Platform.Version as number) : 0,
      manufacturer: Device.manufacturer || nativeCaps.manufacturer || 'Android',
      model: Device.modelName || nativeCaps.model || 'Generic Device',
      accessibilityEnabled: nativeCaps.accessibilityEnabled ?? false,
      directCallAudio: nativeCaps.directCallAudio ?? false,
      microphone: nativeCaps.microphone ?? false,
      audioSource: nativeCaps.audioSource || 'VOICE_COMMUNICATION',
      status: nativeCaps.status || 'AVAILABLE',
    };
  }

  static getAppVersion(): string {
    return Application.nativeApplicationVersion || '1.0.0';
  }

  static getBuildVersion(): string {
    return Application.nativeBuildVersion || '1';
  }
}
